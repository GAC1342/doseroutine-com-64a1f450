/**
 * Repeat a saved routine every week.
 *
 * How the popular training apps solve this (Hevy, Strong, Jefit, Fitbod all
 * converge on the same shape):
 *
 *   1. You build a *routine* once — a named list of exercises with sets/reps.
 *   2. You assign that routine to one or more weekdays.
 *   3. The assignment recurs forever until you change it; opening any future
 *      day loads the routine's exercises instead of a blank workout.
 *
 * The important bit is that the calendar entry points at the routine rather
 * than copying it, so editing "Push day" once updates every Monday, Wednesday
 * and Friday. That's what `workout_sessions.template_id` is for: one recurring
 * row, a `days_of_week` array, and a link back to the saved routine.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { normalizeTime } from "@/lib/routine-schedule";
import { DEFAULT_WORKOUT_TIME } from "@/lib/quick-add-workout";
import {
  datesThisWeek,
  normalizeInterval,
  parseDateOverrides,
  pruneDateOverrides,
  parseTimeOverrides,
  pruneSkippedDates,
  toggleSkippedDate,
} from "@/lib/routine-recurrence";

/** JS weekday numbers, Monday first — how humans read a training week. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_SHORT: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

/** Sorted, de-duplicated, Monday-first weekday list. */
export function sortWeekdays(days: readonly number[]): number[] {
  const set = new Set(days.filter((d) => d >= 0 && d <= 6));
  return WEEK_ORDER.filter((d) => set.has(d));
}

/** Adds or removes a weekday — the day chips are toggles, never a wizard. */
export function toggleWeekday(days: readonly number[], day: number): number[] {
  const set = new Set(days);
  if (set.has(day)) set.delete(day);
  else set.add(day);
  return sortWeekdays([...set]);
}

/** "Every day" / "Weekdays" / "Mon, Wed, Fri" — the label under each routine. */
export function describeWeekdays(days: readonly number[]): string {
  const sorted = sortWeekdays(days);
  if (sorted.length === 0) return "Not scheduled";
  if (sorted.length === 7) return "Every day";
  const weekdays = [1, 2, 3, 4, 5];
  if (sorted.length === 5 && weekdays.every((d) => sorted.includes(d))) return "Weekdays";
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) return "Weekends";
  return sorted.map((d) => WEEKDAY_SHORT[d]).join(", ");
}

export type RoutineAssignment = {
  /** workout_sessions row id. */
  id: string;
  templateId: string | null;
  label: string;
  time: string;
  weekdays: number[];
  durationMin: number | null;
  /** 1 = every week, 2 = every other week. */
  intervalWeeks: number;
  anchorDate: string | null;
  /** Last day this routine runs, YYYY-MM-DD. Null = repeats indefinitely. */
  repeatUntil: string | null;
  /** One-off cancelled dates, YYYY-MM-DD. */
  skippedDates: string[];
  /** Weekday → "HH:mm" time override. */
  timeOverrides: Record<number, string>;
};

/** Recurring weekly slots, including the ones not linked to a saved routine. */
export async function fetchRoutineAssignments(): Promise<RoutineAssignment[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      "id,label,planned_time,days_of_week,duration_min,template_id,active,interval_weeks,anchor_date,repeat_until,skipped_dates,time_overrides",
    )
    .not("planned_time", "is", null);
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.active !== false)
    .map((row) => ({
      id: row.id,
      templateId: row.template_id ?? null,
      label: (row.label ?? "").trim() || "Workout",
      time: normalizeTime(row.planned_time) ?? DEFAULT_WORKOUT_TIME,
      weekdays: sortWeekdays(
        row.days_of_week && row.days_of_week.length > 0 ? row.days_of_week : [0, 1, 2, 3, 4, 5, 6],
      ),
      durationMin: row.duration_min ?? null,
      intervalWeeks: normalizeInterval(row.interval_weeks),
      anchorDate: row.anchor_date ?? null,
      repeatUntil: row.repeat_until ?? null,
      skippedDates: (row.skipped_dates ?? []).map((d) => String(d).slice(0, 10)),
      timeOverrides: parseTimeOverrides(row.time_overrides),
    }));
}

export type RepeatInput = {
  /** Saved routine to repeat. */
  templateId: string;
  label: string;
  weekdays: number[];
  time?: string;
  durationMin?: number | null;
  kind?: string;
  /** 1 = every week, 2 = every other week. */
  intervalWeeks?: number;
  /** Week the interval counts from, YYYY-MM-DD. */
  anchorDate?: string | null;
  /** Stop repeating after this date, YYYY-MM-DD. Null/undefined = forever. */
  repeatUntil?: string | null;
  /** Existing recurring row to update instead of creating a second one. */
  sessionId?: string;
};

/**
 * Creates (or updates) the single recurring row that repeats a routine weekly.
 * Re-running it for the same routine never stacks duplicate calendar entries.
 */
