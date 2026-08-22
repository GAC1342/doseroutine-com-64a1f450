import { describe, expect, it } from "vitest";

import {
  formatPlannedDetail,
  plannedSessionsForDay,
  summarizePlannedSession,
} from "@/lib/planned-day-exercises";
import type { RoutineOccurrence } from "@/lib/routine-schedule";
import type { WorkoutTemplate } from "@/lib/workout-templates";

const metric = { toDisplay: (kg: number) => kg, label: "kg" };

function occurrence(over: Partial<RoutineOccurrence> = {}): RoutineOccurrence {
  return {
    id: "sess-1",
    key: "workout:sess-1:2026-08-29",
    kind: "workout",
    label: "Leg day",
    time: "17:30",
    scheduledAt: new Date("2026-08-29T23:30:00Z"),
    sessionKind: "strength",
    templateId: "tpl-1",
    ...over,
  };
}

function template(): WorkoutTemplate {
  return {
    id: "tpl-1",
    name: "Lower body A",
    workout_type: "strength",
    duration_min: 45,
    rpe: null,
    calories: null,
    distance_m: null,
    target_pace_s: null,
    target_hr: null,
    notes: null,
    use_count: 3,
    last_used_at: null,
    exercises: [
      {
        id: "e2",
        template_id: "tpl-1",
        exercise: "Romanian deadlift",
        set_index: 2,
        sets: 3,
        reps: 10,
        weight_kg: 60,
        rest_seconds: 90,
        tempo: null,
      },
      {
        id: "e1",
        template_id: "tpl-1",
        exercise: "Back squat",
        set_index: 1,
        sets: 5,
        reps: 5,
        weight_kg: 100,
        rest_seconds: null,
        tempo: null,
      },
      {
        id: "e3",
        template_id: "tpl-1",
        exercise: "   ",
        set_index: 3,
        sets: null,
        reps: null,
        weight_kg: null,
        rest_seconds: null,
        tempo: null,
      },
    ],
  };
}

describe("plannedSessionsForDay", () => {
  it("expands a scheduled workout into its movements, in saved order", () => {
    const [session] = plannedSessionsForDay([occurrence()], [template()], metric);
    expect(session.exercises.map((e) => e.name)).toEqual(["Back squat", "Romanian deadlift"]);
    expect(session.templateName).toBe("Lower body A");
  });

  it("drops blank exercise rows so no empty illustration slot renders", () => {
    const [session] = plannedSessionsForDay([occurrence()], [template()], metric);
    expect(session.exercises).toHaveLength(2);
  });

  it("keeps sessions with no routine attached so the UI can prompt", () => {
    const [session] = plannedSessionsForDay(
      [occurrence({ templateId: null })],
      [template()],
      metric,
    );
    expect(session.exercises).toEqual([]);
    expect(session.templateName).toBeNull();
    expect(summarizePlannedSession(session)).toBe("strength");
  });

  it("keeps sessions whose template row has not loaded or was deleted", () => {
    const [session] = plannedSessionsForDay([occurrence({ templateId: "gone" })], [], metric);
    expect(session.exercises).toEqual([]);
  });

  it("ignores meal anchors — they render on their own row", () => {
    const sessions = plannedSessionsForDay(
      [occurrence(), occurrence({ kind: "meal", key: "meal:m1:2026-08-29", id: "m1" })],
      [template()],
      metric,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe("sess-1");
  });

  it("converts weights into the user's unit system", () => {
    const imperial = { toDisplay: (kg: number) => kg * 2.20462, label: "lb" };
    const [session] = plannedSessionsForDay([occurrence()], [template()], imperial);
    expect(session.exercises[0].detail).toContain("220.5 lb");
  });

  it("summarises exercise count and routine name", () => {
    const [session] = plannedSessionsForDay([occurrence()], [template()], metric);
    expect(summarizePlannedSession(session)).toBe("2 exercises · Lower body A");
  });
});

describe("formatPlannedDetail", () => {
  it("formats sets, reps, load, tempo and rest", () => {
    expect(
      formatPlannedDetail(
        { sets: 3, reps: 10, weight_kg: 60, rest_seconds: 90, tempo: "3-1-1" },
        metric,
      ),
    ).toBe("3 × 10 · @ 60 kg · 3-1-1 · 90s rest");
  });

  it("degrades gracefully when only part of the prescription exists", () => {
    expect(
      formatPlannedDetail(
        { sets: 4, reps: null, weight_kg: null, rest_seconds: null, tempo: null },
        metric,
      ),
    ).toBe("4 sets");
    expect(
      formatPlannedDetail(
        { sets: null, reps: 12, weight_kg: null, rest_seconds: null, tempo: null },
        metric,
      ),
    ).toBe("12 reps");
    expect(
      formatPlannedDetail(
        { sets: null, reps: null, weight_kg: null, rest_seconds: null, tempo: null },
        metric,
      ),
    ).toBe("");
  });
});
