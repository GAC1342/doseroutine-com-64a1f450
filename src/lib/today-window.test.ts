import { describe, expect, it } from "vitest";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { filterEventsForLocalDay, localDayWindow } from "./today-window";
import { planEvents } from "./schedule";
import type { Database } from "@/integrations/supabase/types";

type UC = Database["public"]["Tables"]["user_compounds"]["Row"];

/** Minimal user_compound factory. Cast through unknown so we don't have to
 *  hand-populate every optional column the DB row exposes. */
function makeUC(overrides: Partial<UC>): UC {
  const base = {
    id: overrides.id ?? "uc-1",
    user_id: "user-1",
    compound_id: "c-1",
    active: true,
    frequency: "daily",
    days_of_week: null,
    times_of_day: ["10:00"],
    dose_amount: 1,
    dose_unit: "mg",
    start_date: null,
    end_date: null,
    cycle_on_days: null,
    cycle_off_days: null,
  };
  return { ...base, ...overrides } as unknown as UC;
}

/** End-to-end: given a user's stack, planEvents produces the same rows the
 *  DB would store, and the Today page window filters that set down to just
 *  the current local calendar day. */
function todayEvents(ucs: UC[], now: Date, tz: string) {
  const planned = planEvents("user-1", ucs, tz, 14, now);
  return filterEventsForLocalDay(planned, now, tz);
}

