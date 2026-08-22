/**
 * Web Vitals regression alerting.
 *
 * `src/lib/web-vitals.ts` records every sample as an analytics event, which is
 * great for dashboards and useless for being *told* something broke. This
 * module decides which samples are bad enough to raise as Sentry events so an
 * alert rule can page on a spike.
 *
 * Alerting policy (deliberately narrow, to keep the signal alertable):
 *   • only genuine cold navigations — bfcache/prerender samples are fiction
 *   • only the surfaces that matter commercially: mobile, and article pages
 *   • only "poor" values, using Google's Core Web Vitals p75 thresholds
 */

/** Google's "poor" boundaries. Above these, the metric fails CWV outright. */
export const POOR_THRESHOLDS = {
  LCP: 4000, // ms
  INP: 500, // ms
  CLS: 0.25, // unitless
  FCP: 3000, // ms
  TTFB: 1800, // ms
} as const;

export type AlertableMetric = keyof typeof POOR_THRESHOLDS;

/** Metrics we actually alert on. FCP/TTFB stay dashboard-only. */
export const ALERTED_METRICS: AlertableMetric[] = ["LCP", "INP", "CLS"];

export type VitalSample = {
  name: string;
  value: number;
  loadKind: "navigate" | "bfcache" | "prerender" | "other";
  path: string;
  /** Viewport width in CSS px — the mobile/desktop split. */
  viewportWidth: number;
};

export const MOBILE_MAX_WIDTH = 768;

export function isArticleSurface(path: string): boolean {
  return (
    path === "/articles" ||
    path.startsWith("/articles/") ||
    path === "/blog" ||
    path.startsWith("/blog/")
  );
}

export function surfaceOf(sample: VitalSample): "mobile" | "article" | "other" {
  if (sample.viewportWidth > 0 && sample.viewportWidth <= MOBILE_MAX_WIDTH) return "mobile";
  if (isArticleSurface(sample.path)) return "article";
  return "other";
}

export type VitalAlert = {
  metric: AlertableMetric;
  value: number;
  threshold: number;
  surface: "mobile" | "article";
  path: string;
};

/**
 * Returns an alert when this sample represents a real regression, else null.
 * Pure — all the judgement lives here so it can be unit tested exhaustively.
 */
export function evaluateVital(sample: VitalSample): VitalAlert | null {
  if (sample.loadKind !== "navigate") return null;
  if (!Number.isFinite(sample.value) || sample.value < 0) return null;

  const metric = sample.name as AlertableMetric;
  if (!ALERTED_METRICS.includes(metric)) return null;

  const surface = surfaceOf(sample);
  if (surface === "other") return null;

  const threshold = POOR_THRESHOLDS[metric];
  if (sample.value <= threshold) return null;

  return { metric, value: sample.value, threshold, surface, path: sample.path };
}
