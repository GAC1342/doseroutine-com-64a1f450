/**
 * Unit coverage for the math behind the review sheet's live recalculation:
 * scaling items by servings, rounding totals, and the displayed breakdown.
 */
import { describe, expect, it } from "vitest";
import {
  buildScaleBreakdown,
  roundTotals,
  scaleItems,
  totalsFor,
  type MealItem,
} from "@/lib/meal-nutrition";
import { makeMeal } from "@/test/fixtures/foods";

const ITEMS: MealItem[] = makeMeal(["yogurt", "granola"]);

describe("meal scaling math", () => {
  it("sums item macros into totals", () => {
    expect(roundTotals(totalsFor(ITEMS))).toEqual({
      calories: 240,
      protein_g: 20,
      carbs_g: 26,
      fat_g: 5,
    });
  });

  it("scales every item by the servings factor", () => {
    const scaled = scaleItems(ITEMS, 2);
    expect(scaled.map((i) => i.calories)).toEqual([200, 280]);
    expect(scaled[0]!.protein_g).toBe(34);
    expect(roundTotals(totalsFor(scaled)).calories).toBe(480);
  });

  it("round-trips through a one-serving basis without drift", () => {
    const perServing = scaleItems(scaleItems(ITEMS, 3), 1 / 3);
    expect(perServing.map((i) => i.calories)).toEqual([100, 140]);
    expect(roundTotals(totalsFor(scaleItems(perServing, 1.5))).calories).toBe(360);
  });

  it("explains per-serving × servings = shown totals", () => {
    const perServing = { calories: 250, protein_g: 20, carbs_g: 26, fat_g: 5 };
    const shownTotals = { calories: 500, protein_g: 40, carbs_g: 52, fat_g: 10 };
    const breakdown = buildScaleBreakdown({
      perServing,
      servings: 2,
      shownTotals,
      baseItems: ITEMS,
      items: scaleItems(ITEMS, 2),
    });
    expect(breakdown.servings).toBe(2);
    const kcal = breakdown.macros.find((m) => m.key === "calories");
    expect(kcal?.perServing).toBe(250);
    expect(kcal?.shown).toBe(500);
    expect(kcal?.exact).toBe(500);
    expect(breakdown.items[0]?.scaledCalories).toBeGreaterThan(
      breakdown.items[0]!.perServingCalories,
    );
  });
});
