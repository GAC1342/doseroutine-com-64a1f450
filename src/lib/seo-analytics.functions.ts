import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findBehavioralBotSessions, normalizeAnalyticsPath } from "@/lib/bot-sessions";
import {
  buildKeywordRows,
  buildLandingSeoRows,
  totalsOfLanding,
  type ConversionAgg,
  type KeywordRow,
  type LandingSeoRow,
} from "@/lib/seo-analytics";

export type SeoAnalyticsWindow = 7 | 28 | 90;

export type SeoAnalytics = {
  days: SeoAnalyticsWindow;
  connected: boolean;
  error: string | null;
  period: { startDate: string; endDate: string };
  previous: { startDate: string; endDate: string };
  keywords: KeywordRow[];
  landings: LandingSeoRow[];
  totals: ReturnType<typeof totalsOfLanding>;
};

const SIGNUP_EVENTS = new Set(["funnel_signup_completed", "auth_completed"]);
const UPGRADE_EVENTS = new Set([
  "trial_start_click",
  "trial_checkout_opened",
  "trial_expired_upgrade_click",
  "pro_route_gate_cta",
  "save_gate_click",
  "funnel_save_gate_click",
]);

/**
 * Admin-only SEO analytics: site-wide keyword performance from Search Console
 * joined with first-party conversion data grouped by landing page.
 */
export const getSeoAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = (input as { days?: number } | undefined)?.days;
    const days: SeoAnalyticsWindow = raw === 90 ? 90 : raw === 7 ? 7 : 28;
    return { days };
  })
  .handler(async ({ context, data }): Promise<SeoAnalytics> => {
    const { supabase } = context;
    const { data: adminRow } = await supabase.rpc("is_admin");
    if (!adminRow) throw new Error("Forbidden");

    const { loadSiteSearchData } = await import("@/lib/seo-analytics.server");
    const from = new Date(Date.now() - data.days * 86_400_000).toISOString();

    const [search, events] = await Promise.all([
      loadSiteSearchData(data.days),
      supabase
        .from("analytics_events")
        .select("session_id, event_name, path, properties, created_at")
        .gte("created_at", from)
        .order("created_at", { ascending: true })
        .limit(20_000),
    ]);

    if (events.error) throw new Error(events.error.message);

    const parsed = (events.data ?? [])
      .map((r) => {
        const props = (r.properties ?? {}) as Record<string, unknown>;
        return {
          sessionId: r.session_id ?? "",
          event: r.event_name ?? "",
          path: normalizeAnalyticsPath(r.path ?? "/"),
          ts: r.created_at ? Date.parse(r.created_at) : 0,
          uaFlagged: props.is_bot === true || props.is_bot_inferred === true,
        };
      })
      .filter((e) => e.sessionId);

    const behavioral = findBehavioralBotSessions(parsed);
    const human = parsed.filter((e) => !e.uaFlagged && !behavioral.has(e.sessionId));

    type Agg = { landing: string; signedUp: boolean; upgraded: boolean };
    const sessions = new Map<string, Agg>();
    for (const e of human) {
      let s = sessions.get(e.sessionId);
      if (!s) {
        // Rows arrive oldest-first, so the first path is the landing page.
        s = { landing: e.path, signedUp: false, upgraded: false };
        sessions.set(e.sessionId, s);
      }
      if (SIGNUP_EVENTS.has(e.event)) s.signedUp = true;
      if (UPGRADE_EVENTS.has(e.event)) s.upgraded = true;
    }

    const byPath = new Map<string, ConversionAgg>();
    for (const s of sessions.values()) {
      const row = byPath.get(s.landing) ?? {
        path: s.landing,
        sessions: 0,
        signups: 0,
        upgradeIntent: 0,
      };
      row.sessions += 1;
      if (s.signedUp) row.signups += 1;
      if (s.upgraded) row.upgradeIntent += 1;
      byPath.set(s.landing, row);
    }

    const keywords = buildKeywordRows(
      search.queriesCurrent,
      search.queriesPrevious,
      search.pageQuery,
    );
    const landings = buildLandingSeoRows(search.pages, search.pageQuery, [...byPath.values()]);

    return {
      days: data.days,
      connected: search.connected,
      error: search.error,
      period: search.period,
      previous: search.previous,
      keywords,
      landings,
      totals: totalsOfLanding(landings),
    };
  });
