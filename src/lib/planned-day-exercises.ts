/**
 * Turns the calendar's scheduled routine rows into something a human can act
 * on: the actual movements each planned session contains, so tapping a day
 * shows "Back squat, Romanian deadlift, Leg curl" with their illustrations
 * instead of a bare "2:02 PM · Workout · Strength" line.
 *
 * Pure and template-driven, so the calendar, the day sheet and the tests all
 * agree on what a scheduled workout actually is.
 */

import type { RoutineOccurrence } from "@/lib/routine-schedule";
import type { WorkoutTemplate, WorkoutTemplateExerciseRow } from "@/lib/workout-templates";

export type PlannedExercise = {
  /** Movement name, exactly as saved on the routine. */
  name: string;
  /** "3×10 @ 60 kg"-style detail, already unit-formatted by the caller. */
  detail: string;
};

export type PlannedSession = {
  /** Matches the RoutineOccurrence key, stable per day. */
  key: string;
  sessionId: string;
  label: string;
  time: string;
  sessionKind: string | null;
  templateId: string | null;
  /** Name of the saved routine backing this slot, when one is attached. */
  templateName: string | null;
  exercises: PlannedExercise[];
};

function round(value: number, places = 1): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

/** "3 × 10 @ 60 kg · 90s rest" for one planned exercise row. */
export function formatPlannedDetail(
  row: Pick<WorkoutTemplateExerciseRow, "sets" | "reps" | "weight_kg" | "rest_seconds" | "tempo">,
  weight: { toDisplay: (kg: number) => number; label: string },
): string {
  const parts: string[] = [];
  if (row.sets && row.reps) parts.push(`${row.sets} × ${round(row.reps, 0)}`);
  else if (row.sets) parts.push(`${row.sets} sets`);
  else if (row.reps) parts.push(`${round(row.reps, 0)} reps`);
  if (row.weight_kg) parts.push(`@ ${round(weight.toDisplay(row.weight_kg), 1)} ${weight.label}`);
  if (row.tempo) parts.push(row.tempo);
  if (row.rest_seconds) parts.push(`${row.rest_seconds}s rest`);
  return parts.join(" · ");
}

/**
 * Pairs each scheduled workout occurrence with the exercises of the routine
 * it runs. Meals are dropped — they have their own row in the day panel — and
 * sessions without a saved routine still come back (with an empty list) so the
 * UI can offer to attach one instead of silently showing nothing.
 */
export function plannedSessionsForDay(
  occurrences: readonly RoutineOccurrence[],
  templates: readonly WorkoutTemplate[],
  weight: { toDisplay: (kg: number) => number; label: string },
): PlannedSession[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  return occurrences
    .filter((occ) => occ.kind === "workout")
    .map((occ) => {
      const template = occ.templateId ? byId.get(occ.templateId) : undefined;
      const exercises = [...(template?.exercises ?? [])]
        .sort((a, b) => a.set_index - b.set_index)
        .map((row) => ({
          name: (row.exercise ?? "").trim(),
          detail: formatPlannedDetail(row, weight),
        }))
        .filter((row) => row.name.length > 0);
      return {
        key: occ.key,
        sessionId: occ.id,
        label: occ.label,
        time: occ.time,
        sessionKind: occ.sessionKind,
        templateId: occ.templateId,
        templateName: template?.name ?? null,
        exercises,
      };
    });
}

/** Short summary line: "5 exercises · Leg day" or the prompt to attach one. */
export function summarizePlannedSession(session: PlannedSession): string {
  const bits: string[] = [];
  if (session.exercises.length > 0) {
    bits.push(`${session.exercises.length} exercise${session.exercises.length === 1 ? "" : "s"}`);
  }
  if (session.templateName) bits.push(session.templateName);
  else if (session.sessionKind) bits.push(session.sessionKind);
  return bits.join(" · ");
}
