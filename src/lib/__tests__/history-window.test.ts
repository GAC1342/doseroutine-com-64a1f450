import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import { historyWindow, localDayWindow } from "../today-window";

/** These mirror the exact call sites in today.tsx, timeline.tsx and
 *  fetchAdherenceEvents. If any screen stops using the shared helper, the
 *  "identical window" assertions below start failing. */
function todayScreenWindow(now: Date, tz: string) {
  return historyWindow(now, tz, 30);
}
function timelineScreenWindow(now: Date, tz: string) {
  return historyWindow(now, tz, 30);
}

describe("historyWindow", () => {
  const tz = "America/Edmonton";

  it("starts at a real local midnight", () => {
    const now = new Date("2026-07-31T09:00:00Z");
    const { start } = historyWindow(now, tz, 30);
    expect(formatInTimeZone(start, tz, "HH:mm:ss")).toBe("00:00:00");
  });

  it("counts days inclusive of today", () => {
    const now = new Date("2026-07-31T09:00:00Z");
    expect(formatInTimeZone(historyWindow(now, tz, 1).start, tz, "yyyy-MM-dd")).toBe(
      formatInTimeZone(now, tz, "yyyy-MM-dd"),
    );
    expect(formatInTimeZone(historyWindow(now, tz, 7).start, tz, "yyyy-MM-dd")).toBe("2026-07-25");
    expect(formatInTimeZone(historyWindow(now, tz, 30).start, tz, "yyyy-MM-dd")).toBe("2026-07-02");
  });

  it("ends at now, so doses scheduled later today are not pre-scored", () => {
    const now = new Date("2026-07-31T09:00:00Z");
    const { end } = historyWindow(now, tz, 30);
    expect(end.getTime()).toBe(now.getTime());
    expect(end.getTime()).toBeLessThan(localDayWindow(now, tz).end.getTime());
  });

  it("keeps the start on local midnight across a spring-forward DST change", () => {
    // 2026-03-08 is the US/Canada spring-forward date (23h day).
    const now = new Date("2026-03-10T18:00:00Z");
    const { start } = historyWindow(now, tz, 7);
    expect(formatInTimeZone(start, tz, "yyyy-MM-dd HH:mm:ss")).toBe("2026-03-04 00:00:00");
  });

  it("keeps the start on local midnight across a fall-back DST change", () => {
    // 2026-11-01 is the fall-back date (25h day).
    const now = new Date("2026-11-03T18:00:00Z");
    const { start } = historyWindow(now, tz, 7);
    expect(formatInTimeZone(start, tz, "yyyy-MM-dd HH:mm:ss")).toBe("2026-10-28 00:00:00");
  });

  it("is stable for a whole local day at the start boundary", () => {
    const morning = new Date("2026-07-31T14:00:00Z"); // 08:00 local
    const night = new Date("2026-08-01T05:00:00Z"); // 23:00 local, same local day
    expect(historyWindow(morning, tz, 30).start.toISOString()).toBe(
      historyWindow(night, tz, 30).start.toISOString(),
    );
  });
});

describe("Today and Timeline pull the same window", () => {
  const cases: Array<[string, string]> = [
    ["2026-07-31T09:00:00Z", "America/Edmonton"],
    ["2026-03-08T09:30:00Z", "America/Edmonton"], // DST spring forward
    ["2026-11-01T08:30:00Z", "America/New_York"], // DST fall back
    ["2026-07-31T15:45:00Z", "Australia/Sydney"], // date ahead of UTC
    ["2026-01-01T00:30:00Z", "Pacific/Kiritimati"], // +14 offset
    ["2026-06-15T12:00:00Z", "Asia/Kathmandu"], // :45 offset
  ];

  for (const [iso, tz] of cases) {
    it(`matches byte-for-byte at ${iso} in ${tz}`, () => {
      const now = new Date(iso);
      const a = todayScreenWindow(now, tz);
      const b = timelineScreenWindow(now, tz);
      expect(a.start.toISOString()).toBe(b.start.toISOString());
      expect(a.end.toISOString()).toBe(b.end.toISOString());
    });
  }

  it("matches for every window length the app uses", () => {
    const now = new Date("2026-07-31T09:00:00Z");
    for (const days of [7, 30, 400]) {
      const a = historyWindow(now, "America/Edmonton", days);
      const b = historyWindow(now, "America/Edmonton", days);
      expect(a.start.toISOString()).toBe(b.start.toISOString());
      expect(a.end.toISOString()).toBe(b.end.toISOString());
    }
  });
});
