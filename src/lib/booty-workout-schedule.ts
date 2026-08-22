import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Does this routine row point at the 10-Minute Booty Workout? */
export function isBootyRoutine(label: string | null | undefined): boolean {
  return /booty/i.test(label ?? "");
}

/** True when the user has an active, time-scheduled booty workout routine.
 *  The completion chart is gated on this — no schedule, nothing to chart against. */
export function useBootyWorkoutScheduled() {
  const query = useQuery({
    queryKey: ["routine", "workout_sessions", "booty"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id,label,planned_time,active")
        .not("planned_time", "is", null);
      if (error) throw error;
      return (data ?? []).some((row) => row.active !== false && isBootyRoutine(row.label));
    },
    staleTime: 60_000,
  });

  return { scheduled: query.data === true, loading: query.isLoading };
}
