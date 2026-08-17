/**
 * Personal-record detection from logged strength work.
 *
 * A PR is the best estimated one-rep max we have ever seen for an exercise.
 * Only completed sessions count — a planned session is an intention, not a lift.
 */

import { estimateOneRepMaxKg, type WorkoutStatus } from "./workout-types";

export type PrSetRow = {
  exercise: string;
  reps: number | null;
  weight_kg: number | null;
  workout_log_id: string;
};

export type PrLogRow = {
  id: string;
  performed_on: string;
  status: WorkoutStatus | string;
};

export type PersonalRecord = {
  exercise: string;
  /** Normalised lower-case key used for matching. */
  key: string;
  oneRepMaxKg: number;
  weightKg: number;
  reps: number;
  performedOn: string;
};

export function normalizeExerciseKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Maps common naming variants onto the four lifts Body Metrics shows. */
const CORE_LIFT_ALIASES: Record<string, "bench" | "squat" | "deadlift" | "ohp"> = {
  bench: "bench",
  "bench press": "bench",
  "barbell bench press": "bench",
  "flat bench": "bench",
  squat: "squat",
  "back squat": "squat",
  "barbell squat": "squat",
  "front squat": "squat",
  deadlift: "deadlift",
  "conventional deadlift": "deadlift",
  "barbell deadlift": "deadlift",
  ohp: "ohp",
  "overhead press": "ohp",
  "shoulder press": "ohp",
  "military press": "ohp",
  "strict press": "ohp",
};

export function coreLiftFor(exercise: string): "bench" | "squat" | "deadlift" | "ohp" | null {
  return CORE_LIFT_ALIASES[normalizeExerciseKey(exercise)] ?? null;
}

/**
 * Best estimated 1RM per exercise across all completed sessions, newest wins
 * on ties so the displayed date is the most recent time the PR was hit.
 */
export function computePersonalRecords(
  logs: readonly PrLogRow[],
  sets: readonly PrSetRow[],
): PersonalRecord[] {
  const completedById = new Map<string, PrLogRow>();
  for (const log of logs) {
    if (log.status === "completed") completedById.set(log.id, log);
  }

  const best = new Map<string, PersonalRecord>();
  for (const set of sets) {
    const log = completedById.get(set.workout_log_id);
    if (!log) continue;
    const name = set.exercise?.trim();
    if (!name) continue;
    const oneRm = estimateOneRepMaxKg(set.weight_kg, set.reps);
    if (oneRm == null) continue;

    const key = normalizeExerciseKey(name);
    const current = best.get(key);
    const candidate: PersonalRecord = {
      exercise: name,
      key,
      oneRepMaxKg: oneRm,
      weightKg: set.weight_kg ?? 0,
      reps: set.reps ?? 0,
      performedOn: log.performed_on,
    };
    if (
      !current ||
      candidate.oneRepMaxKg > current.oneRepMaxKg + 1e-9 ||
      (Math.abs(candidate.oneRepMaxKg - current.oneRepMaxKg) < 1e-9 &&
        candidate.performedOn > current.performedOn)
    ) {
      best.set(key, candidate);
    }
  }

  return [...best.values()].sort((a, b) => b.oneRepMaxKg - a.oneRepMaxKg);
}

/** The four lifts Body Metrics surfaces, keyed by its column prefix. */
export function coreLiftRecords(
  records: readonly PersonalRecord[],
): Partial<Record<"bench" | "squat" | "deadlift" | "ohp", PersonalRecord>> {
  const out: Partial<Record<"bench" | "squat" | "deadlift" | "ohp", PersonalRecord>> = {};
  for (const record of records) {
    const lift = coreLiftFor(record.exercise);
    if (!lift) continue;
    const existing = out[lift];
    if (!existing || record.oneRepMaxKg > existing.oneRepMaxKg) out[lift] = record;
  }
  return out;
}