describe("Today page local-day window (e2e)", () => {
  it("returns a window that spans exactly 24h on a normal day", () => {
    const now = new Date("2026-07-26T15:00:00Z"); // Sun in Edmonton
    const { start, end, iso } = localDayWindow(now, "America/Edmonton");
    expect(iso).toBe("2026-07-26");
    // Inclusive .lte at .999 → 24h - 1ms
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it("excludes a Monday 10:00 weekly dose from Sunday's Today (Edmonton)", () => {
    // The exact regression from the user: TRT Mon 10:00 leaked into Sunday.
    const trt = makeUC({
      id: "trt",
      frequency: "weekly",
      days_of_week: [1], // Monday
      times_of_day: ["10:00"],
    });
    const now = new Date("2026-07-26T23:40:00-06:00"); // Sun 23:40 Edmonton
    const events = todayEvents([trt], now, "America/Edmonton");
    expect(events).toHaveLength(0);
  });

  it("includes that same Monday 10:00 dose once the local day flips", () => {
    const trt = makeUC({
      id: "trt",
      frequency: "weekly",
      days_of_week: [1],
      times_of_day: ["10:00"],
    });
    const now = new Date("2026-07-27T10:05:00-06:00"); // Mon 10:05 Edmonton
    const events = todayEvents([trt], now, "America/Edmonton");
    expect(events).toHaveLength(1);
    expect(formatInTimeZone(events[0].scheduled_at, "America/Edmonton", "yyyy-MM-dd HH:mm")).toBe(
      "2026-07-27 10:00",
    );
  });

  it("late-night dose that crosses UTC midnight still counts as today (Edmonton)", () => {
    const uc = makeUC({ id: "n1", frequency: "daily", times_of_day: ["23:30"] });
    const now = new Date("2026-07-26T22:00:00-06:00"); // Sun 22:00 local
    const events = todayEvents([uc], now, "America/Edmonton");
    expect(events).toHaveLength(1);
    // 23:30 Edmonton on Jul 26 = 05:30 UTC on Jul 27 — outside a naive UTC day.
    expect(events[0].scheduled_at).toBe("2026-07-27T05:30:00.000Z");
  });

  it("Tokyo user just past midnight sees the new day's doses, not yesterday's", () => {
    const daily = makeUC({ id: "d", frequency: "daily", times_of_day: ["08:00", "20:00"] });
    const now = new Date("2026-07-27T00:15:00+09:00"); // Mon 00:15 Tokyo
    const events = todayEvents([daily], now, "Asia/Tokyo");
    expect(events).toHaveLength(2);
    for (const ev of events) {
      expect(formatInTimeZone(ev.scheduled_at, "Asia/Tokyo", "yyyy-MM-dd")).toBe("2026-07-27");
    }
  });

  it("respects start_date: a dose starting tomorrow does not appear today", () => {
    const uc = makeUC({
      id: "future",
      frequency: "daily",
      times_of_day: ["09:00"],
      start_date: "2026-07-27",
    });
    const now = new Date("2026-07-26T15:00:00-06:00");
    expect(todayEvents([uc], now, "America/Edmonton")).toHaveLength(0);
  });

  it("respects end_date: a dose that ended yesterday does not appear today", () => {
    const uc = makeUC({
      id: "past",
      frequency: "daily",
      times_of_day: ["09:00"],
      end_date: "2026-07-25",
    });
    const now = new Date("2026-07-26T15:00:00-06:00");
    expect(todayEvents([uc], now, "America/Edmonton")).toHaveLength(0);
  });

  it("DST spring-forward day (America/Edmonton, 2027-03-14) is only 23h but still covers the local day", () => {
    // 2027-03-14 02:00 local → clocks jump to 03:00. The local calendar day
    // is 23 hours long. Both a 01:30 and a 22:00 local dose must show up.
    const early = makeUC({ id: "e", frequency: "daily", times_of_day: ["01:30"] });
    const late = makeUC({ id: "l", frequency: "daily", times_of_day: ["22:00"] });
    const now = fromZonedTime("2027-03-14T12:00:00", "America/Edmonton");
    const events = todayEvents([early, late], now, "America/Edmonton");
    expect(events).toHaveLength(2);
    const { start, end } = localDayWindow(now, "America/Edmonton");
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000 - 1);
    // Neither event leaks into the next local day.
    for (const ev of events) {
      expect(formatInTimeZone(ev.scheduled_at, "America/Edmonton", "yyyy-MM-dd")).toBe(
        "2027-03-14",
      );
    }
  });

  it("DST fall-back day (America/Edmonton, 2026-11-01) is 25h and no adjacent-day doses leak in", () => {
    const daily = makeUC({
      id: "d",
      frequency: "daily",
      times_of_day: ["01:30", "12:00", "23:30"],
    });
    const now = fromZonedTime("2026-11-01T15:00:00", "America/Edmonton");
    const { start, end } = localDayWindow(now, "America/Edmonton");
    expect(end.getTime() - start.getTime()).toBe(25 * 60 * 60 * 1000 - 1);
    const events = todayEvents([daily], now, "America/Edmonton");
    // Three doses on the local day — none from Oct 31 or Nov 2.
    expect(events).toHaveLength(3);
    for (const ev of events) {
      expect(formatInTimeZone(ev.scheduled_at, "America/Edmonton", "yyyy-MM-dd")).toBe(
        "2026-11-01",
      );
    }
  });

  it("weekly DOW is anchored to local date, not UTC (Auckland Sunday-evening UTC is already Monday local)", () => {
    // 2026-07-26 22:00 UTC = 2026-07-27 10:00 in Pacific/Auckland (Monday).
    const monWeekly = makeUC({
      id: "m",
      frequency: "weekly",
      days_of_week: [1],
      times_of_day: ["10:00"],
    });
    const now = new Date("2026-07-26T22:00:00Z");
    const events = todayEvents([monWeekly], now, "Pacific/Auckland");
    expect(events).toHaveLength(1);
    expect(formatInTimeZone(events[0].scheduled_at, "Pacific/Auckland", "EEEE HH:mm")).toBe(
      "Monday 10:00",
    );
  });

  it("cross-timezone isolation: same instant produces different Today sets for Edmonton vs Tokyo", () => {
    const daily = makeUC({ id: "d", frequency: "daily", times_of_day: ["09:00"] });
    const now = new Date("2026-07-27T02:00:00Z"); // Sun 20:00 Edmonton, Mon 11:00 Tokyo
    const edm = todayEvents([daily], now, "America/Edmonton");
    const tok = todayEvents([daily], now, "Asia/Tokyo");
    expect(formatInTimeZone(edm[0].scheduled_at, "America/Edmonton", "yyyy-MM-dd")).toBe(
      "2026-07-26",
    );
    expect(formatInTimeZone(tok[0].scheduled_at, "Asia/Tokyo", "yyyy-MM-dd")).toBe("2026-07-27");
  });
});
