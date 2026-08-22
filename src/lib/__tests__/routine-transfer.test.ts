import { describe, expect, it } from "vitest";

import {
  ROUTINE_BACKUP_KIND,
  backupFilename,
  buildRoutineBackup,
  parseRoutineBackup,
  uniqueName,
} from "@/lib/routine-transfer";
import { datesThisWeek } from "@/lib/routine-recurrence";
import { routineRemindersDue, type RoutineWorkoutRow } from "@/lib/routine-reminders";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const template: any = {
  id: "t1",
  name: "Push day",
  workout_type: "strength",
  duration_min: 45,
  rpe: null,
  calories: null,
  distance_m: null,
  target_pace_s: null,
  target_hr: null,
  notes: null,
  use_count: 2,
  last_used_at: null,
  exercises: [
    {
      id: "e2",
      template_id: "t1",
      exercise: "Bench press",
      set_index: 1,
      sets: 3,
      reps: 8,
      weight_kg: 60,
      rest_seconds: 90,
      tempo: null,
    },
    {
      id: "e1",
      template_id: "t1",
      exercise: "Warm-up",
      set_index: 0,
      sets: 1,
      reps: 10,
      weight_kg: null,
      rest_seconds: null,
      tempo: null,
    },
  ],
};

const assignment = {
  id: "s1",
  templateId: "t1",
  label: "Push day",
  time: "18:00",
  weekdays: [1, 3],
  durationMin: 45,
  intervalWeeks: 2,
  anchorDate: "2026-08-17",
  repeatUntil: null,
  skippedDates: [],
  timeOverrides: { 3: "06:30" },
};

describe("routine export / import", () => {
  it("exports templates and their repeat rules", () => {
    const backup = buildRoutineBackup([template], [assignment], new Date("2026-08-20T00:00:00Z"));
    expect(backup.kind).toBe(ROUTINE_BACKUP_KIND);
    expect(backup.templates[0]?.exercises.map((e) => e.exercise)).toEqual([
      "Warm-up",
      "Bench press",
    ]);
    expect(backup.schedules[0]).toMatchObject({
      templateName: "Push day",
      weekdays: [1, 3],
      intervalWeeks: 2,
      timeOverrides: { "3": "06:30" },
    });
    expect(backupFilename(new Date("2026-08-20T00:00:00Z"))).toBe(
      "doseroutine-routines-2026-08-20.json",
    );
  });

  it("round-trips through the parser", () => {
    const backup = buildRoutineBackup([template], [assignment]);
    const parsed = parseRoutineBackup(JSON.stringify(backup));
    expect(parsed.templates).toHaveLength(1);
    expect(parsed.schedules[0]?.time).toBe("18:00");
  });

  it("rejects files that are not routine backups", () => {
    expect(() => parseRoutineBackup("nope")).toThrow(/valid JSON/);
    expect(() => parseRoutineBackup(JSON.stringify({ kind: "other" }))).toThrow(/routine backup/);
    expect(() =>
      parseRoutineBackup(JSON.stringify({ kind: ROUTINE_BACKUP_KIND, templates: [] })),
    ).toThrow(/no routines/);
  });

  it("drops schedules pointing at missing routines", () => {
    const parsed = parseRoutineBackup(
      JSON.stringify({
        kind: ROUTINE_BACKUP_KIND,
        version: 1,
        templates: [{ name: "Legs", exercises: [] }],
        schedules: [
          { templateName: "Ghost", weekdays: [1], time: "07:00" },
          { templateName: "Legs", weekdays: [2], time: "07:00" },
        ],
      }),
    );
    expect(parsed.schedules.map((s) => s.templateName)).toEqual(["Legs"]);
  });

  it("never silently overwrites an existing routine name", () => {
    expect(uniqueName("Push day", new Set())).toBe("Push day");
    expect(uniqueName("Push day", new Set(["Push day"]))).toBe("Push day (imported)");
    expect(uniqueName("Push day", new Set(["Push day", "Push day (imported)"]))).toBe(
      "Push day (imported) 2",
    );
  });
});

describe("this-week-only scope", () => {
  it("lists only the remaining matching dates in the current week", () => {
    expect(datesThisWeek([1, 3, 5], "2026-08-19")).toEqual(["2026-08-19", "2026-08-21"]);
    expect(datesThisWeek([1], "2026-08-19")).toEqual([]);
  });
});

describe("reminders honour recurrence", () => {
  const base: RoutineWorkoutRow = {
    id: "s1",
    user_id: "u1",
    label: "Push day",
    kind: "strength",
    planned_time: "18:00:00",
    days_of_week: [3],
    active: true,
    at_time_alert_on: true,
    pre_alert_on: false,
    pre_lead_min: null,
    interval_weeks: 2,
    anchor_date: "2026-08-17",
    skipped_dates: [],
    time_overrides: {},
  };

  function due(row: RoutineWorkoutRow, dayKey: string, minutes: number) {
    return routineRemindersDue({ workouts: [row], meals: [], dayKey, nowMinutes: minutes });
  }

  it("fires on an on-week day", () => {
    expect(due(base, "2026-08-19", 18 * 60)).toHaveLength(1);
  });

  it("stays quiet on an off-week", () => {
    expect(due(base, "2026-08-26", 18 * 60)).toHaveLength(0);
  });

  it("stays quiet on a skipped date", () => {
    expect(due({ ...base, skipped_dates: ["2026-08-19"] }, "2026-08-19", 18 * 60)).toHaveLength(0);
  });

  it("uses the override time for that day", () => {
    const row = { ...base, time_overrides: { "2026-08-19": "06:30" } };
    expect(due(row, "2026-08-19", 18 * 60)).toHaveLength(0);
    const hit = due(row, "2026-08-19", 6 * 60 + 30);
    expect(hit[0]?.time).toBe("06:30");
  });
});
