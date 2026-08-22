/**
 * Recent / Relog data for Quick Add Meal.
 *
 * "Recent" is the last 20 distinct meals by name; "Frequent" is the five names
 * the user logs most often. Re-logging copies the stored macros into today
 * with source='relog' — no AI call, no photo, one tap.
 */
import { supabase } from "@/integrations/supabase/client";

export type RecentMeal = {
  key: string;
  name: string;
  slot: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  /** Stored item breakdown, copied verbatim on relog. */
  items: unknown;
  count: number;
  loggedAt: string;
};

type MealRow = {
  id: string;
  label: string | null;
  name: string | null;
  meal_slot: string | null;
  meal_type: string | null;
  adj_calories: number | null;
  adj_protein_g: number | null;
  adj_carbs_g: number | null;
  adj_fat_g: number | null;
  est_calories: number | null;
  est_protein_g: number | null;
  est_carbs_g: number | null;
  est_fat_g: number | null;
  fiber_g: number | null;
  ai_items: unknown;
  logged_at: string | null;
  created_at: string | null;
};

const num = (...values: Array<number | null | undefined>) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  }
  return 0;
};

/** Collapse raw rows into distinct-by-name entries, newest first, with counts. */
export function collapseMeals(rows: MealRow[]): RecentMeal[] {
  const byName = new Map<string, RecentMeal>();
  for (const row of rows) {
    const name = (row.label ?? row.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byName.set(key, {
      key,
      name,
      slot: row.meal_slot ?? row.meal_type ?? null,
      calories: num(row.adj_calories, row.est_calories),
      protein_g: num(row.adj_protein_g, row.est_protein_g),
      carbs_g: num(row.adj_carbs_g, row.est_carbs_g),
      fat_g: num(row.adj_fat_g, row.est_fat_g),
      fiber_g: num(row.fiber_g),
      items: row.ai_items ?? null,
      count: 1,
      loggedAt: row.logged_at ?? row.created_at ?? "",
    });
  }
  return Array.from(byName.values());
}

/** Five most-logged meals, ties broken by recency. */
export function frequentMeals(meals: RecentMeal[]): RecentMeal[] {
  return [...meals]
    .filter((meal) => meal.count > 1)
    .sort((a, b) => b.count - a.count || b.loggedAt.localeCompare(a.loggedAt))
    .slice(0, 5);
}

export async function fetchRecentMeals(): Promise<{
  recent: RecentMeal[];
  frequent: RecentMeal[];
}> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return { recent: [], frequent: [] };

  const { data, error } = await supabase
    .from("meals")
    .select(
      "id, label, name, meal_slot, meal_type, adj_calories, adj_protein_g, adj_carbs_g, adj_fat_g, est_calories, est_protein_g, est_carbs_g, est_fat_g, fiber_g, ai_items, logged_at, created_at",
    )
    .eq("user_id", uid)
    .order("logged_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const collapsed = collapseMeals((data ?? []) as unknown as MealRow[]);
  return { recent: collapsed.slice(0, 20), frequent: frequentMeals(collapsed) };
}

/** Duplicate a previous meal into today. */
export async function relogMeal(meal: RecentMeal, mealType: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("You need to be signed in.");

  const { error } = await supabase.from("meals").insert({
    user_id: uid,
    label: meal.name,
    name: meal.name,
    meal_slot: mealType,
    meal_type: mealType,
    source: "relog",
    ai_items: (meal.items ?? null) as never,
    est_calories: meal.calories,
    est_protein_g: meal.protein_g,
    est_carbs_g: meal.carbs_g,
    est_fat_g: meal.fat_g,
    adj_calories: meal.calories,
    adj_protein_g: meal.protein_g,
    adj_carbs_g: meal.carbs_g,
    adj_fat_g: meal.fat_g,
    fiber_g: meal.fiber_g,
    logged_at: new Date().toISOString(),
  });
  if (error) throw error;
}
