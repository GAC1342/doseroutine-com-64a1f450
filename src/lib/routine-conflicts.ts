/**
 * Weekly-schedule time conflicts.
 *
 * Adding a session to a day that already has one at (or overlapping) the same
 * time used to silently stack two entries on top of each other. These pure
 * helpers detect the clash so the UI can ask: overwrite the existing entry, or
 * shift the new one later.
 */

import { normalizeTime, occursOnDay } from "@/lib/routine-schedule";

export const DEFAULT_SESSION_MIN = 60;

export type ScheduleRowLike = {
  id: string;
  label: string | null;
  planned_time: string | null;
  days_of_week: number[] | null;
  active?: boolean | null;
  duration_min?: number | null;
};

export type ScheduleConflict = {
  id: string;
  label: string;
  /** "HH:mm" of the existing entry. */
  time: string;
  durationMin: number;
  /** Weekdays (0 = Sunday) where the clash happens. */
  weekdays: number[];
};

/** Minutes since midnight for an "HH:mm" value; null when unparseable. */
export function minutesOfTime(value: string | null | undefined): number | null {
  const time = normalizeTime(value);
  if (!time) return null;
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** "HH:mm" for minutes since midnight, clamped to the same day. */
export function timeFromMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** Shift an "HH:mm" time by N minutes without rolling past midnight. */
export function shiftTime(time: string, minutes: number): string {
  const base = minutesOfTime(time);
  if (base == null) return time;
  return timeFromMinutes(base + minutes);
}

function overlaps(aStart: number, aMin: number, bStart: number, bMin: number): boolean {
  return aStart < bStart + bMin && bStart < aStart + aMin;
}

/** Which weekdays does a row cover? A null/empty list means every day. */
function rowWeekdays(row: ScheduleRowLike, weekdays: number[]): number[] {
  const days = row.days_of_week;
  if (!days || days.length === 0) return [...weekdays];
  return weekdays.filter((d) => days.includes(d));
}

/**
 * Existing rows that overlap the proposed slot on at least one of `weekdays`.
 * `ignoreId` lets the inline editor exclude the row being edited.
 */
export function findScheduleConflicts(input: {
  rows: ScheduleRowLike[];
  weekdays: number[];
  time: string;
  durationMin?: number;
  ignoreId?: string;
}): ScheduleConflict[] {
  const start = minutesOfTime(input.time);
  if (start == null || input.weekdays.length === 0) return [];
  const span = input.durationMin && input.durationMin > 0 ? input.durationMin : DEFAULT_SESSION_MIN;

  const out: ScheduleConflict[] = [];
  for (const row of input.rows) {
    if (row.active === false) continue;
    if (input.ignoreId && row.id === input.ignoreId) continue;
    const rowStart = minutesOfTime(row.planned_time);
    if (rowStart == null) continue;
    const rowSpan =
      row.duration_min && row.duration_min > 0 ? row.duration_min : DEFAULT_SESSION_MIN;
    if (!overlaps(start, span, rowStart, rowSpan)) continue;
    const days = rowWeekdays(row, input.weekdays);
    if (days.length === 0) continue;
    out.push({
      id: row.id,
      label: (row.label ?? "").trim() || "Workout",
      time: normalizeTime(row.planned_time) ?? "",
      durationMin: rowSpan,
      weekdays: days,
    });
  }
  return out;
}

/**
 * A free slot right after the latest conflicting entry, so "Shift later" always
 * lands somewhere clear.
 */
export function suggestShiftedTime(
  conflicts: ScheduleConflict[],
  fallbackTime: string,
  gapMin = 5,
): string {
  let latestEnd = minutesOfTime(fallbackTime) ?? 0;
  for (const c of conflicts) {
    const start = minutesOfTime(c.time);
    if (start == null) continue;
    latestEnd = Math.max(latestEnd, start + c.durationMin);
  }
  return timeFromMinutes(latestEnd + gapMin);
}

/** Plain-English summary of the clash for the prompt copy. */
export function describeConflicts(conflicts: ScheduleConflict[]): string {
  if (conflicts.length === 0) return "";
  const names = conflicts.map((c) => `${c.label}${c.time ? ` at ${c.time}` : ""}`);
  return names.join(", ");
}

/** Re-exported so callers building conflict UI need only this module. */
export { occursOnDay };
