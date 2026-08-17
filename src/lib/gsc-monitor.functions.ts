import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface GscSnapshotRow {
  snapshot_date: string;
  site_url: string;
  sitemap_path: string | null;
  sitemap_last_downloaded: string | null;
  sitemap_last_submitted: string | null;
  sitemap_is_pending: boolean | null;
  sitemap_submitted_urls: number | null;
  sitemap_indexed_urls: number | null;
  sitemap_errors: number | null;
  sitemap_warnings: number | null;
  sitemap_fetch_ok: boolean | null;
  sitemap_url_count: number | null;
  inspected_urls: number;
  indexed_urls: number;
  not_indexed_urls: number;
  excluded_urls: number;
  crawl_error_urls: number;
  robots_blocked_urls: number;
  coverage_breakdown: Record<string, number>;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  avg_position: number | null;
  performance_range_start: string | null;
  performance_range_end: string | null;
  issues: Array<{ kind: string; message: string; before?: string; after?: string }>;
  api_ok: boolean;
  api_error: string | null;
}

/** Admin-only: Search Console snapshot history, newest first. */
export const listGscSnapshots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(60) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString().slice(0, 10);
    const { data: rows, error } = await supabaseAdmin
      .from("gsc_daily_snapshots")
      .select("*")
      .gte("snapshot_date", since)
      .order("snapshot_date", { ascending: false });
    if (error) throw error;
    return { rows: (rows ?? []) as unknown as GscSnapshotRow[], days: data.days };
  });
