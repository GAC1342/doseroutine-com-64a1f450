import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Checkin = {
  id: string;
  checked_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  notes: string | null;
};

export const getRecentCheckins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Checkin[]> => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("body_checkins" as any)
      .select("id, checked_at, weight_kg, body_fat_pct, waist_cm, notes")
      .eq("user_id", userId)
      .gte("checked_at", since)
      .order("checked_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Checkin[];
  });

export const upsertCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      checked_at?: string;
      weight_kg?: number | null;
      body_fat_pct?: number | null;
      waist_cm?: number | null;
      notes?: string | null;
    }) => {
      // Caller supplies the date (from a picker that already uses the
      // browser zone). If missing, we accept whatever the DB defaults to
      // rather than silently stamping a UTC-day here, which would land
      // late-evening check-ins on tomorrow's date in western timezones.
      const date = input.checked_at;
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
      const num = (v: unknown, min: number, max: number): number | null => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        if (n < min || n > max) throw new Error(`Value out of range (${min}-${max})`);
        return n;
      };
      return {
        checked_at: date,
        weight_kg: num(input.weight_kg, 20, 400),
        body_fat_pct: num(input.body_fat_pct, 2, 70),
        waist_cm: num(input.waist_cm, 30, 250),
        notes: input.notes ? String(input.notes).slice(0, 500) : null,
      };
    },
  )
  .handler(async ({ data, context }): Promise<Checkin> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("body_checkins" as any)
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id,checked_at" })
      .select("id, checked_at, weight_kg, body_fat_pct, waist_cm, notes")
      .single();
    if (error) throw error;
    return row as unknown as Checkin;
  });

export const deleteCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing id");
    return { id: String(input.id) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("body_checkins" as any)
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export type TrendSummary = {
  weeks: number;
  weight_kg_start: number | null;
  weight_kg_now: number | null;
  weight_kg_delta: number | null;
  body_fat_pct_start: number | null;
  body_fat_pct_now: number | null;
  waist_cm_start: number | null;
  waist_cm_now: number | null;
};

/** Returns a compact summary the AI plan generator can reference. */
export function summarizeTrend(checkins: Checkin[], weeks = 8): TrendSummary {
  const cutoff = new Date(Date.now() - weeks * 7 * 86_400_000).toISOString().slice(0, 10);
  const inRange = checkins.filter((c) => c.checked_at >= cutoff);
  const sorted = [...inRange].sort((a, b) => a.checked_at.localeCompare(b.checked_at));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const w0 = first?.weight_kg ?? null;
  const w1 = last?.weight_kg ?? null;
  return {
    weeks,
    weight_kg_start: w0,
    weight_kg_now: w1,
    weight_kg_delta: w0 != null && w1 != null ? Math.round((w1 - w0) * 10) / 10 : null,
    body_fat_pct_start: first?.body_fat_pct ?? null,
    body_fat_pct_now: last?.body_fat_pct ?? null,
    waist_cm_start: first?.waist_cm ?? null,
    waist_cm_now: last?.waist_cm ?? null,
  };
}
