/**
 * User-defined exercises and categories.
 *
 * Built-in suggestions live in `exercise-options.ts`. This module adds the
 * user's own saved exercises on top, so anything they log once can be reused
 * from the suggestion list later — under their own category label if they
 * gave one.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  WORKOUT_FAMILY_LABELS,
  workoutFamily,
  type WorkoutFamily,
  type WorkoutType,
} from "@/lib/workout-types";

export type CustomExerciseRow = {
  id: string;
  name: string;
  /** The user's own category label, e.g. "Sled work". Optional. */
  category: string | null;
  /** Built-in activity type this was created under, if any. */
  workout_type: string | null;
  family: string;
  use_count: number;
};

export type CustomExerciseInput = {
  name: string;
  category: string | null;
  workoutType: WorkoutType | null;
  family: WorkoutFamily;
};

const COLUMNS = "id,name,category,workout_type,family,use_count";

/** Every custom exercise for the signed-in user, most used first. */
export async function fetchCustomExercises(): Promise<CustomExerciseRow[]> {
  const { data, error } = await supabase
    .from("custom_exercises")
    .select(COLUMNS)
    .order("use_count", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CustomExerciseRow[];
}

export function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeCategory(category: string | null | undefined): string | null {
  const trimmed = (category ?? "").trim().replace(/\s+/g, " ");
  return trimmed === "" ? null : trimmed.slice(0, 60);
}

export async function saveCustomExercise(input: CustomExerciseInput): Promise<CustomExerciseRow> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in");

  const name = normalizeExerciseName(input.name);
  if (!name) throw new Error("Give the exercise a name");
  if (name.length > 80) throw new Error("That name is too long (80 characters max)");

  const payload = {
    name,
    category: normalizeCategory(input.category),
    workout_type: input.workoutType,
    family: input.family,
  };

  // Uniqueness is enforced by a functional index on lower(trim(name)), which
  // PostgREST's upsert cannot target — so look the row up first.
  const { data: existing, error: lookupError } = await supabase
    .from("custom_exercises")
    .select(COLUMNS)
    .ilike("name", name)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing) {
    const { data, error } = await supabase
      .from("custom_exercises")
      .update(payload)
      .eq("id", (existing as CustomExerciseRow).id)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data as CustomExerciseRow;
  }

  const { data, error } = await supabase
    .from("custom_exercises")
    .insert({ ...payload, user_id: userId })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") throw new Error(`“${name}” is already in your list`);
    throw error;
  }
  return data as CustomExerciseRow;
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const { error } = await supabase.from("custom_exercises").delete().eq("id", id);
  if (error) throw error;
}

/** Bumps the counter so frequently used custom exercises sort to the top. */
export async function markCustomExerciseUsed(row: CustomExerciseRow): Promise<void> {
  await supabase
    .from("custom_exercises")
    .update({ use_count: (row.use_count ?? 0) + 1 })
    .eq("id", row.id);
}

/** Distinct category labels the user has created, alphabetical. */
export function customCategories(rows: readonly CustomExerciseRow[]): string[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    const label = normalizeCategory(row.category);
    if (!label) continue;
    const key = label.toLowerCase();
    if (!seen.has(key)) seen.set(key, label);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Custom exercises relevant to the activity being logged: exact type matches
 * first, then anything in the same family, then the rest.
 */
export function customExercisesForType(
  rows: readonly CustomExerciseRow[],
  type: string | null | undefined,
): CustomExerciseRow[] {
  const family = workoutFamily(type);
  const rank = (row: CustomExerciseRow) => {
    if (row.workout_type && row.workout_type === type) return 0;
    if (row.family === family) return 1;
    return 2;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b) || b.use_count - a.use_count);
}

/** Grouped for display: user's own category label, else the family label. */
export function groupCustomExercises(
  rows: readonly CustomExerciseRow[],
): { label: string; rows: CustomExerciseRow[] }[] {
  const groups = new Map<string, { label: string; rows: CustomExerciseRow[] }>();
  for (const row of rows) {
    const label =
      normalizeCategory(row.category) ??
      WORKOUT_FAMILY_LABELS[(row.family as WorkoutFamily) ?? "other"] ??
      "Other";
    const key = label.toLowerCase();
    const group = groups.get(key) ?? { label, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}
