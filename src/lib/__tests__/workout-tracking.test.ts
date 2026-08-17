import { describe, expect, it } from "vitest";
import {
  currentStreak,
  groupByDay,
  matchesFilter,
  monthDateRange,
  recentDayKeys,
  summarize,
  type WorkoutLogRow,
  type WorkoutSetRow,
} from "@/lib/workout-stats";
import { computePersonalRecords, coreLiftFor, coreLiftRecords } from "@/lib/workout-prs";
import { estimateOneRepMaxKg, totalVolumeKg, fromMetres, toKg } from "@/lib/workout-types";
import { repeatPlanDates } from "@/components/workout-log-sheet";

function log(
  partial: Partial<WorkoutLogRow> & { id: string; performed_on: string },
): WorkoutLogRow {
  return {
    status: "completed",
    workout_type: "strength",
    title: null,
    duration_min: null,
    rpe: null,
    calories: null,
    distance_m: null,
    avg_pace_s: null,
    avg_hr: null,
    max_hr: null,
    notes: null,
    ...partial,
  };
}

function set(
  partial: Partial<WorkoutSetRow> & { id: string; workout_log_id: string },
): WorkoutSetRow {
  return {
    exercise: "Bench Press",
    set_index: 0,
    sets: 3,
    reps: 5,
    weight_kg: 100,
    ...partial,
  };
}

describe("workout stats", () => {
  it("groups logs per day and records families", () => {
    const byDay = groupByDay([
      log({ id: "a", performed_on: "2026-02-01" }),
      log({ id: "b", performed_on: "2026-02-01", workout_type: "run", status: "planned" }),
      log({ id: "c", performed_on: "2026-02-03" }),
    ]);
    expect(byDay.size).toBe(2);
    const day = byDay.get("2026-02-01")!;
    expect(day.logs).toHaveLength(2);
    expect(day.hasCompleted).toBe(true);
    expect(day.hasPlanned).toBe(true);
    expect(day.families).toEqual(["strength", "cardio"]);
  });

  it("filters by status and family", () => {
    const strength = log({ id: "a", performed_on: "2026-02-01" });
    const plannedRun = log({
      id: "b",
      performed_on: "2026-02-01",
      workout_type: "run",
      status: "planned",
    });
    expect(matchesFilter(strength, "strength")).toBe(true);
    expect(matchesFilter(strength, "cardio")).toBe(false);
    expect(matchesFilter(plannedRun, "planned")).toBe(true);
    expect(matchesFilter(plannedRun, "completed")).toBe(false);
    expect(matchesFilter(plannedRun, "all")).toBe(true);
  });

  it("summarizes only completed sessions", () => {
    const logs = [
      log({
        id: "a",
        performed_on: "2026-02-01",
        duration_min: 45,
        distance_m: 5000,
        calories: 300,
      }),
      log({ id: "b", performed_on: "2026-02-02", duration_min: 60, status: "planned" }),
    ];
    const sets = [set({ id: "s1", workout_log_id: "a" }), set({ id: "s2", workout_log_id: "b" })];
    const result = summarize(logs, sets, "metric");
    expect(result.sessions).toBe(1);
    expect(result.minutes).toBe(45);
    expect(result.calories).toBe(300);
    expect(result.distanceUnitValue).toBeCloseTo(5, 5);
    // Only the completed session's sets count: 3 x 5 x 100kg.
    expect(result.volumeKg).toBe(1500);
  });

  it("counts a streak back from today and tolerates a rest day today", () => {
    const logs = [
      log({ id: "a", performed_on: "2026-02-08" }),
      log({ id: "b", performed_on: "2026-02-07" }),
      log({ id: "c", performed_on: "2026-02-05" }),
    ];
    expect(currentStreak(logs, "2026-02-08")).toBe(2);
    expect(currentStreak(logs, "2026-02-09")).toBe(2);
    expect(currentStreak(logs, "2026-02-10")).toBe(0);
    expect(currentStreak([], "2026-02-10")).toBe(0);
  });

  it("ignores planned sessions in the streak", () => {
    const logs = [log({ id: "a", performed_on: "2026-02-08", status: "planned" })];
    expect(currentStreak(logs, "2026-02-08")).toBe(0);
  });

  it("builds recent day keys and month ranges across boundaries", () => {
    expect(recentDayKeys("2026-03-02", 3)).toEqual(["2026-02-28", "2026-03-01", "2026-03-02"]);
    expect(monthDateRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("workout maths", () => {
  it("computes volume and Epley 1RM", () => {
    expect(totalVolumeKg([{ exercise: "Squat", sets: 5, reps: 5, weightKg: 100 }])).toBe(2500);
    expect(estimateOneRepMaxKg(100, 1)).toBe(100);
    expect(estimateOneRepMaxKg(100, 5)).toBeCloseTo(116.667, 2);
    expect(estimateOneRepMaxKg(100, 30)).toBeNull();
    expect(estimateOneRepMaxKg(null, 5)).toBeNull();
  });

  it("converts units round-trip", () => {
    expect(toKg(220.462, "imperial")).toBeCloseTo(100, 2);
    expect(fromMetres(1609.344, "imperial")).toBeCloseTo(1, 5);
  });
});

describe("personal records", () => {
  it("takes the best 1RM per exercise from completed sessions only", () => {
    const logs = [
      log({ id: "a", performed_on: "2026-01-01" }),
      log({ id: "b", performed_on: "2026-02-01" }),
      log({ id: "c", performed_on: "2026-03-01", status: "planned" }),
    ];
    const sets = [
      set({ id: "s1", workout_log_id: "a", weight_kg: 100, reps: 5 }),
      set({ id: "s2", workout_log_id: "b", weight_kg: 110, reps: 5 }),
      set({ id: "s3", workout_log_id: "c", weight_kg: 200, reps: 5 }),
    ];
    const prs = computePersonalRecords(logs, sets);
    expect(prs).toHaveLength(1);
    expect(prs[0].weightKg).toBe(110);
    expect(prs[0].performedOn).toBe("2026-02-01");
  });

  it("maps naming variants onto core lifts", () => {
    expect(coreLiftFor("Flat Bench")).toBe("bench");
    expect(coreLiftFor("  BARBELL squat ")).toBe("squat");
    expect(coreLiftFor("Overhead Press")).toBe("ohp");
    expect(coreLiftFor("Lateral Raise")).toBeNull();

    const logs = [log({ id: "a", performed_on: "2026-01-01" })];
    const sets = [
      set({ id: "s1", workout_log_id: "a", exercise: "Back Squat", weight_kg: 150, reps: 3 }),
      set({ id: "s2", workout_log_id: "a", exercise: "Cable Fly", weight_kg: 20, reps: 12 }),
    ];
    const core = coreLiftRecords(computePersonalRecords(logs, sets));
    expect(core.squat?.exercise).toBe("Back Squat");
    expect(core.bench).toBeUndefined();
  });
});

describe("weekly repeat planning", () => {
  it("creates future dates on the chosen weekdays only", () => {
    // 2026-02-02 is a Monday.
    const dates = repeatPlanDates("2026-02-02", [1, 4], 2);
    expect(dates).toEqual(["2026-02-05", "2026-02-09", "2026-02-12", "2026-02-16"]);
  });

  it("returns nothing when no weekdays are selected", () => {
    expect(repeatPlanDates("2026-02-02", [], 4)).toEqual([]);
  });
});
