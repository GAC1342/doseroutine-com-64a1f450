import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { analyzeRobots, type RobotsIssue } from "@/lib/robots-health";
import { ROBOTS_BASELINE } from "@/lib/robots-baseline";

// Recurring robots.txt health check.
// - Fetches /robots.txt on the live site
// - Verifies it is reachable and served as text/plain
// - Verifies it references the canonical sitemap, and that the sitemap responds 200
// - Verifies no unintended noindex directives (body "Noindex:" lines or X-Robots-Tag header)
// - Verifies no live sitemap URL is blocked by a Disallow rule
// - Verifies Googlebot, Bingbot, DuckDuckBot, Applebot and Slurp can crawl public
//   pages while private app paths stay disallowed
// - Alerts when the live rules drift from the approved baseline (src/lib/robots-baseline.ts)
// Emails only on failures (or when ?force=summary is passed).
// Scheduled daily via pg_cron. Public route; guarded by SITEMAP_HEALTH_SECRET header.

const SITE = "https://doseroutine.com";
const ROBOTS_URL = `${SITE}/robots.txt`;
const SITEMAP_URL = `${SITE}/sitemap.xml`;
const UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) DoseRoutineHealthCheck/1.0";
const TIMEOUT_MS = 15_000;
const SAMPLE_SIZE = 60;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": UA },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

function samplePaths(xml: string, limit: number): string[] {
  const paths: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const loc = m[1].trim();
    if (!loc.startsWith(SITE)) continue;
    try {
      paths.push(new URL(loc).pathname);
    } catch {
      /* ignore malformed loc */
    }
  }
  if (paths.length <= limit) return paths;
  // Even spread across the sitemap so every section is represented.
  const step = paths.length / limit;
  return Array.from({ length: limit }, (_, i) => paths[Math.floor(i * step)]);
}

export const Route = createFileRoute("/api/public/hooks/robots-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SITEMAP_HEALTH_SECRET;
        if (!secret) {
          return Response.json({ error: "SITEMAP_HEALTH_SECRET not configured" }, { status: 500 });
        }
        if (request.headers.get("x-admin-secret") !== secret) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const force = new URL(request.url).searchParams.get("force");

        let issues: RobotsIssue[];
        try {
          const res = await fetchWithTimeout(ROBOTS_URL);
          const body = res.ok ? await res.text() : "";

          let sitemapReachable = false;
          let sampleSitemapPaths: string[] = [];
          try {
            const smRes = await fetchWithTimeout(SITEMAP_URL);
            sitemapReachable = smRes.ok;
            if (smRes.ok) sampleSitemapPaths = samplePaths(await smRes.text(), SAMPLE_SIZE);
          } catch {
            sitemapReachable = false;
          }

          issues = analyzeRobots({
            status: res.status,
            contentType: res.headers.get("content-type") || "",
            xRobotsTag: res.headers.get("x-robots-tag"),
            body,
            expectedSitemapUrl: SITEMAP_URL,
            sitemapReachable,
            sampleSitemapPaths,
            expectedFingerprint: ROBOTS_BASELINE,
          });
        } catch (err) {
          issues = [
            {
              code: "fetch_failed",
              message: `Could not fetch ${ROBOTS_URL}: ${err instanceof Error ? err.message : String(err)}`,
              severity: "error",
            },
          ];
        }

        const errors = issues.filter((i) => i.severity === "error");
        // Unexpected rule drift is alert-worthy even though it isn't an error.
        const drift = issues.filter((i) => i.code === "rules_changed");
        const shouldEmail = errors.length > 0 || drift.length > 0 || force === "summary";
        if (shouldEmail) {
          await sendTemplateEmail("robots-health-report", "Nikk.delibasic@gmail.com", {
            templateData: {
              checkedAt: new Date().toISOString(),
              robotsUrl: ROBOTS_URL,
              sitemapUrl: SITEMAP_URL,
              failed: errors.length,
              drifted: drift.length > 0,
              issues,
            },
            idempotencyKey: `robots-health-${new Date().toISOString().slice(0, 10)}-${errors.length}-${drift.length}`,
          });
        }

        return Response.json({
          ok: errors.length === 0 && drift.length === 0,
          robotsUrl: ROBOTS_URL,
          sitemapUrl: SITEMAP_URL,
          failed: errors.length,
          drifted: drift.length > 0,
          emailed: shouldEmail,
          issues,
        });
      },
    },
  },
});
