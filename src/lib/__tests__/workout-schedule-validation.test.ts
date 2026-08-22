import { describe, expect, it } from "vitest";

import {
  describeEditScope,
  firstScheduleError,
  formatPreviewDay,
  hasScheduleErrors,
  isValidTime,
  previewOccurrences,
  validateWorkoutSchedule,
  type WorkoutScheduleDraft,
} from "@/lib/workout-schedule-validation";

// 2026-03-02 is a Monday.
const MONDAY = "2026-03-02";

function draft(overrides: Partial<WorkoutScheduleDraft> = {}): WorkoutScheduleDraft {
  return {
    repeats: true,
    weekdays: [1, 3, 5],
    time: "07:30",
    intervalWeeks: 1,
    repeatUntil: "",
    ...overrides,
  };
}

describe("validateWorkoutSchedule", () => {
  it("passes a well-formed weekly recurrence", () => {
    const errors = validateWorkoutSchedule(draft(), MONDAY, { requireTime: true });
    expect(errors).toEqual({});
    expect(hasScheduleErrors(errors)).toBe(false);
  });

  it("ignores everything when the workout does not repeat", () => {
    const errors = validateWorkoutSchedule(
      draft({ repeats: false, weekdays: [], time: "" }),
      MONDAY,
      { requireTime: true },
    );
    expect(errors).toEqual({});
  });

  it("blocks a recurrence with no days selected", () => {
    const errors = validateWorkoutSchedule(draft({ weekdays: [] }), MONDAY);
    expect(errors.weekdays).toMatch(/at least one day/i);
    expect(firstScheduleError(errors)).toBe(errors.weekdays);
  });

  it("blocks an out-of-range or malformed time", () => {
    expect(validateWorkoutSchedule(draft({ time: "25:00" }), MONDAY).time).toMatch(/valid time/i);
    expect(validateWorkoutSchedule(draft({ time: "7:3" }), MONDAY).time).toMatch(/valid time/i);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
  });

  it("requires a time only on surfaces that persist one", () => {
    expect(validateWorkoutSchedule(draft({ time: "" }), MONDAY).time).toBeUndefined();
    expect(
      validateWorkoutSchedule(draft({ time: "" }), MONDAY, { requireTime: true }).time,
    ).toMatch(/start time/i);
  });

  it("blocks an end date before the start day", () => {
    const errors = validateWorkoutSchedule(draft({ repeatUntil: "2026-02-01" }), MONDAY);
    expect(errors.repeatUntil).toMatch(/on or after 2026-03-02/);
  });

  it("blocks an end date that no occurrence can reach", () => {
    // Monday start, Saturday-only routine, end date the same Monday.
    const errors = validateWorkoutSchedule(draft({ weekdays: [6], repeatUntil: MONDAY }), MONDAY);
    expect(errors.repeatUntil).toMatch(/No workouts fall before this end date/i);
  });

  it("accepts an end date that at least one occurrence reaches", () => {
    const errors = validateWorkoutSchedule(
      draft({ weekdays: [6], repeatUntil: "2026-03-07" }),
      MONDAY,
    );
    expect(errors.repeatUntil).toBeUndefined();
  });

  it("can require an explicit end date when the surface demands one", () => {
    const errors = validateWorkoutSchedule(draft(), MONDAY, { requireEndDate: true });
    expect(errors.repeatUntil).toMatch(/stop repeating/i);
  });

  it("reports errors in a stable, user-facing order", () => {
    const errors = validateWorkoutSchedule(
      draft({ weekdays: [], time: "99:99", repeatUntil: "nope" }),
      MONDAY,
    );
    expect(firstScheduleError(errors)).toBe(errors.weekdays);
  });
});

describe("previewOccurrences", () => {
  it("lists the exact days the rule will schedule", () => {
    const days = previewOccurrences(draft(), MONDAY, 4);
    expect(days).toEqual(["2026-03-02", "2026-03-04", "2026-03-06", "2026-03-09"]);
  });

  it("honours the every-other-week interval", () => {
    const days = previewOccurrences(draft({ weekdays: [1], intervalWeeks: 2 }), MONDAY, 3);
    expect(days).toEqual(["2026-03-02", "2026-03-16", "2026-03-30"]);
  });

  it("stops at the end date", () => {
    const days = previewOccurrences(draft({ weekdays: [1], repeatUntil: "2026-03-10" }), MONDAY, 6);
    expect(days).toEqual(["2026-03-02", "2026-03-09"]);
  });

  it("returns nothing without days or when not repeating", () => {
    expect(previewOccurrences(draft({ weekdays: [] }), MONDAY)).toEqual([]);
    expect(previewOccurrences(draft({ repeats: false }), MONDAY)).toEqual([]);
  });
});

describe("presentation helpers", () => {
  it("formats a preview chip without timezone drift", () => {
    expect(formatPreviewDay("2026-03-02")).toMatch(/Mon/);
    expect(formatPreviewDay("2026-03-02")).toMatch(/2/);
  });

  it("explains each edit scope", () => {
    expect(describeEditScope("occurrence")).toMatch(/Only this date/i);
    expect(describeEditScope("series")).toMatch(/Every future date/i);
  });
});
