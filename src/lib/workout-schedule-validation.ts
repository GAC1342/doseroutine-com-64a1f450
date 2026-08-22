/**
 * One validation contract for every workout scheduling surface (edit sheet,
 * quick add, weekly calendar inline editor).
 *
 * Save must be blocked — not silently corrected — when a recurrence would be
 * impossible to schedule: no days picked, an unparseable/absent time, or an
 * end date that lands before the first occurrence.
 */

import { nextOccurrences, normalizeInterval } from "@/lib/routine-recurrence";

export type WorkoutScheduleDraft = {
  repeats: boolean;
  weekdays: number[];
  time: string;
  intervalWeeks: number;
  repeatUntil: string;
};

export type ScheduleField = "weekdays" | "time" | "repeatUntil" | "intervalWeeks";

export type ScheduleErrors = Partial<Record<ScheduleField, string>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test((value ?? "").trim());
}

export function isValidDateKey(value: string): boolean {
  return DATE_RE.test((value ?? "").trim());
}

/**
 * @param startDay The first day the workout can land on (YYYY-MM-DD).
 * @param options.requireTime Surfaces that persist a planned time (the edit
 *   sheet, weekly calendar) require one; quick-add falls back to a default.
 */
export function validateWorkoutSchedule(
  draft: WorkoutScheduleDraft,
  startDay: string,
  options: { requireTime?: boolean; requireEndDate?: boolean } = {},
): ScheduleErrors {
  const errors: ScheduleErrors = {};
  if (!draft.repeats) return errors;

  if (draft.weekdays.length === 0) {
    errors.weekdays = "Pick at least one day of the week for this workout to repeat on.";
  }

  const time = (draft.time ?? "").trim();
  if (time && !isValidTime(time)) {
    errors.time = "Enter a valid time between 00:00 and 23:59.";
  } else if (!time && options.requireTime) {
    errors.time = "Add a start time so the workout can be scheduled and remind you.";
  }

  if (normalizeInterval(draft.intervalWeeks) !== Number(draft.intervalWeeks)) {
    errors.intervalWeeks = "Choose how often this repeats (every 1–4 weeks).";
  }

  const end = (draft.repeatUntil ?? "").trim();
  if (end) {
    if (!isValidDateKey(end)) {
      errors.repeatUntil = "Enter the end date as a real calendar date.";
    } else if (isValidDateKey(startDay) && end < startDay) {
      errors.repeatUntil = `The end date has to be on or after ${startDay}.`;
    } else if (draft.weekdays.length > 0 && previewOccurrences(draft, startDay, 1).length === 0) {
      errors.repeatUntil =
        "No workouts fall before this end date. Pick a later date or different days.";
    }
  } else if (options.requireEndDate) {
    errors.repeatUntil = "Pick the date this routine should stop repeating.";
  }

  return errors;
}

export function firstScheduleError(errors: ScheduleErrors): string | null {
  const order: ScheduleField[] = ["weekdays", "time", "intervalWeeks", "repeatUntil"];
  for (const key of order) {
    const message = errors[key];
    if (message) return message;
  }
  return null;
}

export function hasScheduleErrors(errors: ScheduleErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/** The exact days this recurrence will schedule, for the live calendar preview. */
export function previewOccurrences(
  draft: WorkoutScheduleDraft,
  startDay: string,
  count = 6,
): string[] {
  if (!draft.repeats || draft.weekdays.length === 0 || !isValidDateKey(startDay)) return [];
  return nextOccurrences(
    draft.weekdays,
    {
      intervalWeeks: normalizeInterval(draft.intervalWeeks),
      anchorDate: startDay,
      repeatUntil: isValidDateKey(draft.repeatUntil) ? draft.repeatUntil : null,
    },
    startDay,
    count,
  ).map((o) => o.dayKey);
}

/** "Mon 25 Aug" — compact label for a preview chip. */
export function formatPreviewDay(dayKey: string): string {
  if (!isValidDateKey(dayKey)) return dayKey;
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Which rows a save should touch when editing an existing repeating workout. */
export type WorkoutEditScope = "occurrence" | "series";

export function describeEditScope(scope: WorkoutEditScope): string {
  return scope === "occurrence"
    ? "Only this date changes. The rest of the series stays as it is."
    : "Every future date in this repeating workout is updated.";
}
