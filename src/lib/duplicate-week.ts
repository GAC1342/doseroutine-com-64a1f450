/**
 * One-tap "duplicate this week into next week" for recurring training.
 *
 * Recurring rows already repeat, so a naive copy would double every session.
 * The planner below therefore only creates what next week is actually missing:
 *
 *   - a weekly row (interval 1) already covers next week → skipped
 *   - an every-other-week row that lands on an "off" week → copied, anchored
 *     on next Monday so the copy lands where the gap is
 *   - a row whose next-week occurrences were all cancelled → un-cancelled
 *     instead of copied, so you get the plan back without a duplicate rule
 *
 * The planning half is pure so it can be unit tested; the apply half performs
 * the writes and returns everything needed to undo them.
 */

import { supabase } from "@/integrations/supabase/client";
import { normalizeWeekdays, occursOnDay } from "@/lib/routine-schedule";
import { occursOnWeek, isAfterRepeatEnd } from "@/lib/routine-recurrence";

export type DuplicableSession = {
  id: string;
  label: string | null;
  planned_time: string | null;
  days_of_week: number[] | null;
  interval_weeks?: number | null;
  anchor_date?: string | null;
  repeat_until?: string | null;
  skipped_dates?: string[] | null;
  kind?: string | null;
  duration_min?: number | null;
  template_id?: string | null;
  active?: boolean | null;
};

export type PlannedCopy = {
  sourceId: string;
  label: string;
  weekdays: number[];
  time: string | null;
  kind: string | null;
  durationMin: number | null;
  templateId: string | null;
  intervalWeeks: number;
  anchorDate: string;
};

export type PlannedUnskip = { id: string; dates: string[] };

export type WeekDuplicationPlan = {
  copies: PlannedCopy[];
  unskips: PlannedUnskip[];
  /** Rows that already repeat into next week and need no change. */
  alreadyCovered: number;
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Monday-first YYYY-MM-DD keys for the week containing `from`. */
export function weekKeys(from: Date): string[] {
  const monday = new Date(from);
  monday.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dayKey(d);
  });
}

/** Monday-first keys for the week after the one containing `from`. */
export function nextWeekKeys(from: Date = new Date()): string[] {
  const next = new Date(from);
  next.setDate(from.getDate() + 7);
  return weekKeys(next);
}

/** Which of `keys` this row actually lands on (respecting the week interval). */
function landingDays(row: DuplicableSession, keys: string[]): string[] {
  const fields = {
    intervalWeeks: row.interval_weeks ?? 1,
    anchorDate: row.anchor_date ?? null,
    repeatUntil: row.repeat_until ?? null,
  };
  return keys.filter((k) => occursOnDay(row.days_of_week, k) && occursOnWeek(k, fields));
}

/** Work out what next week is missing. Pure — no network, no clock reads. */
export function planWeekDuplication(
  rows: readonly DuplicableSession[],
  targetKeys: string[],
): WeekDuplicationPlan {
  const copies: PlannedCopy[] = [];
  const unskips: PlannedUnskip[] = [];
  let alreadyCovered = 0;
  const anchorDate = targetKeys[0] ?? "";

  for (const row of rows) {
    if (row.active === false) continue;
    const weekdays = normalizeWeekdays(row.days_of_week);
    if (weekdays.length === 0) continue;

    // A routine whose "repeat until" date is behind the target week is
    // finished — copying it would silently resurrect a plan the user ended.
    if (
      targetKeys.length > 0 &&
      isAfterRepeatEnd(targetKeys[0] as string, { repeatUntil: row.repeat_until ?? null })
    ) {
      continue;
    }

    const lands = landingDays(row, targetKeys);
    if (lands.length === 0) {
      copies.push({
        sourceId: row.id,
        label: (row.label ?? "").trim() || "Workout",
        weekdays,
        time: row.planned_time ?? null,
        kind: row.kind ?? null,
        durationMin: row.duration_min ?? null,
        templateId: row.template_id ?? null,
        intervalWeeks: Math.max(1, Math.trunc(Number(row.interval_weeks ?? 1)) || 1),
        anchorDate,
      });
      continue;
    }

    const skipped = new Set((row.skipped_dates ?? []).map((d) => (d ?? "").slice(0, 10)));
    const cancelled = lands.filter((k) => skipped.has(k));
    if (cancelled.length > 0) {
      unskips.push({ id: row.id, dates: cancelled });
      if (cancelled.length < lands.length) alreadyCovered += 1;
    } else {
      alreadyCovered += 1;
    }
  }

  return { copies, unskips, alreadyCovered };
}

