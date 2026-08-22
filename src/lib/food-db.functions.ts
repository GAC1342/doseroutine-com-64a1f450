import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FoodSearchResult = {
  id: string;
  name: string;
  brand: string | null;
  source: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  defaultPortionG: number;
  qualityScore: number;
};

/** Search the food catalog (curated + cached USDA), falling back to USDA live. */
export const searchFoodDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({
    query: String(input?.query ?? "")
      .trim()
      .slice(0, 80),
  }))
  .handler(async ({ data }): Promise<FoodSearchResult[]> => {
    if (data.query.length < 2) return [];
    const { searchFoodCatalog, lookupUsdaAndCache } = await import("@/lib/food-db.server");
    const own = await searchFoodCatalog(data.query, 8);
    if (own.length >= 3) return own;
    const usda = await lookupUsdaAndCache(data.query).catch(() => null);
    if (!usda || own.some((f) => f.id === usda.id)) return own;
    return [...own, usda];
  });

/** Household portions for one food, used by the portion picker. */
export const foodPortionsFor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { foodId: string }) => ({
    foodId: String(input?.foodId ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    if (!data.foodId) return [];
    const { getFoodPortions } = await import("@/lib/food-db.server");
    return getFoodPortions(data.foodId);
  });

export type ScanCorrectionInput = {
  name: string;
  portion: string;
  grams?: number | null;
  foodId?: string | null;
  dataSource?: string | null;
  aiPortion?: string | null;
  aiGrams?: number | null;
  ai: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  user: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
};

function macros(raw: unknown) {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const n = (key: string) => {
    const value = Number(obj[key]);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };
  return {
    calories: n("calories"),
    protein_g: n("protein_g"),
    carbs_g: n("carbs_g"),
    fat_g: n("fat_g"),
  };
}

/**
 * Feedback loop: record what the scanner said vs. what the user saved.
 *
 * Only items the user actually changed are stored. A corrected item whose
 * numbers came from an unmatched AI guess is promoted into the food database
 * so the next scan of the same food starts from real data.
 */
export const recordScanCorrections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      mealId?: string | null;
      scanId?: string | null;
      readFrom?: string | null;
      items: ScanCorrectionInput[];
    }) => ({
      mealId: input?.mealId ? String(input.mealId) : null,
      scanId: input?.scanId ? String(input.scanId).slice(0, 80) : null,
      readFrom: input?.readFrom ? String(input.readFrom).slice(0, 30) : null,
      items: (Array.isArray(input?.items) ? input.items : []).slice(0, 20).map((item) => ({
        name: String(item?.name ?? "").slice(0, 120),
        portion: String(item?.portion ?? "").slice(0, 60),
        grams: Number(item?.grams) > 0 ? Number(item.grams) : null,
        foodId: item?.foodId ? String(item.foodId) : null,
        dataSource: item?.dataSource ? String(item.dataSource).slice(0, 20) : null,
        aiPortion: item?.aiPortion ? String(item.aiPortion).slice(0, 60) : null,
        aiGrams: Number(item?.aiGrams) > 0 ? Number(item.aiGrams) : null,
        ai: macros(item?.ai),
        user: macros(item?.user),
      })),
    }),
  )
  .handler(async ({ data, context }) => {
    if (data.items.length === 0) return { recorded: 0, promoted: 0 };

    const { normalizeFoodName, promoteUserFood, bumpTimesLogged } =
      await import("@/lib/food-db.server");

    const changed = data.items.filter((item) => {
      const drift =
        Math.abs(item.user.calories - item.ai.calories) +
        Math.abs(item.user.protein_g - item.ai.protein_g) +
        Math.abs(item.user.carbs_g - item.ai.carbs_g) +
        Math.abs(item.user.fat_g - item.ai.fat_g);
      return drift > 0.5 || (item.aiPortion && item.aiPortion !== item.portion);
    });

    if (changed.length === 0) {
      await bumpTimesLogged(
        data.items.map((i) => i.foodId ?? "").filter(Boolean) as string[],
      ).catch(() => undefined);
      return { recorded: 0, promoted: 0 };
    }

    const rows = changed.map((item) => {
      const base = Math.max(item.ai.calories, item.user.calories, 1);
      return {
        user_id: context.userId,
        meal_id: data.mealId,
        scan_id: data.scanId,
        item_name: item.name || "Item",
        item_name_norm: normalizeFoodName(item.name || "Item"),
        food_id: item.foodId,
        read_from: data.readFrom,
        resolved_source: item.dataSource,
        ai_portion: item.aiPortion,
        user_portion: item.portion,
        ai_grams: item.aiGrams,
        user_grams: item.grams,
        ai_calories: item.ai.calories,
        ai_protein_g: item.ai.protein_g,
        ai_carbs_g: item.ai.carbs_g,
        ai_fat_g: item.ai.fat_g,
        user_calories: item.user.calories,
        user_protein_g: item.user.protein_g,
        user_carbs_g: item.user.carbs_g,
        user_fat_g: item.user.fat_g,
        calorie_drift_pct:
          Math.round((Math.abs(item.user.calories - item.ai.calories) / base) * 1000) / 10,
      };
    });

    const { error } = await context.supabase.from("meal_scan_corrections").insert(rows);
    if (error) throw new Error(error.message);

    // Promote hand-corrected foods that had no database match behind them.
    let promoted = 0;
    for (const item of changed) {
      if (item.foodId) continue;
      const grams = item.grams ?? 0;
      if (grams <= 0) continue;
      const id = await promoteUserFood({
        name: item.name,
        grams,
        calories: item.user.calories,
        protein_g: item.user.protein_g,
        carbs_g: item.user.carbs_g,
        fat_g: item.user.fat_g,
      }).catch(() => null);
      if (id) promoted += 1;
    }

    await bumpTimesLogged(data.items.map((i) => i.foodId ?? "").filter(Boolean) as string[]).catch(
      () => undefined,
    );

    return { recorded: rows.length, promoted };
  });

