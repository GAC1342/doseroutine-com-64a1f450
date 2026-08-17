import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  clusterZeroResultTerms,
  type CatalogEntry,
  type ZeroResultCluster,
  type ZeroResultTerm,
} from "@/lib/zero-result-clusters";
import type { SearchWindow } from "@/lib/search-insights.functions";

export type ZeroResultReport = {
  window: SearchWindow;
  from: string;
  /** Total zero-result searches in the window. */
  totalZeroSearches: number;
  /** Distinct zero-result terms. */
  distinctTerms: number;
  /** Share of all searches that returned nothing, 0–1. */
  zeroRate: number;
  clusters: ZeroResultCluster[];
};

/**
 * Admin-only: cluster dead-end searches and propose catalog fixes
 * (aliases, goal tags, filter chips, or a missing library entry).
 */
export const getZeroResultReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const w = (input as { window?: string } | undefined)?.window;
    return { window: (w === "30d" || w === "90d" ? w : "7d") as SearchWindow };
  })
  .handler(async ({ context, data }): Promise<ZeroResultReport> => {
    const { supabase } = context;
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const days = data.window === "90d" ? 90 : data.window === "30d" ? 30 : 7;
    const from = new Date(Date.now() - days * 86_400_000).toISOString();

    const [{ data: rows, error }, { data: compounds, error: catalogError }] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("properties")
        .eq("event_name", "search_committed")
        .gte("created_at", from)
        .limit(20_000),
      supabase.from("compounds").select("slug,name,aliases,category,goal_tags").limit(2_000),
    ]);

    if (error) throw new Error(error.message);
    if (catalogError) throw new Error(catalogError.message);

    const catalog: CatalogEntry[] = (compounds ?? []).map((c) => ({
      slug: c.slug,
      name: c.name,
      aliases: c.aliases,
      category: c.category,
      goalTags: c.goal_tags,
    }));

    const counts = new Map<string, number>();
    let totalSearches = 0;
    let totalZeroSearches = 0;

    for (const r of rows ?? []) {
      const p = (r.properties ?? {}) as Record<string, unknown>;
      if (p["is_bot"] === true) continue;
      const term = typeof p["term"] === "string" ? p["term"].trim() : "";
      if (!term) continue;
      totalSearches += 1;
      const zero = p["zero_results"] === true || p["result_count"] === 0;
      if (!zero) continue;
      totalZeroSearches += 1;
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }

    const terms: ZeroResultTerm[] = Array.from(counts.entries()).map(([term, searches]) => ({
      term,
      searches,
    }));

    return {
      window: data.window,
      from,
      totalZeroSearches,
      distinctTerms: terms.length,
      zeroRate: totalSearches > 0 ? totalZeroSearches / totalSearches : 0,
      clusters: clusterZeroResultTerms(terms, catalog, { limit: 12 }),
    };
  });