export type DuplicationResult = {
  /** Rows created — delete these to undo. */
  createdIds: string[];
  /** Cancellations we removed — restore these to undo. */
  restored: PlannedUnskip[];
  alreadyCovered: number;
};

/** Applies a plan. Returns everything needed by {@link undoWeekDuplication}. */
export async function applyWeekDuplication(plan: WeekDuplicationPlan): Promise<DuplicationResult> {
  const createdIds: string[] = [];
  const restored: PlannedUnskip[] = [];

  if (plan.copies.length > 0) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("You need to be signed in");

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert(
        plan.copies.map((c) => ({
          user_id: userId,
          label: c.label,
          planned_time: c.time,
          days_of_week: c.weekdays,
          kind: c.kind ?? "strength",
          duration_min: c.durationMin,
          template_id: c.templateId,
          interval_weeks: c.intervalWeeks,
          anchor_date: c.anchorDate,
          active: true,
        })),
      )
      .select("id");
    if (error) throw error;
    for (const row of data ?? []) createdIds.push(row.id);
  }

  for (const u of plan.unskips) {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("skipped_dates")
      .eq("id", u.id)
      .single();
    if (error) throw error;
    const drop = new Set(u.dates);
    const next = (data?.skipped_dates ?? []).filter((d) => !drop.has((d ?? "").slice(0, 10)));
    const { error: upErr } = await supabase
      .from("workout_sessions")
      .update({ skipped_dates: next })
      .eq("id", u.id);
    if (upErr) throw upErr;
    restored.push(u);
  }

  return { createdIds, restored, alreadyCovered: plan.alreadyCovered };
}

/** Reverses {@link applyWeekDuplication}. */
export async function undoWeekDuplication(result: DuplicationResult): Promise<void> {
  if (result.createdIds.length > 0) {
    const { error } = await supabase.from("workout_sessions").delete().in("id", result.createdIds);
    if (error) throw error;
  }
  for (const u of result.restored) {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("skipped_dates")
      .eq("id", u.id)
      .single();
    if (error) throw error;
    const merged = [...new Set([...(data?.skipped_dates ?? []), ...u.dates])];
    const { error: upErr } = await supabase
      .from("workout_sessions")
      .update({ skipped_dates: merged })
      .eq("id", u.id);
    if (upErr) throw upErr;
  }
}

/** Human summary for the confirmation toast. */
export function describeDuplication(result: {
  createdIds: string[];
  restored: PlannedUnskip[];
  alreadyCovered: number;
}): string {
  const parts: string[] = [];
  if (result.createdIds.length > 0) {
    parts.push(
      `${result.createdIds.length} session${result.createdIds.length === 1 ? "" : "s"} copied`,
    );
  }
  const restoredCount = result.restored.reduce((n, r) => n + r.dates.length, 0);
  if (restoredCount > 0)
    parts.push(`${restoredCount} cancelled day${restoredCount === 1 ? "" : "s"} restored`);
  if (parts.length === 0) {
    return result.alreadyCovered > 0
      ? "Next week already matches this week"
      : "Nothing to copy yet";
  }
  if (result.alreadyCovered > 0) parts.push(`${result.alreadyCovered} already repeating`);
  return parts.join(" · ");
}
