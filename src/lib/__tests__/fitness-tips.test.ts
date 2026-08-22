import { describe, expect, it } from "vitest";
import { fitnessTips, shouldShowFirstRunGuide, type FitnessSignals } from "@/lib/fitness-tips";
import { EMPTY_SIGNALS } from "@/lib/fitness-signals";

const complete: FitnessSignals = {
  hasLoggedWorkout: true,
  loggedThisWeek: 3,
  hasWeeklyPlan: true,
  plannedDays: 3,
  hasSavedExercises: true,
  hasRoutines: true,
  hasBodyMetrics: true,
  hasRecentBodyEntry: true,
};

describe("fitnessTips", () => {
  it("says nothing when the profile is fully set up", () => {
    for (const tab of ["workout", "routine", "exercises", "body"] as const) {
      expect(fitnessTips(tab, complete)).toEqual([]);
    }
  });

  it("asks a brand-new user to log first", () => {
    const tips = fitnessTips("workout", EMPTY_SIGNALS);
    expect(tips[0]?.id).toBe("log-first");
  });

  it("nudges a second training day when only one is planned", () => {
    const tips = fitnessTips("routine", { ...complete, plannedDays: 1 });
    expect(tips.some((t) => t.id === "plan-more-days")).toBe(true);
  });

  it("flags stale body data", () => {
    const tips = fitnessTips("body", { ...complete, hasRecentBodyEntry: false });
    expect(tips[0]?.id).toBe("body-stale");
  });

  it("never shows more than two tips at once", () => {
    expect(fitnessTips("workout", EMPTY_SIGNALS).length).toBeLessThanOrEqual(2);
  });
});

describe("shouldShowFirstRunGuide", () => {
  it("hides once the user marked it done", () => {
    expect(shouldShowFirstRunGuide(EMPTY_SIGNALS, true)).toBe(false);
  });

  it("hides once logging, planning and picking are all covered", () => {
    expect(shouldShowFirstRunGuide(complete, false)).toBe(false);
  });

  it("shows for a fresh profile", () => {
    expect(shouldShowFirstRunGuide(EMPTY_SIGNALS, false)).toBe(true);
  });
});
