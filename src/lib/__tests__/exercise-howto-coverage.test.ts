import { describe, expect, it } from "vitest";

import { MUSCLE_GROUPS } from "@/lib/muscle-groups";
import { exerciseHowTo } from "@/lib/exercise-howto";

const names = Array.from(new Set(MUSCLE_GROUPS.flatMap((g) => g.exercises.map((e) => e.name))));

describe("exercise how-to coverage", () => {
  it("documents every picker exercise", () => {
    const missing = names.filter((name) => !exerciseHowTo(name));
    expect(missing).toEqual([]);
  });

  it.each(names)("%s has steps, cues and mistakes", (name) => {
    const how = exerciseHowTo(name)!;
    expect(how.steps.length).toBeGreaterThanOrEqual(3);
    expect(how.mistakes.length).toBeGreaterThanOrEqual(2);
    for (const line of [...how.steps, ...how.mistakes]) {
      expect(line.trim().length).toBeGreaterThan(10);
    }
  });

  it("every exercise carries form cues", () => {
    for (const group of MUSCLE_GROUPS) {
      for (const exercise of group.exercises) {
        expect(exercise.cues.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
