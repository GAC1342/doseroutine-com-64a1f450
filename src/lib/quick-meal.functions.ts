import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

function normalizeMealType(value: unknown): string | null {
  return MEAL_TYPES.includes(value as (typeof MEAL_TYPES)[number]) ? (value as string) : null;
}

export type QuickMealResponse =
  | { ok: true; result: import("@/lib/analyze-meal.server").AnalyzeMealResult }
  | { ok: false; error: string; message: string };

/** Describe-your-meal mode: text in, the same grounded item list out. */
export const analyzeMealDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; meal_type?: string | null }) => {
    const text = String(input?.text ?? "")
      .trim()
      .slice(0, 500);
    if (text.length < 3) throw new Error("Describe what you ate.");
    return { text, mealType: normalizeMealType(input?.meal_type) };
  })
  .handler(async ({ data }): Promise<QuickMealResponse> => {
    const { analyzeMealText, AnalyzeMealError } = await import("@/lib/analyze-meal.server");
    try {
      const result = await analyzeMealText({ text: data.text, mealType: data.mealType });
      return { ok: true, result };
    } catch (err) {
      if (err instanceof AnalyzeMealError) {
        return { ok: false, error: err.code, message: err.message };
      }
      console.error("[analyze-meal-text] unexpected failure", err);
      return {
        ok: false,
        error: "analysis_failed",
        message: "Something went wrong reading that. Try again.",
      };
    }
  });

/** Barcode mode: Open Food Facts (cached by GTIN) as a single-item meal. */
export const lookupBarcodeMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { barcode: string; meal_type?: string | null }) => {
    const barcode = String(input?.barcode ?? "").replace(/\D/g, "");
    if (barcode.length < 6) throw new Error("That barcode doesn't look right.");
    return { barcode, mealType: normalizeMealType(input?.meal_type) };
  })
  .handler(async ({ data }): Promise<QuickMealResponse> => {
    const { lookupBarcodeFood } = await import("@/lib/analyze-meal.server");
    try {
      const food = await lookupBarcodeFood(data.barcode);
      if (!food) {
        return {
          ok: false,
          error: "not_found",
          message: "We couldn't find that product. Try describing it instead.",
        };
      }
      const factor = food.grams / 100;
      const round = (n: number) => Math.round(n);
      const item = {
        name: food.brand ? `${food.brand} ${food.name}` : food.name,
        grams: food.grams,
        calories: round(food.per100g.calories * factor),
        protein_g: round(food.per100g.protein_g * factor),
        carbs_g: round(food.per100g.carbs_g * factor),
        fat_g: round(food.per100g.fat_g * factor),
        fiber_g: round(food.per100g.fiber_g * factor),
        confidence: 0.95,
        nutrition_source: food.source === "cache" ? ("cache" as const) : ("usda" as const),
      };
      return {
        ok: true,
        result: {
          meal_name: item.name,
          photo_url: null,
          storage_path: null,
          confidence: 0.95,
          health_score: null,
          notes: "",
          items: [item],
          totals: {
            calories: item.calories,
            protein_g: item.protein_g,
            carbs_g: item.carbs_g,
            fat_g: item.fat_g,
            fiber_g: item.fiber_g,
          },
        },
      };
    } catch (err) {
      console.error("[barcode-meal] lookup failed", err);
      return { ok: false, error: "lookup_failed", message: "Barcode lookup failed. Try again." };
    }
  });
