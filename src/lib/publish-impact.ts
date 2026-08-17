// Pure helpers for the "publish impact" report: compares Search Console crawl
// and impression metrics recorded before vs. after a publish date.
// No network/db access so it can be unit-tested.

export interface PublishImpactSnapshot {
  snapshot_date: string;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  avg_position: number | null;
  indexed_urls: number | null;
  inspected_urls: number | null;
  crawl_error_urls: number | null;
  sitemap_url_count: number | null;
  sitemap_last_downloaded: string | null;
}

export interface MetricComparison {
  key: string;
  label: string;
  /** Average across the window before the publish date (null when no data). */
  before: number | null;
  /** Average across the window on/after the publish date. */
  after: number | null;
  /** after - before */
  change: number | null;
  /** Percent change vs. before (null when before is 0 or missing). */
  changePct: number | null;
  /** true when a lower number is better (e.g. average position, crawl errors). */
  lowerIsBetter: boolean;
  /** Rounding used when displaying the value. */
  decimals: number;
}

export interface PublishImpactReport {
  publishDate: string;
  windowDays: number;
  beforeRange: { start: string; end: string } | null;
  afterRange: { start: string; end: string } | null;
  beforeCount: number;
  afterCount: number;
  metrics: MetricComparison[];
  /** Days after publish where Google refetched the sitemap. */
  sitemapFetchedAfterPublish: boolean;
  /** Plain-English summary of what moved. */
  summary: string;
}

interface MetricDef {
  key: keyof PublishImpactSnapshot & string;
  label: string;
  lowerIsBetter?: boolean;
  decimals?: number;
}

const METRICS: MetricDef[] = [
  { key: "impressions", label: "Impressions (28d)" },
  { key: "clicks", label: "Clicks (28d)" },
  { key: "ctr", label: "CTR", decimals: 2 },
  { key: "avg_position", label: "Average position", lowerIsBetter: true, decimals: 1 },
  { key: "indexed_urls", label: "Indexed pages" },
  { key: "crawl_error_urls", label: "Crawl errors", lowerIsBetter: true },
  { key: "sitemap_url_count", label: "URLs in sitemap" },
];

/** Metric definitions available to the charts, in display order. */
export const PUBLISH_IMPACT_METRICS: ReadonlyArray<{
  key: string;
  label: string;
  lowerIsBetter: boolean;
  decimals: number;
}> = METRICS.map((m) => ({
  key: m.key,
  label: m.label,
  lowerIsBetter: m.lowerIsBetter ?? false,
  decimals: m.decimals ?? 0,
}));

export interface PublishImpactPoint {
  /** YYYY-MM-DD */
  date: string;
  /** Days relative to the publish date (negative = before, 0 = publish day). */
  offset: number;
  phase: "before" | "after";
  /** Metric value on that day, null when the snapshot has no value. */
  value: number | null;
  /** Same value, only populated for the "before" phase (for split line rendering). */
  before: number | null;
  /** Same value, only populated for the "after" phase. */
  after: number | null;
}


function toDay(value: string): string {
  return value.slice(0, 10);
}

function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, v) => sum + v, 0);
  return total / values.length;
}

function collect(rows: PublishImpactSnapshot[], key: string): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const value = (row as unknown as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) out.push(value);
  }
  return out;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function describe(metrics: MetricComparison[]): string {
  const impressions = metrics.find((m) => m.key === "impressions");
  const position = metrics.find((m) => m.key === "avg_position");
  const indexed = metrics.find((m) => m.key === "indexed_urls");

  if (!impressions || impressions.before === null || impressions.after === null) {
    return "Not enough snapshots on both sides of the publish date yet — check back in a few days.";
  }

  const parts: string[] = [];
  const pct = impressions.changePct;
  if (pct === null || Math.abs(pct) < 2) {
    parts.push("Impressions are flat so far");
  } else {
    parts.push(`Impressions are ${pct > 0 ? "up" : "down"} ${Math.abs(round(pct, 1))}%`);
  }
  if (indexed && indexed.change !== null && indexed.change !== 0) {
    parts.push(
      `${indexed.change > 0 ? "+" : ""}${round(indexed.change, 0)} indexed pages`,
    );
  }
  if (position && position.change !== null && Math.abs(position.change) >= 0.1) {
    parts.push(
      `average position ${position.change < 0 ? "improved" : "slipped"} by ${Math.abs(round(position.change, 1))}`,
    );
  }
  return `${parts.join(", ")}.`;
}

/**
 * Compare Search Console snapshots recorded in the `windowDays` before a publish
 * date against the same number of days on/after it.
 */
