import { describe, expect, it } from "vitest";

import { EXERCISE_ART } from "@/lib/exercise-art";
import { MUSCLE_GROUPS } from "@/lib/muscle-groups";

/**
 * Every exercise offered in the muscle-group picker must ship an
 * illustration — a new exercise added without art shows up as a blank tile
 * next to illustrated ones, which is what shipped before this gate existed.
 */
describe("exercise illustration coverage", () => {
  const names = [...new Set(MUSCLE_GROUPS.flatMap((g) => g.exercises.map((e) => e.name)))];

  it("has art for every catalog exercise", () => {
    const missing = names.filter((name) => !EXERCISE_ART[name]);
    expect(missing).toEqual([]);
  });

  it("points every entry at a real image url", () => {
    for (const name of names) {
      expect(EXERCISE_ART[name], name).toMatch(/^(\/|https?:)/);
    }
  });
});
