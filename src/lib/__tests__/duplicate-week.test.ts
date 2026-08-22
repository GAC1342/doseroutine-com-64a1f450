import { describe, expect, it } from "vitest";
import {
  describeDuplication,
  nextWeekKeys,
  planWeekDuplication,
  weekKeys,
  type DuplicableSession,
} from "@/lib/duplicate-week";

// Week of Mon 2026-08-24 … Sun 2026-08-30.
const TARGET = weekKeys(new Date(2026, 7, 24));

function row(over: Partial<DuplicableSession> = {}): DuplicableSession {
  return {
    id: "s1",
    label: "Push day",
    planned_time: "17:30:00",
    days_of_week: [1, 3, 5],
    interval_weeks: 1,
    anchor_date: null,
    skipped_dates: [],
    kind: "strength",
    duration_min: 45,
    template_id: null,
    active: true,
    ...over,
  };
}

describe("planWeekDuplication", () => {
  it("skips weekly rows that already cover next week", () => {
    const plan = planWeekDuplication([row()], TARGET);
    expect(plan.copies).toHaveLength(0);
    expect(plan.unskips).toHaveLength(0);
    expect(plan.alreadyCovered).toBe(1);
  });

  it("copies a row whose interval leaves next week empty", () => {
    // Anchored on the current week with a 2-week interval → next week is off.
    const plan = planWeekDuplication(
      [row({ interval_weeks: 2, anchor_date: "2026-08-17" })],
      TARGET,
    );
    expect(plan.copies).toHaveLength(1);
    expect(plan.copies[0]).toMatchObject({
      sourceId: "s1",
      label: "Push day",
      weekdays: [1, 3, 5],
      durationMin: 45,
      anchorDate: TARGET[0],
    });
  });

  it("preserves the repeat pattern on the copy", () => {
    const plan = planWeekDuplication(
      [row({ days_of_week: [2, 6], interval_weeks: 2, anchor_date: "2026-08-17" })],
      TARGET,
    );
    expect(plan.copies[0]?.weekdays).toEqual([2, 6]);
    expect(plan.copies[0]?.intervalWeeks).toBe(2);
  });

  it("restores cancelled occurrences instead of duplicating the rule", () => {
    const plan = planWeekDuplication(
      [row({ skipped_dates: ["2026-08-24", "2026-08-26"] })],
      TARGET,
    );
    expect(plan.copies).toHaveLength(0);
    expect(plan.unskips).toEqual([{ id: "s1", dates: ["2026-08-24", "2026-08-26"] }]);
  });

  it("ignores inactive rows", () => {
    const plan = planWeekDuplication([row({ id: "a", active: false }), row({ id: "b" })], TARGET);
    expect(plan.copies).toHaveLength(0);
    expect(plan.alreadyCovered).toBe(1);
  });
});

describe("nextWeekKeys", () => {
  it("returns the following Monday-first week", () => {
    expect(nextWeekKeys(new Date(2026, 7, 21))).toEqual([
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
    ]);
  });
});

describe("describeDuplication", () => {
  it("summarizes copies, restores and no-ops", () => {
    expect(describeDuplication({ createdIds: ["a", "b"], restored: [], alreadyCovered: 1 })).toBe(
      "2 sessions copied · 1 already repeating",
    );
    expect(describeDuplication({ createdIds: [], restored: [], alreadyCovered: 2 })).toBe(
      "Next week already matches this week",
    );
    expect(describeDuplication({ createdIds: [], restored: [], alreadyCovered: 0 })).toBe(
      "Nothing to copy yet",
    );
  });
});
