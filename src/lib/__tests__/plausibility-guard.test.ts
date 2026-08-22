import { describe, expect, it } from "vitest";
import { guardPlausibility } from "@/lib/food-resolver.server";
import type { MealItem } from "@/lib/meal-nutrition";

const base: MealItem = {
  name: "Chicken breast",
  portion: "150 g",
  calories: 248,
  protein_g: 46,
  carbs_g: 0,
  fat_g: 5,
  grams: 150,
};

describe("guardPlausibility", () => {
  it("leaves a coherent estimate untouched", () => {
    const { item, adjusted } = guardPlausibility(base);
    expect(adjusted).toBe(false);
    expect(item.calories).toBe(248);
  });

  it("rebuilds calories when they contradict the macros", () => {
    const { item, adjusted } = guardPlausibility({ ...base, calories: 900 });
    expect(adjusted).toBe(true);
    expect(item.calories).toBe(229); // 46*4 + 0*4 + 5*9
  });

  it("rebuilds calories when none were given", () => {
    const { item, adjusted } = guardPlausibility({ ...base, calories: 0 });
    expect(adjusted).toBe(true);
    expect(item.calories).toBe(229);
  });

  it("catches an impossible energy density for the stated weight", () => {
    const { item, adjusted } = guardPlausibility({
      ...base,
      grams: 20,
      calories: 400,
      protein_g: 2,
      carbs_g: 3,
      fat_g: 1,
    });
    expect(adjusted).toBe(true);
    expect(item.calories).toBe(29);
  });

  it("cannot fix an item with no macros at all", () => {
    const { adjusted } = guardPlausibility({
      ...base,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      calories: 500,
    });
    expect(adjusted).toBe(false);
  });
});
