import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type MonthKeyParts = { year: number; month: number };

export function parseMonthKey(monthKey: string): MonthKeyParts | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function monthKeyInZone(date: Date = new Date(), zone: string): string {
  return formatInTimeZone(date, zone, "yyyy-MM");
}

export function addMonthsToMonthKey(monthKey: string, delta: number): string {
  const parts = parseMonthKey(monthKey);
  if (!parts) return monthKeyInZone(new Date(), "UTC");
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1 + delta, 1, 12, 0, 0));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthRangeInZone(
  monthKey: string,
  zone: string,
): { start: Date; end: Date } | null {
  const parts = parseMonthKey(monthKey);
  if (!parts) return null;
  const start = fromZonedTime(`${monthKey}-01T00:00:00`, zone);
  const nextMonthKey = addMonthsToMonthKey(monthKey, 1);
  const end = fromZonedTime(`${nextMonthKey}-01T00:00:00`, zone);
  return { start, end };
}

export function todayKeyInZone(zone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, zone, "yyyy-MM-dd");
}

function dayKeyToUtcDay(dayKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function formatDayKeyLabel(dayKey: string, zone: string): string {
  const noon = fromZonedTime(`${dayKey}T12:00:00`, zone);
  return formatInTimeZone(noon, zone, "EEEE, MMM d");
}

export function relativeDayLabel(dayKey: string, zone: string, now: Date = new Date()): string {
  const today = todayKeyInZone(zone, now);
  const todayDay = dayKeyToUtcDay(today);
  const targetDay = dayKeyToUtcDay(dayKey);
  if (todayDay != null && targetDay != null) {
    const diff = todayDay - targetDay;
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
  }
  return formatDayKeyLabel(dayKey, zone);
}

export function formatMonthLabel(monthKey: string, zone: string): string {
  const parts = parseMonthKey(monthKey);
  if (!parts) return monthKey;
  const noon = fromZonedTime(`${monthKey}-01T12:00:00`, zone);
  return formatInTimeZone(noon, zone, "MMMM yyyy");
}

export function daysInMonthKey(monthKey: string): number {
  const parts = parseMonthKey(monthKey);
  if (!parts) return 0;
  return new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
}

export function firstWeekdayOfMonthKey(monthKey: string): number {
  const parts = parseMonthKey(monthKey);
  if (!parts) return 0;
  return new Date(Date.UTC(parts.year, parts.month - 1, 1, 12, 0, 0)).getUTCDay();
}

export function addDaysToDayKey(dayKey: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return dayKey;
  const d = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + delta, 12, 0, 0),
  );
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Sunday-start week containing the given day key. */
export function weekStartDayKey(dayKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return dayKey;
  const weekday = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0),
  ).getUTCDay();
  return addDaysToDayKey(dayKey, -weekday);
}

export function weekDayKeys(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToDayKey(weekStart, i));
}

/** UTC instant range covering `days` local days starting at `startDayKey`. */
export function dayRangeInZone(
  startDayKey: string,
  days: number,
  zone: string,
): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDayKey) || days < 1) return null;
  const start = fromZonedTime(`${startDayKey}T00:00:00`, zone);
  const end = fromZonedTime(`${addDaysToDayKey(startDayKey, days)}T00:00:00`, zone);
  return { start, end };
}

export function formatWeekLabel(weekStart: string, zone: string): string {
  const endKey = addDaysToDayKey(weekStart, 6);
  const s = fromZonedTime(`${weekStart}T12:00:00`, zone);
  const e = fromZonedTime(`${endKey}T12:00:00`, zone);
  const sameMonth = weekStart.slice(0, 7) === endKey.slice(0, 7);
  return sameMonth
    ? `${formatInTimeZone(s, zone, "MMM d")} – ${formatInTimeZone(e, zone, "d, yyyy")}`
    : `${formatInTimeZone(s, zone, "MMM d")} – ${formatInTimeZone(e, zone, "MMM d, yyyy")}`;
}
