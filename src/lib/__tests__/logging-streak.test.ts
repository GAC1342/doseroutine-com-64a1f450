import { describe, expect, it } from "vitest";
import {
  DEFAULT_NUDGE_SETTINGS,
  computeLoggingStreak,
  pickLoggingNudge,
  nudgeTimeField,
  snoozeFor,
  snoozeUntilTomorrow,
} from "@/lib/logging-streak";

describe("computeLoggingStreak", () => {
  it("counts consecutive days ending today", () => {
    const s = computeLoggingStreak(["2026-03-01", "2026-03-02", "2026-03-03"], "2026-03-03");
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
    expect(s.todayEmpty).toBe(false);
  });

  it("keeps the streak alive when today is still empty", () => {
    const s = computeLoggingStreak(["2026-03-01", "2026-03-02"], "2026-03-03");
    expect(s.current).toBe(2);
    expect(s.todayEmpty).toBe(true);
  });

  it("breaks on a gap", () => {
    const s = computeLoggingStreak(["2026-02-25", "2026-03-02", "2026-03-03"], "2026-03-03");
    expect(s.current).toBe(2);
    expect(s.best).toBe(2);
    expect(s.last7).toBe(3);
  });
});

describe("pickLoggingNudge", () => {
  const at = (h: number, m = 0) => new Date(2026, 2, 3, h, m);

  it("prioritises overdue doses", () => {
    const nudge = pickLoggingNudge({
      now: at(12),
      settings: DEFAULT_NUDGE_SETTINGS,
      loggedSlots: new Set(),
      overdueDoses: 2,
    });
    expect(nudge?.kind).toBe("dose");
  });

  it("nudges the latest missed meal slot only", () => {
    const nudge = pickLoggingNudge({
      now: at(15),
      settings: DEFAULT_NUDGE_SETTINGS,
      loggedSlots: new Set(["breakfast"]),
      overdueDoses: 0,
    });
    expect(nudge?.slot).toBe("lunch");
  });

  it("stays quiet before the cut-off and during quiet hours", () => {
    expect(
      pickLoggingNudge({
        now: at(8),
        settings: DEFAULT_NUDGE_SETTINGS,
        loggedSlots: new Set(),
        overdueDoses: 0,
      }),
    ).toBeNull();
    expect(
      pickLoggingNudge({
        now: at(22),
        settings: DEFAULT_NUDGE_SETTINGS,
        loggedSlots: new Set(),
        overdueDoses: 0,
      }),
    ).toBeNull();
  });

  it("respects the meal toggle", () => {
    expect(
      pickLoggingNudge({
        now: at(15),
        settings: { ...DEFAULT_NUDGE_SETTINGS, meals_enabled: false },
        loggedSlots: new Set(),
        overdueDoses: 0,
      }),
    ).toBeNull();
  });
});

describe("snooze", () => {
  const base = {
    ...DEFAULT_NUDGE_SETTINGS,
  };

  it("suppresses nudges while the snooze is active", () => {
    const now = new Date("2026-05-01T15:00:00");
    const nudge = pickLoggingNudge({
      now,
      settings: { ...base, snoozed_until: new Date(now.getTime() + 30 * 60_000).toISOString() },
      loggedSlots: new Set<string>(),
      overdueDoses: 2,
    });
    expect(nudge).toBeNull();
  });

  it("resumes once the snooze has passed", () => {
    const now = new Date("2026-05-01T15:00:00");
    const nudge = pickLoggingNudge({
      now,
      settings: { ...base, snoozed_until: new Date(now.getTime() - 60_000).toISOString() },
      loggedSlots: new Set<string>(),
      overdueDoses: 2,
    });
    expect(nudge?.kind).toBe("dose");
  });

  it("snoozeFor and snoozeUntilTomorrow return future times", () => {
    const now = new Date("2026-05-01T15:00:00");
    expect(new Date(snoozeFor(60, now)).getTime()).toBe(now.getTime() + 3_600_000);
    const tomorrow = new Date(snoozeUntilTomorrow(now));
    expect(tomorrow.getDate()).toBe(2);
    expect(tomorrow.getHours()).toBe(6);
  });

  it("maps a meal nudge to the right cut-off field", () => {
    expect(nudgeTimeField({ kind: "meal", slot: "lunch", text: "" })).toBe("lunch_by");
    expect(nudgeTimeField({ kind: "dose", text: "" })).toBeNull();
  });
});
