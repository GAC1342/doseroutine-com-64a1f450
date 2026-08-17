/**
 * Reusable workout templates.
 *
 * A template stores everything you'd normally re-type for a recurring session:
 * the session-level fields (type, duration, effort, distance, target pace /
 * heart-rate) plus a list of exercises with predefined sets, reps, weight,
 * rest and tempo. Storage is metric, same as workout_logs.
 */

import { supabase } from "@/integrations/supabase/client";
import type { WorkoutType } from "@/lib/workout-types";

export type WorkoutTemplateRow = {
  id: string;
  name: string;
  workout_type: string;
  duration_min: number | null;
  rpe: number | null;
  calories: number | null;
  distance_m: number | null;
  target_pace_s: number | null;
  target_hr: number | null;
  notes: string | null;
  use_count: number;
  last_used_at: string | null;
};

export type WorkoutTemplateExerciseRow = {
  id: string;
  template_id: string;
  exercise: string;
  set_index: number;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  rest_seconds: number | null;
  tempo: string | null;
};

export type WorkoutTemplate = WorkoutTemplateRow & {
  exercises: WorkoutTemplateExerciseRow[];
};

export type TemplateExerciseInput = {
  exercise: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  restSeconds: number | null;
  tempo: string | null;
};

export type TemplateInput = {
  name: string;
  workoutType: WorkoutType;
  durationMin: number | null;
  rpe: number | null;
  calories: number | null;
  distanceM: number | null;
  targetPaceS: number | null;
  targetHr: number | null;
  notes: string | null;
  exercises: TemplateExerciseInput[];
};

const TEMPLATE_COLUMNS =
  "id,name,workout_type,duration_min,rpe,calories,distance_m,target_pace_s,target_hr,notes,use_count,last_used_at";

/** Templates plus their exercises, newest-used first. */
export async function fetchWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  const { data: templates, error } = await supabase
    .from("workout_templates")
    .select(TEMPLATE_COLUMNS)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw error;

  const rows = (templates ?? []) as WorkoutTemplateRow[];
  if (rows.length === 0) return [];

  const { data: exercises, error: exError } = await supabase
    .from("workout_template_exercises")
    .select("id,template_id,exercise,set_index,sets,reps,weight_kg,rest_seconds,tempo")
    .in(
      "template_id",
      rows.map((t) => t.id),
    )
    .order("set_index", { ascending: true });
  if (exError) throw exError;

  const byTemplate = new Map<string, WorkoutTemplateExerciseRow[]>();
  for (const ex of (exercises ?? []) as WorkoutTemplateExerciseRow[]) {
    const list = byTemplate.get(ex.template_id) ?? [];
    list.push(ex);
    byTemplate.set(ex.template_id, list);
  }

  return rows.map((t) => ({ ...t, exercises: byTemplate.get(t.id) ?? [] }));
}

/** Creates a template (or replaces one when `templateId` is supplied). */
export async function saveWorkoutTemplate(
  input: TemplateInput,
  templateId?: string,
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in");

  const name = input.name.trim();
  if (!name) throw new Error("Give the template a name");

  const payload = {
    user_id: userId,
    name,
    workout_type: input.workoutType,
    duration_min: input.durationMin,
    rpe: input.rpe,
    calories: input.calories,
    distance_m: input.distanceM,
    target_pace_s: input.targetPaceS,
    target_hr: input.targetHr,
    notes: input.notes?.trim() || null,
  };

  let id: string;
  if (templateId) {
    const { error } = await supabase.from("workout_templates").update(payload).eq("id", templateId);
    if (error) throw error;
    id = templateId;
    const { error: delError } = await supabase
      .from("workout_template_exercises")
      .delete()
      .eq("template_id", templateId);
    if (delError) throw delError;
  } else {
    const { data, error } = await supabase
      .from("workout_templates")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }

  const rows = input.exercises
    .filter((e) => e.exercise.trim() !== "")
    .map((e, index) => ({
      template_id: id,
      user_id: userId,
      exercise: e.exercise.trim(),
      set_index: index,
      sets: e.sets != null ? Math.round(e.sets) : null,
      reps: e.reps,
      weight_kg: e.weightKg,
      rest_seconds: e.restSeconds != null ? Math.round(e.restSeconds) : null,
      tempo: e.tempo?.trim() || null,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("workout_template_exercises").insert(rows);
    if (error) throw error;
  }

  return id;
}

export async function deleteWorkoutTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from("workout_templates").delete().eq("id", templateId);
  if (error) throw error;
}

/** Renames a template in place, keeping its exercises and usage stats. */
export async function renameWorkoutTemplate(templateId: string, name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Give the template a name");
  const { error } = await supabase
    .from("workout_templates")
    .update({ name: trimmed })
    .eq("id", templateId);
  if (error) throw error;
  return trimmed;
}

/** Case-insensitive search across template name, type, notes and exercises. */
export function filterTemplates(templates: WorkoutTemplate[], query: string): WorkoutTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates;
  const terms = q.split(/\s+/);
  return templates.filter((t) => {
    const haystack = [t.name, t.workout_type, t.notes ?? "", ...t.exercises.map((e) => e.exercise)]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Bumps usage stats so recently-used templates float to the top. */
export async function markTemplateUsed(template: WorkoutTemplateRow): Promise<void> {
  const { error } = await supabase
    .from("workout_templates")
    .update({ use_count: (template.use_count ?? 0) + 1, last_used_at: new Date().toISOString() })
    .eq("id", template.id);
  if (error) throw error;
}

/* -------------------- pacing helpers -------------------- */

/** Parses "8:30", "8:30/mi", "510" (seconds) into seconds per unit. */
export function parsePaceInput(value: string): number | null {
  const trimmed = value.trim().replace(/\s*\/\s*(mi|km)\s*$/i, "");
  if (!trimmed) return null;
  const clock = /^(\d{1,3}):([0-5]?\d)$/.exec(trimmed);
  if (clock) {
    const mins = Number(clock[1]);
    const secs = Number(clock[2]);
    const total = mins * 60 + secs;
    return total > 0 ? total : null;
  }
  const plain = Number(trimmed);
  if (!Number.isFinite(plain) || plain <= 0) return null;
  return plain;
}

/** Seconds per unit -> "8:30" for editing. */
export function formatPaceInput(secondsPerUnit: number | null | undefined): string {
  if (secondsPerUnit == null || !Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0) return "";
  const total = Math.round(secondsPerUnit);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Short human summary used on template cards. */
export function templateSummary(template: WorkoutTemplate): string {
  const parts: string[] = [];
  if (template.exercises.length > 0) {
    parts.push(
      `${template.exercises.length} exercise${template.exercises.length === 1 ? "" : "s"}`,
    );
  }
  if (template.duration_min) parts.push(`${Math.round(template.duration_min)} min`);
  if (template.target_pace_s) parts.push(`${formatPaceInput(template.target_pace_s)} pace`);
  if (template.rpe) parts.push(`RPE ${template.rpe}`);
  return parts.join(" · ");
}
