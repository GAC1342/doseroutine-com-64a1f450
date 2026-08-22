/**
 * Today card data: the meals logged today, grouped by meal type.
 *
 * The card reads its numbers from the same rows the diary uses, so the ring,
 * the macro bars and the list can never disagree. Editing re-opens the Quick
 * Add review sheet, so a stored row has to be convertible back into the
 * analyzer result shape the sheet understands.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AnalyzeMealResult, AnalyzedItem } from "@/lib/analyze-meal.server";
import { dayKeyOf } from "@/lib/macro-progress";

export type TodayMealRow = {
  id: string;
  name: string;
  mealType: string;
  loggedAt: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  healthScore: number | null;
  confidence: string | null;
  source: string | null;
  storagePath: string | null;
  photoUrl: string | null;
  items: unknown;
  notes: string | null;
};

export type TodayMealsData = {
  meals: TodayMealRow[];
  targets: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  };
};

export const MEAL_GROUPS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
] as const;

const num = (...values: Array<number | null | undefined>) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  }
  return 0;
};

/** Anything unrecognised lands in "Other" rather than disappearing. */
export function groupKeyFor(mealType: string | null | undefined): string {
  const value = (mealType ?? "").toLowerCase();
  return MEAL_GROUPS.some((group) => group.key === value) ? value : "other";
}

export function groupMeals(meals: TodayMealRow[]) {
  const order = [...MEAL_GROUPS.map((g) => g.key), "other"];
  const labels: Record<string, string> = {
    ...Object.fromEntries(MEAL_GROUPS.map((g) => [g.key, g.label])),
    other: "Other",
  };
  return order
    .map((key) => ({
      key,
      label: labels[key] ?? "Other",
      meals: meals
        .filter((meal) => groupKeyFor(meal.mealType) === key)
        .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    }))
    .filter((group) => group.meals.length > 0);
}

export function sumMeals(meals: TodayMealRow[]) {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein_g: acc.protein_g + meal.protein_g,
      carbs_g: acc.carbs_g + meal.carbs_g,
      fat_g: acc.fat_g + meal.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export async function fetchTodayMeals(day: string = dayKeyOf(new Date())): Promise<TodayMealsData> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Session not ready");

  const start = new Date(`${day}T00:00:00`).toISOString();
  const end = new Date(`${day}T23:59:59.999`).toISOString();

  const [mealsRes, profileRes] = await Promise.all([
    supabase
      .from("meals")
      .select(
        "id,label,name,meal_slot,meal_type,logged_at,adj_calories,adj_protein_g,adj_carbs_g,adj_fat_g,est_calories,est_protein_g,est_carbs_g,est_fat_g,fiber_g,health_score,ai_confidence,source,storage_path,photo_url,ai_items,notes",
      )
      .eq("user_id", uid)
      .gte("logged_at", start)
      .lte("logged_at", end)
      .order("logged_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("target_calories,target_protein_g,target_carbs_g,target_fat_g")
      .eq("id", uid)
      .maybeSingle(),
  ]);
  if (mealsRes.error) throw mealsRes.error;

  const meals: TodayMealRow[] = (mealsRes.data ?? []).map((row) => ({
    id: String(row.id),
    name: (row.label ?? row.name ?? "Meal").trim() || "Meal",
    mealType: String(row.meal_slot ?? row.meal_type ?? "other"),
    loggedAt: String(row.logged_at ?? ""),
    calories: num(row.adj_calories, row.est_calories),
    protein_g: num(row.adj_protein_g, row.est_protein_g),
    carbs_g: num(row.adj_carbs_g, row.est_carbs_g),
    fat_g: num(row.adj_fat_g, row.est_fat_g),
    fiber_g: num(row.fiber_g),
    healthScore: typeof row.health_score === "number" ? row.health_score : null,
    confidence: row.ai_confidence ?? null,
    source: row.source ?? null,
    storagePath: row.storage_path ?? null,
    photoUrl: row.photo_url ?? null,
    items: row.ai_items ?? null,
    notes: row.notes ?? null,
  }));

  const p = profileRes.data;
  return {
    meals,
    targets: {
      calories: p?.target_calories == null ? null : Number(p.target_calories),
      protein_g: p?.target_protein_g == null ? null : Number(p.target_protein_g),
      carbs_g: p?.target_carbs_g == null ? null : Number(p.target_carbs_g),
      fat_g: p?.target_fat_g == null ? null : Number(p.target_fat_g),
    },
  };
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) throw error;
}

/** Short-lived signed URL for a stored meal photo (bucket is private). */
export async function signedMealPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("meal-photos").createSignedUrl(path, 900);
  if (error) return null;
  return data?.signedUrl ?? null;
}

const confidenceValue = (band: string | null): number => {
  if (band === "high") return 0.9;
  if (band === "low") return 0.4;
  return 0.7;
};

type StoredItem = {
  name?: unknown;
  grams?: unknown;
  calories?: unknown;
  protein_g?: unknown;
  carbs_g?: unknown;
  fat_g?: unknown;
  fiber_g?: unknown;
  dataSource?: unknown;
};

const numOf = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Turn a stored meal back into the review sheet's analyzer-result shape. */
export function analysisFromMeal(meal: TodayMealRow): AnalyzeMealResult {
  const raw = Array.isArray(meal.items) ? (meal.items as StoredItem[]) : [];
  const items: AnalyzedItem[] = raw
    .map((item) => ({
      name: String(item.name ?? "Item"),
      grams: Math.max(1, Math.round(numOf(item.grams, 100))),
      calories: Math.round(numOf(item.calories)),
      protein_g: Math.round(numOf(item.protein_g)),
      carbs_g: Math.round(numOf(item.carbs_g)),
      fat_g: Math.round(numOf(item.fat_g)),
      fiber_g: Math.round(numOf(item.fiber_g)),
      confidence: confidenceValue(meal.confidence),
      nutrition_source: (item.dataSource === "usda" || item.dataSource === "cache"
        ? item.dataSource
        : "llm") as AnalyzedItem["nutrition_source"],
    }))
    .filter((item) => item.name.trim().length > 0);

  // Older rows (and relogs) can have no item breakdown — represent the meal as
  // a single editable line so the sheet still works.
  if (items.length === 0) {
    items.push({
      name: meal.name,
      grams: 100,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      fiber_g: meal.fiber_g,
      confidence: confidenceValue(meal.confidence),
      nutrition_source: "llm",
    });
  }

  return {
    meal_name: meal.name,
    photo_url: meal.photoUrl,
    storage_path: meal.storagePath,
    confidence: confidenceValue(meal.confidence),
    health_score: meal.healthScore,
    notes: meal.notes ?? "",
    items,
    totals: {
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      fiber_g: meal.fiber_g,
    },
  };
}
