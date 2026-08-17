/**
 * Pure aggregation helpers for the Insights dashboard.
 *
 * Everything here is deliberately free of network / Supabase access so the
 * bucketing and delta maths can be unit-tested, mirroring the approach used by
 * `src/lib/publish-impact.ts`.
 */

export type Aggregation = "sum" | "avg" | "last" | "max";

export interface RawPoint {
  /** YYYY-MM-DD (or any ISO string — only the date part is used). */
  date: string;
  value: number;
}

export interface SeriesPoint {
  /** YYYY-MM-DD bucket key. */
  date: string;
  /** Short human label for the axis. */
  label: string;
  /** Null when the bucket has no data (line charts skip the gap). */
  value: number | null;
}

export type Direction = "up" | "down" | "flat";

export interface Delta {
  current: number | null;
  previous: number | null;
  change: number | null;
  pct: number | null;
  direction: Direction;
}

export const INSIGHT_WINDOWS = [30, 90, 365] as const;
export type InsightWindow = (typeof INSIGHT_WINDOWS)[number];

export function windowLabel(days: number): string {
  if (days <= 31) return "Last 30 days";
  if (days <= 92) return "Last 90 days";
  return "Last 12 months";
}

export function dayKey(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of YYYY-MM-DD keys ending on `end`, `days` long. */
export function enumerateDays(days: number, end: string = dayKey(new Date())): string[] {
  const n = Math.max(1, Math.floor(days));
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

function shortLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`;
}

function reduceBucket(values: number[], how: Aggregation): number | null {
  if (values.length === 0) return null;
  switch (how) {
    case "sum":
      return values.reduce((s, v) => s + v, 0);
    case "avg":
      return values.reduce((s, v) => s + v, 0) / values.length;
    case "max":
      return Math.max(...values);
    case "last":
    default:
      return values[values.length - 1]!;
  }
}

/** Group raw points into one bucket per day across the window. */
export function bucketByDay(
  rows: readonly RawPoint[],
  days: number,
  how: Aggregation = "sum",
  end: string = dayKey(new Date()),
): SeriesPoint[] {
  const keys = enumerateDays(days, end);
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    const key = dayKey(row.date);
    if (key < first || key > last) continue;
    if (!Number.isFinite(row.value)) continue;
    const list = grouped.get(key);
    if (list) list.push(row.value);
    else grouped.set(key, [row.value]);
  }
  return keys.map((date) => ({
    date,
    label: shortLabel(date),
    value: reduceBucket(grouped.get(date) ?? [], how),
  }));
}

/** Group raw points into ISO-ish weekly buckets (7-day blocks ending on `end`). */
export function bucketByWeek(
  rows: readonly RawPoint[],
  days: number,
  how: Aggregation = "sum",
  end: string = dayKey(new Date()),
): SeriesPoint[] {
  const weeks = Math.max(1, Math.ceil(days / 7));
  const out: SeriesPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const bucketEnd = addDays(end, -i * 7);
    const bucketStart = addDays(bucketEnd, -6);
    const values: number[] = [];
    for (const row of rows) {
      const key = dayKey(row.date);
      if (key >= bucketStart && key <= bucketEnd && Number.isFinite(row.value)) {
        values.push(row.value);
      }
    }
    out.push({
      date: bucketStart,
      label: shortLabel(bucketStart),
      value: reduceBucket(values, how),
    });
  }
  return out;
}

/** Downsample so long windows stay readable (keeps first and last points). */
export function condense(points: readonly SeriesPoint[], maxPoints = 60): SeriesPoint[] {
  if (points.length <= maxPoints) return [...points];
  const step = Math.ceil(points.length / maxPoints);
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]!);
  const last = points[points.length - 1]!;
  if (out[out.length - 1]?.date !== last.date) out.push(last);
  return out;
}

function toDirection(change: number | null, epsilon: number): Direction {
  if (change === null || Math.abs(change) < epsilon) return "flat";
  return change > 0 ? "up" : "down";
}

/** Compare the second half of a series against the first half. */
export function deltaAcross(points: readonly SeriesPoint[], how: Aggregation = "avg"): Delta {
  const withValues = points.filter((p) => p.value !== null) as Array<
    SeriesPoint & { value: number }
  >;
  if (withValues.length < 2) {
    return { current: withValues[0]?.value ?? null, previous: null, change: null, pct: null, direction: "flat" };
  }
  const mid = Math.floor(withValues.length / 2);
  const previous = reduceBucket(
    withValues.slice(0, mid).map((p) => p.value),
    how,
  );
  const current = reduceBucket(
    withValues.slice(mid).map((p) => p.value),
    how,
  );
  return deltaBetween(current, previous);
}

export function deltaBetween(current: number | null, previous: number | null): Delta {
  if (current === null || previous === null) {
    return { current, previous, change: null, pct: null, direction: "flat" };
  }
  const change = current - previous;
  const pct = previous === 0 ? null : (change / Math.abs(previous)) * 100;
  const epsilon = Math.max(Math.abs(previous) * 0.005, 1e-9);
  return { current, previous, change, pct, direction: toDirection(change, epsilon) };
}

/** Total of all non-null values. */
export function total(points: readonly SeriesPoint[]): number {
  return points.reduce((s, p) => s + (p.value ?? 0), 0);
}

/** Most recent non-null value. */
export function latest(points: readonly SeriesPoint[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]!.value !== null) return points[i]!.value;
  }
  return null;
}

export function hasData(points: readonly SeriesPoint[]): boolean {
  return points.some((p) => p.value !== null);
}

export function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function formatCompact(value: number, decimals = 0): string {
  if (Math.abs(value) >= 10_000) {
    return `${round(value / 1000, 1).toLocaleString()}k`;
  }
  return round(value, decimals).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}
