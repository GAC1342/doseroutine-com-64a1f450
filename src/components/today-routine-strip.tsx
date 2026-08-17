import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Dumbbell, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { todayKeyInZone } from "@/lib/local-calendar";
import {
  formatRoutineTime,
  routineForDay,
  type MealTimeRow,
  type WorkoutSessionRow,
} from "@/lib/routine-schedule";

/** Loads every recurring workout slot and meal time for the signed-in user. */
export function useRoutineRows() {
  return useQuery({
    queryKey: ["today-routine"],
    queryFn: async () => {
      const [workoutsRes, mealsRes] = await Promise.all([
        supabase.from("workout_sessions").select("*").not("planned_time", "is", null),
        supabase.from("meal_times").select("*"),
      ]);
      if (workoutsRes.error) throw workoutsRes.error;
      if (mealsRes.error) throw mealsRes.error;
      return {
        workouts: (workoutsRes.data ?? []) as WorkoutSessionRow[],
        meals: (mealsRes.data ?? []) as MealTimeRow[],
      };
    },
    staleTime: 5 * 60_000,
  });
}

/** Today's workout + meal anchors. Purely informational: these never enter
 *  adherence math, so the score on this page stays dose-only. */
export function TodayRoutineStrip({ tz }: { tz: string }) {
  const { data } = useRoutineRows();
  const dayKey = todayKeyInZone(tz);
  const rows = routineForDay(data?.workouts ?? [], data?.meals ?? [], dayKey, tz);

  if (rows.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Today's routine
        </h2>
        <Link
          to="/fitness"
          search={{ view: "workouts" }}
          className="text-xs font-semibold text-primary"
        >
          Edit
        </Link>
      </div>
      <Card className="mt-2 divide-y divide-border rounded-2xl border-border p-0">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-3 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              {row.kind === "workout" ? (
                <Dumbbell className="h-4 w-4 text-primary" />
              ) : (
                <UtensilsCrossed className="h-4 w-4 text-accent-warm" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatRoutineTime(row.time)}
                {row.kind === "workout" && row.sessionKind ? ` · ${row.sessionKind}` : ""}
              </p>
            </div>
            {row.kind === "workout" && (
              <Link
                to="/fitness"
                search={{ day: dayKey, view: "workouts" }}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Log
              </Link>
            )}
          </div>
        ))}
      </Card>
    </section>
  );
}
