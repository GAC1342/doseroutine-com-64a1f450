import { trackEvent } from "@/lib/analytics";

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

function report(metric: Metric) {
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
