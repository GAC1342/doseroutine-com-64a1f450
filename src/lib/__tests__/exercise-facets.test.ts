import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  activeFilterCount,
  describeExercise,
  exerciseDifficulty,
  exerciseEquipment,
  exerciseMuscleGroup,
  filterExercises,
  matchesQuery,
} from "@/lib/exercise-facets";
import { relativeUsedLabel } from "@/lib/recent-exercises";

describe("exercise facets", () => {
  it("infers equipment from the exercise name", () => {
    expect(exerciseEquipment("Barbell back squat")).toBe("barbell");
    expect(exerciseEquipment("Incline dumbbell press")).toBe("dumbbell");
    expect(exerciseEquipment("Lat pulldown")).toBe("machine");
    expect(exerciseEquipment("Push-up")).toBe("bodyweight");
    expect(exerciseEquipment("Kettlebell swing")).toBe("kettlebell");
    expect(exerciseEquipment("Banded face pull")).toBe("band");
    expect(exerciseEquipment("Treadmill intervals")).toBe("cardio");
  });

  it("grades difficulty", () => {
    expect(exerciseDifficulty("Leg press")).toBe("beginner");
    expect(exerciseDifficulty("Bench press")).toBe("intermediate");
    expect(exerciseDifficulty("Power snatch")).toBe("advanced");
  });

  it("maps built-in exercises to their muscle group", () => {
    expect(exerciseMuscleGroup("Bench press")).toBe("chest");
    expect(exerciseMuscleGroup("Totally made up move")).toBeNull();
  });

  it("matches multi-word queries in any order of tokens present", () => {
    expect(matchesQuery("Incline dumbbell press", "dumbbell press")).toBe(true);
    expect(matchesQuery("Incline dumbbell press", "cable")).toBe(false);
  });

  it("filters by facets and ranks previously used first", () => {
    const items = [
      describeExercise("Zercher squat"),
      describeExercise("Bench press", { lastUsedAt: Date.now() - 86_400_000, useCount: 4 }),
      describeExercise("Lat pulldown"),
    ];

    const all = filterExercises(items, EMPTY_FILTERS);
    expect(all[0].name).toBe("Bench press");

    const machine = filterExercises(items, { ...EMPTY_FILTERS, equipment: "machine" });
    expect(machine.map((i) => i.name)).toEqual(["Lat pulldown"]);

    const used = filterExercises(items, { ...EMPTY_FILTERS, usedOnly: true });
    expect(used.map((i) => i.name)).toEqual(["Bench press"]);

    const chest = filterExercises(items, { ...EMPTY_FILTERS, muscle: "chest" });
    expect(chest.map((i) => i.name)).toEqual(["Bench press"]);
  });

  it("counts active filters", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, muscle: "back", usedOnly: true })).toBe(2);
  });

  it("labels recency", () => {
    const now = Date.parse("2026-01-10T00:00:00Z");
    expect(relativeUsedLabel(now, now)).toBe("Today");
    expect(relativeUsedLabel(now - 86_400_000, now)).toBe("Yesterday");
    expect(relativeUsedLabel(now - 3 * 86_400_000, now)).toBe("3d ago");
    expect(relativeUsedLabel(now - 20 * 86_400_000, now)).toBe("2w ago");
  });
});
