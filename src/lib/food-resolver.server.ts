/**
 * Grounding layer (server-only).
 *
 * The vision model is only trusted to say *what* the food is and *how much*
 * of it there is. The macros themselves come from the food database
 * (curated → USDA), scaled to the portion. Only when nothing matches do the
 * model's own numbers survive.
 */
import { parsePortionGrams, describeGrams } from "@/lib/portion-units";
import { getFoodPortions, resolveFoodRecord, type FoodRecord } from "@/lib/food-db.server";
import {
  reconcileEstimate,
  roundMacro,
  type FoodDataSource,
  type MealEstimate,
  type MealItem,
} from "@/lib/meal-nutrition";

/** Scale a per-100g food record to a gram weight. */
export function scaleFoodToGrams(
  food: FoodRecord,
  grams: number,
): Omit<MealItem, "name" | "portion"> {
  const f = grams / 100;
  const micro = (per100: number | null | undefined) =>
    per100 == null ? null : roundMacro(per100 * f);
  return {
    fiber_g: micro(food.fiber100),
    sugar_g: micro(food.sugar100),
    sodium_mg: food.sodium100mg == null ? null : Math.round(food.sodium100mg * f),
    satfat_g: micro(food.satfat100),
    calories: roundMacro(food.kcal100 * f, "kcal"),
    protein_g: roundMacro(food.protein100 * f),
    carbs_g: roundMacro(food.carbs100 * f),
    fat_g: roundMacro(food.fat100 * f),
    grams: roundMacro(grams),
    foodId: food.id,
    dataSource: (food.source === "usda" ? "usda" : "database") as FoodDataSource,
    sourceName: food.brand ? `${food.name} (${food.brand})` : food.name,
    sourceBasis: `${Math.round(food.kcal100)} kcal · ${roundMacro(food.protein100)}P / ${roundMacro(food.carbs100)}C / ${roundMacro(food.fat100)}F per 100 g`,
  };
}

/**
 * Sanity-check a pure AI estimate against physics: macros can't carry more
 * energy than the stated calories allow, and no real food exceeds ~9 kcal/g.
 * When the numbers are impossible we rebuild calories from the macros rather
 * than logging a figure we know is wrong.
 */
export function guardPlausibility(item: MealItem): { item: MealItem; adjusted: boolean } {
  const protein = Math.max(0, Number(item.protein_g) || 0);
  const carbs = Math.max(0, Number(item.carbs_g) || 0);
  const fat = Math.max(0, Number(item.fat_g) || 0);
  const stated = Math.max(0, Number(item.calories) || 0);
  const fromMacros = protein * 4 + carbs * 4 + fat * 9;
  const grams = Number(item.grams) > 0 ? Number(item.grams) : null;

  // Macro energy and stated calories should agree within a wide tolerance.
  const wayOff =
    fromMacros > 0 && (stated <= 0 || stated < fromMacros * 0.6 || stated > fromMacros * 1.7);
  // 9 kcal/g is pure fat — anything above that is a portion-size error.
  const impossibleDensity = grams != null && stated > grams * 9.2;

  if (!wayOff && !impossibleDensity) return { item, adjusted: false };
  if (fromMacros <= 0) return { item, adjusted: false };

  return {
    item: { ...item, calories: roundMacro(fromMacros, "kcal") },
    adjusted: true,
  };
}

async function groundItem(item: MealItem): Promise<MealItem> {
  const food = await resolveFoodRecord(item.name).catch(() => null);
  const statedGrams = Number(item.grams) > 0 ? Number(item.grams) : parsePortionGrams(item.portion);

  if (!food) {
    return guardPlausibility({
      ...item,
      grams: statedGrams ?? null,
      foodId: null,
      dataSource: "ai",
    }).item;
  }

  const grams = statedGrams && statedGrams > 0 ? statedGrams : food.defaultPortionG;
  const portions = await getFoodPortions(food.id).catch(() => []);
  const scaled = scaleFoodToGrams(food, grams);
  return {
    ...item,
    name: item.name || food.name,
    portion: describeGrams(grams, portions) || item.portion,
    ...scaled,
  };
}

/**
 * Ground a visual estimate against the food database.
 *
 * Barcode panels and transcribed Nutrition Facts panels are already exact, so
 * they pass through untouched — re-deriving them from a generic database entry
 * would make them worse, not better.
 */
export async function groundEstimate(estimate: MealEstimate): Promise<MealEstimate> {
  const readFrom = estimate.readFrom ?? "visual";
  if (readFrom !== "visual") {
    const source: FoodDataSource = readFrom === "barcode" ? "barcode" : "label";
    return {
      ...estimate,
      items: estimate.items.map((item) => ({
        ...item,
        grams: Number(item.grams) > 0 ? item.grams : parsePortionGrams(item.portion),
        dataSource: item.dataSource ?? source,
      })),
    };
  }

  const items: MealItem[] = [];
  for (const item of estimate.items) {
    items.push(await groundItem(item));
  }

  const grounded = items.filter((i) => i.dataSource === "database" || i.dataSource === "usda");
  const note =
    grounded.length === 0
      ? estimate.note
      : `${grounded.length} of ${items.length} item${items.length === 1 ? "" : "s"} matched our food database.${estimate.note ? ` ${estimate.note}` : ""}`;

  // Every item grounded in real data is a materially better estimate than a
  // pure visual guess, so the confidence floor rises with the match rate.
  const confidence =
    grounded.length === items.length && items.length > 0
      ? estimate.confidence === "low"
        ? "medium"
        : estimate.confidence
      : estimate.confidence;

  return reconcileEstimate({ ...estimate, items, note: note.slice(0, 300), confidence });
}
