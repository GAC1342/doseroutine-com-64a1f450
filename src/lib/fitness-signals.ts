/**
 * "What's missing from my profile" signals for the Fitness tabs.
 *
 * One small query answers every tip: counts and a couple of dates, nothing
 * heavy, cached for a few minutes because tips don't need to be live.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FitnessSignals } from "@/lib/fitness-tips";

export const EMPTY_SIGNALS: FitnessSignals = {
  hasLoggedWorkout: false,
  loggedThisWeek: 0,
  hasWeeklyPlan: false,
  plannedDays: 0,
  hasSavedExercises: false,
  hasRoutines: false,
  hasBodyMetrics: false,
  hasRecentBodyEntry: false,
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function fetchFitnessSignals(): Promise<FitnessSignals> {
  const weekStart = daysAgoIso(7);
  const [logs, sessions, templates, custom, body] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("performed_on")
      .order("performed_on", {
        ascending: false,
      })
      .limit(60),
    supabase.from("workout_sessions").select("days_of_week, active"),
    supabase.from("workout_templates").select("id").limit(1),
    supabase.from("custom_exercises").select("id").limit(1),
    supabase
      .from("body_metrics")
      .select("measured_at")
      .order("measured_at", { ascending: false })
      .limit(1),
  ]);

  const logRows = logs.data ?? [];
  const activeSessions = (sessions.data ?? []).filter((r) => r.active !== false);
  const plannedDays = new Set(activeSessions.flatMap((r) => r.days_of_week ?? [])).size;
  const latestBody = body.data?.[0]?.measured_at ?? null;

  return {
    hasLoggedWorkout: logRows.length > 0,
    loggedThisWeek: logRows.filter((r) => (r.performed_on ?? "") >= weekStart).length,
    hasWeeklyPlan: activeSessions.length > 0,
    plannedDays,
    hasSavedExercises: (custom.data ?? []).length > 0 || logRows.length > 0,
    hasRoutines: (templates.data ?? []).length > 0,
    hasBodyMetrics: Boolean(latestBody),
    hasRecentBodyEntry: Boolean(latestBody && latestBody.slice(0, 10) >= daysAgoIso(30)),
  };
}

export function useFitnessSignals() {
  return useQuery({
    queryKey: ["fitness-signals"],
    queryFn: fetchFitnessSignals,
    staleTime: 2 * 60_000,
  });
}
