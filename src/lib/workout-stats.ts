/**
 * Aggregation helpers for the fitness calendar and summary strip.
 *
 * `performed_on` is a plain calendar date (YYYY-MM-DD) so no timezone maths is
 * needed here — the caller supplies "today" already resolved in the user's
 * profile timezone.
 */

import {
  fromMetres,
  totalVolumeKg,
  workoutFamily,
  workoutTypeLabel,
  WORKOUT_FAMILY_LABELS,
  type UnitSystem,
  type WorkoutFamily,
  type WorkoutStatus,
} from "./workout-types";

export type WorkoutLogRow = {
  id: string;
  performed_on: string;
  status: WorkoutStatus | string;
  workout_type: string;
  title: string | null;
  duration_min: number | null;
  rpe: number | null;
  calories: number | null;
  distance_m: number | null;
  avg_pace_s: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  notes: string | null;
  /** Free-form session tags (e.g. "deload", "fasted"). */
  tags?: string[] | null;
  /** 1–5 self-ratings captured with the session. */
  sleep_quality?: number | null;
  stress_level?: number | null;
  /** Planned start time ("HH:MM[:SS]") — drives workout reminders. */
  scheduled_time?: string | null;
};

export type WorkoutSetRow = {
  id: string;
  workout_log_id: string;
  exercise: string;
  set_index: number;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
};

export type CalendarFilter =
  | "all"
  | "completed"
  | "planned"
  | "strength"
  | "cardio"
  | "mindbody"
  | "sport"
  | "other";

export function matchesFilter(log: WorkoutLogRow, filter: CalendarFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "completed":
      return log.status === "completed";
    case "planned":
      return log.status === "planned";
    case "strength":
    case "cardio":
    case "mindbody":
    case "sport":
    case "other":
      return workoutFamily(log.workout_type) === filter;
  }
}

export type DayBucket = {
  dayKey: string;
  logs: WorkoutLogRow[];
  hasCompleted: boolean;
  hasPlanned: boolean;
  families: WorkoutFamily[];
};

/** Groups logs into one bucket per calendar day, newest-first within a day. */
export function groupByDay(
  logs: readonly WorkoutLogRow[],
  filter: CalendarFilter = "all",
): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  for (const log of logs) {
    if (!matchesFilter(log, filter)) continue;
    const bucket = map.get(log.performed_on) ?? {
      dayKey: log.performed_on,
      logs: [],
      hasCompleted: false,
      hasPlanned: false,
      families: [],
    };
    bucket.logs.push(log);
    if (log.status === "completed") bucket.hasCompleted = true;
    if (log.status === "planned") bucket.hasPlanned = true;
    const family = workoutFamily(log.workout_type);
    if (!bucket.families.includes(family)) bucket.families.push(family);
    map.set(log.performed_on, bucket);
  }
  return map;
}

export type WorkoutSummary = {
  sessions: number;
  minutes: number;
  distance: number;
  distanceUnitValue: number;
  volumeKg: number;
  calories: number;
};

/**
 * Totals across completed sessions in the supplied window.
 * `distanceUnitValue` is already converted to the caller's unit system.
 */
export function summarize(
  logs: readonly WorkoutLogRow[],
  sets: readonly WorkoutSetRow[],
  units: UnitSystem,
): WorkoutSummary {
  const completed = logs.filter((l) => l.status === "completed");
  const ids = new Set(completed.map((l) => l.id));
  const relevantSets = sets.filter((s) => ids.has(s.workout_log_id));
  const distanceMetres = completed.reduce((sum, l) => sum + (l.distance_m ?? 0), 0);
  return {
    sessions: completed.length,
    minutes: completed.reduce((sum, l) => sum + (l.duration_min ?? 0), 0),
    distance: distanceMetres,
    distanceUnitValue: distanceMetres > 0 ? fromMetres(distanceMetres, units) : 0,
    volumeKg: totalVolumeKg(
      relevantSets.map((s) => ({
        exercise: s.exercise,
        sets: s.sets,
        reps: s.reps,
        weightKg: s.weight_kg,
      })),
    ),
    calories: completed.reduce((sum, l) => sum + (l.calories ?? 0), 0),
  };
}

