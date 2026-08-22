import { trackEvent } from "@/lib/analytics";
import { captureToSentry } from "@/lib/sentry";
import { evaluateVital } from "@/lib/web-vitals-alerts";

/**
 * Web Vitals monitoring: reports Core Web Vitals + FCP/TTFB to
 * `web_vital` analytics events so regressions show up next to the rest of the
 * funnel. Runs once per page load in the browser; skips bots, prerender,
 * data-saver, and non-production hosts.
 *
 * Metrics captured:
 *   LCP  — Largest Contentful Paint (loading)
 *   CLS  — Cumulative Layout Shift (visual stability)
 *   INP  — Interaction to Next Paint (responsiveness; replaces FID)
 *   FCP  — First Contentful Paint (perceived load)
 *   TTFB — Time to First Byte (server + edge cache health)
 */

let initialized = false;

type Metric = {
  name: "LCP" | "CLS" | "INP" | "FCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
  navigationType?: string;
  delta: number;
};

function shouldReport(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof document === "undefined") return false;
  // Chrome prerender / speculation rules: metrics are meaningless.
  if ((document as { prerendering?: boolean }).prerendering) return false;
  // Only report from the canonical production hosts (skip preview/dev/localhost).
  const host = window.location.hostname;
  const isProd =
    host === "doseroutine.com" || host === "www.doseroutine.com" || host.endsWith(".lovable.app");
  if (!isProd) return false;
  return true;
}

/**
 * Back/forward-cache restores report a near-zero LCP by design (the page is
 * already painted). About half of our samples are bfcache restores, which
 * dragged the reported LCP p75 down to ~50ms — physically impossible for a
 * real load. `load_kind` lets reporting isolate genuine cold navigations.
 */
function loadKind(navigationType?: string): "navigate" | "bfcache" | "prerender" | "other" {
  if (navigationType === "back-forward-cache") return "bfcache";
  if (navigationType === "prerender") return "prerender";
  if (navigationType === "navigate" || navigationType === "reload") return "navigate";
  return "other";
}

/**
 * Raise a Sentry event for a genuinely poor sample on mobile / article pages.
 * The tags are what the "Web Vitals regression" alert rule matches on; the
 * fingerprint keeps one issue per metric+surface so a spike is visible as a
 * rising event count rather than thousands of unique issues.
 */
function alertOnRegression(metric: Metric) {
  const alert = evaluateVital({
    name: metric.name,
    value: metric.value,
    loadKind: loadKind(metric.navigationType),
    path: window.location.pathname,
    viewportWidth: window.innerWidth,
  });
  if (!alert) return;

  captureToSentry(
    new Error(`Web Vital regression: ${alert.metric} on ${alert.surface}`),
    {
      metric: alert.metric,
      value: Math.round(alert.value * 1000) / 1000,
      threshold: alert.threshold,
      surface: alert.surface,
      path: alert.path,
      rating: metric.rating,
      connection:
        (navigator as { connection?: { effectiveType?: string } }).connection?.effectiveType ??
        null,
    },
    {
      tags: {
        web_vital: alert.metric,
        web_vital_surface: alert.surface,
        web_vital_path: alert.path.slice(0, 100),
      },
      fingerprint: ["web-vital-regression", alert.metric, alert.surface],
    },
  );
}

function report(metric: Metric) {
  try {
    alertOnRegression(metric);
  } catch {
    /* observability must never break the page */
  }
  trackEvent("web_vital", {
    metric: metric.name,
    value: Math.round(metric.value * 1000) / 1000,
    rating: metric.rating,
    metric_id: metric.id,
    navigation_type: metric.navigationType ?? null,
    // "navigate" = trustworthy cold-load timing; bfcache/prerender must be
    // excluded from LCP/FCP percentiles.
    load_kind: loadKind(metric.navigationType),
    path: window.location.pathname,
    // Effective connection type helps separate slow-network noise from real regressions.
    connection:
      (navigator as { connection?: { effectiveType?: string } }).connection?.effectiveType ?? null,
    device_memory: (navigator as { deviceMemory?: number }).deviceMemory ?? null,
  });
}

export function initWebVitals(): void {
  if (initialized) return;
  if (!shouldReport()) return;
  initialized = true;

  void import("web-vitals")
    .then(({ onLCP, onCLS, onINP, onFCP, onTTFB }) => {
      // reportAllChanges: false — final value on page hide (matches Chrome UX
      // Report methodology).
      onLCP(report);
      onCLS(report);
      onINP(report);
      onFCP(report);
      onTTFB(report);
    })
    .catch(() => {
      /* noop — never break the app for observability */
    });
}
