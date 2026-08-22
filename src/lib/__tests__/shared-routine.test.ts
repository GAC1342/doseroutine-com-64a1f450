import { describe, expect, it } from "vitest";
import {
  formatExerciseDetail,
  formatPace,
  generatePublicId,
  isValidPublicId,
  PUBLIC_ID_LENGTH,
  routineShareLabel,
  routineShareUrl,
  routineSummary,
  scrubExercise,
  SHARED_ROUTINE_EXERCISE_FIELDS,
} from "@/lib/shared-routine";

describe("public ids", () => {
  it("are long enough and alphanumeric", () => {
    const id = generatePublicId();
    expect(id).toHaveLength(PUBLIC_ID_LENGTH);
    expect(PUBLIC_ID_LENGTH).toBeGreaterThanOrEqual(10);
    expect(isValidPublicId(id)).toBe(true);
  });

  it("are not sequential — 500 ids are all distinct", () => {
    const ids = new Set(Array.from({ length: 500 }, () => generatePublicId()));
    expect(ids.size).toBe(500);
  });

  it("rejects malformed ids", () => {
    expect(isValidPublicId("short")).toBe(false);
    expect(isValidPublicId("has-a-dash-x")).toBe(false);
    expect(isValidPublicId(42)).toBe(false);
  });

  it("builds the public link and label", () => {
    expect(routineShareUrl("abcdefghijkl", "https://doseroutine.com")).toBe(
      "https://doseroutine.com/r/abcdefghijkl",
    );
    expect(routineShareLabel("abcdefghijkl")).toBe("doseroutine.com/r/abcdefghijkl");
  });
});

describe("privacy whitelist", () => {
  it("drops every field that is not workout data", () => {
    const scrubbed = scrubExercise({
      exercise: "Back squat",
      set_index: 0,
      sets: 4,
      reps: 8,
      weight_kg: 100,
      rest_seconds: 120,
      tempo: "3-1-1",
      // Everything below must never survive.
      notes: "felt awful, upped my test dose",
      compound: "Testosterone cypionate",
      dose_mg: 200,
      bloodwork: { hematocrit: 52 },
      body_weight_kg: 88,
      photo_url: "https://example.com/private.jpg",
      user_id: "00000000-0000-0000-0000-000000000000",
    });

    expect(Object.keys(scrubbed).sort()).toEqual([...SHARED_ROUTINE_EXERCISE_FIELDS].sort());
    expect(JSON.stringify(scrubbed)).not.toMatch(/test|dose|bloodwork|photo|user_id/i);
  });

  it("normalises blank tempo to null", () => {
    expect(scrubExercise({ exercise: "Row", set_index: 1, tempo: "   " }).tempo).toBeNull();
  });
});

describe("formatting", () => {
  it("summarises a routine for the page and OG description", () => {
    expect(
      routineSummary({
        exercises: [
          {
            exercise: "A",
            set_index: 0,
            sets: null,
            reps: null,
            weight_kg: null,
            rest_seconds: null,
            tempo: null,
          },
          {
            exercise: "B",
            set_index: 1,
            sets: null,
            reps: null,
            weight_kg: null,
            rest_seconds: null,
            tempo: null,
          },
        ],
        duration_min: 45,
      }),
    ).toBe("2 exercises · 45 min · shared from DoseRoutine");
  });

  it("formats sets, reps, load and rest", () => {
    expect(
      formatExerciseDetail({
        exercise: "Bench press",
        set_index: 0,
        sets: 4,
        reps: 8,
        weight_kg: 82.5,
        rest_seconds: 90,
        tempo: null,
      }),
    ).toBe("4 × 8 · 82.5 kg · 90s rest");
  });

  it("formats pace", () => {
    expect(formatPace(510)).toBe("8:30");
    expect(formatPace(null)).toBeNull();
  });
});
