import { describe, expect, it } from "vitest";
import {
  activeRules,
  describeRule,
  formatWeekdays,
  isSkippedByRules,
  isWholeDaySkipped,
  rulesForDay,
  type StandingRule,
} from "@/lib/standing-rules";
import { nextWeekRange } from "@/lib/pause";
import { planEvents, ruleSkipDays } from "@/lib/schedule";
import type { Database } from "@/integrations/supabase/types";

type UC = Database["public"]["Tables"]["user_compounds"]["Row"];

function uc(overrides: Partial<UC> = {}): UC {
  return {
    id: "uc-1",
    user_id: "u-1",
    compound_id: null,
    custom_name: "Test",
    custom_category: null,
    rxcui: null,
    is_prescription: false,
    dose_amount: 10,
    dose_unit: "mg",
    frequency: "daily",
    days_of_week: null,
    times_of_day: ["08:00"],
    with_food: null,
    post_workout: null,
    start_date: null,
    end_date: null,
    cycle_on_days: null,
    cycle_off_days: null,
    active: true,
    notes: null,
    created_at: null,
    ...overrides,
  } as UC;
}

function rule(overrides: Partial<StandingRule> = {}): StandingRule {
  return {
    id: "r-1",
    user_compound_id: null,
    days_of_week: [7],
    enabled: true,
    note: null,
    ...overrides,
  };
}

// 2026-08-01 is a Saturday, so this window covers Sat → Fri.
const FROM = new Date("2026-08-01T09:00:00Z");

describe("standing rule matching", () => {
  it("ignores disabled rules and rules with no days", () => {
    expect(activeRules([rule({ enabled: false })])).toHaveLength(0);
    expect(activeRules([rule({ days_of_week: [] })])).toHaveLength(0);
    expect(activeRules([rule({ days_of_week: null })])).toHaveLength(0);
    expect(activeRules([rule({ days_of_week: [0, 9] })])).toHaveLength(0);
    expect(activeRules(null)).toEqual([]);
  });

  it("applies a whole-stack rule to every compound", () => {
    const rules = [rule({ days_of_week: [7] })];
    expect(isSkippedByRules(7, "anything", rules)).toBe(true);
    expect(isSkippedByRules(1, "anything", rules)).toBe(false);
    expect(isWholeDaySkipped(7, rules)).toBe(true);
  });

  it("scopes a per-compound rule to that compound only", () => {
    const rules = [rule({ user_compound_id: "uc-1", days_of_week: [6, 7] })];
    expect(isSkippedByRules(6, "uc-1", rules)).toBe(true);
    expect(isSkippedByRules(6, "uc-2", rules)).toBe(false);
    // A per-compound rule must never blank out the entire day.
    expect(isWholeDaySkipped(6, rules)).toBe(false);
  });

  it("lets a global rule win alongside a narrower one", () => {
    const rules = [
      rule({ id: "a", user_compound_id: "uc-1", days_of_week: [1] }),
      rule({ id: "b", user_compound_id: null, days_of_week: [7] }),
    ];
    expect(isSkippedByRules(7, "uc-2", rules)).toBe(true);
    expect(rulesForDay(7, rules).map((r) => r.id)).toEqual(["b"]);
    expect(rulesForDay(1, rules).map((r) => r.id)).toEqual(["a"]);
    expect(rulesForDay(3, rules)).toEqual([]);
  });
});

