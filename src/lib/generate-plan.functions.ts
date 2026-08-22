import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireFullAccess } from "@/lib/entitlement.server";
import {
  PLAN_INSTRUCTIONS,
  PLAN_OUTPUT_SCHEMA,
  requestPlanFromAI,
  SLOT_DEFAULT_TIME,
  planPayloadSchema,
  type PlanPayload,
  type TimeSlot,
} from "@/lib/plan-normalize";

export type { PlanBlock, PlanItem, PlanPayload, PlanWarning, TimeSlot } from "@/lib/plan-normalize";

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { goal: string }) => {
    const g = String(input?.goal ?? "").trim();
    if (!g || g.length > 200) throw new Error("Invalid goal");
    return { goal: g };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { goal } = data;

    // Paid feature: verify entitlement server-side. The /plan route guard is
    // client-side only and can be bypassed by calling this function directly.
    await requireFullAccess(supabase, userId);

    // Load user's ACTIVE stack + curated rules for those compounds only.
    const { data: ucs, error: ucErr } = await supabase
      .from("user_compounds")
      .select(
        "id, custom_name, dose_amount, dose_unit, times_of_day, days_of_week, frequency, with_food, notes, compound:compounds(id, name, category, is_controlled)",
      )
      .eq("user_id", userId)
      .eq("active", true);
    if (ucErr) throw ucErr;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const stack = (ucs ?? []).map((u: any) => ({
      user_compound_id: u.id,
      name: u.custom_name || u.compound?.name || "Compound",
      category: u.compound?.category ?? null,
      controlled: !!u.compound?.is_controlled,
      dose: u.dose_amount
        ? `${u.dose_amount}${u.dose_unit ? " " + u.dose_unit : ""}`
        : "user-entered",
      times_of_day: u.times_of_day,
      days_of_week: u.days_of_week,
      frequency: u.frequency,
      with_food: u.with_food,
      notes: u.notes,
    }));

    if (stack.length === 0) {
      throw new Error("Add compounds to your stack first.");
    }

    // Load curated interaction rules — only pairs relevant to this stack.
    const { data: allRules } = await supabase.from("interaction_rules").select("*");
    const compoundIds = new Set(stack.map((s) => s.user_compound_id));
    const compoundNames = new Set(stack.map((s) => s.name.toLowerCase()));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const relevant = (allRules ?? []).filter((r: any) => {
      const a = String(r.a_name ?? "").toLowerCase();
      const b = String(r.b_name ?? "").toLowerCase();
      return (
        compoundNames.has(a) ||
        compoundNames.has(b) ||
        compoundIds.has(r.a_id) ||
        compoundIds.has(r.b_id)
      );
    });

    // Recent progress summary (last 8 weeks of body check-ins) — lets the AI
    // reference concrete trends ("weight up 1.2 kg over 8 wk") when advising.
    let trend: unknown = null;
    try {
      const cutoff = new Date(Date.now() - 8 * 7 * 86_400_000).toISOString().slice(0, 10);
      const { data: cks } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        .from("body_checkins" as any)
        .select("checked_at, weight_kg, body_fat_pct, waist_cm")
        .eq("user_id", userId)
        .gte("checked_at", cutoff)
        .order("checked_at", { ascending: true });
      const rows = (cks ?? []) as unknown as Array<{
        checked_at: string;
        weight_kg: number | null;
        body_fat_pct: number | null;
        waist_cm: number | null;
      }>;
      if (rows.length >= 2) {
        const first = rows[0];
        const last = rows[rows.length - 1];
        const d = (a: number | null, b: number | null) =>
          a != null && b != null ? Math.round((b - a) * 10) / 10 : null;
        trend = {
          weeks: 8,
          weight_kg_delta: d(first.weight_kg, last.weight_kg),
          body_fat_pct_delta: d(first.body_fat_pct, last.body_fat_pct),
          waist_cm_delta: d(first.waist_cm, last.waist_cm),
          entries: rows.length,
        };
      }
    } catch {
      // trend is optional — never block plan generation on it.
    }

    const userPayload = {
      goal,
      stack,
      curated_rules: relevant,
      recent_progress: trend,
      instructions: PLAN_INSTRUCTIONS,
      output_schema: PLAN_OUTPUT_SCHEMA,
    };

    // One retry: an empty `blocks` after normalisation means the model
    // ignored the contract. Previously that saved a summary-only plan and
    // the user saw a paragraph with no schedule under it.
    let parsed: PlanPayload = await requestPlanFromAI(userPayload, goal, 0);
    if (parsed.blocks.length === 0) {
      console.warn("generate-plan: empty blocks on first attempt, retrying", { goal });
      parsed = await requestPlanFromAI(userPayload, goal, 1);
    }
    if (parsed.blocks.length === 0) {
      throw new Error(
        "The AI couldn't build a schedule from your stack this time. Please try again.",
      );
    }

    // Post-filter: strip any block item that isn't in the user's stack
    // (defense in depth), and back-fill user_compound_id from the name when
    // the model omitted it — "Apply to my stack" needs that id to work.
    const stackById = new Map(stack.map((s) => [s.user_compound_id, s]));
    const stackByName = new Map(stack.map((s) => [s.name.toLowerCase(), s]));
    parsed.blocks = parsed.blocks
      .map((b) => ({
        ...b,
        clock_hint: b.clock_hint || SLOT_DEFAULT_TIME[b.time_of_day as TimeSlot],
        items: b.items
          .map((it) => {
            const match =
              (it.user_compound_id && stackById.get(it.user_compound_id)) ||
              stackByName.get(it.name.toLowerCase());
            if (!match) return null;
            return {
              ...it,
              user_compound_id: match.user_compound_id,
              name: match.name,
              // For controlled items, force the user's saved dose.
              dose: match.controlled ? match.dose : it.dose || match.dose,
              controlled: Boolean(match.controlled),
            };
          })
          .filter((it): it is NonNullable<typeof it> => it !== null),
      }))
      // A block whose every item was hallucinated is noise — drop it.
      .filter((b) => b.items.length > 0);

    if (parsed.blocks.length === 0) {
      throw new Error(
        "The AI couldn't build a schedule from your stack this time. Please try again.",
      );
    }

    parsed.disclaimer = "This is educational, not medical advice.";
    parsed.goal = goal;

    // Guard our own output shape (not the model's) before persisting.
    const finalCheck = planPayloadSchema.safeParse(parsed);
    if (!finalCheck.success) {
      console.error(
        "generate-plan: post-normalise shape error",
        finalCheck.error.issues.slice(0, 3),
      );
      throw new Error("Something went wrong building your plan. Please try again.");
    }

    // Save. Replace prior plans for this user so the history doesn't accumulate
    // duplicate rows every time the user regenerates.
    await supabase.from("plans").delete().eq("user_id", userId);
    const { data: saved, error: saveErr } = await supabase
      .from("plans")
      .insert({
        user_id: userId,
        goal,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        plan_json: parsed as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        warnings_json: (parsed.warnings ?? []) as any,
      })
      .select("id, generated_at")
      .single();
    if (saveErr) throw saveErr;

    return { id: saved.id, generated_at: saved.generated_at, plan: parsed };
  });
