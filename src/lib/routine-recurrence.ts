/**
 * Recurrence refinements on top of the weekly repeat:
 *
 *   - interval_weeks: 1 = every week, 2 = every other week, …
 *   - skipped_dates:  one-off "skip this occurrence" cancellations
 *   - time_overrides: a different time on a specific weekday
 *
 * Everything here is pure so the calendar, Today view and tests can agree on
 * which days a recurring routine actually lands on.
 */

import { normalizeTime, weekdayOfDayKey } from "@/lib/routine-schedule";

export type RecurrenceFields = {
  intervalWeeks?: number | null;
  anchorDate?: string | null;
  /** Last day the routine runs, YYYY-MM-DD (inclusive). Null = forever. */
  repeatUntil?: string | null;
  skippedDates?: readonly string[] | null;
  timeOverrides?: Record<string, unknown> | null;
};

const DAY_MS = 86_400_000;

/** Days since the Unix epoch for a YYYY-MM-DD key (UTC noon, DST-proof). */
export function dayNumber(dayKey: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey.trim());
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Math.floor(ms / DAY_MS);
}

/** Monday-anchored week index, so a whole week shares one number. */
export function weekIndex(dayKey: string): number | null {
  const n = dayNumber(dayKey);
  if (n == null) return null;
  // 1970-01-01 was a Thursday; shift so Monday starts the week.
  return Math.floor((n + 3) / 7);
}

export function normalizeInterval(value: number | null | undefined): number {
  const n = Math.trunc(Number(value ?? 1));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 4);
}

/** Has the routine's end date passed for this calendar day? */
export function isAfterRepeatEnd(dayKey: string, fields: RecurrenceFields): boolean {
  const end = (fields.repeatUntil ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
  return dayKey > end;
}

/** Is this calendar day in an "on" week for the routine's interval?
 *  Also false once the routine's "repeat until" date has passed, so every
 *  surface (Today, Timeline, reminders, duplicate week) stops together. */
export function occursOnWeek(dayKey: string, fields: RecurrenceFields): boolean {
  if (isAfterRepeatEnd(dayKey, fields)) return false;
  const interval = normalizeInterval(fields.intervalWeeks);
  if (interval <= 1) return true;
  const week = weekIndex(dayKey);
  if (week == null) return false;
  const anchorWeek = fields.anchorDate ? weekIndex(fields.anchorDate) : null;
  const base = anchorWeek ?? 0;
  return (((week - base) % interval) + interval) % interval === 0;
}

/** Was this single occurrence cancelled? */
export function isSkipped(dayKey: string, fields: RecurrenceFields): boolean {
  const list = fields.skippedDates ?? [];
  return list.some((d) => (d ?? "").slice(0, 10) === dayKey);
}

/** Per-weekday time overrides, keyed "0".."6" → "HH:mm". */
export function parseTimeOverrides(value: unknown): Record<number, string> {
  const out: Record<number, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const day = Number(key);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    const time = normalizeTime(typeof raw === "string" ? raw : null);
    if (time) out[day] = time;
  }
  return out;
}

/**
 * Date-keyed overrides ("2026-08-19" → "HH:mm"). These are the "just this
 * week" edits: they win over the weekday override and expire on their own.
 */
export function parseDateOverrides(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    const time = normalizeTime(typeof raw === "string" ? raw : null);
    if (time) out[key] = time;
  }
  return out;
}

/** Drops date overrides that are already in the past. */
export function pruneDateOverrides(value: unknown, todayKey: string): Record<string, string> {
  const parsed = parseDateOverrides(value);
  const out: Record<string, string> = {};
  for (const [key, time] of Object.entries(parsed)) if (key >= todayKey) out[key] = time;
  return out;
}

/** The time this routine runs at on a given day, honouring overrides. */
export function timeForDay(dayKey: string, baseTime: string, fields: RecurrenceFields): string {
  const weekday = weekdayOfDayKey(dayKey);
  if (weekday == null) return baseTime;
  const dateOverride = parseDateOverrides(fields.timeOverrides)[dayKey];
  if (dateOverride) return dateOverride;
  const overrides = parseTimeOverrides(fields.timeOverrides);
  return overrides[weekday] ?? baseTime;
}

/** Adds/removes a date from the skip list, keeping it sorted and unique. */
export function toggleSkippedDate(
  dates: readonly string[] | null | undefined,
  dayKey: string,
): string[] {
  const set = new Set((dates ?? []).map((d) => (d ?? "").slice(0, 10)).filter(Boolean));
  if (set.has(dayKey)) set.delete(dayKey);
  else set.add(dayKey);
  return [...set].sort();
}

/** Drops skips that are already in the past so the array can't grow forever. */
export function pruneSkippedDates(
  dates: readonly string[] | null | undefined,
  todayKey: string,
): string[] {
  return (dates ?? [])
    .map((d) => (d ?? "").slice(0, 10))
    .filter((d) => d && d >= todayKey)
    .sort();
}

/** "Every week" / "Every week until Sep 30" — the label under a routine. */
export function describeRepeatEnd(repeatUntil: string | null | undefined): string | null {
  const end = (repeatUntil ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const [y, m, d] = end.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function describeInterval(intervalWeeks: number | null | undefined): string {
  const n = normalizeInterval(intervalWeeks);
  if (n === 1) return "Every week";
  if (n === 2) return "Every other week";
  return `Every ${n} weeks`;
}

/** YYYY-MM-DD for a day number (days since epoch, UTC noon). */
export function dayKeyFromNumber(n: number): string {
  return new Date(n * DAY_MS + DAY_MS / 2).toISOString().slice(0, 10);
}

/** The next few calendar days this routine lands on, skips included. */
export function nextOccurrences(
  weekdays: readonly number[],
  fields: RecurrenceFields,
  fromDayKey: string,
  count = 3,
): { dayKey: string; skipped: boolean }[] {
  const start = dayNumber(fromDayKey);
  if (start == null || weekdays.length === 0) return [];
  const out: { dayKey: string; skipped: boolean }[] = [];
  for (let i = 0; i < 70 && out.length < count; i += 1) {
    const key = dayKeyFromNumber(start + i);
    const weekday = weekdayOfDayKey(key);
    if (weekday == null || !weekdays.includes(weekday)) continue;
    if (!occursOnWeek(key, fields)) continue;
    out.push({ dayKey: key, skipped: isSkipped(key, fields) });
  }
  return out;
}

/**
 * Remaining dates in the current Mon–Sun week that this routine lands on,
 * counting from `fromDayKey`. Used by "just this week" edits.
 */
export function datesThisWeek(
  weekdays: readonly number[],
  fromDayKey: string,
  fields: RecurrenceFields = {},
): string[] {
  const start = dayNumber(fromDayKey);
  const week = weekIndex(fromDayKey);
  if (start == null || week == null) return [];
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const key = dayKeyFromNumber(start + i);
    if (weekIndex(key) !== week) break;
    const weekday = weekdayOfDayKey(key);
    if (weekday == null || !weekdays.includes(weekday)) continue;
    if (!occursOnWeek(key, fields)) continue;
    out.push(key);
  }
  return out;
}