describe("weekday formatting", () => {
  it("reads naturally for the common cases", () => {
    expect(formatWeekdays([7])).toBe("Sundays");
    expect(formatWeekdays([6, 7])).toBe("Weekends");
    expect(formatWeekdays([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(formatWeekdays([1, 3, 5])).toBe("Mon, Wed & Fri");
    expect(formatWeekdays([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
    expect(formatWeekdays([])).toBe("No days");
  });

  it("dedupes and sorts unruly input", () => {
    expect(formatWeekdays([5, 1, 5, 3])).toBe("Mon, Wed & Fri");
  });

  it("describes scope in plain English", () => {
    expect(describeRule(rule())).toBe("Skip Sundays · whole stack");
    expect(describeRule(rule({ user_compound_id: "uc-1" }), "Creatine")).toBe(
      "Skip Sundays · Creatine",
    );
  });
});

describe("planEvents with standing rules", () => {
  it("plans the full week when no rule fires", () => {
    expect(planEvents("u-1", [uc()], "UTC", 7, FROM, null, [])).toHaveLength(7);
  });

  it("drops every Sunday for an 'always skip Sundays' rule", () => {
    const events = planEvents("u-1", [uc()], "UTC", 14, FROM, null, [rule({ days_of_week: [7] })]);
    const days = events.map((e) => e.scheduled_at.slice(0, 10));
    // 2026-08-02 and 2026-08-09 are Sundays.
    expect(days).not.toContain("2026-08-02");
    expect(days).not.toContain("2026-08-09");
    expect(days).toHaveLength(12);
  });

  it("only removes the named compound for a scoped rule", () => {
    const stack = [uc({ id: "uc-1" }), uc({ id: "uc-2" })];
    const events = planEvents("u-1", stack, "UTC", 7, FROM, null, [
      rule({ user_compound_id: "uc-1", days_of_week: [7] }),
    ]);
    const sunday = events.filter((e) => e.scheduled_at.startsWith("2026-08-02"));
    expect(sunday.map((e) => e.user_compound_id)).toEqual(["uc-2"]);
  });

  it("removes all of a compound's times on a skipped day, not just the first", () => {
    const events = planEvents(
      "u-1",
      [uc({ times_of_day: ["08:00", "13:00", "21:00"] })],
      "UTC",
      7,
      FROM,
      null,
      [rule({ days_of_week: [7] })],
    );
    expect(events.filter((e) => e.scheduled_at.startsWith("2026-08-02"))).toEqual([]);
    expect(events.filter((e) => e.scheduled_at.startsWith("2026-08-03"))).toHaveLength(3);
  });

  it("stacks with vacation mode without either cancelling the other", () => {
    const events = planEvents(
      "u-1",
      [uc()],
      "UTC",
      7,
      FROM,
      { pause_start: "2026-08-03", pause_end: "2026-08-04" },
      [rule({ days_of_week: [7] })],
    );
    const days = events.map((e) => e.scheduled_at.slice(0, 10));
    expect(days).toEqual(["2026-08-01", "2026-08-05", "2026-08-06", "2026-08-07"]);
  });

  it("respects the user's timezone when deciding which day is Sunday", () => {
    // 2026-08-02T23:00Z is still Sunday in UTC but already Monday in Sydney.
    const stack = [uc({ times_of_day: ["09:00"] })];
    const sydney = planEvents(
      "u-1",
      stack,
      "Australia/Sydney",
      3,
      new Date("2026-08-02T23:00:00Z"),
      null,
      [rule({ days_of_week: [7] })],
    );
    // Sydney's Sunday has already passed, so nothing is skipped.
    expect(sydney).toHaveLength(3);
    const utc = planEvents("u-1", stack, "UTC", 3, new Date("2026-08-02T23:00:00Z"), null, [
      rule({ days_of_week: [7] }),
    ]);
    expect(utc).toHaveLength(2);
  });

  it("is unaffected by a disabled rule", () => {
    const events = planEvents("u-1", [uc()], "UTC", 7, FROM, null, [
      rule({ days_of_week: [7], enabled: false }),
    ]);
    expect(events).toHaveLength(7);
  });

  it("can empty the calendar entirely if every day is ruled out", () => {
    const events = planEvents("u-1", [uc()], "UTC", 7, FROM, null, [
      rule({ days_of_week: [1, 2, 3, 4, 5, 6, 7] }),
    ]);
    expect(events).toEqual([]);
  });
});

describe("ruleSkipDays (cleanup of already-scheduled doses)", () => {
  it("returns nothing without active rules", () => {
    expect(ruleSkipDays("UTC", 7, FROM, [])).toEqual([]);
    expect(ruleSkipDays("UTC", 7, FROM, [rule({ enabled: false })])).toEqual([]);
  });

  it("flags whole-stack days so every pending dose is cleared", () => {
    const days = ruleSkipDays("UTC", 14, FROM, [rule({ days_of_week: [7] })]);
    expect(days.map((d) => d.iso)).toEqual(["2026-08-02", "2026-08-09"]);
    expect(days.every((d) => d.wholeDay)).toBe(true);
  });

  it("lists only the affected compounds for scoped rules", () => {
    const days = ruleSkipDays("UTC", 7, FROM, [
      rule({ id: "a", user_compound_id: "uc-1", days_of_week: [7] }),
      rule({ id: "b", user_compound_id: "uc-2", days_of_week: [7] }),
    ]);
    expect(days).toHaveLength(1);
    expect(days[0].wholeDay).toBe(false);
    expect(days[0].compoundIds.sort()).toEqual(["uc-1", "uc-2"]);
  });
});

describe("pause next week", () => {
  it("spans Monday to Sunday of the following week", () => {
    // 2026-08-01 is a Saturday.
    expect(nextWeekRange("2026-08-01")).toEqual({ start: "2026-08-03", end: "2026-08-09" });
    // From a Monday, "next week" is the one after the current one.
    expect(nextWeekRange("2026-08-03")).toEqual({ start: "2026-08-10", end: "2026-08-16" });
    // From a Sunday, next week starts the very next day.
    expect(nextWeekRange("2026-08-02")).toEqual({ start: "2026-08-03", end: "2026-08-09" });
  });

  it("crosses a month boundary cleanly", () => {
    expect(nextWeekRange("2026-08-30")).toEqual({ start: "2026-08-31", end: "2026-09-06" });
  });
});
