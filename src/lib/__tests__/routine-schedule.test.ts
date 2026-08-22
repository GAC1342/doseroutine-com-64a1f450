import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import {
  describeDays,
  formatRoutineTime,
  normalizeTime,
  occursOnDay,
  routineForDay,
  routineForRange,
  weekdayOfDayKey,
  type MealTimeRow,
  type WorkoutSessionRow,
} from "../routine-schedule";

function workout(over: Partial<WorkoutSessionRow>): WorkoutSessionRow {
  return {
    id: "w1",
    user_id: "u1",
    label: "Push day",
    kind: "strength",
    planned_time: "17:30:00",
    days_of_week: [1, 3, 5],
    active: true,
    at_time_alert_on: true,
    pre_alert_on: true,
    pre_lead_min: 30,
    post_window_min: 60,
    created_at: null,
    started_at: null,
    ended_at: null,
    ...over,
  } as WorkoutSessionRow;
}

function meal(over: Partial<MealTimeRow>): MealTimeRow {
  return {
    id: "m1",
    user_id: "u1",
    label: "Breakfast",
    planned_time: "08:00:00",
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    active: true,
    sort_order: 0,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...over,
  } as MealTimeRow;
}

describe("weekdayOfDayKey", () => {
  it("maps calendar dates to weekdays with Sunday = 0", () => {
    expect(weekdayOfDayKey("2026-07-31")).toBe(5); // Friday
    expect(weekdayOfDayKey("2026-08-02")).toBe(0); // Sunday
    expect(weekdayOfDayKey("nope")).toBeNull();
  });
});

describe("occursOnDay", () => {
  it("respects the selected weekdays", () => {
    expect(occursOnDay([1, 3, 5], "2026-07-31")).toBe(true); // Friday
    expect(occursOnDay([1, 3, 5], "2026-08-01")).toBe(false); // Saturday
  });
  it("treats empty/null as every day", () => {
    expect(occursOnDay(null, "2026-08-01")).toBe(true);
    expect(occursOnDay([], "2026-08-01")).toBe(true);
  });
});

describe("normalizeTime", () => {
  it("normalises Postgres TIME values", () => {
    expect(normalizeTime("08:00:00")).toBe("08:00");
    expect(normalizeTime("8:05")).toBe("08:05");
    expect(normalizeTime(null)).toBeNull();
    expect(normalizeTime("99:99")).toBeNull();
  });
});

describe("formatRoutineTime", () => {
  it("renders 12-hour labels", () => {
    expect(formatRoutineTime("00:00")).toBe("12:00 AM");
    expect(formatRoutineTime("08:05")).toBe("8:05 AM");
    expect(formatRoutineTime("12:00")).toBe("12:00 PM");
    expect(formatRoutineTime("17:30")).toBe("5:30 PM");
  });
});

describe("routineForDay", () => {
  const tz = "America/Edmonton";

  it("returns matching workouts and meals sorted by time", () => {
    const rows = routineForDay(
      [workout({})],
      [meal({}), meal({ id: "m2", label: "Dinner", planned_time: "19:00:00" })],
      "2026-07-31",
      tz,
    );
    expect(rows.map((r) => `${r.kind}:${r.label}`)).toEqual([
      "meal:Breakfast",
      "workout:Push day",
      "meal:Dinner",
    ]);
  });

  it("skips inactive rows — the on/off toggle", () => {
    expect(routineForDay([workout({ active: false })], [], "2026-07-31", tz)).toHaveLength(0);
    expect(routineForDay([], [meal({ active: false })], "2026-07-31", tz)).toHaveLength(0);
  });

  it("skips rows with no planned time (ad-hoc sessions)", () => {
    expect(routineForDay([workout({ planned_time: null })], [], "2026-07-31", tz)).toHaveLength(0);
  });

  it("skips days the routine does not repeat on", () => {
    expect(routineForDay([workout({})], [], "2026-08-01", tz)).toHaveLength(0);
  });

  it("anchors the instant to the user's timezone, not the device", () => {
    const [row] = routineForDay([workout({})], [], "2026-07-31", tz);
    expect(formatInTimeZone(row.scheduledAt, tz, "yyyy-MM-dd HH:mm")).toBe("2026-07-31 17:30");
  });

  it("gives every occurrence a stable per-day key", () => {
    const [row] = routineForDay([workout({})], [], "2026-07-31", tz);
    expect(row.key).toBe("workout:w1:2026-07-31");
  });

  it("falls back to a generic label when none is set", () => {
    const [row] = routineForDay([workout({ label: "  " })], [], "2026-07-31", tz);
    expect(row.label).toBe("Workout");
  });
});

describe("describeDays", () => {
  it("summarises common patterns", () => {
    expect(describeDays(null)).toBe("Every day");
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(describeDays([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(describeDays([0, 6])).toBe("Weekends");
    expect(describeDays([1, 3, 5])).toBe("Mon, Wed, Fri");
  });
});

describe("routineForRange", () => {
  it("returns occurrences per day and omits days with nothing on them", () => {
    const days = ["2026-08-03", "2026-08-04", "2026-08-05"]; // Mon, Tue, Wed
    const map = routineForRange([workout({ days_of_week: [1, 3] })], [], days, "America/Edmonton");
    expect([...map.keys()]).toEqual(["2026-08-03", "2026-08-05"]);
    expect(map.get("2026-08-03")).toHaveLength(1);
    expect(map.get("2026-08-04")).toBeUndefined();
  });

  it("includes meal anchors alongside workouts", () => {
    const map = routineForRange(
      [workout({ days_of_week: [1] })],
      [meal({ days_of_week: [1] })],
      ["2026-08-03"],
      "America/Edmonton",
    );
    expect(map.get("2026-08-03")?.map((o) => o.kind)).toEqual(["meal", "workout"]);
  });
});
