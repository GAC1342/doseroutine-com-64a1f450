import { describe, expect, it } from "vitest";
import {
  moveWeekday,
  normalizeWeekdays,
  occursOnDay,
  weekdayOfDayKey,
} from "@/lib/routine-schedule";

describe("normalizeWeekdays", () => {
  it("dedupes, sorts and drops out-of-range days", () => {
    expect(normalizeWeekdays([5, 1, 1, 9, -2, 3])).toEqual([1, 3, 5]);
  });

  it("treats empty/null as every day", () => {
    expect(normalizeWeekdays([])).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(normalizeWeekdays(null)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("moveWeekday", () => {
  it("moves only the dragged day and keeps the rest", () => {
    // Mon/Wed/Fri dragged from Wed onto Thu.
    expect(moveWeekday([1, 3, 5], 3, 4)).toEqual([1, 4, 5]);
  });

  it("is a no-op when dropped on the same day", () => {
    expect(moveWeekday([1, 3, 5], 3, 3)).toEqual([1, 3, 5]);
  });

  it("merges when the target day already runs", () => {
    expect(moveWeekday([1, 3, 5], 3, 5)).toEqual([1, 5]);
  });

  it("reschedules a single-day session", () => {
    expect(moveWeekday([2], 2, 6)).toEqual([6]);
  });

  it("never returns an empty pattern", () => {
    expect(moveWeekday([4], 4, 4)).toEqual([4]);
  });
});

describe("weekday mapping stays consistent across surfaces", () => {
  it("maps calendar day keys to the JS weekday used by the picker", () => {
    // 2026-08-17 is a Monday.
    expect(weekdayOfDayKey("2026-08-17")).toBe(1);
    expect(weekdayOfDayKey("2026-08-18")).toBe(2);
    expect(weekdayOfDayKey("2026-08-23")).toBe(0);
  });

  it("shows a Tue/Thu session on exactly Tue and Thu", () => {
    const days = normalizeWeekdays([2, 4]);
    const week = [
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ];
    expect(week.filter((d) => occursOnDay(days, d))).toEqual(["2026-08-18", "2026-08-20"]);
  });

  it("does not shift the day near midnight in negative-offset timezones", () => {
    const prev = process.env.TZ;
    process.env.TZ = "America/Edmonton";
    try {
      expect(weekdayOfDayKey("2026-08-20")).toBe(4);
      expect(occursOnDay([4], "2026-08-20")).toBe(true);
      expect(occursOnDay([4], "2026-08-19")).toBe(false);
    } finally {
      process.env.TZ = prev;
    }
  });
});
