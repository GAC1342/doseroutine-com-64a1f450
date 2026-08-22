// Pure logic for the daily URL Inspection crawl-block watcher.
// Reads Google's stored index record for each affected URL and flags any
// URL where robots.txt blocks the crawl, the fetch fails, or indexing is
// disallowed. No network calls here so it stays unit-testable.

export const CRAWL_WATCH_URLS: string[] = [
  // Canonical money pages that must always stay crawlable.
  "/",
  "/library",
  "/interaction-checker",
  "/blog",
  // Parameter variants that were wrongly blocked by robots.txt in the
  // 2026-08 incident — these must keep returning "allowed" + 301.
  "/?lang=fr",
  "/?lang=es",
  "/?lang=de",
  "/library/choline-bitartrate?lang=fr",
  "/library/creatine-monohydrate?lang=es",
  "/library/semaglutide?lang=de",
];

export interface InspectionReading {
  url: string;
  /** Google's robotsTxtState: ALLOWED | DISALLOWED | ROBOTS_TXT_STATE_UNSPECIFIED */
  robotsTxtState: string | null;
  /** pageFetchState: SUCCESSFUL | SOFT_404 | BLOCKED_ROBOTS_TXT | NOT_FOUND | ... */
  pageFetchState: string | null;
  indexingState: string | null;
  verdict: string | null;
  coverageState: string | null;
  lastCrawlTime: string | null;
  apiError: string | null;
}

export type AlertSeverity = "error" | "warning";

export interface CrawlAlert {
  url: string;
  code: "robots_blocked" | "fetch_blocked" | "fetch_error" | "indexing_disallowed" | "api_error";
  severity: AlertSeverity;
  message: string;
}

const OK_FETCH_STATES = new Set(["SUCCESSFUL", "SOFT_404", "PAGE_FETCH_STATE_UNSPECIFIED"]);

/** Returns every problem found in a single URL's stored index record. */
export function alertsForReading(r: InspectionReading): CrawlAlert[] {
  const alerts: CrawlAlert[] = [];

  if (r.apiError) {
    alerts.push({
      url: r.url,
      code: "api_error",
      severity: "warning",
      message: `URL Inspection call failed: ${r.apiError}`,
    });
    return alerts;
  }

  if (r.robotsTxtState && r.robotsTxtState !== "ALLOWED") {
    alerts.push({
      url: r.url,
      code: "robots_blocked",
      severity: "error",
      message: `robots.txt state is ${r.robotsTxtState} (expected ALLOWED)`,
    });
  }

  if (r.pageFetchState) {
    if (/BLOCKED/i.test(r.pageFetchState)) {
      alerts.push({
        url: r.url,
        code: "fetch_blocked",
        severity: "error",
        message: `Google could not fetch the page: ${r.pageFetchState}`,
      });
    } else if (!OK_FETCH_STATES.has(r.pageFetchState)) {
      alerts.push({
        url: r.url,
        code: "fetch_error",
        severity: "warning",
        message: `Page fetch state is ${r.pageFetchState}`,
      });
    }
  }

  if (r.indexingState && /BLOCKED|DISALLOW/i.test(r.indexingState)) {
    alerts.push({
      url: r.url,
      code: "indexing_disallowed",
      severity: "error",
      message: `Indexing state is ${r.indexingState}`,
    });
  }

  return alerts;
}

export function collectAlerts(readings: InspectionReading[]): CrawlAlert[] {
  return readings.flatMap(alertsForReading);
}

export interface WatchSummary {
  checked: number;
  allowed: number;
  blocked: number;
  errors: number;
  unknown: number;
}

export function summarize(readings: InspectionReading[]): WatchSummary {
  let allowed = 0;
  let blocked = 0;
  let errors = 0;
  let unknown = 0;
  for (const r of readings) {
    if (r.apiError) errors++;
    else if (r.robotsTxtState === "ALLOWED") allowed++;
    else if (r.robotsTxtState) blocked++;
    else unknown++;
  }
  return { checked: readings.length, allowed, blocked, errors, unknown };
}

/** True when the run must page Nikk (any error-severity alert). */
export function shouldAlert(alerts: CrawlAlert[]): boolean {
  return alerts.some((a) => a.severity === "error");
}
