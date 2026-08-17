import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { runSchemaValidation, SITEMAP_URL, type UrlReport } from "@/lib/schema-validation.server";

// Automated JSON-LD / structured-data validator.
// - Fetches /sitemap.xml
// - Extracts every <script type="application/ld+json"> block on each URL
// - Parses JSON, checks required @context/@type, and applies per-type rules
//   (Article, BreadcrumbList, ItemList, CollectionPage, MedicalWebPage,
//   FAQPage, MedicalSubstance, WebPage, Organization, WebSite)
// - Emails Nikk on errors/warnings; also usable on-demand from the admin
//   report page (which calls the shared server helper directly).
// Scheduled daily via pg_cron. Public route; guarded by SCHEMA_VALIDATION_SECRET header.

export const Route = createFileRoute("/api/public/hooks/schema-validation")({
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
        const provided = request.headers.get("x-admin-secret");
        if (provided !== secret) {
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
          report = await runSchemaValidation({ limit });
        } catch (err) {
          await sendTemplateEmail("schema-validation-report", "Nikk.delibasic@gmail.com", {
            templateData: {
              checkedAt: new Date().toISOString(),
              sitemapUrl: SITEMAP_URL,
              totalUrls: 0,
              checkedUrls: 0,
              urlsWithIssues: 1,
              errorCount: 1,
              warningCount: 0,
              totalBlocks: 0,
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

        const failing: UrlReport[] = report.reports
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
            : r.issues.slice(0, 3).map((i) => i.message),
        }));

        const shouldEmail = report.errorCount > 0 || report.warningCount > 0 || force === "summary";
        if (shouldEmail) {
          await sendTemplateEmail("schema-validation-report", "Nikk.delibasic@gmail.com", {
            templateData: {
              checkedAt: report.checkedAt,
              sitemapUrl: report.sitemapUrl,
              totalUrls: report.totalUrls,
              checkedUrls: report.checkedUrls,
              urlsWithIssues: report.urlsWithIssues,
              errorCount: report.errorCount,
              warningCount: report.warningCount,
              totalBlocks: report.totalBlocks,
              topFailures,
            },
            idempotencyKey: `schema-validation-${report.checkedAt.slice(0, 10)}-${report.errorCount}-${report.warningCount}`,
          });
        }

        return Response.json({
          ok: true,
          checkedAt: report.checkedAt,
          totalUrls: report.totalUrls,
          checkedUrls: report.checkedUrls,
          totalBlocks: report.totalBlocks,
          urlsWithIssues: report.urlsWithIssues,
          errorCount: report.errorCount,
          warningCount: report.warningCount,
          emailed: shouldEmail,
          topFailures,
        });
      },
    },
  },
});
