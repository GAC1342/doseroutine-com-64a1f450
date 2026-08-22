/**
 * Owner-side management of workout routine share links.
 *
 * A share row points at a `workout_templates` row; the public page reads the
 * routine live through the `get_shared_routine` security-definer function, so
 * edits to the routine flow through to anyone holding the link, and switching
 * `is_active` off kills it immediately.
 */

import { supabase } from "@/integrations/supabase/client";
import { generatePublicId, type SharedRoutine } from "@/lib/shared-routine";
import { saveWorkoutTemplate, type TemplateExerciseInput } from "@/lib/workout-templates";
import type { WorkoutType } from "@/lib/workout-types";

export type RoutineShareRow = {
  id: string;
  routine_id: string;
  public_id: string;
  is_active: boolean;
  show_owner_name: boolean;
  created_at: string;
  view_count: number;
  save_count: number;
};

const COLUMNS =
  "id,routine_id,public_id,is_active,show_owner_name,created_at,view_count,save_count";

/** Loosely typed table handle — `routine_shares` is newer than the generated types. */
function table() {
  return supabase.from("routine_shares" as never) as unknown as {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: unknown; error: unknown }>;
      };
    };
    insert: (value: unknown) => {
      select: (cols: string) => { single: () => Promise<{ data: unknown; error: unknown }> };
    };
    update: (value: unknown) => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>;
    };
    delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  };
}

export async function fetchRoutineShares(routineId: string): Promise<RoutineShareRow[]> {
  const { data, error } = await table()
    .select(COLUMNS)
    .eq("routine_id", routineId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as RoutineShareRow[] | null) ?? [];
}

export async function createRoutineShare(
  routineId: string,
  showOwnerName: boolean,
): Promise<RoutineShareRow> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in");

  const { data, error } = await table()
    .insert({
      routine_id: routineId,
      owner_user_id: userId,
      public_id: generatePublicId(),
      show_owner_name: showOwnerName,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as RoutineShareRow;
}

export async function setRoutineShareActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await table().update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function setRoutineShareOwnerName(id: string, show: boolean): Promise<void> {
  const { error } = await table().update({ show_owner_name: show }).eq("id", id);
  if (error) throw error;
}

export async function deleteRoutineShare(id: string): Promise<void> {
  const { error } = await table().delete().eq("id", id);
  if (error) throw error;
}

/**
 * Copies a publicly shared routine into the signed-in user's own templates and
 * bumps `save_count`. Only whitelisted workout fields are written — there is
 * nothing else in the payload to copy.
 */
export async function saveSharedRoutineToAccount(routine: SharedRoutine): Promise<string> {
  const exercises: TemplateExerciseInput[] = routine.exercises.map((e) => ({
    exercise: e.exercise,
    sets: e.sets,
    reps: e.reps,
    weightKg: e.weight_kg,
    restSeconds: e.rest_seconds,
    tempo: e.tempo,
  }));

  const templateId = await saveWorkoutTemplate({
    name: routine.routine_name,
    workoutType: (routine.workout_type as WorkoutType) ?? "strength",
    durationMin: routine.duration_min,
    rpe: routine.rpe,
    calories: null,
    distanceM: routine.distance_m,
    targetPaceS: routine.target_pace_s,
    targetHr: routine.target_hr,
    notes: null,
    exercises,
  });

  await supabase.rpc(
    "increment_routine_share_save" as never,
    {
      _public_id: routine.public_id,
    } as never,
  );

  return templateId;
}

/* -------------------- sign-in handoff -------------------- */

const PENDING_KEY = "doseroutine:pending-routine-save";

export function rememberPendingRoutineSave(publicId: string): void {
  try {
    window.sessionStorage.setItem(PENDING_KEY, publicId);
  } catch {
    /* private mode — the ?save=1 param still carries the intent */
  }
}

export function consumePendingRoutineSave(): string | null {
  try {
    const value = window.sessionStorage.getItem(PENDING_KEY);
    window.sessionStorage.removeItem(PENDING_KEY);
    return value;
  } catch {
    return null;
  }
}
