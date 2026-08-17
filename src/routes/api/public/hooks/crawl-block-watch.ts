import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { GSC_SITE_URL, absoluteUrl } from "@/lib/seo-monitor-urls";
import {
  CRAWL_WATCH_URLS,
  collectAlerts,
  shouldAlert,
  summarize,
  type InspectionReading,
} from "@/lib/crawl-block-watch";

// Daily crawl-block watch.
// Reads Google's stored URL Inspection record for each affected URL (the
// canonical money pages plus the ?lang= variants that were wrongly blocked)
// and emails Nikk whenever robots.txt blocks a crawl, Google can't fetch the
// page, or indexing is disallowed. Results are stored in gsc_crawl_inspections
// so history is visible in the admin Search Console page.
// Note: this reads the stored index record — it cannot run a live test.

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 3;
const ALERT_EMAIL = "Nikk.delibasic@gmail.com";

async function inspect(url: string): Promise<InspectionReading> {
  const empty: InspectionReading = {
    url,
    robotsTxtState: null,
    pageFetchState: null,
    indexingState: null,
    verdict: null,
    coverageState: null,
    lastCrawlTime: null,
    apiError: null,
  };
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!apiKey || !connKey) {
    return { ...empty, apiError: "Search Console connection not configured" };
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Connection-Api-Key": connKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: GSC_SITE_URL }),
    });
    if (!res.ok) {
      return { ...empty, apiError: `${res.status}: ${(await res.text()).slice(0, 200)}` };
    }
    const data = (await res.json()) as any;
    const idx = data?.inspectionResult?.indexStatusResult ?? {};
    return {
      url,
      robotsTxtState: idx.robotsTxtState ?? null,
      pageFetchState: idx.pageFetchState ?? null,
      indexingState: idx.indexingState ?? null,
      verdict: idx.verdict ?? null,
      coverageState: idx.coverageState ?? null,
      lastCrawlTime: idx.lastCrawlTime ?? null,
      apiError: null,
    };
  } catch (err) {
    return { ...empty, apiError: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(t);
  }
}

async function runPool<T, R>(items: T[], worker: (t: T) => Promise<R>, n: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        results[idx] = await worker(items[idx]);
      }
    }),
  );
  return results;
}

export const Route = createFileRoute("/api/public/hooks/crawl-block-watch")({
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

        const force = new URL(request.url).searchParams.get("force"); // 'summary' -> always email

        const readings = await runPool(
          CRAWL_WATCH_URLS.map(absoluteUrl),
          (u) => inspect(u),
          CONCURRENCY,
        );
        const alerts = collectAlerts(readings);
        const summary = summarize(readings);
        const checkedAt = new Date().toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: upsertError } = await supabaseAdmin.from("gsc_crawl_inspections").upsert(
          readings.map((r) => ({
            url: r.url,
            site_url: GSC_SITE_URL,
            robots_txt_state: r.robotsTxtState,
            page_fetch_state: r.pageFetchState,
            indexing_state: r.indexingState,
            verdict: r.verdict,
            coverage_state: r.coverageState,
            last_crawl_time: r.lastCrawlTime,
            api_error: r.apiError,
            is_blocked: alerts.some((a) => a.url === r.url && a.severity === "error"),
            checked_at: checkedAt,
            updated_at: checkedAt,
          })),
          { onConflict: "url,site_url" },
        );
        if (upsertError) console.error("crawl-block-watch upsert failed", upsertError);

        let emailed = false;
        if (shouldAlert(alerts) || force === "summary") {
          try {
            await sendTemplateEmail("crawl-block-report", ALERT_EMAIL, {
              templateData: {
                checkedAt,
                siteUrl: GSC_SITE_URL,
                summary,
                alerts: JSON.parse(JSON.stringify(alerts)),
              },
            });
            emailed = true;
          } catch (err) {
            console.error("crawl-block-watch email failed", err);
          }
        }

        return Response.json({ ok: true, checkedAt, summary, alerts, emailed });
      },
    },
  },
});
