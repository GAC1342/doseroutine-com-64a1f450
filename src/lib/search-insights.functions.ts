import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SearchWindow = "7d" | "30d" | "90d";

export type TermStat = {
  term: string;
  searches: number;
  /** Searches on this term that ended with a suggestion being opened. */
  selections: number;
  /** selections / searches, 0–1. */
  successRate: number;
  zeroResults: number;
};

export type ChipStat = {
  group: string;
  value: string;
  uses: number;
  /** Times the chip was turned on (vs off). */
  activations: number;
};

export type SearchInsights = {
  window: SearchWindow;
  from: string;
  totalSearches: number;
  totalSuggestShown: number;
  totalSelections: number;
  /** selections / suggestion impressions, 0–1. */
  suggestCtr: number;
  avgSelectedPosition: number | null;
  aliasSelectionShare: number;
  topTerms: TermStat[];
  zeroResultTerms: { term: string; searches: number }[];
  topChips: ChipStat[];
  bySurface: { surface: string; searches: number; selections: number }[];
};

type EventRow = {
  event_name: string;
  properties: Record<string, unknown> | null;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const EVENT_NAMES = [
  "search_committed",
  "search_suggest_shown",
  "search_suggest_selected",
  "search_filter_chip",
  "search_cleared",
];

/**
 * Admin-only report: which typed terms and filter chips drive searches that
 * actually end in a compound/post being opened.
 */
export const getSearchInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const w = (input as { window?: string } | undefined)?.window;
    return { window: (w === "30d" || w === "90d" ? w : "7d") as SearchWindow };
  })
  .handler(async ({ context, data }): Promise<SearchInsights> => {
    const { supabase } = context;
    const { data: adminRow } = await supabase.rpc("is_admin");
    if (!adminRow) throw new Error("Forbidden");

    const days = data.window === "90d" ? 90 : data.window === "30d" ? 30 : 7;
    const from = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data: rows, error } = await supabase
      .from("analytics_events")
      .select("event_name, properties")
      .in("event_name", EVENT_NAMES)
      .gte("created_at", from)
      .limit(20_000);

    if (error) throw new Error(error.message);

    const events = (rows ?? []) as unknown as EventRow[];

    const terms = new Map<string, TermStat>();
    const chips = new Map<string, ChipStat>();
    const surfaces = new Map<string, { searches: number; selections: number }>();

    let totalSearches = 0;
    let totalSuggestShown = 0;
    let totalSelections = 0;
    let positionSum = 0;
    let positionCount = 0;
    let aliasSelections = 0;

    const termStat = (term: string): TermStat => {
      let t = terms.get(term);
      if (!t) {
        t = { term, searches: 0, selections: 0, successRate: 0, zeroResults: 0 };
        terms.set(term, t);
      }
      return t;
    };

    const surfaceStat = (surface: string) => {
      let s = surfaces.get(surface);
      if (!s) {
        s = { searches: 0, selections: 0 };
        surfaces.set(surface, s);
      }
      return s;
    };

    for (const e of events) {
      const p = e.properties ?? {};
      if (p["is_bot"] === true) continue;
      const surface = str(p["surface"]) ?? "unknown";
      const term = str(p["term"]);

      switch (e.event_name) {
        case "search_committed": {
          if (!term) break;
          totalSearches += 1;
          surfaceStat(surface).searches += 1;
          const t = termStat(term);
          t.searches += 1;
          if (p["zero_results"] === true || num(p["result_count"]) === 0) t.zeroResults += 1;
          break;
        }
        case "search_suggest_shown": {
          totalSuggestShown += 1;
          break;
        }
        case "search_suggest_selected": {
          totalSelections += 1;
          surfaceStat(surface).selections += 1;
          if (term) termStat(term).selections += 1;
          const idx = num(p["index"]);
          if (idx !== null && idx >= 0) {
            positionSum += idx;
            positionCount += 1;
          }
          if (p["match_type"] === "alias") aliasSelections += 1;
          break;
        }
        case "search_filter_chip": {
          const group = str(p["group"]) ?? "unknown";
          const value = str(p["value"]) ?? "unknown";
          const key = `${surface}:${group}:${value}`;
          let c = chips.get(key);
          if (!c) {
            c = { group: `${surface} · ${group}`, value, uses: 0, activations: 0 };
            chips.set(key, c);
          }
          c.uses += 1;
          if (p["active"] === true) c.activations += 1;
          break;
        }
        default:
          break;
      }
    }

    for (const t of terms.values()) {
      t.successRate = t.searches > 0 ? t.selections / t.searches : 0;
    }

    const allTerms = Array.from(terms.values());

    return {
      window: data.window,
      from,
      totalSearches,
      totalSuggestShown,
      totalSelections,
      suggestCtr: totalSuggestShown > 0 ? totalSelections / totalSuggestShown : 0,
      avgSelectedPosition: positionCount > 0 ? positionSum / positionCount : null,
      aliasSelectionShare: totalSelections > 0 ? aliasSelections / totalSelections : 0,
      topTerms: allTerms
        .slice()
        .sort((a, b) => b.searches - a.searches || a.term.localeCompare(b.term))
        .slice(0, 20),
      zeroResultTerms: allTerms
        .filter((t) => t.zeroResults > 0)
        .sort((a, b) => b.zeroResults - a.zeroResults)
        .slice(0, 15)
        .map((t) => ({ term: t.term, searches: t.zeroResults })),
      topChips: Array.from(chips.values())
        .sort((a, b) => b.uses - a.uses)
        .slice(0, 20),
      bySurface: Array.from(surfaces.entries())
        .map(([surface, s]) => ({ surface, ...s }))
        .sort((a, b) => b.searches - a.searches),
    };
  });
