import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPlanTimeMap, diffSchedule, type ScheduleSnapshotRow } from "@/lib/apply-plan-logic";

export type { ScheduleChange, ScheduleSnapshotRow } from "@/lib/apply-plan-logic";

/** Preview what "Apply this schedule" would change, without writing anything. */
export const getPlanApplyPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: plan } = await supabase
      .from("plans")
      .select("id, goal, plan_json, generated_at")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: ucs, error } = await supabase
      .from("user_compounds")
      .select("id, custom_name, times_of_day, compound:compounds(name)")
      .eq("user_id", userId)
      .eq("active", true);
    if (error) throw error;

    const current: ScheduleSnapshotRow[] = (ucs ?? []).map((u: any) => ({
      id: u.id,
      name: u.custom_name || u.compound?.name || "Compound",
      times_of_day: Array.isArray(u.times_of_day) ? u.times_of_day : [],
    }));

    const target = buildPlanTimeMap((plan?.plan_json as any) ?? null);
    const changes = diffSchedule(current, target);

    const { data: snaps } = await supabase
      .from("plan_schedule_snapshots")
      .select("kind, goal, created_at")
      .eq("user_id", userId);

    return {
      hasPlan: Boolean(plan),
      goal: plan?.goal ?? null,
      changes,
      snapshots: (snaps ?? []).map((s: any) => ({
        kind: s.kind as "original" | "previous",
        goal: s.goal as string | null,
        created_at: s.created_at as string,
      })),
    };
  });

/** Write the latest plan's timing onto the user's stack, snapshotting first. */
export const applyPlanToStack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: plan } = await supabase
      .from("plans")
      .select("id, goal, plan_json")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!plan) throw new Error("Generate a plan first.");

    const { data: ucs, error } = await supabase
      .from("user_compounds")
      .select("id, custom_name, times_of_day, compound:compounds(name)")
      .eq("user_id", userId)
      .eq("active", true);
    if (error) throw error;

    const current: ScheduleSnapshotRow[] = (ucs ?? []).map((u: any) => ({
      id: u.id,
      name: u.custom_name || u.compound?.name || "Compound",
      times_of_day: Array.isArray(u.times_of_day) ? u.times_of_day : [],
    }));

    const target = buildPlanTimeMap(plan.plan_json as any);
    const changes = diffSchedule(current, target);
    if (changes.length === 0) {
      return { applied: 0, goal: plan.goal };
    }

    // Snapshot BEFORE writing. "original" is written once, ever, so the user
    // can always get back to the schedule they set up themselves.
    const { data: existingOriginal } = await supabase
      .from("plan_schedule_snapshots")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "original")
      .maybeSingle();

    if (!existingOriginal) {
      const { error: origErr } = await supabase.from("plan_schedule_snapshots").insert({
        user_id: userId,
        kind: "original",
        goal: null,
        snapshot_json: current as any,
      });
      if (origErr) throw origErr;
    }

    const { error: prevErr } = await supabase.from("plan_schedule_snapshots").upsert(
      {
        user_id: userId,
        kind: "previous",
        goal: plan.goal,
        snapshot_json: current as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,kind" },
    );
    if (prevErr) throw prevErr;

    for (const c of changes) {
      const { error: upErr } = await supabase
        .from("user_compounds")
        .update({ times_of_day: c.to })
        .eq("id", c.id)
        .eq("user_id", userId);
      if (upErr) throw upErr;
    }

    return { applied: changes.length, goal: plan.goal };
  });

/** Restore a saved snapshot: "previous" = undo last apply, "original" = full reset. */
export const revertPlanApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "previous" | "original" }) => {
    const kind = input?.kind;
    if (kind !== "previous" && kind !== "original") throw new Error("Invalid snapshot kind");
    return { kind };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: snap } = await supabase
      .from("plan_schedule_snapshots")
      .select("snapshot_json")
      .eq("user_id", userId)
      .eq("kind", data.kind)
      .maybeSingle();
    if (!snap) throw new Error("No saved schedule to restore.");

    const rows = (snap.snapshot_json as unknown as ScheduleSnapshotRow[]) ?? [];
    let restored = 0;
    for (const row of rows) {
      const { error } = await supabase
        .from("user_compounds")
        .update({ times_of_day: row.times_of_day ?? [] })
        .eq("id", row.id)
        .eq("user_id", userId);
      if (error) throw error;
      restored += 1;
    }

    // Undoing the last apply consumes that snapshot; the original stays put
    // so a reset is always available.
    if (data.kind === "previous") {
      await supabase
        .from("plan_schedule_snapshots")
        .delete()
        .eq("user_id", userId)
        .eq("kind", "previous");
    }

    return { restored };
  });
