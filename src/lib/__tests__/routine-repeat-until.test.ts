import { describe, expect, it } from "vitest";
import {
  describeRepeatEnd,
  isAfterRepeatEnd,
  nextOccurrences,
  occursOnWeek,
} from "@/lib/routine-recurrence";
import { routineForDay } from "@/lib/routine-schedule";
import { planWeekDuplication, weekKeys } from "@/lib/duplicate-week";
import { routineRemindersDue } from "@/lib/routine-reminders";

const TZ = "UTC";

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    user_id: "u1",
    label: "Push day",
    kind: "strength",
    planned_time: "18:00:00",
    days_of_week: [1, 4],
    active: true,
    interval_weeks: 1,
    anchor_date: "2026-08-17",
    repeat_until: null as string | null,
    skipped_dates: [] as string[],
    time_overrides: {},
    at_time_alert_on: true,
    pre_alert_on: false,
    pre_lead_min: null,
    ...overrides,
  };
}

describe("repeat until (recurrence end date)", () => {
  it("treats days after the end date as past the end", () => {
    const fields = { repeatUntil: "2026-08-31" };
    expect(isAfterRepeatEnd("2026-08-31", fields)).toBe(false);
    expect(isAfterRepeatEnd("2026-09-01", fields)).toBe(true);
    expect(isAfterRepeatEnd("2026-09-01", { repeatUntil: null })).toBe(false);
    expect(isAfterRepeatEnd("2026-09-01", { repeatUntil: "nonsense" })).toBe(false);
  });

  it("stops the weekly pattern once the end date has passed", () => {
    const fields = { intervalWeeks: 1, repeatUntil: "2026-08-31" };
    expect(occursOnWeek("2026-08-24", fields)).toBe(true);
    expect(occursOnWeek("2026-08-31", fields)).toBe(true);
    expect(occursOnWeek("2026-09-07", fields)).toBe(false);
  });

  it("truncates the next-occurrence list at the end date", () => {
    const out = nextOccurrences([1, 4], { repeatUntil: "2026-08-27" }, "2026-08-20", 5);
    expect(out.map((o) => o.dayKey)).toEqual(["2026-08-20", "2026-08-24", "2026-08-27"]);
  });

  it("hides occurrences from the calendar/Today engine after the end date", () => {
    const row = session({ repeat_until: "2026-08-27" }) as never;
    expect(routineForDay([row], [], "2026-08-27", TZ)).toHaveLength(1);
    expect(routineForDay([row], [], "2026-08-31", TZ)).toHaveLength(0);
  });

  it("never fires a reminder for a session past its end date", () => {
    const due = routineRemindersDue({
      workouts: [session({ repeat_until: "2026-08-27" })],
      meals: [],
      dayKey: "2026-08-31",
      nowMinutes: 18 * 60,
    });
    expect(due).toHaveLength(0);
  });

  it("does not duplicate a week that falls past the end date", () => {
    const keys = weekKeys(new Date("2026-09-07T12:00:00Z"));
    const plan = planWeekDuplication(
      [
        {
          id: "s1",
          label: "Push day",
          planned_time: "18:00:00",
          days_of_week: [1, 4],
          interval_weeks: 1,
          anchor_date: "2026-08-17",
          repeat_until: "2026-08-31",
        },
      ],
      keys,
    );
    expect(plan.copies).toHaveLength(0);
  });

  it("formats the end date for the routine summary", () => {
    expect(describeRepeatEnd("2026-08-31")).toContain("Aug");
    expect(describeRepeatEnd(null)).toBeNull();
  });
});
