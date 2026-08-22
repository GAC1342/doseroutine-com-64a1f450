import { describe, expect, it } from "vitest";
import { rescaleItemToGrams } from "@/components/food-portion-picker";
import type { MealItem } from "@/lib/meal-nutrition";
import { isMalformedQuantity, parsePortionGrams, parseQuantity } from "@/lib/portion-units";

/**
 * Unknown and malformed units must land on the intended null state. A silent
 * mis-parse is the dangerous failure: it rescales every macro in the meal.
 */

const item: MealItem = {
  name: "Chicken breast",
  portion: "100 g",
  grams: 100,
  calories: 165,
  protein_g: 31,
  carbs_g: 0,
  fat_g: 3.6,
};

describe("unknown unit words never produce grams", () => {
  const cases = [
    "2 xyz",
    "2 gg",
    "2 zz",
    "5 blorps",
    "1 quux",
    "3 units",
    "2 pcs",
    "4 pieces",
    "1 serving",
    "2 servings",
    "1 slice",
    "3 sticks",
    "xyz",
    "2",
    "2 grams!",
  ];
  for (const input of cases) {
    it(`parsePortionGrams(${JSON.stringify(input)}) is null or an exact gram read`, () => {
      const grams = parsePortionGrams(input);
      // Only genuinely known units may return a number; these are all unknown.
      if (input === "2 grams!") {
        expect(grams).toBe(2);
      } else {
        expect(grams).toBeNull();
      }
    });
  }
});

describe("unit before number is rejected as malformed", () => {
  const cases = ["kg 2", "oz 4", "g 100", "kg 2 oz 4", "cup 1", "ml 250"];
  for (const input of cases) {
    it(`${JSON.stringify(input)} is malformed`, () => {
      expect(isMalformedQuantity(input)).toBe(true);
      expect(parsePortionGrams(input)).toBeNull();
      expect(parseQuantity(input)).toBeNull();
    });
  }
});

describe("bare units and empty input are rejected", () => {
  const cases = ["kg", "oz", "g", "ml", "cup", "", "   ", "\t\n"];
  for (const input of cases) {
    it(`${JSON.stringify(input)} yields null grams`, () => {
      expect(parsePortionGrams(input)).toBeNull();
      expect(parseQuantity(input)).toBeNull();
    });
  }
});

describe("malformed numbers and split units are rejected", () => {
  const cases = [
    "2..5 g",
    "1,,5 kg",
    "2.5.5 kg",
    "1. kg",
    ".5 kg",
    "1e3 kg",
    "1/0 cup",
    "2 k g",
    "1 2 3 g",
    "1 kg kg",
    "2 grams extra 3 oz",
  ];
  for (const input of cases) {
    it(`${JSON.stringify(input)} is malformed and parses to null`, () => {
      expect(isMalformedQuantity(input)).toBe(true);
      expect(parsePortionGrams(input)).toBeNull();
    });
  }
});

describe("non-positive amounts are not portions", () => {
  for (const input of ["0 g", "0 kg", "0.0 oz", "-2 g", "-1 kg"]) {
    it(`${JSON.stringify(input)} yields null grams`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }
});

describe("null input never rescales macros", () => {
  const rejected = ["2 xyz", "kg 2", "2..5 g", "1 serving", ""];
  for (const input of rejected) {
    it(`${JSON.stringify(input)} leaves the item untouched`, () => {
      const grams = parsePortionGrams(input);
      expect(grams).toBeNull();
      expect(rescaleItemToGrams(item, grams ?? 0)).toEqual({});
    });
  }

  it("a valid portion still rescales after a rejected one", () => {
    expect(rescaleItemToGrams(item, parsePortionGrams("200 g") ?? 0)).toMatchObject({
      grams: 200,
      calories: 330,
      protein_g: 62,
    });
  });
});