export function buildPublishImpactReport(
  rows: PublishImpactSnapshot[],
  publishDateInput: string,
  windowDays = 14,
): PublishImpactReport {
  const publishDate = toDay(publishDateInput);
  const days = Math.max(1, Math.floor(windowDays));

  const beforeStart = addDays(publishDate, -days);
  const beforeEnd = addDays(publishDate, -1);
  const afterStart = publishDate;
  const afterEnd = addDays(publishDate, days - 1);

  const before = rows.filter((r) => {
    const d = toDay(r.snapshot_date);
    return d >= beforeStart && d <= beforeEnd;
  });
  const after = rows.filter((r) => {
    const d = toDay(r.snapshot_date);
    return d >= afterStart && d <= afterEnd;
  });

  const metrics: MetricComparison[] = METRICS.map((def) => {
    const decimals = def.decimals ?? 0;
    const beforeAvgRaw = average(collect(before, def.key));
    const afterAvgRaw = average(collect(after, def.key));
    const beforeAvg = beforeAvgRaw === null ? null : round(beforeAvgRaw, decimals);
    const afterAvg = afterAvgRaw === null ? null : round(afterAvgRaw, decimals);
    const change =
      beforeAvgRaw === null || afterAvgRaw === null
        ? null
        : round(afterAvgRaw - beforeAvgRaw, decimals);
    const changePct =
      beforeAvgRaw === null || afterAvgRaw === null || beforeAvgRaw === 0
        ? null
        : ((afterAvgRaw - beforeAvgRaw) / beforeAvgRaw) * 100;
    return {
      key: def.key,
      label: def.label,
      before: beforeAvg,
      after: afterAvg,
      change,
      changePct: changePct === null ? null : round(changePct, 1),
      lowerIsBetter: def.lowerIsBetter ?? false,
      decimals,
    };
  });

  const sitemapFetchedAfterPublish = after.some(
    (r) => r.sitemap_last_downloaded !== null && toDay(r.sitemap_last_downloaded) >= publishDate,
  );

  return {
    publishDate,
    windowDays: days,
    beforeRange: before.length > 0 ? { start: beforeStart, end: beforeEnd } : null,
    afterRange: after.length > 0 ? { start: afterStart, end: afterEnd } : null,
    beforeCount: before.length,
    afterCount: after.length,
    metrics,
    sitemapFetchedAfterPublish,
    summary: describe(metrics),
  };
}

/** Whether a change is good news for this metric. */
export function isImprovement(metric: MetricComparison): boolean | null {
  if (metric.change === null || metric.change === 0) return null;
  return metric.lowerIsBetter ? metric.change < 0 : metric.change > 0;
}

/**
 * Chronological daily series for one metric across the before/after windows,
 * shaped for charting (one row per snapshot day, split into before/after keys
 * so a chart can render two segments with a publish marker between them).
 */
export function buildPublishImpactSeries(
  rows: PublishImpactSnapshot[],
  metricKey: string,
  publishDateInput: string,
  windowDays = 14,
): PublishImpactPoint[] {
  const publishDate = toDay(publishDateInput);
  const days = Math.max(1, Math.floor(windowDays));
  const start = addDays(publishDate, -days);
  const end = addDays(publishDate, days - 1);

  const seen = new Set<string>();
  const points: PublishImpactPoint[] = [];

  for (const row of rows) {
    const date = toDay(row.snapshot_date);
    if (date < start || date > end || seen.has(date)) continue;
    seen.add(date);
    const raw = (row as unknown as Record<string, unknown>)[metricKey];
    const value = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    const phase: "before" | "after" = date < publishDate ? "before" : "after";
    points.push({
      date,
      offset: Math.round(
        (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${publishDate}T00:00:00Z`)) / 86_400_000,
      ),
      phase,
      value,
      before: phase === "before" ? value : null,
      after: phase === "after" ? value : null,
    });
  }

  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Bridge the gap so the two line segments visually connect at the publish day.
  const firstAfter = points.findIndex((p) => p.phase === "after");
  if (firstAfter > 0) {
    const prev = points[firstAfter - 1]!;
    prev.after = prev.value;
  }

  return points;
}

/** Two-bar comparison data (before vs. after averages) for one metric. */
export function toComparisonBars(
  metric: MetricComparison,
): Array<{ phase: string; value: number }> {
  const bars: Array<{ phase: string; value: number }> = [];
  if (metric.before !== null) bars.push({ phase: "Before", value: metric.before });
  if (metric.after !== null) bars.push({ phase: "After", value: metric.after });
  return bars;
}
