import { beforeEach, describe, expect, it } from "vitest";
import {
  isGuideComplete,
  loadBulkPicks,
  loadTargetDays,
  markGuideComplete,
  saveBulkPicks,
  saveTargetDays,
} from "@/lib/fitness-prefs";

describe("fitness prefs", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("remembers the first-run guide being completed", () => {
    expect(isGuideComplete()).toBe(false);
    markGuideComplete();
    expect(isGuideComplete()).toBe(true);
  });

  it("round-trips bulk exercise picks", () => {
    saveBulkPicks(["Squat", "Bench press"]);
    expect(loadBulkPicks()).toEqual(["Squat", "Bench press"]);
  });

  it("ignores corrupt stored values", () => {
    window.localStorage.setItem("doseroutine.fitness.bulkPicks", "{not json");
    expect(loadBulkPicks()).toEqual([]);
  });

  it("stores target days sorted and de-duplicated", () => {
    saveTargetDays([3, 1, 3]);
    expect(loadTargetDays()).toEqual([1, 3]);
  });

  it("drops out-of-range weekdays", () => {
    window.localStorage.setItem("doseroutine.fitness.targetDays", "[9,2,-1]");
    expect(loadTargetDays()).toEqual([2]);
  });
});
