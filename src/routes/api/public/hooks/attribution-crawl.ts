import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import {
  runAttributionCrawl,
  SITEMAP_URL,
  type AttributionUrlReport,
} from "@/lib/attribution-crawl.server";

// Automated content-attribution crawler.
// - Fetches /sitemap.xml
// - Crawls every public URL as an AI scraper UA
// - Verifies X-Content-Attribution / cite-as headers,
//   the visible DoseRoutine credit line, publisher JSON-LD, meta author,
//   and the canonical URL
// - Emails Nikk when any page loses a signal
// Scheduled daily via pg_cron. Public route; guarded by SCHEMA_VALIDATION_SECRET.

export const Route = createFileRoute("/api/public/hooks/attribution-crawl")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SCHEMA_VALIDATION_SECRET;
        if (!secret) {
          return new Response(
            JSON.stringify({ error: "SCHEMA_VALIDATION_SECRET not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        if (request.headers.get("x-admin-secret") !== secret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const url = new URL(request.url);
        const force = url.searchParams.get("force"); // 'summary' -> email even when clean
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;

        let report;
        try {
          report = await runAttributionCrawl({ limit });
        } catch (err) {
          await sendTemplateEmail("attribution-crawl-report", "Nikk.delibasic@gmail.com", {
            templateData: {
              checkedAt: new Date().toISOString(),
              sitemapUrl: SITEMAP_URL,
              totalUrls: 0,
              checkedUrls: 0,
              urlsWithIssues: 1,
              errorCount: 1,
              warningCount: 0,
              byCheck: [{ check: "fetch", count: 1 }],
              topFailures: [
                {
                  url: SITEMAP_URL,
                  status: null,
                  errors: 1,
                  warnings: 0,
                  sampleMessages: [err instanceof Error ? err.message : String(err)],
                },
              ],
            },
          });
          return Response.json({ ok: false, error: "sitemap_fetch_failed" }, { status: 502 });
        }

        const failing: AttributionUrlReport[] = report.reports
          .filter((r) => r.issues.length > 0 || r.fetchError)
          .sort((a, b) => {
            const aErr = a.issues.filter((i) => i.severity === "error").length;
            const bErr = b.issues.filter((i) => i.severity === "error").length;
            if (aErr !== bErr) return bErr - aErr;
            return b.issues.length - a.issues.length;
          });

        const topFailures = failing.slice(0, 25).map((r) => ({
          url: r.url,
          status: r.status,
          errors: r.issues.filter((i) => i.severity === "error").length,
          warnings: r.issues.filter((i) => i.severity === "warning").length,
          sampleMessages: r.fetchError
            ? [r.fetchError]
            : r.issues.slice(0, 4).map((i) => i.message),
        }));

        const byCheck = Object.entries(report.byCheck)
          .map(([check, count]) => ({ check, count }))
          .sort((a, b) => b.count - a.count);

        const shouldEmail = report.errorCount > 0 || report.warningCount > 0 || force === "summary";
        if (shouldEmail) {
          await sendTemplateEmail("attribution-crawl-report", "Nikk.delibasic@gmail.com", {
            templateData: {
              checkedAt: report.checkedAt,
              sitemapUrl: report.sitemapUrl,
              totalUrls: report.totalUrls,
              checkedUrls: report.checkedUrls,
              urlsWithIssues: report.urlsWithIssues,
              errorCount: report.errorCount,
              warningCount: report.warningCount,
              byCheck,
              topFailures,
            },
            idempotencyKey: `attribution-crawl-${report.checkedAt.slice(0, 10)}-${report.errorCount}-${report.warningCount}`,
          });
        }

        return Response.json({
          ok: true,
          checkedAt: report.checkedAt,
          totalUrls: report.totalUrls,
          checkedUrls: report.checkedUrls,
          urlsWithIssues: report.urlsWithIssues,
          errorCount: report.errorCount,
          warningCount: report.warningCount,
          byCheck,
          emailed: shouldEmail,
          topFailures,
        });
      },
    },
  },
});
