import { describe, expect, it } from "vitest";
import {
  breakdownByActivity,
  breakdownByExercise,
  breakdownByFamily,
  matchesFilter,
  type WorkoutLogRow,
  type WorkoutSetRow,
} from "@/lib/workout-stats";
import { unusedStarters, STARTER_TEMPLATES } from "@/lib/starter-templates";
import {
  customCategories,
  customExercisesForType,
  groupCustomExercises,
} from "@/lib/custom-exercises";

function log(id: string, type: string, extra: Partial<WorkoutLogRow> = {}): WorkoutLogRow {
  return {
    id,
    performed_on: "2026-01-05",
    workout_type: type,
    status: "completed",
    duration_min: 30,
    distance_m: null,
    calories: null,
    notes: null,
    tags: null,
    ...(extra as object),
  } as WorkoutLogRow;
}

function set(
  logId: string,
  exercise: string,
  sets: number,
  reps: number,
  kg: number,
): WorkoutSetRow {
  return {
    id: `${logId}-${exercise}`,
    workout_log_id: logId,
    exercise,
    set_index: 0,
    sets,
    reps,
    weight_kg: kg,
  } as WorkoutSetRow;
}

describe("family filter", () => {
  it("matches the other family", () => {
    expect(matchesFilter(log("a", "other"), "other")).toBe(true);
    expect(matchesFilter(log("a", "run"), "other")).toBe(false);
    expect(matchesFilter(log("a", "run"), "cardio")).toBe(true);
  });
});

describe("breakdowns", () => {
  const logs = [
    log("a", "run", { distance_m: 5000, duration_min: 30 }),
    log("b", "run", { distance_m: 8000, duration_min: 45 }),
    log("c", "yoga", { duration_min: 40 }),
    log("d", "strength", { duration_min: 60 }),
    log("e", "strength", { duration_min: 60, status: "planned" }),
  ];
  const sets = [set("d", "Back squat", 4, 5, 100), set("e", "Back squat", 4, 5, 100)];

  it("groups by family and ignores planned sessions", () => {
    const rows = breakdownByFamily(logs, sets);
    const cardio = rows.find((r) => r.key === "cardio");
    expect(cardio?.sessions).toBe(2);
    expect(cardio?.distanceM).toBe(13000);
    expect(rows.find((r) => r.key === "strength")?.sessions).toBe(1);
    expect(rows.find((r) => r.key === "mindbody")?.minutes).toBe(40);
  });

  it("groups by activity", () => {
    const rows = breakdownByActivity(logs, sets);
    expect(rows[0].key).toBe("run");
    expect(rows.find((r) => r.key === "yoga")?.sessions).toBe(1);
  });

  it("groups by exercise using completed sets only", () => {
    const rows = breakdownByExercise(logs, sets);
    expect(rows).toHaveLength(1);
    expect(rows[0].sessions).toBe(1);
    expect(rows[0].volumeKg).toBe(2000);
    expect(rows[0].bestWeightKg).toBe(100);
  });
});

describe("starter templates", () => {
  it("covers the new families", () => {
    const families = new Set(STARTER_TEMPLATES.map((t) => t.family));
    expect(families.has("cardio")).toBe(true);
    expect(families.has("mindbody")).toBe(true);
    expect(families.has("sport")).toBe(true);
  });

  it("hides starters already saved", () => {
    const all = unusedStarters([], "cardio");
    const after = unusedStarters([all[0].input.name.toUpperCase()], "cardio");
    expect(after).toHaveLength(all.length - 1);
  });
});

describe("custom exercises", () => {
  const rows = [
    {
      id: "1",
      name: "Sled push",
      category: "Conditioning",
      workout_type: "strength",
      family: "strength",
      use_count: 3,
    },
    {
      id: "2",
      name: "Pool sprints",
      category: null,
      workout_type: "swim",
      family: "cardio",
      use_count: 1,
    },
  ];

  it("lists distinct categories", () => {
    expect(customCategories(rows)).toEqual(["Conditioning"]);
  });

  it("ranks exact type matches first", () => {
    expect(customExercisesForType(rows, "swim")[0].name).toBe("Pool sprints");
    expect(customExercisesForType(rows, "strength")[0].name).toBe("Sled push");
  });

  it("falls back to the family label when no category is set", () => {
    const labels = groupCustomExercises(rows).map((g) => g.label);
    expect(labels).toContain("Conditioning");
    expect(labels).toContain("Cardio");
  });
});
