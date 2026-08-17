import { fromZonedTime } from "date-fns-tz";
import type { Database } from "@/integrations/supabase/types";

export type WorkoutSessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type MealTimeRow = Database["public"]["Tables"]["meal_times"]["Row"];

export type RoutineKind = "workout" | "meal";

/** A single planned, non-dose anchor on a given calendar day.
 *  Deliberately a separate type from schedule_events: routine rows are anchors,
 *  never doses, so they can never be pulled into adherence scoring. */
export type RoutineOccurrence = {
  id: string;
  /** Stable per-day identity, e.g. "workout:<id>:2026-07-31". */
  key: string;
  kind: RoutineKind;
  label: string;
  /** Local wall-clock time, "HH:mm". */
  time: string;
  /** The instant this anchor lands on, in the user's timezone. */
  scheduledAt: Date;
  /** Workout type ("strength" | "cardio" | "mobility" | …) for workout rows. */
  sessionKind: string | null;
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Weekday index (0 = Sunday) for a YYYY-MM-DD calendar date.
 *  Parsed as UTC noon so no timezone can shift the date onto its neighbour. */
export function weekdayOfDayKey(dayKey: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)).getUTCDay();
}

/** Does a recurring routine row land on this calendar day?
 *  A null/empty days_of_week means "every day". */
export function occursOnDay(daysOfWeek: number[] | null | undefined, dayKey: string): boolean {
  const weekday = weekdayOfDayKey(dayKey);
  if (weekday == null) return false;
  const days = daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : ALL_DAYS;
  return days.includes(weekday);
}

/** Normalise a Postgres TIME ("08:00:00", "8:05") to "HH:mm". */
export function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** 12-hour display label for an "HH:mm" time. */
export function formatRoutineTime(time: string): string {
  const [hStr, m] = time.split(":");
  const h = Number(hStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${suffix}`;
}

function toOccurrence(
  kind: RoutineKind,
  row: {
    id: string;
    label: string | null;
    planned_time: string | null;
    active: boolean | null;
    days_of_week: number[] | null;
  },
  dayKey: string,
  tz: string,
  sessionKind: string | null,
  fallbackLabel: string,
): RoutineOccurrence | null {
  if (row.active === false) return null;
  const time = normalizeTime(row.planned_time);
  if (!time) return null;
  if (!occursOnDay(row.days_of_week, dayKey)) return null;
  return {
    id: row.id,
    key: `${kind}:${row.id}:${dayKey}`,
    kind,
    label: (row.label ?? "").trim() || fallbackLabel,
    time,
    scheduledAt: fromZonedTime(`${dayKey}T${time}:00`, tz),
    sessionKind,
  };
}

/** All planned workout + meal anchors for one calendar day, sorted by time. */
export function routineForDay(
  workouts: WorkoutSessionRow[],
  meals: MealTimeRow[],
  dayKey: string,
  tz: string,
): RoutineOccurrence[] {
  const out: RoutineOccurrence[] = [];
  for (const w of workouts) {
    const occ = toOccurrence("workout", w, dayKey, tz, w.kind ?? null, "Workout");
    if (occ) out.push(occ);
  }
  for (const m of meals) {
    const occ = toOccurrence(
      "meal",
      {
        id: m.id,
        label: m.label,
        planned_time: m.planned_time,
        active: m.active,
        days_of_week: m.days_of_week,
      },
      dayKey,
      tz,
      null,
      "Meal",
    );
    if (occ) out.push(occ);
  }
  return out.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

export const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** "Every day" / "Weekdays" / "Mon, Wed, Fri" summary for a repeat pattern. */
export function describeDays(daysOfWeek: number[] | null | undefined): string {
  const days =
    daysOfWeek && daysOfWeek.length > 0 ? [...daysOfWeek].sort((a, b) => a - b) : ALL_DAYS;
  if (days.length === 7) return "Every day";
  if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return "Weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
  return days.map((d) => WEEKDAY_NAMES[d]?.slice(0, 3)).join(", ");
}
