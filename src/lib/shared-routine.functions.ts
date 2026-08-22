import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { scrubExercise, type SharedRoutine } from "@/lib/shared-routine";

const publicIdSchema = z.object({ publicId: z.string().regex(/^[A-Za-z0-9]{10,64}$/) });

type RawRow = Record<string, unknown>;

/**
 * Public read for /r/{id}. Goes through the `get_shared_routine` security
 * definer function, which only returns rows whose share is still active and
 * only the whitelisted workout columns — no notes, no stack data.
 */
export const fetchSharedRoutine = createServerFn({ method: "GET" })
  .inputValidator((data) => publicIdSchema.parse(data))
  .handler(async ({ data }): Promise<SharedRoutine | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc(
      "get_shared_routine" as never,
      { _public_id: data.publicId } as never,
    );
    if (error) throw error;
    const row = ((rows ?? []) as RawRow[])[0];
    if (!row) return null;

    const rawExercises = Array.isArray(row["exercises"]) ? (row["exercises"] as RawRow[]) : [];
    return {
      public_id: String(row["public_id"]),
      created_at: String(row["created_at"]),
      view_count: Number(row["view_count"] ?? 0),
      save_count: Number(row["save_count"] ?? 0),
      owner_name: typeof row["owner_name"] === "string" ? row["owner_name"] : null,
      routine_name: String(row["routine_name"] ?? "Shared routine"),
      workout_type: String(row["workout_type"] ?? "strength"),
      duration_min: num(row["duration_min"]),
      rpe: num(row["rpe"]),
      distance_m: num(row["distance_m"]),
      target_pace_s: num(row["target_pace_s"]),
      target_hr: num(row["target_hr"]),
      exercises: rawExercises.map(scrubExercise).sort((a, b) => a.set_index - b.set_index),
    };
  });

/** Bumps view_count. Fire-and-forget; failures never block the page. */
export const recordSharedRoutineView = createServerFn({ method: "POST" })
  .inputValidator((data) => publicIdSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc(
      "increment_routine_share_view" as never,
      { _public_id: data.publicId } as never,
    );
    return { ok: !error };
  });

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
