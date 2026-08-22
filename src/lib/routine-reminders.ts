import { normalizeTime, occursOnDay } from "@/lib/routine-schedule";
import { isSkipped, occursOnWeek, timeForDay } from "@/lib/routine-recurrence";

/** Minimal shape the matcher needs from a recurring workout slot. */
export type RoutineWorkoutRow = {
  id: string;
  user_id: string;
  label: string | null;
  kind: string | null;
  planned_time: string | null;
  days_of_week: number[] | null;
  active: boolean | null;
  at_time_alert_on: boolean | null;
  pre_alert_on: boolean | null;
  pre_lead_min: number | null;
  /** Recurrence refinements: every-other-week, skips, per-day times. */
  interval_weeks?: number | null;
  anchor_date?: string | null;
  repeat_until?: string | null;
  skipped_dates?: string[] | null;
  time_overrides?: unknown;
};

/** Minimal shape the matcher needs from a recurring meal time. */
export type RoutineMealRow = {
  id: string;
  user_id: string;
  label: string | null;
  planned_time: string | null;
  days_of_week: number[] | null;
  active: boolean | null;
  alerts_on: boolean | null;
};

export type RoutineDue = {
  routineKind: "workout" | "meal";
  routineId: string;
  userId: string;
  label: string;
  /** "HH:mm" local scheduled time. */
  time: string;
  /** How many minutes before the slot this alert is meant to land (0 = at time). */
  leadMinutes: number;
  sessionKind: string | null;
};

/** Catch-up window: the cron runs every 5 minutes, so a slot stays "due" for
 *  5 minutes after its target minute. Anything older is skipped rather than
 *  fired late — the per-day dedupe log keeps it from firing again tomorrow. */
export const DUE_WINDOW_MIN = 5;

export function minutesOfDay(hhmm: string | null | undefined): number | null {
  const t = normalizeTime(hhmm ?? null);
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Is "now" (minutes since local midnight) inside the user's quiet window? */
export function isInQuietHours(
  nowMinutes: number,
  start: string | null,
  end: string | null,
): boolean {
  const s = minutesOfDay(start);
  const e = minutesOfDay(end);
  if (s == null || e == null || s === e) return false;
  if (s < e) return nowMinutes >= s && nowMinutes < e;
  return nowMinutes >= s || nowMinutes < e;
}

function isDue(targetMinutes: number, nowMinutes: number): boolean {
  return nowMinutes >= targetMinutes && nowMinutes < targetMinutes + DUE_WINDOW_MIN;
}

/**
 * Which recurring workout slots and meal times should alert right now.
 *
 * Pure so it can be unit tested without a database: callers pass the rows,
 * the user's local day key, and the local minute-of-day.
 */
export function routineRemindersDue(input: {
  workouts: RoutineWorkoutRow[];
  meals: RoutineMealRow[];
  dayKey: string;
  nowMinutes: number;
}): RoutineDue[] {
  const { workouts, meals, dayKey, nowMinutes } = input;
  const due: RoutineDue[] = [];

  for (const w of workouts) {
    if (w.active === false) continue;
    const baseTime = normalizeTime(w.planned_time);
    if (!baseTime) continue;
    if (!occursOnDay(w.days_of_week, dayKey)) continue;
    const recurrence = {
      intervalWeeks: w.interval_weeks ?? 1,
      anchorDate: w.anchor_date ?? null,
      repeatUntil: w.repeat_until ?? null,
      skippedDates: w.skipped_dates ?? null,
      timeOverrides: (w.time_overrides ?? null) as Record<string, unknown> | null,
    };
    // Off-weeks and one-off skips must never buzz.
    if (!occursOnWeek(dayKey, recurrence)) continue;
    if (isSkipped(dayKey, recurrence)) continue;
    const time = timeForDay(dayKey, baseTime, recurrence);
    const target = minutesOfDay(time);
    if (target == null) continue;

    // A pre-alert replaces the at-time alert so a single slot never
    // double-buzzes; at-time is the default when no lead is configured.
    const lead = w.pre_alert_on ? Math.max(0, w.pre_lead_min ?? 0) : 0;
    const wantsAlert = lead > 0 ? true : w.at_time_alert_on !== false;
    if (!wantsAlert) continue;

    const fireAt = target - lead;
    if (fireAt < 0 || !isDue(fireAt, nowMinutes)) continue;

    due.push({
      routineKind: "workout",
      routineId: w.id,
      userId: w.user_id,
      label: (w.label ?? "").trim() || "Workout",
      time,
      leadMinutes: lead,
      sessionKind: w.kind ?? null,
    });
  }

  for (const m of meals) {
    if (m.active === false) continue;
    if (m.alerts_on === false) continue;
    const time = normalizeTime(m.planned_time);
    const target = minutesOfDay(m.planned_time);
    if (!time || target == null) continue;
    if (!occursOnDay(m.days_of_week, dayKey)) continue;
    if (!isDue(target, nowMinutes)) continue;

    due.push({
      routineKind: "meal",
      routineId: m.id,
      userId: m.user_id,
      label: (m.label ?? "").trim() || "Meal",
      time,
      leadMinutes: 0,
      sessionKind: null,
    });
  }

  return due;
}

/** Local wall-clock day key + minute-of-day for an instant in a timezone. */
export function localParts(now: Date, timeZone: string): { dayKey: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value])) as Record<
    string,
    string
  >;
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  return {
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
  };
}

/** Notification copy for a due routine alert. */
export function routineAlertCopy(row: RoutineDue): {
  title: string;
  body: string;
  url: string;
  dayPath: string;
} {
  const [hStr, mStr] = row.time.split(":");
  const h = Number(hStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const timeText = `${hour12}:${mStr} ${suffix}`;
  const soon = row.leadMinutes > 0 ? ` in ${row.leadMinutes} min` : "";
  if (row.routineKind === "workout") {
    return {
      title: `Workout: ${row.label}`,
      body: row.sessionKind
        ? `${row.sessionKind} session at ${timeText}${soon}.`
        : `Scheduled for ${timeText}${soon}.`,
      url: "/fitness?view=workouts",
      dayPath: "/fitness",
    };
  }
  return {
    title: `Meal: ${row.label}`,
    body: `Scheduled for ${timeText}${soon}.`,
    url: "/today",
    dayPath: "/today",
  };
}