function shiftDayKey(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

/**
 * Consecutive days with at least one completed session, counting back from
 * today. A rest day today does not break the streak (it only starts counting
 * from yesterday) — a rest day before that does.
 */
export function currentStreak(logs: readonly WorkoutLogRow[], todayKey: string): number {
  const trained = new Set(logs.filter((l) => l.status === "completed").map((l) => l.performed_on));
  if (trained.size === 0) return 0;

  let cursor = trained.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  let streak = 0;
  while (trained.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

/** Inclusive list of day keys covering the last `days` days ending today. */
export function recentDayKeys(todayKey: string, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(shiftDayKey(todayKey, -i));
  return out;
}

export function monthDateRange(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String((m ?? 1) + 1).padStart(2, "0")}`;
  return { start, end: `${nextMonth}-01` };
}

export { shiftDayKey };

/* -------------------- breakdowns -------------------- */

export type BreakdownRow = {
  /** Stable key: a family key, a workout type key, or an exercise name. */
  key: string;
  label: string;
  sessions: number;
  minutes: number;
  /** Metres — convert for display with `fromMetres`. */
  distanceM: number;
  volumeKg: number;
  calories: number;
};

function emptyRow(key: string, label: string): BreakdownRow {
  return { key, label, sessions: 0, minutes: 0, distanceM: 0, volumeKg: 0, calories: 0 };
}

function sortBreakdown(rows: BreakdownRow[]): BreakdownRow[] {
  return rows.sort(
    (a, b) => b.sessions - a.sessions || b.minutes - a.minutes || a.label.localeCompare(b.label),
  );
}

function volumeByLog(sets: readonly WorkoutSetRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sets) {
    const count = (s.sets ?? 0) * (s.reps ?? 0);
    const weight = s.weight_kg ?? 0;
    if (count <= 0 || weight <= 0) continue;
    map.set(s.workout_log_id, (map.get(s.workout_log_id) ?? 0) + count * weight);
  }
  return map;
}

/** Completed-session totals grouped by exercise family. */
export function breakdownByFamily(
  logs: readonly WorkoutLogRow[],
  sets: readonly WorkoutSetRow[],
): BreakdownRow[] {
  const volumes = volumeByLog(sets);
  const map = new Map<string, BreakdownRow>();
  for (const log of logs) {
    if (log.status !== "completed") continue;
    const family = workoutFamily(log.workout_type);
    const row = map.get(family) ?? emptyRow(family, WORKOUT_FAMILY_LABELS[family]);
    row.sessions += 1;
    row.minutes += log.duration_min ?? 0;
    row.distanceM += log.distance_m ?? 0;
    row.calories += log.calories ?? 0;
    row.volumeKg += volumes.get(log.id) ?? 0;
    map.set(family, row);
  }
  return sortBreakdown([...map.values()]);
}

/**
 * Completed-session totals grouped by activity (workout type) — running,
 * cycling, yoga, swimming and the rest, each on its own line.
 */
export function breakdownByActivity(
  logs: readonly WorkoutLogRow[],
  sets: readonly WorkoutSetRow[],
): BreakdownRow[] {
  const volumes = volumeByLog(sets);
  const map = new Map<string, BreakdownRow>();
  for (const log of logs) {
    if (log.status !== "completed") continue;
    const key = log.workout_type || "other";
    const row = map.get(key) ?? emptyRow(key, workoutTypeLabel(key));
    row.sessions += 1;
    row.minutes += log.duration_min ?? 0;
    row.distanceM += log.distance_m ?? 0;
    row.calories += log.calories ?? 0;
    row.volumeKg += volumes.get(log.id) ?? 0;
    map.set(key, row);
  }
  return sortBreakdown([...map.values()]);
}

export type ExerciseBreakdownRow = {
  key: string;
  exercise: string;
  sessions: number;
  totalSets: number;
  totalReps: number;
  volumeKg: number;
  bestWeightKg: number | null;
};

/** Per-exercise totals across completed sessions, busiest first. */
export function breakdownByExercise(
  logs: readonly WorkoutLogRow[],
  sets: readonly WorkoutSetRow[],
): ExerciseBreakdownRow[] {
  const completed = new Set(logs.filter((l) => l.status === "completed").map((l) => l.id));
  const map = new Map<string, ExerciseBreakdownRow & { logIds: Set<string> }>();
  for (const s of sets) {
    if (!completed.has(s.workout_log_id)) continue;
    const exercise = s.exercise.trim();
    if (!exercise) continue;
    const key = exercise.toLowerCase();
    const row =
      map.get(key) ??
      ({
        key,
        exercise,
        sessions: 0,
        totalSets: 0,
        totalReps: 0,
        volumeKg: 0,
        bestWeightKg: null,
        logIds: new Set<string>(),
      } as ExerciseBreakdownRow & { logIds: Set<string> });
    row.logIds.add(s.workout_log_id);
    row.sessions = row.logIds.size;
    const setCount = s.sets ?? 0;
    const reps = s.reps ?? 0;
    row.totalSets += setCount;
    row.totalReps += setCount * reps;
    if (s.weight_kg && setCount > 0 && reps > 0) row.volumeKg += setCount * reps * s.weight_kg;
    if (s.weight_kg && (row.bestWeightKg == null || s.weight_kg > row.bestWeightKg)) {
      row.bestWeightKg = s.weight_kg;
    }
    map.set(key, row);
  }
  return [...map.values()]
    .map(({ logIds: _logIds, ...row }) => row)
    .sort(
      (a, b) =>
        b.sessions - a.sessions || b.volumeKg - a.volumeKg || a.exercise.localeCompare(b.exercise),
    );
}
