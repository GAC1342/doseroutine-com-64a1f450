/**
 * Client-side performance logging beyond Core Web Vitals.
 *
 * Web Vitals (src/lib/web-vitals.ts) answers "how fast was the page load".
 * This adds the regression signals the test suite can't see:
 *
 *   page_perf        — navigation timing breakdown (DNS, TLS, TTFB, DOM, load)
 *                      plus transferred bytes and script/resource counts
 *   long_task        — aggregated main-thread blocking per page view
 *   route_perf       — client route transition duration (slow ones only)
 *   slow_resource    — individual resources over the slow threshold
 *
 * Everything is fire-and-forget through `trackEvent`, sampled, and safe on
 * browsers without the relevant PerformanceObserver entry types.
 */
import { trackEvent } from "@/lib/analytics";

let initialized = false;

/** Only report route transitions/resources slower than this. */
const SLOW_ROUTE_MS = 1_000;
const SLOW_RESOURCE_MS = 1_500;
/** Cap the number of slow-resource events per page view. */
const MAX_SLOW_RESOURCES = 5;
let slowResourcesSent = 0;

function isProdHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "doseroutine.com" || host === "www.doseroutine.com" || host.endsWith(".lovable.app")
  );
}

function shouldReport(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if ((document as { prerendering?: boolean }).prerendering) return false;
  return isProdHost();
}

function round(n: number): number {
  return Math.round(n);
}

/** Strip query strings so we never log tokens in resource URLs. */
export function safeResourceName(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return `${u.origin === window.location.origin ? "" : u.origin}${u.pathname}`;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

function reportNavigationTiming(): void {
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!nav) return;
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const transferred =
    resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) + (nav.transferSize || 0);
  const scripts = resources.filter((r) => r.initiatorType === "script");

  trackEvent("page_perf", {
    path: window.location.pathname,
    nav_type: nav.type,
    dns_ms: round(nav.domainLookupEnd - nav.domainLookupStart),
    tls_ms: round(
      nav.connectEnd - nav.secureConnectionStart > 0
        ? nav.connectEnd - nav.secureConnectionStart
        : 0,
    ),
    ttfb_ms: round(nav.responseStart - nav.requestStart),
    response_ms: round(nav.responseEnd - nav.responseStart),
    dom_interactive_ms: round(nav.domInteractive),
    dom_content_loaded_ms: round(nav.domContentLoadedEventEnd),
    load_ms: round(nav.loadEventEnd || nav.duration),
    resource_count: resources.length,
    script_count: scripts.length,
    script_bytes: round(scripts.reduce((s, r) => s + (r.transferSize || 0), 0)),
    transferred_bytes: round(transferred),
  });
}

function observeLongTasks(): () => void {
  let total = 0;
  let count = 0;
  let longest = 0;
  let observer: PerformanceObserver | undefined;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        total += entry.duration;
        longest = Math.max(longest, entry.duration);
        count += 1;
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    return () => {};
  }
  return () => {
    observer?.disconnect();
    if (count === 0) return;
    trackEvent("long_task", {
      path: window.location.pathname,
      task_count: count,
      total_blocking_ms: round(total),
      longest_task_ms: round(longest),
    });
  };
}

function observeSlowResources(): void {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (entry.duration < SLOW_RESOURCE_MS) continue;
        if (slowResourcesSent >= MAX_SLOW_RESOURCES) return;
        slowResourcesSent += 1;
        trackEvent("slow_resource", {
          path: window.location.pathname,
          resource: safeResourceName(entry.name),
          initiator: entry.initiatorType,
          duration_ms: round(entry.duration),
          bytes: round(entry.transferSize || 0),
        });
      }
    });
    observer.observe({ type: "resource", buffered: true });
  } catch {
    /* unsupported browser */
  }
}

/**
 * Log a client-side route transition. Only durations over the slow threshold
 * are sent, so normal navigation costs nothing.
 */
export function trackRouteTransition(from: string, to: string, durationMs: number): void {
  if (!shouldReport()) return;
  if (durationMs < SLOW_ROUTE_MS) return;
  trackEvent("route_perf", {
    from_path: from,
    to_path: to,
    duration_ms: round(durationMs),
  });
}

/** Install navigation/long-task/resource performance logging. Idempotent. */
export function initClientPerf(): void {
  if (initialized) return;
  if (!shouldReport()) return;
  initialized = true;

  const flushLongTasks = observeLongTasks();
  observeSlowResources();

  const onLoaded = () => {
    // Defer so loadEventEnd is populated.
    setTimeout(reportNavigationTiming, 0);
  };
  if (document.readyState === "complete") onLoaded();
  else window.addEventListener("load", onLoaded, { once: true });

  // Long-task totals are only meaningful once the view is done.
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") flushLongTasks();
    },
    { once: true },
  );
}
