/**
 * Vacation / pause mode.
 *
 * A pause is an inclusive range of LOCAL calendar dates (yyyy-MM-dd) stored on
 * the profile. While a date falls inside the range, no schedule events are
 * generated for it, so those days produce no doses at all — they can't be
 * "missed" and therefore never damage the adherence score.
 *
 * Dates are compared as plain ISO strings on purpose: yyyy-MM-dd sorts
 * lexicographically, so no Date objects (and no timezone drift) are involved.
 */

import { formatInTimeZone } from "date-fns-tz";

export type PauseWindow = {
  pause_start: string | null;
  pause_end: string | null;
  pause_reason?: string | null;
};

/** Normalizes a possibly-partial pause row into a usable range, or null. */
export function normalizePause(p: PauseWindow | null | undefined): {
  start: string;
  end: string;
  reason: string | null;
} | null {
  if (!p) return null;
  const start = p.pause_start ?? null;
  const end = p.pause_end ?? null;
  // A half-filled range is treated as no pause rather than an open-ended one —
  // an accidental open pause would silently stop every future dose.
  if (!start || !end) return null;
  if (end < start) return { start: end, end: start, reason: p.pause_reason ?? null };
  return { start, end, reason: p.pause_reason ?? null };
}

/** True when the given local ISO date (yyyy-MM-dd) is inside the pause. */
export function isPausedOnDate(isoDate: string, p: PauseWindow | null | undefined): boolean {
  const range = normalizePause(p);
  if (!range) return false;
  return isoDate >= range.start && isoDate <= range.end;
}

/** True when "now", in the user's timezone, falls inside the pause. */
export function isPausedNow(
  p: PauseWindow | null | undefined,
  tz: string,
  now: Date = new Date(),
): boolean {
  return isPausedOnDate(formatInTimeZone(now, tz, "yyyy-MM-dd"), p);
}

/** Whole days remaining in the pause, counting today. 0 when not paused. */
export function pauseDaysRemaining(
  p: PauseWindow | null | undefined,
  tz: string,
  now: Date = new Date(),
): number {
  const range = normalizePause(p);
  if (!range) return 0;
  const today = formatInTimeZone(now, tz, "yyyy-MM-dd");
  if (today > range.end) return 0;
  const from = today < range.start ? range.start : today;
  return Math.max(0, diffDays(from, range.end) + 1);
}

/** True when the pause is entirely in the past (safe to clear). */
export function isPauseExpired(
  p: PauseWindow | null | undefined,
  tz: string,
  now: Date = new Date(),
): boolean {
  const range = normalizePause(p);
  if (!range) return false;
  return formatInTimeZone(now, tz, "yyyy-MM-dd") > range.end;
}

/** Calendar days between two yyyy-MM-dd strings (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((utcMidnight(b) - utcMidnight(a)) / 86_400_000);
}

/** Adds n whole days to a yyyy-MM-dd string, returning yyyy-MM-dd. */
export function addDays(iso: string, n: number): string {
  const d = new Date(utcMidnight(iso) + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Today's local calendar date in the given timezone, as yyyy-MM-dd. */
export function localToday(tz: string, now: Date = new Date()): string {
  return formatInTimeZone(now, tz, "yyyy-MM-dd");
}

/**
 * The Monday–Sunday range of the week after the one containing `iso`.
 * Powers the "pause next week" shortcut so the user doesn't have to work out
 * dates by hand.
 */
export function nextWeekRange(iso: string): { start: string; end: string } {
  // 1..7, Monday..Sunday — same convention as days_of_week everywhere else.
  const dow = ((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const nextMonday = addDays(iso, 8 - dow);
  return { start: nextMonday, end: addDays(nextMonday, 6) };
}

function utcMidnight(iso: string): number {
  return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

/** Human label like "Paused until Fri, 8 Aug". */
export function formatPauseRange(p: PauseWindow | null | undefined, tz: string): string | null {
  const range = normalizePause(p);
  if (!range) return null;
  const fmt = (iso: string) => formatInTimeZone(`${iso}T12:00:00Z`, "UTC", "EEE, d MMM");
  return range.start === range.end ? fmt(range.start) : `${fmt(range.start)} – ${fmt(range.end)}`;
}
