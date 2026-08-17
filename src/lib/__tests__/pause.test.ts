import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  formatPauseRange,
  isPausedNow,
  isPausedOnDate,
  isPauseExpired,
  normalizePause,
  pauseDaysRemaining,
} from "@/lib/pause";
import { planEvents } from "@/lib/schedule";
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

describe("pause helpers", () => {
  it("treats a half-filled range as no pause (never open-ended)", () => {
    expect(normalizePause({ pause_start: "2026-08-01", pause_end: null })).toBeNull();
    expect(normalizePause({ pause_start: null, pause_end: "2026-08-01" })).toBeNull();
    expect(normalizePause(null)).toBeNull();
  });

  it("swaps a reversed range instead of dropping it", () => {
    expect(normalizePause({ pause_start: "2026-08-10", pause_end: "2026-08-01" })).toEqual({
      start: "2026-08-01",
      end: "2026-08-10",
      reason: null,
    });
  });

  it("is inclusive of both endpoints", () => {
    const p = { pause_start: "2026-08-01", pause_end: "2026-08-03" };
    expect(isPausedOnDate("2026-07-31", p)).toBe(false);
    expect(isPausedOnDate("2026-08-01", p)).toBe(true);
    expect(isPausedOnDate("2026-08-02", p)).toBe(true);
    expect(isPausedOnDate("2026-08-03", p)).toBe(true);
    expect(isPausedOnDate("2026-08-04", p)).toBe(false);
  });

  it("resolves 'now' in the user's timezone, not the runtime's", () => {
    const p = { pause_start: "2026-08-02", pause_end: "2026-08-02" };
    // 2026-08-01 22:00 UTC is already 2026-08-02 in Sydney but not in London.
    const now = new Date("2026-08-01T22:00:00Z");
    expect(isPausedNow(p, "Australia/Sydney", now)).toBe(true);
    expect(isPausedNow(p, "Europe/London", now)).toBe(false);
  });

  it("counts remaining days inclusively and stops at zero", () => {
    const tz = "UTC";
    const now = new Date("2026-08-02T10:00:00Z");
    expect(
      pauseDaysRemaining({ pause_start: "2026-08-01", pause_end: "2026-08-03" }, tz, now),
    ).toBe(2);
    expect(
      pauseDaysRemaining({ pause_start: "2026-08-02", pause_end: "2026-08-02" }, tz, now),
    ).toBe(1);
    expect(
      pauseDaysRemaining({ pause_start: "2026-07-01", pause_end: "2026-07-05" }, tz, now),
    ).toBe(0);
    // A future pause counts its own full length, not the gap before it.
    expect(
      pauseDaysRemaining({ pause_start: "2026-09-01", pause_end: "2026-09-03" }, tz, now),
    ).toBe(3);
  });

  it("flags an expired pause", () => {
    const now = new Date("2026-08-10T00:00:00Z");
    expect(isPauseExpired({ pause_start: "2026-08-01", pause_end: "2026-08-05" }, "UTC", now)).toBe(
      true,
    );
    expect(isPauseExpired({ pause_start: "2026-08-01", pause_end: "2026-08-31" }, "UTC", now)).toBe(
      false,
    );
    expect(isPauseExpired(null, "UTC", now)).toBe(false);
  });

  it("does date arithmetic without timezone drift", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(diffDays("2026-03-01", "2026-03-08")).toBe(7);
    // Across a DST boundary in most northern-hemisphere zones.
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("formats a readable range, collapsing single days", () => {
    expect(formatPauseRange({ pause_start: "2026-08-01", pause_end: "2026-08-01" }, "UTC")).toBe(
      "Sat, 1 Aug",
    );
    expect(formatPauseRange({ pause_start: "2026-08-01", pause_end: "2026-08-03" }, "UTC")).toBe(
      "Sat, 1 Aug – Mon, 3 Aug",
    );
    expect(formatPauseRange(null, "UTC")).toBeNull();
  });
});

describe("planEvents with vacation mode", () => {
  const from = new Date("2026-08-01T09:00:00Z");

  it("plans every day when there is no pause", () => {
    const events = planEvents("u-1", [uc()], "UTC", 5, from, null);
    expect(events).toHaveLength(5);
  });

  it("generates nothing on paused days", () => {
    const events = planEvents("u-1", [uc()], "UTC", 5, from, {
      pause_start: "2026-08-02",
      pause_end: "2026-08-03",
    });
    const days = events.map((e) => e.scheduled_at.slice(0, 10));
    expect(days).toEqual(["2026-08-01", "2026-08-04", "2026-08-05"]);
  });

  it("resumes automatically once the pause ends", () => {
    const events = planEvents("u-1", [uc()], "UTC", 3, from, {
      pause_start: "2026-07-20",
      pause_end: "2026-07-31",
    });
    expect(events).toHaveLength(3);
  });

  it("produces an entirely empty week when the pause covers it", () => {
    const events = planEvents("u-1", [uc()], "UTC", 7, from, {
      pause_start: "2026-08-01",
      pause_end: "2026-08-31",
    });
    expect(events).toEqual([]);
  });

  it("ignores a malformed half-open pause rather than stopping all doses", () => {
    const events = planEvents("u-1", [uc()], "UTC", 4, from, {
      pause_start: "2026-08-01",
      pause_end: null,
    });
    expect(events).toHaveLength(4);
  });

  it("pauses multi-time and weekly compounds alike", () => {
    const stack = [
      uc({ id: "a", times_of_day: ["08:00", "20:00"] }),
      uc({ id: "b", frequency: "weekly", days_of_week: [6, 7], times_of_day: ["09:00"] }),
    ];
    const paused = planEvents("u-1", stack, "UTC", 7, from, {
      pause_start: "2026-08-01",
      pause_end: "2026-08-07",
    });
    expect(paused).toEqual([]);
    const normal = planEvents("u-1", stack, "UTC", 7, from, null);
    expect(normal.length).toBeGreaterThan(0);
  });
});
