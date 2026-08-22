import { describe, expect, it } from "vitest";

import {
  describeInterval,
  isSkipped,
  nextOccurrences,
  normalizeInterval,
  occursOnWeek,
  parseTimeOverrides,
  pruneSkippedDates,
  timeForDay,
  toggleSkippedDate,
  weekIndex,
} from "@/lib/routine-recurrence";
import { routineForDay } from "@/lib/routine-schedule";

describe("routine recurrence", () => {
  it("keeps a whole Mon–Sun week on one index", () => {
    expect(weekIndex("2026-08-17")).toBe(weekIndex("2026-08-23"));
    expect(weekIndex("2026-08-24")).toBe((weekIndex("2026-08-17") ?? 0) + 1);
  });

  it("clamps the interval", () => {
    expect(normalizeInterval(null)).toBe(1);
    expect(normalizeInterval(0)).toBe(1);
    expect(normalizeInterval(9)).toBe(4);
  });

  it("runs every other week from the anchor week", () => {
    const fields = { intervalWeeks: 2, anchorDate: "2026-08-17" };
    expect(occursOnWeek("2026-08-19", fields)).toBe(true);
    expect(occursOnWeek("2026-08-26", fields)).toBe(false);
    expect(occursOnWeek("2026-09-02", fields)).toBe(true);
  });

  it("always runs when weekly", () => {
    expect(occursOnWeek("2026-08-26", { intervalWeeks: 1 })).toBe(true);
  });

  it("tracks one-off skips", () => {
    const fields = { skippedDates: ["2026-08-19"] };
    expect(isSkipped("2026-08-19", fields)).toBe(true);
    expect(isSkipped("2026-08-20", fields)).toBe(false);
    expect(toggleSkippedDate(["2026-08-19"], "2026-08-19")).toEqual([]);
    expect(toggleSkippedDate([], "2026-08-19")).toEqual(["2026-08-19"]);
    expect(pruneSkippedDates(["2026-01-01", "2026-08-19"], "2026-08-19")).toEqual(["2026-08-19"]);
  });

  it("applies per-weekday time overrides", () => {
    const fields = { timeOverrides: { "3": "06:30", "9": "07:00", bad: "x" } };
    expect(parseTimeOverrides(fields.timeOverrides)).toEqual({ 3: "06:30" });
    expect(timeForDay("2026-08-19", "18:00", fields)).toBe("06:30");
    expect(timeForDay("2026-08-20", "18:00", fields)).toBe("18:00");
  });

  it("lists upcoming occurrences with skip state", () => {
    const out = nextOccurrences(
      [1, 3],
      { intervalWeeks: 2, anchorDate: "2026-08-17", skippedDates: ["2026-08-19"] },
      "2026-08-17",
      3,
    );
    expect(out.map((o) => o.dayKey)).toEqual(["2026-08-17", "2026-08-19", "2026-08-31"]);
    expect(out[1]?.skipped).toBe(true);
  });

  it("hides skipped and off-week days from the calendar", () => {
    const row = {
      id: "s1",
      label: "Push day",
      planned_time: "18:00:00",
      active: true,
      days_of_week: [3],
      kind: "strength",
      interval_weeks: 2,
      anchor_date: "2026-08-17",
      skipped_dates: ["2026-09-02"],
      time_overrides: { "3": "06:30" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    expect(routineForDay([row], [], "2026-08-19", "UTC")[0]?.time).toBe("06:30");
    expect(routineForDay([row], [], "2026-08-26", "UTC")).toHaveLength(0);
    expect(routineForDay([row], [], "2026-09-02", "UTC")).toHaveLength(0);
  });

  it("describes the interval", () => {
    expect(describeInterval(1)).toBe("Every week");
    expect(describeInterval(2)).toBe("Every other week");
    expect(describeInterval(3)).toBe("Every 3 weeks");
  });
});
