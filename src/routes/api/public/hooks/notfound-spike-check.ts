import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

// Cron-triggered 404 spike detector.
// - Counts hits in the last WINDOW_MINUTES
// - Compares to average per-window over the prior 24h (excluding current window)
// - Alerts when hits > max(baseline * SPIKE_MULTIPLIER, MIN_ABSOLUTE)
// Guarded by x-admin-secret header matching SITEMAP_HEALTH_SECRET (reused).

const SITE = "https://doseroutine.com";
const WINDOW_MINUTES = 60;
const SPIKE_MULTIPLIER = 3;
const MIN_ABSOLUTE = 25;
const ALERT_TO = "Nikk.delibasic@gmail.com";

interface PathAgg {
  path: string;
  hits: number;
  sample_referrer: string | null;
}

export const Route = createFileRoute("/api/public/hooks/notfound-spike-check")({
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

        const url = new URL(request.url);
        const force = url.searchParams.get("force"); // 'alert' -> email even when healthy

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = Date.now();
        const windowStart = new Date(now - WINDOW_MINUTES * 60_000).toISOString();
        const baselineStart = new Date(now - 25 * 60 * 60_000).toISOString();

        // Current window
        const current = await supabaseAdmin
          .from("not_found_log")
          .select("path, referrer", { count: "exact" })
          .gte("occurred_at", windowStart)
          .order("occurred_at", { ascending: false })
          .limit(1000);

        if (current.error) {
          return Response.json({ error: current.error.message }, { status: 500 });
        }
        const hitsThisWindow = current.count ?? current.data?.length ?? 0;

        // 24h prior baseline (excluding current window)
        const baseline = await supabaseAdmin
          .from("not_found_log")
          .select("id", { count: "exact", head: true })
          .gte("occurred_at", baselineStart)
          .lt("occurred_at", windowStart);

        if (baseline.error) {
          return Response.json({ error: baseline.error.message }, { status: 500 });
        }
        const baselineTotal = baseline.count ?? 0;
        const baselinePerWindow = baselineTotal / 24; // 24 hourly buckets in the 24h prior

        const threshold = Math.max(baselinePerWindow * SPIKE_MULTIPLIER, MIN_ABSOLUTE);
        const isSpike = hitsThisWindow > threshold;

        // Aggregate top offending paths in the current window
        const byPath = new Map<string, PathAgg>();
        for (const row of current.data ?? []) {
          const agg = byPath.get(row.path) ?? { path: row.path, hits: 0, sample_referrer: null };
          agg.hits += 1;
          if (!agg.sample_referrer && row.referrer) agg.sample_referrer = row.referrer;
          byPath.set(row.path, agg);
        }
        const topPaths = Array.from(byPath.values())
          .sort((a, b) => b.hits - a.hits)
          .slice(0, 15);

        const shouldEmail = isSpike || force === "alert";
        if (shouldEmail) {
          const bucket = Math.floor(now / (WINDOW_MINUTES * 60_000));
          await sendTemplateEmail("notfound-spike-report", ALERT_TO, {
            templateData: {
              checkedAt: new Date().toISOString(),
              windowMinutes: WINDOW_MINUTES,
              hitsThisWindow,
              baselinePerWindow,
              threshold: Math.round(threshold),
              topPaths,
              site: SITE,
            },
            idempotencyKey: `notfound-spike-${bucket}`,
          });
        }

        return Response.json({
          ok: true,
          window_minutes: WINDOW_MINUTES,
          hits_this_window: hitsThisWindow,
          baseline_per_window: Number(baselinePerWindow.toFixed(2)),
          threshold: Math.round(threshold),
          is_spike: isSpike,
          emailed: shouldEmail,
          top_paths: topPaths.slice(0, 5),
        });
      },
    },
  },
});
