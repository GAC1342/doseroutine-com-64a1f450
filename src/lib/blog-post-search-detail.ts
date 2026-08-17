// Pure helpers for the per-post Search Console drilldown.
// No network or db access so they can be unit-tested.

import type { GscMetricRow, PeriodRange, RawRow } from "@/lib/blog-search-performance";

export type QueryDetailRow = GscMetricRow & {
  query: string;
  /** Change vs the previous equal-length period (null when the query is new). */
  deltaClicks: number | null;
  deltaImpressions: number | null;
  deltaPosition: number | null;
  /** True when the query had no impressions in the previous period. */
  isNew: boolean;
};

export type DailyPoint = GscMetricRow & { date: string };

export type BlogPostSearchDetail = {
  slug: string;
  url: string;
  connected: boolean;
  error: string | null;
  period: PeriodRange;
  previous: PeriodRange;
  totals: GscMetricRow & { queries: number };
  queries: QueryDetailRow[];
  daily: DailyPoint[];
};

export type QuerySortKey = "impressions" | "clicks" | "ctr" | "position" | "query";

function metrics(row: RawRow): GscMetricRow {
  return {
    clicks: Math.round(row.clicks ?? 0),
    impressions: Math.round(row.impressions ?? 0),
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

/** Impression-weighted merge of two metric rows for the same key. */
export function mergeMetrics(a: GscMetricRow, b: GscMetricRow): GscMetricRow {
  const impressions = a.impressions + b.impressions;
  const clicks = a.clicks + b.clicks;
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position:
      impressions > 0
        ? (a.position * a.impressions + b.position * b.impressions) / impressions
        : a.position || b.position,
  };
}

/**
 * Fold rows keyed by a single dimension (query or date) into a map, merging
 * duplicates the way the page-level dashboard does — Search Console can report
 * the same page twice (trailing slash / query params).
 */
export function indexByKey(rows: RawRow[]): Map<string, GscMetricRow> {
  const out = new Map<string, GscMetricRow>();
  for (const row of rows) {
    const key = row.keys?.[0];
    if (!key) continue;
    const m = metrics(row);
    const prev = out.get(key);
    out.set(key, prev ? mergeMetrics(prev, m) : m);
  }
  return out;
}

/** Full query table for one post, newest-period rows joined with prior deltas. */
export function buildQueryRows(
  current: Map<string, GscMetricRow>,
  previous: Map<string, GscMetricRow>,
): QueryDetailRow[] {
  const rows: QueryDetailRow[] = [];
  for (const [query, cur] of current) {
    const prev = previous.get(query);
    rows.push({
      query,
      ...cur,
      deltaClicks: prev ? cur.clicks - prev.clicks : null,
      deltaImpressions: prev ? cur.impressions - prev.impressions : null,
      deltaPosition:
        prev && prev.position > 0 && cur.position > 0 ? cur.position - prev.position : null,
      isNew: !prev || prev.impressions === 0,
    });
  }
  return sortQueryRows(rows, "impressions", "desc");
}

export function sortQueryRows(
  rows: QueryDetailRow[],
  key: QuerySortKey,
  direction: "asc" | "desc",
): QueryDetailRow[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "query") return sign * a.query.localeCompare(b.query);
    const diff = a[key] - b[key];
    if (diff !== 0) return sign * diff;
    return b.impressions - a.impressions || a.query.localeCompare(b.query);
  });
}

export function filterQueryRows(rows: QueryDetailRow[], term: string): QueryDetailRow[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => r.query.toLowerCase().includes(needle));
}

/** Daily series, ascending by date, with gaps left out (GSC omits zero days). */
export function buildDailySeries(rows: RawRow[]): DailyPoint[] {
  const byDate = indexByKey(rows);
  return [...byDate.entries()]
    .map(([date, m]) => ({ date, ...m }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function totalsOfQueries(rows: QueryDetailRow[]): GscMetricRow & { queries: number } {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const weighted = rows.reduce((s, r) => s + r.position * r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? weighted / impressions : 0,
    queries: rows.length,
  };
}

/** CSV export of the query table (Excel/Sheets friendly). */
export function queryRowsToCsv(rows: QueryDetailRow[]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["query", "impressions", "clicks", "ctr", "position"].join(",");
  const body = rows.map((r) =>
    [
      escape(r.query),
      r.impressions,
      r.clicks,
      (r.ctr * 100).toFixed(2),
      r.position.toFixed(1),
    ].join(","),
  );
  return [header, ...body].join("\n");
}
