/**
 * Sitemap coverage anomalies: how many URLs we submit vs. how many Google says
 * it indexed. Pure so the CLI check and the daily hook share one definition of
 * "anomaly" and it can be unit-tested without hitting Search Console.
 */

export interface CoverageInput {
  /** URLs in the sitemap we actually serve right now. */
  servedUrlCount: number | null;
  /** `<image:image>` entries we serve. Search Console counts these as
   * submitted "URLs" too, so they belong in the expected total. */
  servedImageCount?: number | null;
  /** `contents[].submitted` summed, as Search Console reports it. */
  submittedUrls: number | null;
  /** `contents[].indexed` summed. Google stopped populating this — it now
   * reports 0 for every property — so null *and* 0 mean "not reported". */
  indexedUrls: number | null;
  errors: number | null;
  warnings: number | null;
  lastDownloaded: string | null;
  isPending: boolean | null;
  now?: Date;
}

export interface CoverageAnomaly {
  kind:
    | "not_submitted"
    | "submitted_mismatch"
    | "indexed_ratio_low"
    | "sitemap_errors"
    | "sitemap_warnings"
    | "stale_fetch"
    | "pending";
  severity: "error" | "warning";
  message: string;
}

/** Submitted count may lag the served sitemap by this fraction before alerting. */
export const SUBMITTED_MISMATCH_RATIO = 0.05;
/** Indexed/submitted below this ratio is worth a look. */
export const INDEXED_RATIO_FLOOR = 0.6;
/** Days without a Google fetch before the submission counts as stale. */
export const STALE_FETCH_DAYS = 7;

export function detectCoverageAnomalies(input: CoverageInput): CoverageAnomaly[] {
  const anomalies: CoverageAnomaly[] = [];
  const now = input.now ?? new Date();

  if (input.submittedUrls === null) {
    anomalies.push({
      kind: "not_submitted",
      severity: "error",
      message: "Search Console reports no submitted URL count for the sitemap",
    });
  } else if (input.servedUrlCount !== null && input.servedUrlCount > 0) {
    // Search Console counts image entries as submitted items alongside page
    // URLs, so the expected total is pages + images.
    const expected = input.servedUrlCount + (input.servedImageCount ?? 0);
    const delta = Math.abs(expected - input.submittedUrls);
    if (delta / expected > SUBMITTED_MISMATCH_RATIO) {
      anomalies.push({
        kind: "submitted_mismatch",
        severity: "warning",
        message: `Sitemap serves ${expected} entries (${input.servedUrlCount} URLs + ${input.servedImageCount ?? 0} images) but Search Console counts ${input.submittedUrls} submitted (${delta} apart)`,
      });
    }
  }

  // Google no longer populates the indexed count in this API; a reported 0 is
  // "unknown", not "nothing indexed". Only alert on a real positive-but-low count.
  if (
    input.submittedUrls !== null &&
    input.indexedUrls !== null &&
    input.indexedUrls > 0 &&
    input.submittedUrls > 0
  ) {
    const ratio = input.indexedUrls / input.submittedUrls;
    if (ratio < INDEXED_RATIO_FLOOR) {
      anomalies.push({
        kind: "indexed_ratio_low",
        severity: "warning",
        message: `Only ${input.indexedUrls} of ${input.submittedUrls} submitted URLs are indexed (${Math.round(ratio * 100)}%)`,
      });
    }
  }

  if ((input.errors ?? 0) > 0) {
    anomalies.push({
      kind: "sitemap_errors",
      severity: "error",
      message: `Search Console reports ${input.errors} sitemap error(s); the exact cause is not exposed by the API`,
    });
  }
  if ((input.warnings ?? 0) > 0) {
    anomalies.push({
      kind: "sitemap_warnings",
      severity: "warning",
      message: `Search Console reports ${input.warnings} sitemap warning(s)`,
    });
  }

  if (input.lastDownloaded) {
    const ageDays = (now.getTime() - new Date(input.lastDownloaded).getTime()) / 86_400_000;
    if (Number.isFinite(ageDays) && ageDays > STALE_FETCH_DAYS) {
      anomalies.push({
        kind: "stale_fetch",
        severity: "warning",
        message: `Google last fetched the sitemap ${Math.round(ageDays)} days ago`,
      });
    }
  }

  if (input.isPending === true) {
    anomalies.push({
      kind: "pending",
      severity: "warning",
      message: "Search Console still lists the sitemap as pending processing",
    });
  }

  return anomalies;
}

export function formatCoverageReport(input: CoverageInput, anomalies: CoverageAnomaly[]): string {
  const n = (v: number | null) => (v === null ? "not reported" : String(v));
  const lines = [
    `served URLs:    ${n(input.servedUrlCount)}`,
    `submitted URLs: ${n(input.submittedUrls)}`,
    `indexed URLs:   ${n(input.indexedUrls)}`,
    `errors:         ${n(input.errors)}`,
    `warnings:       ${n(input.warnings)}`,
    `last fetched:   ${input.lastDownloaded ?? "never"}`,
  ];
  if (anomalies.length === 0) lines.push("", "no anomalies");
  else lines.push("", "anomalies:", ...anomalies.map((a) => `  [${a.severity}] ${a.message}`));
  return lines.join("\n");
}
