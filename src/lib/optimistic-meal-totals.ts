/**
 * Optimistic Home update after a meal is saved.
 *
 * The daily ring and macro bars read the ["macro-progress", weekStart] cache.
 * Adding the saved totals straight into that cache lets Home reflect the meal
 * on the same frame the sheet closes; the follow-up invalidation reconciles
 * with the server a moment later.
 */
import type { QueryClient } from "@tanstack/react-query";
import {
  addTotals,
  dayKeyOf,
  emptyTotals,
  weekDaysFor,
  type MacroTargets,
} from "@/lib/macro-progress";
import type { MealTotals } from "@/lib/meal-nutrition";

type MacroProgressData = { byDay: Record<string, MealTotals>; targets: MacroTargets };

export function applyOptimisticMealTotals(
  qc: QueryClient,
  totals: MealTotals,
  when: Date = new Date(),
) {
  const day = dayKeyOf(when);
  const weekStart = weekDaysFor(day)[0];
  qc.setQueryData<MacroProgressData>(["macro-progress", weekStart], (prev) => {
    if (!prev) return prev;
    const current = prev.byDay[day] ?? emptyTotals();
    return { ...prev, byDay: { ...prev.byDay, [day]: addTotals(current, totals) } };
  });
  void qc.invalidateQueries({ queryKey: ["macro-progress"] });
}
