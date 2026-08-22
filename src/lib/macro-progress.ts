/**
 * Shared helpers for daily / weekly macro totals and goal progress.
 * Kept UI-free so both Today and Timeline render identical numbers.
 */

import { EMPTY_TOTALS, type MealTotals } from "@/lib/meal-nutrition";

export type MacroKey = "calories" | "protein_g" | "carbs_g" | "fat_g";

export const MACRO_META: { key: MacroKey; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
];

export type MacroTargets = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export const NO_TARGETS: MacroTargets = {
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
};

export function hasAnyTarget(targets: MacroTargets): boolean {
  return MACRO_META.some(({ key }) => (targets[key] ?? 0) > 0);
}

/** yyyy-MM-dd for a local date. */
export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** The seven yyyy-MM-dd keys of the Monday-based week containing `day`. */
export function weekDaysFor(day: string): string[] {
  const base = new Date(`${day}T00:00:00`);
  const offset = (base.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(base);
  monday.setDate(base.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dayKeyOf(d);
  });
}

export function shortWeekdayLabel(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

/**
 * Heading for the per-day macro row.
 *
 * Without this the row of zeroes reads as if it contradicts the weekly chart
 * underneath it — saying "Today" makes clear the two are different windows.
 */
export function dayHeadingLabel(day: string, now: Date = new Date()): string {
  const date = new Date(`${day}T00:00:00`);
  const formatted = date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return day === dayKeyOf(now) ? `Today · ${formatted}` : formatted;
}

/** Percentage of a goal, clamped to 0-999 so a wild day cannot break layout. */
export function goalPercent(value: number, target: number | null): number | null {
  if (!target || target <= 0) return null;
  return Math.min(999, Math.round((value / target) * 100));
}

export function addTotals(a: MealTotals, b: MealTotals): MealTotals {
  return {
    calories: a.calories + b.calories,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
  };
}

export function emptyTotals(): MealTotals {
  return { ...EMPTY_TOTALS };
}
