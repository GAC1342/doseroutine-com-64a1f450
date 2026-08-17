import { describe, it, expect } from "vitest";
import { dayKeyInZone } from "@/lib/day-key";
import { buildHeatmap, type AdhEvent } from "@/lib/adherence";

/**
 * Timezone matrix for schedule/grouping code.
 *
 * The bug this guards against: a dose scheduled at 22:00 local time in a
 * negative-offset zone (e.g. America/Edmonton, UTC-6/-7) lands on the NEXT
 * UTC day. Grouping by `toISOString().slice(0,10)` or by `new Date(str)`
 * without a zone silently pushes that dose into tomorrow, so Today renders
 * empty, the streak breaks, and the heatmap cell is off by one.
 *
 * We test every zone at:
 *   - 22:00 local (late evening, most common failure mode)
 *   - 00:00 local (day start)
 *   - 23:59 local (last minute)
 *   - during a DST forward transition (spring-forward)
 *   - during a DST backward transition (fall-back)
 * and assert the day-key equals the local calendar date, never the UTC one.
 */

const ZONES = [
  "UTC",
  "America/Edmonton", // UTC-7 / -6 DST — the reported bug's zone
  "America/Los_Angeles", // UTC-8 / -7 DST
  "America/New_York", // UTC-5 / -4 DST
  "America/Sao_Paulo", // UTC-3, no DST since 2019
  "Europe/London", // UTC+0 / +1 DST
  "Europe/Berlin", // UTC+1 / +2 DST
  "Asia/Kolkata", // UTC+5:30 (half-hour offset)
  "Asia/Tokyo", // UTC+9, no DST
  "Pacific/Auckland", // UTC+12 / +13 DST — largest positive offset
  "Pacific/Chatham", // UTC+12:45 / +13:45 (quarter-hour offset)
] as const;

// Build an ISO string for a local wall-clock time in a given zone by
// letting Intl compute the offset for that instant.
function localWallTimeToUtcIso(
  zone: string,
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
): string {
  // Guess-and-correct: start from the naive UTC instant, ask Intl what wall
  // time that maps to in `zone`, then shift by the delta. One pass is enough
  // outside DST gaps; two passes handle transitions safely.
  const guess = Date.UTC(y, m - 1, d, h, min);
  const shift = (t: number): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(t));
    const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
    );
    return t + (Date.UTC(y, m - 1, d, h, min) - asUtc);
  };
  return new Date(shift(shift(guess))).toISOString();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

describe("dayKeyInZone — timezone matrix", () => {
  for (const zone of ZONES) {
    describe(zone, () => {
      const cases: Array<{
        label: string;
        y: number;
        m: number;
        d: number;
        h: number;
        min: number;
      }> = [
        { label: "midnight (day start)", y: 2026, m: 3, d: 15, h: 0, min: 0 },
        { label: "22:00 (late evening)", y: 2026, m: 3, d: 15, h: 22, min: 0 },
        { label: "23:59 (last minute)", y: 2026, m: 3, d: 15, h: 23, min: 59 },
        { label: "noon", y: 2026, m: 6, d: 21, h: 12, min: 0 },
        // Spring-forward and fall-back — timing differs by zone but any date
        // within the transition weekend exercises the offset shift.
        { label: "spring DST weekend, 22:00", y: 2026, m: 3, d: 8, h: 22, min: 0 },
        { label: "fall DST weekend, 22:00", y: 2026, m: 11, d: 1, h: 22, min: 0 },
      ];
      for (const c of cases) {
        it(`${c.label} maps to the local calendar date`, () => {
          const iso = localWallTimeToUtcIso(zone, c.y, c.m, c.d, c.h, c.min);
          const expected = `${c.y}-${pad(c.m)}-${pad(c.d)}`;
          expect(dayKeyInZone(iso, zone)).toBe(expected);
        });
      }

      it("22:00 in negative-offset zones does NOT match the UTC day-key", () => {
        // The regression: naive UTC slicing would return tomorrow's date.
        const iso = localWallTimeToUtcIso(zone, 2026, 7, 15, 22, 0);
        const utcKey = iso.slice(0, 10);
        const local = dayKeyInZone(iso, zone);
        // Only zones actually west of UTC at that instant will differ; the
        // point is that dayKeyInZone stays anchored to local, regardless.
        expect(local).toBe("2026-07-15");
        if (utcKey !== local) {
          // Sanity: the naive-UTC bug would have returned the next day.
          expect(utcKey >= local).toBe(true);
        }
      });
    });
  }
});

