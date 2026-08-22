/**
 * One-tap "Add to workout" plumbing.
 *
 * Three destinations exist for an exercise you just found in the library:
 *   1. today's workout log (already handled by WorkoutLogSheet),
 *   2. a saved routine / template you reuse,
 *   3. a recurring day on the weekly calendar.
 *
 * Only (1) was reachable without re-typing everything, which is why building a
 * routine felt slower than it used to. These helpers make (2) and (3) a single
 * tap: append to an existing template, spin up a new one from the current
 * picks, or drop a recurring session on a weekday.
 */

import { supabase } from "@/integrations/supabase/client";
import { saveWorkoutTemplate, type WorkoutTemplate } from "@/lib/workout-templates";
import { normalizeTime } from "@/lib/routine-schedule";

/** Trim, drop blanks, and de-duplicate case-insensitively (order preserved). */
export function normalizeExerciseNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Names not already present on the template, so re-tapping never duplicates. */
export function newExercisesFor(template: WorkoutTemplate, names: string[]): string[] {
  const existing = new Set(template.exercises.map((e) => e.exercise.trim().toLowerCase()));
  return normalizeExerciseNames(names).filter((n) => !existing.has(n.toLowerCase()));
}

/**
 * Appends exercises to an existing template, keeping its other rows intact.
 * Returns how many were actually added (already-present ones are skipped).
 */
export async function appendExercisesToTemplate(
  template: WorkoutTemplate,
  names: string[],
): Promise<{ added: number; rowIds: string[] }> {
  const toAdd = newExercisesFor(template, names);
  if (toAdd.length === 0) return { added: 0, rowIds: [] };

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You need to be signed in");

  const start = template.exercises.reduce((max, e) => Math.max(max, e.set_index + 1), 0);
  const rows = toAdd.map((exercise, i) => ({
    template_id: template.id,
    user_id: userId,
    exercise,
    set_index: start + i,
    sets: 3,
    reps: 10,
    weight_kg: null,
    rest_seconds: 90,
    tempo: null,
  }));

  const { data, error } = await supabase
    .from("workout_template_exercises")
    .insert(rows)
    .select("id");
  if (error) throw error;
  return { added: rows.length, rowIds: (data ?? []).map((r) => r.id) };
}

/** Undo for {@link appendExercisesToTemplate}: removes just the rows we added. */
export async function removeTemplateExercises(rowIds: string[]): Promise<void> {
  if (rowIds.length === 0) return;
  const { error } = await supabase.from("workout_template_exercises").delete().in("id", rowIds);
  if (error) throw error;
}

/** Creates a brand-new routine seeded with the picked exercises. */
export async function createRoutineFromPicks(name: string, names: string[]): Promise<string> {
  const exercises = normalizeExerciseNames(names);
  if (exercises.length === 0) throw new Error("Pick at least one exercise");
  return saveWorkoutTemplate({
    name: name.trim() || "New routine",
    workoutType: "strength",
    durationMin: null,
    rpe: null,
    calories: null,
    distanceM: null,
    targetPaceS: null,
    targetHr: null,
    notes: null,
    exercises: exercises.map((exercise) => ({
      exercise,
      sets: 3,
      reps: 10,
      weightKg: null,
      restSeconds: 90,
      tempo: null,
    })),
  });
}

export const DEFAULT_WORKOUT_TIME = "17:30";

/**
 * Adds a recurring session to the weekly calendar.
 * `weekdays` uses JS day numbers (0 = Sunday), matching `days_of_week`.
 */
export async function scheduleWorkoutOnDays(input: {
  label: string;
  weekdays: number[];
  time?: string;
  kind?: string;
  durationMin?: number | null;
  /** Saved routine that supplies the exercises for every occurrence. */
  templateId?: string;
  /** Existing rows to replace instead of stacking a second entry on the slot. */
  replaceIds?: string[];
  intervalWeeks?: number;
  anchorDate?: string;
  repeatUntil?: string | null;
}): Promise<string> {
  const time = normalizeTime(input.time ?? DEFAULT_WORKOUT_TIME) ?? DEFAULT_WORKOUT_TIME;
  const weekdays = [...new Set(input.weekdays)].sort((a, b) => a - b);
  if (weekdays.length === 0) throw new Error("Pick at least one day");
  if (!input.templateId) throw new Error("Pick at least one exercise for this routine");

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You need to be signed in");

  if (input.replaceIds && input.replaceIds.length > 0) {
    const { error: delError } = await supabase
      .from("workout_sessions")
      .delete()
      .in("id", input.replaceIds);
    if (delError) throw delError;
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      label: input.label.trim() || "Workout",
      planned_time: `${time}:00`,
      days_of_week: weekdays,
      kind: input.kind ?? "strength",
      duration_min: input.durationMin ?? null,
      template_id: input.templateId ?? null,
      interval_weeks: Math.min(4, Math.max(1, Math.round(input.intervalWeeks ?? 1))),
      anchor_date: input.anchorDate ?? new Date().toISOString().slice(0, 10),
      repeat_until: input.repeatUntil || null,
      active: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Hides one date from a repeating routine without deleting the saved series. */
export async function skipScheduledWorkoutOccurrence(id: string, dayKey: string): Promise<void> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("skipped_dates")
    .eq("id", id)
    .single();
  if (error) throw error;
  const dates = new Set((data.skipped_dates ?? []).map((date) => String(date).slice(0, 10)));
  dates.add(dayKey);
  const { error: updateError } = await supabase
    .from("workout_sessions")
    .update({ skipped_dates: [...dates].sort() })
    .eq("id", id);
  if (updateError) throw updateError;
}

/** Undo for {@link scheduleWorkoutOnDays}. */
export async function removeScheduledWorkout(id: string): Promise<void> {
  const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
  if (error) throw error;
}

/** Inline edit of a weekly entry: rename, retime, or change how long it runs. */
export async function updateScheduledWorkout(
  id: string,
  patch: {
    label?: string;
    time?: string;
    durationMin?: number | null;
    weekdays?: number[];
    intervalWeeks?: number;
    repeatUntil?: string | null;
  },
): Promise<void> {
  const update: {
    label?: string;
    planned_time?: string;
    duration_min?: number | null;
    days_of_week?: number[];
    interval_weeks?: number;
    repeat_until?: string | null;
  } = {};
  if (patch.label !== undefined) update.label = patch.label.trim() || "Workout";
  if (patch.time !== undefined) {
    const time = normalizeTime(patch.time);
    if (!time) throw new Error("Enter a valid time");
    update.planned_time = `${time}:00`;
  }
  if (patch.durationMin !== undefined) update.duration_min = patch.durationMin;
  if (patch.weekdays !== undefined) {
    const weekdays = [...new Set(patch.weekdays)].sort((a, b) => a - b);
    if (weekdays.length === 0) throw new Error("Pick at least one day");
    update.days_of_week = weekdays;
  }
  if (patch.intervalWeeks !== undefined) {
    update.interval_weeks = Math.min(4, Math.max(1, Math.round(patch.intervalWeeks)));
  }
  if (patch.repeatUntil !== undefined) update.repeat_until = patch.repeatUntil || null;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase.from("workout_sessions").update(update).eq("id", id);
  if (error) throw error;
}

/** "Chest day" style label from the first pick, so the user rarely has to type. */
export function suggestRoutineName(names: string[], fallback = "New routine"): string {
  const first = normalizeExerciseNames(names)[0];
  if (!first) return fallback;
  const extra = normalizeExerciseNames(names).length - 1;
  return extra > 0 ? `${first} +${extra}` : first;
}
