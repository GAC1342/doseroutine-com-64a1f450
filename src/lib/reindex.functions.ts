import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface IndexSubmissionRow {
  id: string;
  created_at: string;
  source: string;
  sitemap_url: string;
  sitemap_submit_ok: boolean;
  sitemap_submit_error: string | null;
  sitemap_url_count: number | null;
  sitemap_last_downloaded: string | null;
  sitemap_is_pending: boolean | null;
  indexnow_ok: boolean;
  indexnow_submitted: number;
  indexnow_error: string | null;
  duration_ms: number | null;
}

/** Admin-only: resubmit the sitemap to Search Console and ping IndexNow. */
export const submitSitemapAndReindex = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { runReindex, recordReindex } = await import("@/lib/reindex.server");
    const result = await runReindex();
    await recordReindex(result, { source: "manual", triggeredBy: context.userId });
    return result;
  });

/** Admin-only: history of submit/reindex runs, newest first. */
export const listIndexSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(10) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("index_submissions")
      .select(
        "id, created_at, source, sitemap_url, sitemap_submit_ok, sitemap_submit_error, sitemap_url_count, sitemap_last_downloaded, sitemap_is_pending, indexnow_ok, indexnow_submitted, indexnow_error, duration_ms",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return { rows: (rows ?? []) as unknown as IndexSubmissionRow[] };
  });
