import { describe, expect, it } from "vitest";

import { exerciseArt } from "@/lib/exercise-art";
import { exerciseOptions } from "@/lib/exercise-options";

/**
 * Mind-body, combat and swim sessions should offer the same "pick the move and
 * see the drawing" experience as strength training, so every suggested move for
 * these disciplines needs an illustration.
 */
const ILLUSTRATED_TYPES = ["yoga", "pilates", "boxing", "swim", "stretching", "mobility"];

// Generic session labels shared by every family; they describe a block of a
// session, not a specific movement, so they intentionally have no drawing.
const GENERIC = new Set([
  "Warm-up",
  "Main set",
  "Main flow",
  "Cool down",
  "Drills",
  "Game / session",
  "Accessory circuit",
  "Core finisher",
  "Interval set",
  "Sparring",
  "Full body stretch",
  "Mat pilates",
]);

describe("exercise illustration coverage", () => {
  for (const type of ILLUSTRATED_TYPES) {
    it(`draws every suggested ${type} move`, () => {
      const missing = exerciseOptions(type)
        .filter((name) => !GENERIC.has(name))
        .filter((name) => !exerciseArt(name));
      expect(missing).toEqual([]);
    });
  }
});
