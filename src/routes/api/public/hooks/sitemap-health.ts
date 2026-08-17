import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import {
  classifyUrlResponse,
  discoverSitemapUrls,
  runPool,
  withKeyPublicPages,
  type SitemapFetchResult,
  type UrlFailure,
} from "@/lib/sitemap-url-health";

// Recurring sitemap URL health check.
// - Fetches the sitemap index and every sitemap file it lists (recursively)
// - Crawls every URL with a Googlebot UA using redirect: 'manual'
// - Verifies HTTP 200 and flags redirects, auth walls (401/403 or /auth redirects),
//   noindex tags, non-HTML responses and missing titles
// - Verifies every page carries exactly one absolute, self-referencing canonical tag
// - Always includes the key public pages (home, library, faq, pricing, legal…) even
//   if they are missing from the sitemap
// - Emails Nikk only when there are failures (or when force=summary is passed)
// Scheduled daily via pg_cron. Public route; guarded by SITEMAP_HEALTH_SECRET header.

const SITE = "https://doseroutine.com";
const SITEMAP_URL = `${SITE}/sitemap.xml`;
const UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) DoseRoutineHealthCheck/1.0";
const CONCURRENCY = 8;
const TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  url: string,
  accept: string,
  redirect: RequestRedirect,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      redirect,
      headers: { "User-Agent": UA, Accept: accept },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

const sitemapFetcher = async (url: string): Promise<SitemapFetchResult> => {
  const res = await fetchWithTimeout(url, "application/xml,text/xml,*/*", "follow");
  return {
    ok: res.ok,
    status: res.status,
    text: res.ok ? await res.text() : "",
    contentType: res.headers.get("content-type") ?? undefined,
    finalUrl: res.url,
  };
};

async function checkUrl(url: string): Promise<UrlFailure | null> {
  try {
    // redirect: 'manual' so any 3xx surfaces as a failure instead of being silently followed.
    const res = await fetchWithTimeout(url, "text/html,application/xhtml+xml", "manual");
    const isRedirect = res.status >= 300 && res.status < 400;
    return classifyUrlResponse({
      url,
      status: res.status,
      location: res.headers.get("location"),
      contentType: res.headers.get("content-type"),
      body: isRedirect ? undefined : await res.text(),
    });
  } catch (err) {
    return { url, reason: err instanceof Error ? err.message : String(err) };
  }
}

export const Route = createFileRoute("/api/public/hooks/sitemap-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SITEMAP_HEALTH_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ error: "SITEMAP_HEALTH_SECRET not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const provided = request.headers.get("x-admin-secret");
        if (provided !== secret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const url = new URL(request.url);
        const force = url.searchParams.get("force"); // 'summary' -> email even when healthy
        const checkedAt = new Date().toISOString();

        const discovery = await discoverSitemapUrls(SITEMAP_URL, sitemapFetcher);

        // Root sitemap unreachable: report immediately.
        if (discovery.sitemaps.length === 0) {
          await sendTemplateEmail("sitemap-health-report", "Nikk.delibasic@gmail.com", {
            templateData: {
              checkedAt,
              total: 0,
              checked: 0,
              failed: discovery.failures.length || 1,
              sitemapsChecked: 0,
              failures: discovery.failures.length
                ? discovery.failures
                : [{ url: SITEMAP_URL, reason: "Sitemap fetch failed" }],
              sitemapUrl: SITEMAP_URL,
            },
          });
          return Response.json(
            { ok: false, error: "sitemap_fetch_failed", failures: discovery.failures },
            { status: 502 },
          );
        }

        const urls = withKeyPublicPages(
          SITE,
          discovery.urls.filter((u) => u.startsWith(SITE)),
        );
        const results = await runPool(urls, checkUrl, CONCURRENCY);
        const urlFailures = results
          .filter((r): r is UrlFailure => r !== null)
          .map((f) => ({ ...f, sitemap: discovery.source[f.url] }));
        const failures = [...discovery.failures, ...urlFailures];

        const shouldEmail = failures.length > 0 || force === "summary";
        if (shouldEmail) {
          await sendTemplateEmail("sitemap-health-report", "Nikk.delibasic@gmail.com", {
            templateData: {
              checkedAt,
              total: urls.length,
              checked: urls.length,
              failed: failures.length,
              sitemapsChecked: discovery.sitemaps.length,
              failures,
              sitemapUrl: SITEMAP_URL,
            },
            idempotencyKey: `sitemap-health-${checkedAt.slice(0, 10)}-${failures.length}`,
          });
        }

        return Response.json({
          ok: failures.length === 0,
          sitemaps: discovery.sitemaps,
          sitemapsChecked: discovery.sitemaps.length,
          total: urls.length,
          checked: urls.length,
          failed: failures.length,
          emailed: shouldEmail,
          failures: failures.slice(0, 20),
        });
      },
    },
  },
});
