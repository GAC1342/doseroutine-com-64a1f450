import { describe, expect, it } from "vitest";
import {
  newExercisesFor,
  normalizeExerciseNames,
  suggestRoutineName,
} from "@/lib/quick-add-workout";
import type { WorkoutTemplate } from "@/lib/workout-templates";

function template(exercises: string[]): WorkoutTemplate {
  return {
    id: "t1",
    name: "Push",
    workout_type: "strength",
    duration_min: null,
    rpe: null,
    calories: null,
    distance_m: null,
    target_pace_s: null,
    target_hr: null,
    notes: null,
    use_count: 0,
    last_used_at: null,
    exercises: exercises.map((exercise, i) => ({
      id: `e${i}`,
      template_id: "t1",
      exercise,
      set_index: i,
      sets: 3,
      reps: 10,
      weight_kg: null,
      rest_seconds: 90,
      tempo: null,
    })),
  };
}

describe("quick add workout", () => {
  it("trims, de-duplicates and drops blanks", () => {
    expect(normalizeExerciseNames([" Squat ", "squat", "", "Bench"])).toEqual(["Squat", "Bench"]);
  });

  it("skips exercises already on the routine", () => {
    expect(newExercisesFor(template(["Bench Press"]), ["bench press", "Dip"])).toEqual(["Dip"]);
  });

  it("suggests a name from the picks", () => {
    expect(suggestRoutineName(["Squat"])).toBe("Squat");
    expect(suggestRoutineName(["Squat", "Lunge"])).toBe("Squat +1");
    expect(suggestRoutineName([])).toBe("New routine");
  });

  it("keeps routine exercise groups linked to their recurring calendar row", async () => {
    const source = await import("@/lib/quick-add-workout?raw");
    expect(source.default).toContain("templateId?: string");
    expect(source.default).toContain("template_id: input.templateId ?? null");
  });
});
