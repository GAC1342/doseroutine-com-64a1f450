import { describe, expect, it } from "vitest";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  addMonthsToMonthKey,
  formatDayKeyLabel,
  monthKeyInZone,
  monthRangeInZone,
  relativeDayLabel,
  todayKeyInZone,
} from "./local-calendar";

describe("local calendar helpers", () => {
  it("labels a selected Edmonton Sunday as Sunday, not Saturday", () => {
    expect(formatDayKeyLabel("2026-07-26", "America/Edmonton")).toBe("Sunday, Jul 26");
  });

  it("returns Today for the user's local date, not the UTC date", () => {
    const now = new Date("2026-07-27T05:40:00Z"); // Sunday 23:40 in Edmonton
    expect(todayKeyInZone("America/Edmonton", now)).toBe("2026-07-26");
    expect(relativeDayLabel("2026-07-26", "America/Edmonton", now)).toBe("Today");
    expect(relativeDayLabel("2026-07-25", "America/Edmonton", now)).toBe("Yesterday");
  });

  it("builds month query windows from local midnight in the user's timezone", () => {
    const range = monthRangeInZone("2026-07", "America/Edmonton");
    expect(range).toBeTruthy();
    if (!range) return;
    expect(range.start.toISOString()).toBe("2026-07-01T06:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-01T06:00:00.000Z");
    expect(formatInTimeZone(range.start, "America/Edmonton", "yyyy-MM-dd HH:mm")).toBe(
      "2026-07-01 00:00",
    );
    expect(formatInTimeZone(range.end, "America/Edmonton", "yyyy-MM-dd HH:mm")).toBe(
      "2026-08-01 00:00",
    );
  });

  it("keeps a late-night Edmonton event inside the selected local calendar day", () => {
    const event = fromZonedTime("2026-07-26T23:30:00", "America/Edmonton");
    expect(event.toISOString()).toBe("2026-07-27T05:30:00.000Z");
    expect(formatInTimeZone(event, "America/Edmonton", "yyyy-MM-dd")).toBe("2026-07-26");
  });

  it("covers DST spring-forward month boundaries with local midnight", () => {
    const range = monthRangeInZone("2027-03", "America/Edmonton");
    expect(range).toBeTruthy();
    if (!range) return;
    expect(formatInTimeZone(range.start, "America/Edmonton", "yyyy-MM-dd HH:mm")).toBe(
      "2027-03-01 00:00",
    );
    expect(formatInTimeZone(range.end, "America/Edmonton", "yyyy-MM-dd HH:mm")).toBe(
      "2027-04-01 00:00",
    );
  });

  it("covers DST fall-back month boundaries with local midnight", () => {
    const range = monthRangeInZone("2026-11", "America/Edmonton");
    expect(range).toBeTruthy();
    if (!range) return;
    expect(formatInTimeZone(range.start, "America/Edmonton", "yyyy-MM-dd HH:mm")).toBe(
      "2026-11-01 00:00",
    );
    expect(formatInTimeZone(range.end, "America/Edmonton", "yyyy-MM-dd HH:mm")).toBe(
      "2026-12-01 00:00",
    );
  });

  it("uses each user's timezone when deciding the current month", () => {
    const instant = new Date("2026-08-01T03:00:00Z");
    expect(monthKeyInZone(instant, "America/Edmonton")).toBe("2026-07");
    expect(monthKeyInZone(instant, "UTC")).toBe("2026-08");
  });

  it("changes months without depending on the browser timezone", () => {
    expect(addMonthsToMonthKey("2026-07", 1)).toBe("2026-08");
    expect(addMonthsToMonthKey("2026-01", -1)).toBe("2025-12");
  });
});
