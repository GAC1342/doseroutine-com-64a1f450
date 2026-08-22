import { beforeEach, describe, expect, it } from "vitest";
import {
  foodFavoriteKey,
  isFavoriteFood,
  isFavoriteMeal,
  listFavoriteFoods,
  listRecentFoodSearches,
  mealFavoriteKey,
  rememberFoodSearch,
  toggleFavoriteFood,
  toggleFavoriteMeal,
} from "@/lib/food-favorites";
import type { FoodLabelMatch } from "@/lib/meal-nutrition";

const product: FoodLabelMatch = {
  found: true,
  name: "Vanilla Greek Yogurt",
  brand: "Chobani",
  servingSize: "150 g",
  perServing: {
    name: "Vanilla Greek Yogurt",
    portion: "150 g",
    calories: 120,
    protein_g: 12,
    carbs_g: 14,
    fat_g: 2,
  },
  basis: "serving",
  sourceUrl: "https://example.com",
  barcode: "0894700010045",
};

describe("food favourites", () => {
  beforeEach(() => window.localStorage.clear());

  it("keys products by barcode when present", () => {
    expect(foodFavoriteKey(product)).toBe("code:0894700010045");
    expect(foodFavoriteKey({ ...product, barcode: "" })).toBe("name:chobani|vanilla greek yogurt");
  });

  it("toggles a food on and off", () => {
    expect(toggleFavoriteFood(product)).toBe(true);
    expect(isFavoriteFood(product)).toBe(true);
    expect(listFavoriteFoods()).toHaveLength(1);
    expect(toggleFavoriteFood(product)).toBe(false);
    expect(listFavoriteFoods()).toHaveLength(0);
  });

  it("treats meal labels case-insensitively", () => {
    expect(mealFavoriteKey("  Oatmeal  ")).toBe("oatmeal");
    toggleFavoriteMeal("Oatmeal");
    expect(isFavoriteMeal("oatmeal")).toBe(true);
    toggleFavoriteMeal("OATMEAL");
    expect(isFavoriteMeal("Oatmeal")).toBe(false);
  });

  it("dedupes and caps recent searches", () => {
    rememberFoodSearch("yogurt");
    rememberFoodSearch("Yogurt");
    rememberFoodSearch("a");
    expect(listRecentFoodSearches()).toEqual(["Yogurt"]);
  });
});
