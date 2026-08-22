/**
 * Shapes and small formatters for the barcode scan analytics dashboard.
 *
 * The heavy lifting happens in two security-definer RPCs
 * (`barcode_scan_stats` and `barcode_miss_report`) so raw scan rows never
 * leave the database; these types just describe what comes back.
 */

export type ScanTotals = {
  scans: number;
  resolved: number;
  unresolved: number;
  p50_ms: number | null;
  p95_ms: number | null;
};

export type ScanSourceRow = {
  scan_source: string;
  scans: number;
  resolved: number;
  p50_ms: number | null;
};

export type CountRow = { scans: number } & Record<string, unknown>;

export type ApiRow = {
  api: string;
  calls: number;
  hits: number;
  errors: number;
  avg_ms: number | null;
};

export type DailyRow = { day: string; scans: number; resolved: number };

export type ScanStats = {
  since: string;
  totals: ScanTotals;
  by_scan_source: ScanSourceRow[];
  by_winning_source: { source: string; scans: number }[];
  by_category: { category: string; scans: number }[];
  by_api: ApiRow[];
  daily: DailyRow[];
};

export type ScanMissRow = {
  code: string;
  misses: number;
  last_seen: string;
  scan_sources: string[];
  cached_name: string | null;
  cached_category: string | null;
  cached_source: string | null;
  corrections: number;
  resolved_later: boolean;
};

/** Whole-percent rate, guarding the empty-denominator case. */
export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/** Human labels for how a code was captured. */
export const SCAN_SOURCE_LABELS: Record<string, string> = {
  camera: "Camera (web)",
  "camera-native": "Camera (app)",
  photo: "Photo upload",
  manual: "Typed in",
  unknown: "Unknown",
};

export function scanSourceLabel(key: string): string {
  return SCAN_SOURCE_LABELS[key] ?? key;
}

export function msLabel(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}
