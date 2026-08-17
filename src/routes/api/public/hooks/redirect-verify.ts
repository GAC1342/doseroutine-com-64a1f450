import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { SITE_ORIGIN } from "@/lib/seo-monitor-urls";
import {
  REDIRECT_CASES,
  collectIssues,
  issuesForObservation,
  robotsAllows,
  shouldAlert,
  summarize,
  type RedirectCase,
  type RedirectObservation,
} from "@/lib/redirect-verify";

// Redirect verification job.
// Re-tests every URL that is supposed to redirect (www → apex, trailing
// slash, legacy ?lang= parameters, legacy library slugs) and confirms it
// answers 301 to the exact expected canonical URL, lands on a 200 in one
// hop, and is not blocked by robots.txt at either end.

const TIMEOUT_MS = 15_000;
const CONCURRENCY = 4;
const ALERT_EMAIL = "Nikk.delibasic@gmail.com";
const UA = "DoseRoutine-RedirectVerifier/1.0 (+https://doseroutine.com)";

async function timedFetch(url: string, redirect: RequestRedirect): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect,
      signal: controller.signal,
      headers: { "user-agent": UA, accept: "text/html" },
    });
  } finally {
    clearTimeout(t);
  }
}

async function loadRobots(): Promise<string | null> {
  try {
    const res = await timedFetch(`${SITE_ORIGIN}/robots.txt`, "follow");
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function verify(c: RedirectCase, robotsTxt: string | null): Promise<RedirectObservation> {
  const base: RedirectObservation = {
    from: c.from,
    expected: c.to,
    reason: c.reason,
    status: null,
    location: null,
    targetStatus: null,
    targetRedirects: false,
    fromRobotsAllowed: robotsTxt ? robotsAllows(robotsTxt, c.from) : null,
    toRobotsAllowed: robotsTxt ? robotsAllows(robotsTxt, c.to) : null,
    fetchError: null,
  };

  try {
    const res = await timedFetch(c.from, "manual");
    const rawLocation = res.headers.get("location");
    const location = rawLocation ? new URL(rawLocation, c.from).toString() : null;
    let targetStatus: number | null = null;
    let targetRedirects = false;

    if (location) {
      try {
        const target = await timedFetch(location, "manual");
        targetStatus = target.status;
        targetRedirects = target.status >= 300 && target.status < 400;
      } catch (err) {
        return {
          ...base,
          status: res.status,
          location,
          fetchError: `destination fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    return { ...base, status: res.status, location, targetStatus, targetRedirects };
  } catch (err) {
    return { ...base, fetchError: err instanceof Error ? err.message : String(err) };
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

export const Route = createFileRoute("/api/public/hooks/redirect-verify")({
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

        const robotsTxt = await loadRobots();
        const observations = await runPool(
          REDIRECT_CASES,
          (c) => verify(c, robotsTxt),
          CONCURRENCY,
        );
        const issues = collectIssues(observations);
        const summary = summarize(observations, issues);
        const checkedAt = new Date().toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: upsertError } = await supabaseAdmin.from("redirect_verifications").upsert(
          observations.map((o) => {
            const own = issuesForObservation(o);
            return {
              from_url: o.from,
              expected_url: o.expected,
              reason: o.reason,
              status: o.status,
              location: o.location,
              target_status: o.targetStatus,
              target_redirects: o.targetRedirects,
              from_robots_allowed: o.fromRobotsAllowed,
              to_robots_allowed: o.toRobotsAllowed,
              fetch_error: o.fetchError,
              is_failing: own.some((i) => i.severity === "error"),
              issues: JSON.parse(JSON.stringify(own)),
              checked_at: checkedAt,
              updated_at: checkedAt,
            };
          }),
          { onConflict: "from_url" },
        );
        if (upsertError) console.error("redirect-verify upsert failed", upsertError);

        let emailed = false;
        if (shouldAlert(issues) || force === "summary") {
          try {
            await sendTemplateEmail("redirect-verify-report", ALERT_EMAIL, {
              templateData: {
                checkedAt,
                siteOrigin: SITE_ORIGIN,
                robotsFetched: robotsTxt !== null,
                summary,
                issues: JSON.parse(JSON.stringify(issues)),
              },
            });
            emailed = true;
          } catch (err) {
            console.error("redirect-verify email failed", err);
          }
        }

        return Response.json({ ok: true, checkedAt, summary, issues, emailed });
      },
    },
  },
});
