import { describe, it, expect } from "vitest";
import {
  findDayConsistencyViolations,
  assertDayConsistency,
  type ConsistencyEvent,
} from "@/lib/schedule-consistency";

// Helper: build a UTC ISO for a wall-clock time in a zone.
function localIso(zone: string, y: number, m: number, d: number, h: number, min: number): string {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const shift = (t: number) => {
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
    return t + (guess - asUtc);
  };
  return new Date(shift(shift(guess))).toISOString();
}

const UC = "uc-1";
const ZONE = "America/Edmonton";

describe("findDayConsistencyViolations", () => {
  it("passes when each (uc, local day, slot) has exactly one row", () => {
    const events: ConsistencyEvent[] = [
      {
        id: "a",
        user_compound_id: UC,
        scheduled_at: localIso(ZONE, 2026, 7, 15, 10, 0),
        status: "taken",
      },
      {
        id: "b",
        user_compound_id: UC,
        scheduled_at: localIso(ZONE, 2026, 7, 15, 22, 0),
        status: "pending",
      },
      {
        id: "c",
        user_compound_id: UC,
        scheduled_at: localIso(ZONE, 2026, 7, 16, 10, 0),
        status: "missed",
      },
    ];
    expect(findDayConsistencyViolations(events, ZONE)).toEqual([]);
    expect(() => assertDayConsistency(events, ZONE)).not.toThrow();
  });

  it("flags a slot that is BOTH pending and missed (the reported bug)", () => {
    const iso = localIso(ZONE, 2026, 7, 15, 22, 0);
    const events: ConsistencyEvent[] = [
      { id: "a", user_compound_id: UC, scheduled_at: iso, status: "pending" },
      { id: "b", user_compound_id: UC, scheduled_at: iso, status: "missed" },
    ];
    const v = findDayConsistencyViolations(events, ZONE);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("pending_and_missed");
    expect(v[0].local_day).toBe("2026-07-15");
    expect(v[0].slot).toBe("22:00");
    expect(v[0].event_ids.sort()).toEqual(["a", "b"]);
    expect(() => assertDayConsistency(events, ZONE)).toThrow(/pending_and_missed/);
  });

  it("catches the bug even when the two rows differ by seconds/timezone offset", () => {
    // Two schedule_events at 22:00:00 and 22:00:30 UTC-adjacent — same local slot.
    const iso1 = localIso(ZONE, 2026, 7, 15, 22, 0);
    const iso2 = new Date(new Date(iso1).getTime() + 30_000).toISOString();
    const events: ConsistencyEvent[] = [
      { id: "a", user_compound_id: UC, scheduled_at: iso1, status: "pending" },
      { id: "b", user_compound_id: UC, scheduled_at: iso2, status: "missed" },
    ];
    // 22:00 vs 22:00 slot (HH:mm) — same group.
    const v = findDayConsistencyViolations(events, ZONE);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("pending_and_missed");
  });

  it("does NOT confuse a 22:00 local dose with the next UTC day", () => {
    // A pending dose at 22:00 America/Edmonton is in UTC 04:00 next day.
    // A separate pending dose on the ACTUAL next local day at 10:00 must not
    // be grouped with it.
    const events: ConsistencyEvent[] = [
      {
        id: "a",
        user_compound_id: UC,
        scheduled_at: localIso(ZONE, 2026, 7, 15, 22, 0),
        status: "pending",
      },
      {
        id: "b",
        user_compound_id: UC,
        scheduled_at: localIso(ZONE, 2026, 7, 16, 10, 0),
        status: "missed",
      },
    ];
    expect(findDayConsistencyViolations(events, ZONE)).toEqual([]);
  });

  it("flags duplicate terminal statuses on the same slot", () => {
    const iso = localIso(ZONE, 2026, 7, 15, 10, 0);
    const events: ConsistencyEvent[] = [
      { id: "a", user_compound_id: UC, scheduled_at: iso, status: "taken" },
      { id: "b", user_compound_id: UC, scheduled_at: iso, status: "taken" },
    ];
    const v = findDayConsistencyViolations(events, ZONE);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("duplicate_terminal");
  });

  it("scopes groups by user_compound_id — different compounds at same slot are fine", () => {
    const iso = localIso(ZONE, 2026, 7, 15, 10, 0);
    const events: ConsistencyEvent[] = [
      { id: "a", user_compound_id: "uc-1", scheduled_at: iso, status: "pending" },
      { id: "b", user_compound_id: "uc-2", scheduled_at: iso, status: "missed" },
    ];
    expect(findDayConsistencyViolations(events, ZONE)).toEqual([]);
  });

  it("ignores rows with a null user_compound_id (ad-hoc entries)", () => {
    const iso = localIso(ZONE, 2026, 7, 15, 10, 0);
    const events: ConsistencyEvent[] = [
      { id: "a", user_compound_id: null, scheduled_at: iso, status: "pending" },
      { id: "b", user_compound_id: null, scheduled_at: iso, status: "missed" },
    ];
    expect(findDayConsistencyViolations(events, ZONE)).toEqual([]);
  });

  it("works across multiple zones with the same event list", () => {
    // A dose at 22:00 UTC on 2026-07-15 is 16:00 America/Edmonton same day,
    // but 07:00 next day in Pacific/Auckland (UTC+12). Grouping still holds
    // per-zone because the slot key uses the same zone as the day.
    const iso = "2026-07-15T22:00:00.000Z";
    const events: ConsistencyEvent[] = [
      { id: "a", user_compound_id: UC, scheduled_at: iso, status: "pending" },
      { id: "b", user_compound_id: UC, scheduled_at: iso, status: "missed" },
    ];
    for (const z of ["UTC", "America/Edmonton", "Pacific/Auckland", "Asia/Kolkata"]) {
      const v = findDayConsistencyViolations(events, z);
      expect(v, `zone ${z}`).toHaveLength(1);
      expect(v[0].kind).toBe("pending_and_missed");
    }
  });
});
