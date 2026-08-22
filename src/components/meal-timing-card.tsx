import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_TIMING_RULES,
  buildMealTimingSuggestions,
  type MealTimingRules,
  type TimingMacroSummary,
  type TimingStackItem,
} from "@/lib/meal-timing";

/**
 * Meal timing suggestions built from the user's active stack plus the macros
 * they have actually been logging over the last two weeks.
 */
export function MealTimingCard({ className = "" }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["meal-timing-suggestions"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return null;

      const since = new Date();
      since.setDate(since.getDate() - 14);

      const [stackRes, mealsRes, profileRes, rulesRes] = await Promise.all([
        supabase
          .from("user_compounds")
          .select(
            "custom_name,custom_category,times_of_day,with_food,post_workout,compound:compounds(name,category)",
          )
          .eq("user_id", uid)
          .eq("active", true),
        supabase
          .from("meals")
          .select("logged_at,adj_calories,adj_protein_g,est_calories,est_protein_g")
          .gte("logged_at", since.toISOString()),
        supabase
          .from("profiles")
          .select("target_calories,target_protein_g")
          .eq("id", uid)
          .maybeSingle(),
        supabase
          .from("meal_timing_rules")
          .select(
            "with_food_window_min,workout_window_min,empty_stomach_gap_min,first_meal_protein_g,late_meal_hour,max_meals_per_day,suggestions_enabled",
          )
          .eq("user_id", uid)
          .maybeSingle(),
      ]);
      const rules = (rulesRes.data as MealTimingRules | null) ?? DEFAULT_TIMING_RULES;

      const stack: TimingStackItem[] = (stackRes.data ?? []).map((row) => {
        const compound = row.compound as { name?: string; category?: string } | null;
        return {
          name: compound?.name ?? row.custom_name ?? "Item",
          category: (compound?.category ?? row.custom_category ?? null) as string | null,
          times: (row.times_of_day ?? []) as string[],
          withFood: row.with_food,
          postWorkout: row.post_workout,
        };
      });

      const byDay = new Map<
        string,
        { calories: number; protein: number; count: number; hours: number[] }
      >();
      for (const meal of mealsRes.data ?? []) {
        if (!meal.logged_at) continue;
        const at = new Date(meal.logged_at);
        const key = at.toDateString();
        const bucket = byDay.get(key) ?? { calories: 0, protein: 0, count: 0, hours: [] };
        bucket.calories += meal.adj_calories ?? meal.est_calories ?? 0;
        bucket.protein += meal.adj_protein_g ?? meal.est_protein_g ?? 0;
        bucket.count += 1;
        bucket.hours.push(at.getHours());
        byDay.set(key, bucket);
      }
      const dayCount = byDay.size;
      const totals = [...byDay.values()];
      const macros: TimingMacroSummary = {
        avgCalories: dayCount
          ? Math.round(totals.reduce((a, b) => a + b.calories, 0) / dayCount)
          : null,
        avgProtein: dayCount
          ? Math.round(totals.reduce((a, b) => a + b.protein, 0) / dayCount)
          : null,
        calorieTarget: profileRes.data?.target_calories ?? null,
        proteinTarget: profileRes.data?.target_protein_g ?? null,
        mealsPerDay: dayCount
          ? Math.round((totals.reduce((a, b) => a + b.count, 0) / dayCount) * 10) / 10
          : null,
        firstMealHour: dayCount
          ? Math.round(totals.reduce((a, b) => a + Math.min(...b.hours), 0) / dayCount)
          : null,
        lastMealHour: dayCount
          ? Math.round(totals.reduce((a, b) => a + Math.max(...b.hours), 0) / dayCount)
          : null,
      };

      return buildMealTimingSuggestions(stack, macros, rules);
    },
    staleTime: 5 * 60_000,
  });

  const suggestions = useMemo(() => data ?? [], [data]);
  if (suggestions.length === 0) return null;

  return (
    <section className={`rounded-2xl bg-card p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Meal timing for your protocol</h2>
        <Link
          to="/reminders"
          className="ml-auto text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Adjust rules
        </Link>
      </div>
      <ul className="mt-3 space-y-3">
        {suggestions.map((s) => (
          <li key={s.id} className="rounded-xl bg-muted/50 px-3 py-2">
            <p className="text-sm font-medium">{s.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {s.because}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">
        General timing guidance based on your stack — not medical advice.
      </p>
    </section>
  );
}