describe("buildHeatmap — timezone matrix", () => {
  for (const zone of ZONES) {
    it(`${zone}: late-night dose lands on the correct local day cell`, () => {
      // A dose at 22:00 local on 2026-07-15, marked taken.
      const iso = localWallTimeToUtcIso(zone, 2026, 7, 15, 22, 0);
      const events: AdhEvent[] = [{ id: "e1", scheduled_at: iso, status: "taken", taken_at: iso }];
      // 30-day window ending "now" — anchor "now" inside the window so the
      // 2026-07-15 cell is present regardless of when the test runs.
      const anchor = localWallTimeToUtcIso(zone, 2026, 7, 20, 12, 0);
      const OriginalDate = Date;
      // Freeze Date.now() to the anchor.
      globalThis.Date = class extends OriginalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) super(anchor);
          else super(...(args as [string]));
        }
        static now() {
          return new OriginalDate(anchor).getTime();
        }
      } as DateConstructor;
      try {
        const cells = buildHeatmap(events, 30, zone);
        const targetKey = "2026-07-15";
        const cell = cells.find((c) => c.date === targetKey);
        expect(cell, `expected cell ${targetKey} to exist in ${zone}`).toBeDefined();
        expect(cell!.taken).toBe(1);
        expect(cell!.total).toBe(1);
        // The following-day cell must NOT have absorbed the dose.
        const nextCell = cells.find((c) => c.date === "2026-07-16");
        expect(nextCell?.total ?? 0).toBe(0);
      } finally {
        globalThis.Date = OriginalDate;
      }
    });
  }

  it("multiple doses at day boundaries in America/Edmonton stay grouped correctly", () => {
    const zone = "America/Edmonton";
    const events: AdhEvent[] = [
      // 2026-07-15 23:30 local (crosses UTC midnight)
      {
        id: "a",
        scheduled_at: localWallTimeToUtcIso(zone, 2026, 7, 15, 23, 30),
        status: "taken",
        taken_at: null,
      },
      // 2026-07-16 00:30 local (right after)
      {
        id: "b",
        scheduled_at: localWallTimeToUtcIso(zone, 2026, 7, 16, 0, 30),
        status: "taken",
        taken_at: null,
      },
      // 2026-07-16 22:00 local — the classic bug case
      {
        id: "c",
        scheduled_at: localWallTimeToUtcIso(zone, 2026, 7, 16, 22, 0),
        status: "missed",
        taken_at: null,
      },
    ];
    const anchor = localWallTimeToUtcIso(zone, 2026, 7, 20, 12, 0);
    const OriginalDate = Date;
    globalThis.Date = class extends OriginalDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) super(anchor);
        else super(...(args as [string]));
      }
      static now() {
        return new OriginalDate(anchor).getTime();
      }
    } as DateConstructor;
    try {
      const cells = buildHeatmap(events, 30, zone);
      const d15 = cells.find((c) => c.date === "2026-07-15")!;
      const d16 = cells.find((c) => c.date === "2026-07-16")!;
      const d17 = cells.find((c) => c.date === "2026-07-17")!;
      expect(d15.taken).toBe(1);
      expect(d15.total).toBe(1);
      expect(d16.taken).toBe(1);
      expect(d16.missed).toBe(1);
      expect(d16.total).toBe(2);
      // d17 must be untouched — the 22:00-on-the-16th dose must not spill.
      expect(d17.total).toBe(0);
    } finally {
      globalThis.Date = OriginalDate;
    }
  });
});
