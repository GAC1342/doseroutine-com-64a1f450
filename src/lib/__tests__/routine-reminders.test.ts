import { describe, expect, it } from "vitest";
import {
  isInQuietHours,
  localParts,
  routineAlertCopy,
  routineRemindersDue,
  type RoutineMealRow,
  type RoutineWorkoutRow,
} from "../routine-reminders";

function workout(over: Partial<RoutineWorkoutRow> = {}): RoutineWorkoutRow {
  return {
    id: "w1",
    user_id: "u1",
    label: "Push day",
    kind: "strength",
    planned_time: "17:30:00",
    days_of_week: [1, 3, 5],
    active: true,
    at_time_alert_on: true,
    pre_alert_on: false,
    pre_lead_min: 30,
    ...over,
  };
}

function meal(over: Partial<RoutineMealRow> = {}): RoutineMealRow {
  return {
    id: "m1",
    user_id: "u1",
    label: "Breakfast",
    planned_time: "08:00:00",
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    active: true,
    alerts_on: true,
    ...over,
  };
}

// 2026-07-31 is a Friday (weekday 5); 2026-08-01 is a Saturday.
const FRIDAY = "2026-07-31";
const SATURDAY = "2026-08-01";

function due(opts: {
  workouts?: RoutineWorkoutRow[];
  meals?: RoutineMealRow[];
  dayKey?: string;
  nowMinutes: number;
}) {
  return routineRemindersDue({
    workouts: opts.workouts ?? [],
    meals: opts.meals ?? [],
    dayKey: opts.dayKey ?? FRIDAY,
    nowMinutes: opts.nowMinutes,
  });
}

describe("routineRemindersDue — workouts", () => {
  it("fires at the exact scheduled minute", () => {
    expect(due({ workouts: [workout()], nowMinutes: 17 * 60 + 30 })).toHaveLength(1);
  });

  it("stays due through the 5-minute catch-up window", () => {
    expect(due({ workouts: [workout()], nowMinutes: 17 * 60 + 34 })).toHaveLength(1);
    expect(due({ workouts: [workout()], nowMinutes: 17 * 60 + 35 })).toHaveLength(0);
  });

  it("does not fire before the scheduled minute", () => {
    expect(due({ workouts: [workout()], nowMinutes: 17 * 60 + 29 })).toHaveLength(0);
  });

  it("skips inactive slots", () => {
    expect(due({ workouts: [workout({ active: false })], nowMinutes: 17 * 60 + 30 })).toHaveLength(
      0,
    );
  });

  it("skips slots with alerts switched off", () => {
    expect(
      due({ workouts: [workout({ at_time_alert_on: false })], nowMinutes: 17 * 60 + 30 }),
    ).toHaveLength(0);
  });

  it("skips days the slot does not repeat on", () => {
    expect(due({ workouts: [workout()], dayKey: SATURDAY, nowMinutes: 17 * 60 + 30 })).toHaveLength(
      0,
    );
  });

  it("skips ad-hoc sessions with no planned time", () => {
    expect(
      due({ workouts: [workout({ planned_time: null })], nowMinutes: 17 * 60 + 30 }),
    ).toHaveLength(0);
  });

  it("honours a pre-alert lead instead of the at-time alert", () => {
    const rows = [workout({ pre_alert_on: true, pre_lead_min: 30 })];
    expect(due({ workouts: rows, nowMinutes: 17 * 60 })).toHaveLength(1);
    expect(due({ workouts: rows, nowMinutes: 17 * 60 + 30 })).toHaveLength(0);
  });

  it("never emits two alerts for one slot in the same window", () => {
    const rows = [workout({ pre_alert_on: true, pre_lead_min: 5 })];
    const hits = [
      ...due({ workouts: rows, nowMinutes: 17 * 60 + 25 }),
      ...due({ workouts: rows, nowMinutes: 17 * 60 + 30 }),
    ];
    expect(hits).toHaveLength(1);
  });
});

describe("routineRemindersDue — meals", () => {
  it("fires at the scheduled minute on every repeat day", () => {
    expect(due({ meals: [meal()], dayKey: SATURDAY, nowMinutes: 8 * 60 })).toHaveLength(1);
  });

  it("skips meals with alerts switched off", () => {
    expect(due({ meals: [meal({ alerts_on: false })], nowMinutes: 8 * 60 })).toHaveLength(0);
  });

  it("skips inactive meals", () => {
    expect(due({ meals: [meal({ active: false })], nowMinutes: 8 * 60 })).toHaveLength(0);
  });

  it("treats an empty repeat pattern as every day", () => {
    expect(due({ meals: [meal({ days_of_week: [] })], nowMinutes: 8 * 60 })).toHaveLength(1);
  });
});

describe("routineRemindersDue — ordering and payload", () => {
  it("returns workouts and meals together with their identity intact", () => {
    const rows = due({
      workouts: [workout({ planned_time: "08:00:00", days_of_week: [5] })],
      meals: [meal()],
      nowMinutes: 8 * 60 + 1,
    });
    expect(rows.map((r) => `${r.routineKind}:${r.routineId}`).sort()).toEqual([
      "meal:m1",
      "workout:w1",
    ]);
    expect(rows.every((r) => r.userId === "u1")).toBe(true);
  });
});

describe("isInQuietHours", () => {
  it("handles a same-day window", () => {
    expect(isInQuietHours(60, "00:00", "07:00")).toBe(true);
    expect(isInQuietHours(8 * 60, "00:00", "07:00")).toBe(false);
  });
  it("handles a window that wraps midnight", () => {
    expect(isInQuietHours(23 * 60, "22:00", "07:00")).toBe(true);
    expect(isInQuietHours(3 * 60, "22:00", "07:00")).toBe(true);
    expect(isInQuietHours(12 * 60, "22:00", "07:00")).toBe(false);
  });
  it("is off when unset or equal", () => {
    expect(isInQuietHours(60, null, null)).toBe(false);
    expect(isInQuietHours(60, "22:00", "22:00")).toBe(false);
  });
});

describe("localParts", () => {
  it("reads the wall clock in the user's timezone, not UTC", () => {
    const now = new Date("2026-07-31T23:30:00Z");
    expect(localParts(now, "America/Edmonton")).toEqual({
      dayKey: "2026-07-31",
      minutes: 17 * 60 + 30,
    });
    expect(localParts(now, "UTC")).toEqual({ dayKey: "2026-07-31", minutes: 23 * 60 + 30 });
  });
});

describe("routineAlertCopy", () => {
  it("writes workout copy with the session type", () => {
    const [row] = due({ workouts: [workout()], nowMinutes: 17 * 60 + 30 });
    const copy = routineAlertCopy(row);
    expect(copy.title).toBe("Workout: Push day");
    expect(copy.body).toBe("strength session at 5:30 PM.");
    expect(copy.url).toBe("/fitness?view=workouts");
  });

  it("mentions the lead when it is a pre-alert", () => {
    const [row] = due({
      workouts: [workout({ pre_alert_on: true, pre_lead_min: 15 })],
      nowMinutes: 17 * 60 + 15,
    });
    expect(routineAlertCopy(row).body).toContain("in 15 min");
  });

  it("writes meal copy pointing at Today", () => {
    const [row] = due({ meals: [meal()], nowMinutes: 8 * 60 });
    const copy = routineAlertCopy(row);
    expect(copy.title).toBe("Meal: Breakfast");
    expect(copy.body).toBe("Scheduled for 8:00 AM.");
    expect(copy.url).toBe("/today");
  });
});