export type FoodQualityRow = {
  itemName: string;
  corrections: number;
  avgDriftPct: number;
  avgAiCalories: number;
  avgUserCalories: number;
  lastAt: string;
  resolvedSource: string | null;
};

/** Admin view: which foods the scanner most often gets wrong. */
export const foodQualityReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FoodQualityRow[]> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("meal_scan_corrections")
      .select(
        "item_name, item_name_norm, calorie_drift_pct, ai_calories, user_calories, created_at, resolved_source",
      )
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);

    const groups = new Map<
      string,
      FoodQualityRow & { driftSum: number; aiSum: number; userSum: number }
    >();
    for (const row of data ?? []) {
      const key = row.item_name_norm;
      const existing = groups.get(key);
      const drift = Number(row.calorie_drift_pct) || 0;
      const ai = Number(row.ai_calories) || 0;
      const user = Number(row.user_calories) || 0;
      if (existing) {
        existing.corrections += 1;
        existing.driftSum += drift;
        existing.aiSum += ai;
        existing.userSum += user;
      } else {
        groups.set(key, {
          itemName: row.item_name,
          corrections: 1,
          avgDriftPct: 0,
          avgAiCalories: 0,
          avgUserCalories: 0,
          lastAt: row.created_at,
          resolvedSource: row.resolved_source,
          driftSum: drift,
          aiSum: ai,
          userSum: user,
        });
      }
    }

    return Array.from(groups.values())
      .map((g) => ({
        itemName: g.itemName,
        corrections: g.corrections,
        avgDriftPct: Math.round((g.driftSum / g.corrections) * 10) / 10,
        avgAiCalories: Math.round(g.aiSum / g.corrections),
        avgUserCalories: Math.round(g.userSum / g.corrections),
        lastAt: g.lastAt,
        resolvedSource: g.resolvedSource,
      }))
      .sort((a, b) => b.corrections - a.corrections || b.avgDriftPct - a.avgDriftPct)
      .slice(0, 100);
  });
