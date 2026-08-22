import { describe, expect, it } from "vitest";
import {
  analysisFromMeal,
  groupKeyFor,
  groupMeals,
  sumMeals,
  type TodayMealRow,
} from "@/lib/today-meals";

const meal = (over: Partial<TodayMealRow> = {}): TodayMealRow => ({
  id: "1",
  name: "Chicken bowl",
  mealType: "lunch",
  loggedAt: "2026-08-22T12:00:00.000Z",
  calories: 500,
  protein_g: 40,
  carbs_g: 50,
  fat_g: 15,
  fiber_g: 6,
  healthScore: 7,
  confidence: "high",
  source: "photo",
  storagePath: null,
  photoUrl: null,
  items: null,
  notes: null,
  ...over,
});

describe("today meals", () => {
  it("buckets unknown meal types into Other", () => {
    expect(groupKeyFor("brunch")).toBe("other");
    expect(groupKeyFor("Dinner")).toBe("dinner");
    expect(groupKeyFor(null)).toBe("other");
  });

  it("groups chronologically within a meal type", () => {
    const groups = groupMeals([
      meal({ id: "b", loggedAt: "2026-08-22T13:00:00.000Z" }),
      meal({ id: "a", loggedAt: "2026-08-22T11:00:00.000Z" }),
      meal({ id: "c", mealType: "breakfast", loggedAt: "2026-08-22T08:00:00.000Z" }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["breakfast", "lunch"]);
    expect(groups[1]?.meals.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("sums macros across meals", () => {
    expect(sumMeals([meal(), meal({ id: "2", calories: 100, protein_g: 10 })])).toEqual({
      calories: 600,
      protein_g: 50,
      carbs_g: 100,
      fat_g: 30,
    });
  });

  it("rebuilds an editable analysis from stored items", () => {
    const result = analysisFromMeal(
      meal({
        items: [
          { name: "Rice", grams: 200, calories: 260, protein_g: 5, carbs_g: 57, fat_g: 1 },
          { name: "Chicken", grams: 150, calories: 240, protein_g: 35, carbs_g: 0, fat_g: 10 },
        ],
      }),
    );
    expect(result.items.map((i) => i.name)).toEqual(["Rice", "Chicken"]);
    expect(result.items[0]?.grams).toBe(200);
    expect(result.totals.calories).toBe(500);
  });

  it("falls back to a single line when a meal has no breakdown", () => {
    const result = analysisFromMeal(meal({ items: null }));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Chicken bowl");
  });
});
