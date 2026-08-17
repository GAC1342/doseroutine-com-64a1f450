import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { GSC_SITE_URL, SITE_ORIGIN } from "@/lib/seo-monitor-urls";
import {
  countSitemapLocs,
  detectIssues,
  parseSitemapEntry,
  summarizeCoverage,
  type MonitorIssue,
  type PerformanceTotals,
  type SitemapStatus,
} from "@/lib/gsc-monitor";

// Daily Google Search Console monitor.
// Records one row per day in gsc_daily_snapshots so sitemap fetch status,
// indexing counts and search performance can be tracked over time, and emails
// only when something regresses. Guarded by SEO_MONITOR_SECRET / CRON_SECRET.

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const TIMEOUT_MS = 20_000;
const ALERT_EMAIL = "Nikk.delibasic@gmail.com";

function gscHeaders(): Record<string, string> | null {
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!apiKey || !connKey) return null;
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  };
}

async function withTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Sitemap submission/fetch state as Google reports it. */
async function fetchSitemapStatus(
  headers: Record<string, string>,
): Promise<{ status: SitemapStatus | null; error: string | null }> {
  try {
    const res = await withTimeout(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/sitemaps`,
      { headers },
    );
    if (!res.ok) return { status: null, error: `sitemaps ${res.status}: ${await res.text()}` };
    const data = (await res.json()) as { sitemap?: unknown[] };
    const list = Array.isArray(data.sitemap) ? data.sitemap : [];
    if (list.length === 0) return { status: null, error: "no sitemap submitted" };
    // Prefer our canonical sitemap when the property lists several.
    const preferred = list.find((s) => (s as { path?: string }).path === SITEMAP_URL) ?? list[0];
    return { status: parseSitemapEntry(preferred), error: null };
  } catch (err) {
    return { status: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Clicks/impressions/CTR/position for the last complete 28-day window. */
async function fetchPerformance(
  headers: Record<string, string>,
): Promise<{ totals: PerformanceTotals; error: string | null }> {
  const end = new Date(Date.now() - 3 * 86_400_000); // GSC data lags ~2-3 days
  const start = new Date(end.getTime() - 27 * 86_400_000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const empty: PerformanceTotals = {
    clicks: null,
    impressions: null,
    ctr: null,
    avgPosition: null,
    rangeStart: startDate,
    rangeEnd: endDate,
  };
  try {
    const res = await withTimeout(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
      { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: [] }) },
    );
    if (!res.ok) return { totals: empty, error: `searchAnalytics ${res.status}` };
    const data = (await res.json()) as { rows?: Array<Record<string, number>> };
    const row = data.rows?.[0];
    if (!row) return { totals: empty, error: null };
    return {
      totals: {
        clicks: Math.round(row["clicks"] ?? 0),
        impressions: Math.round(row["impressions"] ?? 0),
        ctr: row["ctr"] ?? null,
        avgPosition: row["position"] ?? null,
        rangeStart: startDate,
        rangeEnd: endDate,
      },
      error: null,
    };
  } catch (err) {
    return { totals: empty, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Live sitemap reachability + URL count (follows a sitemap index one level). */
async function fetchLiveSitemap(): Promise<{ ok: boolean; urlCount: number | null }> {
  try {
    const res = await withTimeout(SITEMAP_URL, { headers: { Accept: "application/xml" } });
    if (!res.ok) return { ok: false, urlCount: null };
    const xml = await res.text();
    const isIndex = /<sitemapindex/i.test(xml);
    if (!isIndex) return { ok: true, urlCount: countSitemapLocs(xml) };
    const children = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((m) => m[1].trim());
    let total = 0;
    for (const child of children.slice(0, 25)) {
      try {
        const r = await withTimeout(child, { headers: { Accept: "application/xml" } });
        if (r.ok) total += countSitemapLocs(await r.text());
      } catch {
        /* one bad child shouldn't fail the whole count */
      }
    }
    return { ok: true, urlCount: total };
  } catch {
    return { ok: false, urlCount: null };
  }
}

export const Route = createFileRoute("/api/public/hooks/gsc-monitor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const seoSecret = process.env.SEO_MONITOR_SECRET;
        const cronSecret = process.env.CRON_SECRET;
        const provided =
          request.headers.get("x-admin-secret") || request.headers.get("x-cron-secret");
        const authorized =
          (seoSecret && provided === seoSecret) || (cronSecret && provided === cronSecret);
        if (!authorized) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(request.url);
        const force = url.searchParams.get("force"); // 'summary' -> email even when clean

        const headers = gscHeaders();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1) Previous snapshot for drop detection.
        const { data: priorRows } = await supabaseAdmin
          .from("gsc_daily_snapshots")
          .select("indexed_urls, sitemap_url_count, snapshot_date")
          .eq("site_url", GSC_SITE_URL)
          .order("snapshot_date", { ascending: false })
          .limit(1);
        const prior = priorRows?.[0] ?? null;

        // 2) Gather today's readings.
        const [sitemapRes, perfRes, live, snapshots] = await Promise.all([
          headers
            ? fetchSitemapStatus(headers)
            : Promise.resolve({ status: null, error: "Search Console connection not configured" }),
          headers
            ? fetchPerformance(headers)
            : Promise.resolve({
                totals: {
                  clicks: null,
                  impressions: null,
                  ctr: null,
                  avgPosition: null,
                  rangeStart: null,
                  rangeEnd: null,
                } as PerformanceTotals,
                error: null,
              }),
          fetchLiveSitemap(),
          supabaseAdmin
            .from("seo_page_snapshots")
            .select("indexing_verdict, coverage_state, rich_result_types"),
        ]);

        const coverage = summarizeCoverage((snapshots.data ?? []) as never[]);
        const apiError = sitemapRes.error ?? perfRes.error ?? null;

        const issues: MonitorIssue[] = detectIssues({
          sitemap: sitemapRes.status,
          sitemapFetchOk: live.ok,
          sitemapUrlCount: live.urlCount,
          coverage,
          prior,
          apiError,
        });

        // 3) Store one row per day (idempotent re-runs overwrite the same day).
        const today = new Date().toISOString().slice(0, 10);
        const row = {
          snapshot_date: today,
          site_url: GSC_SITE_URL,
          sitemap_path: sitemapRes.status?.path ?? SITEMAP_URL,
          sitemap_last_downloaded: sitemapRes.status?.lastDownloaded ?? null,
          sitemap_last_submitted: sitemapRes.status?.lastSubmitted ?? null,
          sitemap_is_pending: sitemapRes.status?.isPending ?? null,
          sitemap_submitted_urls: sitemapRes.status?.submittedUrls ?? null,
          sitemap_indexed_urls: sitemapRes.status?.indexedUrls ?? null,
          sitemap_errors: sitemapRes.status?.errors ?? null,
          sitemap_warnings: sitemapRes.status?.warnings ?? null,
          sitemap_fetch_ok: live.ok,
          sitemap_url_count: live.urlCount,
          inspected_urls: coverage.inspected,
          indexed_urls: coverage.indexed,
          not_indexed_urls: coverage.notIndexed,
          excluded_urls: coverage.excluded,
          crawl_error_urls: coverage.crawlErrors,
          robots_blocked_urls: coverage.robotsBlocked,
          rich_result_fail_urls: coverage.richResultFails,
          coverage_breakdown: coverage.breakdown,
          clicks: perfRes.totals.clicks,
          impressions: perfRes.totals.impressions,
          ctr: perfRes.totals.ctr,
          avg_position: perfRes.totals.avgPosition,
          performance_range_start: perfRes.totals.rangeStart,
          performance_range_end: perfRes.totals.rangeEnd,
          issues: JSON.parse(JSON.stringify(issues)),
          api_ok: !apiError,
          api_error: apiError,
          updated_at: new Date().toISOString(),
        };
        const { error: upsertError } = await supabaseAdmin
          .from("gsc_daily_snapshots")
          .upsert(row, { onConflict: "snapshot_date,site_url" });
        if (upsertError) console.error("gsc-monitor upsert failed", upsertError);

        // 4) Alert only on issues (or explicit summary request).
        const shouldEmail = issues.length > 0 || force === "summary";
        if (shouldEmail) {
          await sendTemplateEmail("gsc-monitor-report", ALERT_EMAIL, {
            templateData: {
              checkedAt: new Date().toISOString(),
              siteUrl: GSC_SITE_URL,
              sitemapPath: row.sitemap_path,
              sitemapLastDownloaded: row.sitemap_last_downloaded,
              sitemapErrors: row.sitemap_errors,
              sitemapWarnings: row.sitemap_warnings,
              sitemapUrlCount: row.sitemap_url_count,
              indexed: row.indexed_urls,
              inspected: row.inspected_urls,
              clicks: row.clicks,
              impressions: row.impressions,
              issues,
            },
            idempotencyKey: `gsc-monitor-${today}-${issues.length}`,
          });
        }

        return Response.json({
          ok: issues.length === 0,
          date: today,
          siteUrl: GSC_SITE_URL,
          sitemap: sitemapRes.status,
          liveSitemap: live,
          coverage,
          performance: perfRes.totals,
          issues,
          emailed: shouldEmail,
          apiError,
        });
      },
    },
  },
});