export async function repeatRoutineWeekly(input: RepeatInput): Promise<string> {
  const weekdays = sortWeekdays(input.weekdays);
  if (weekdays.length === 0) throw new Error("Pick at least one day");
  const time = normalizeTime(input.time ?? DEFAULT_WORKOUT_TIME) ?? DEFAULT_WORKOUT_TIME;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You need to be signed in");

  const payload = {
    label: input.label.trim() || "Workout",
    planned_time: `${time}:00`,
    days_of_week: weekdays,
    duration_min: input.durationMin ?? null,
    kind: input.kind ?? "strength",
    template_id: input.templateId,
    interval_weeks: normalizeInterval(input.intervalWeeks),
    anchor_date: input.anchorDate ?? todayKey(),
    active: true,
    // Only touched when the caller says so, so re-saving a routine from a
    // screen that has no end-date field can't silently clear one.
    ...(input.repeatUntil === undefined
      ? {}
      : { repeat_until: normalizeDateKey(input.repeatUntil) }),
  };

  // Reuse the row already repeating this routine — that's what makes "add it to
  // another day" a toggle instead of rebuilding the routine.
  let sessionId = input.sessionId;
  if (!sessionId) {
    const { data: existing, error: findError } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("template_id", input.templateId)
      .limit(1)
      .maybeSingle();
    if (findError) throw findError;
    sessionId = existing?.id;
  }

  if (sessionId) {
    const { error } = await supabase.from("workout_sessions").update(payload).eq("id", sessionId);
    if (error) throw error;
    return sessionId;
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ ...payload, user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** "2026-09-30" or null — anything else (empty input, junk) becomes null. */
export function normalizeDateKey(value: string | null | undefined): string | null {
  const key = (value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

/**
 * Decides whether a date-input value is worth persisting.
 *
 * Native date inputs emit partial values as "" while the user types, so a
 * blind write would clear the saved end date mid-edit. `commit: false` means
 * "this is still a keystroke"; committing null only happens for an explicit
 * clear (blur/Clear button), never for an in-progress edit.
 */
export function parseEndDateInput(
  value: string,
  opts: { explicitClear?: boolean } = {},
): { commit: boolean; value: string | null } {
  const key = normalizeDateKey(value);
  if (key) return { commit: true, value: key };
  if (value === "" && opts.explicitClear) return { commit: true, value: null };
  return { commit: false, value: null };
}

/** Set (or clear, with null) the date a recurring routine stops on. */
export async function setRepeatUntil(
  assignment: RoutineAssignment,
  repeatUntil: string | null,
): Promise<string | null> {
  const next = normalizeDateKey(repeatUntil);
  // Guard against a partial input silently becoming "no end date".
  if (repeatUntil && !next) throw new Error("Enter a valid end date");
  const { error } = await supabase
    .from("workout_sessions")
    .update({ repeat_until: next })
    .eq("id", assignment.id);
  if (error) throw error;
  return next;
}

/** Toggles one weekday on an existing recurring slot. */
export async function toggleAssignmentDay(
  assignment: RoutineAssignment,
  day: number,
): Promise<number[]> {
  const weekdays = toggleWeekday(assignment.weekdays, day);
  if (weekdays.length === 0) {
    await stopRepeating(assignment.id);
    return [];
  }
  const { error } = await supabase
    .from("workout_sessions")
    .update({ days_of_week: weekdays })
    .eq("id", assignment.id);
  if (error) throw error;
  return weekdays;
}

/** Adds days to an existing slot without touching the ones already set. */
export async function addDaysToAssignment(
  assignment: RoutineAssignment,
  days: readonly number[],
): Promise<number[]> {
  const weekdays = sortWeekdays([...assignment.weekdays, ...days]);
  if (weekdays.length === assignment.weekdays.length) return assignment.weekdays;
  const { error } = await supabase
    .from("workout_sessions")
    .update({ days_of_week: weekdays })
    .eq("id", assignment.id);
  if (error) throw error;
  return weekdays;
}

/** Removes the recurring slot entirely (the saved routine itself is kept). */
export async function stopRepeating(sessionId: string): Promise<void> {
  const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

/** Today as YYYY-MM-DD in the user's local timezone. */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Switch a recurring slot between weekly and every-other-week. */
export async function setRepeatInterval(
  assignment: RoutineAssignment,
  intervalWeeks: number,
): Promise<number> {
  const interval = normalizeInterval(intervalWeeks);
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      interval_weeks: interval,
      anchor_date: assignment.anchorDate ?? todayKey(),
    })
    .eq("id", assignment.id);
  if (error) throw error;
  return interval;
}

/** Skip (or un-skip) a single occurrence without touching the pattern. */
export async function toggleSkipOccurrence(
  assignment: RoutineAssignment,
  dayKey: string,
): Promise<string[]> {
  const next = pruneSkippedDates(toggleSkippedDate(assignment.skippedDates, dayKey), todayKey());
  const { error } = await supabase
    .from("workout_sessions")
    .update({ skipped_dates: next })
    .eq("id", assignment.id);
  if (error) throw error;
  return next;
}

/** Give one weekday its own start time; pass null to fall back to the default. */
export async function setDayTimeOverride(
  assignment: RoutineAssignment,
  weekday: number,
  time: string | null,
): Promise<Record<number, string>> {
  const next: Record<number, string> = { ...assignment.timeOverrides };
  const normalized = time ? normalizeTime(time) : null;
  if (normalized) next[weekday] = normalized;
  else delete next[weekday];
  const { error } = await supabase
    .from("workout_sessions")
    .update({ time_overrides: next })
    .eq("id", assignment.id);
  if (error) throw error;
  return next;
}

type SessionPatch = Partial<Database["public"]["Tables"]["workout_sessions"]["Update"]>;

export type ChangeScope = "future" | "week";

export type RoutineChange = {
  /** New start time, "HH:mm". */
  time?: string | null;
  /** New weekday set. */
  weekdays?: number[];
  intervalWeeks?: number;
  /** New end date, or null to repeat indefinitely. */
  repeatUntil?: string | null;
};

/**
 * Update a recurring routine, either permanently ("all future occurrences") or
 * for the current week only.
 *
 * "This week only" never rewrites the pattern: a time change becomes a
 * date-keyed override on this week's dates, and dropping a day becomes a
 * one-off skip. Next week goes back to the saved routine.
 */
export async function applyRoutineChange(
  assignment: RoutineAssignment,
  change: RoutineChange,
  scope: ChangeScope,
  today = todayKey(),
): Promise<void> {
  if (scope === "future") {
    const patch: SessionPatch = {};
    if (change.time) {
      const time = normalizeTime(change.time);
      if (time) patch.planned_time = `${time}:00`;
    }
    if (change.weekdays) {
      const weekdays = sortWeekdays(change.weekdays);
      if (weekdays.length === 0) throw new Error("Pick at least one day");
      patch.days_of_week = weekdays;
    }
    if (change.repeatUntil !== undefined) {
      patch.repeat_until = normalizeDateKey(change.repeatUntil);
    }
    if (change.intervalWeeks != null) {
      patch.interval_weeks = normalizeInterval(change.intervalWeeks);
      patch.anchor_date = assignment.anchorDate ?? today;
    }
    if (Object.keys(patch).length === 0) return;
    const { error } = await supabase.from("workout_sessions").update(patch).eq("id", assignment.id);
    if (error) throw error;
    return;
  }

  // Week-only edits: overrides and skips, pattern untouched.
  const recurrence = {
    intervalWeeks: assignment.intervalWeeks,
    anchorDate: assignment.anchorDate,
    repeatUntil: assignment.repeatUntil,
    skippedDates: assignment.skippedDates,
  };
  const patch: SessionPatch = {};

  if (change.time) {
    const time = normalizeTime(change.time);
    if (time) {
      const overrides: Record<string, string> = {
        ...Object.fromEntries(
          Object.entries(assignment.timeOverrides).map(([k, v]) => [String(k), v]),
        ),
        ...pruneDateOverrides(assignment.timeOverrides, today),
      };
      for (const dayKey of datesThisWeek(assignment.weekdays, today, recurrence)) {
        overrides[dayKey] = time;
      }
      patch.time_overrides = overrides;
    }
  }

  if (change.weekdays) {
    const keep = new Set(sortWeekdays(change.weekdays));
    const dropped = assignment.weekdays.filter((d) => !keep.has(d));
    if (dropped.length) {
      const skips = new Set(pruneSkippedDates(assignment.skippedDates, today));
      for (const dayKey of datesThisWeek(dropped, today, recurrence)) skips.add(dayKey);
      patch.skipped_dates = [...skips].sort();
    }
  }

  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("workout_sessions").update(patch).eq("id", assignment.id);
  if (error) throw error;
}

/** Date-keyed ("just this week") time overrides currently in effect. */
export function weekOverrides(assignment: RoutineAssignment, today = todayKey()): string[] {
  return Object.keys(pruneDateOverrides(assignment.timeOverrides, today)).sort();
}

/** Clears every "just this week" time override. */
export async function clearWeekOverrides(assignment: RoutineAssignment): Promise<void> {
  const weekdayOnly = Object.fromEntries(
    Object.entries(assignment.timeOverrides).map(([k, v]) => [String(k), v]),
  );
  const { error } = await supabase
    .from("workout_sessions")
    .update({ time_overrides: weekdayOnly })
    .eq("id", assignment.id);
  if (error) throw error;
}

/** Restores per-date overrides from an imported backup. */
export async function saveTimeOverrides(
  sessionId: string,
  overrides: Record<string, string>,
): Promise<void> {
  if (Object.keys(overrides).length === 0) return;
  const { error } = await supabase
    .from("workout_sessions")
    .update({ time_overrides: overrides })
    .eq("id", sessionId);
  if (error) throw error;
}
