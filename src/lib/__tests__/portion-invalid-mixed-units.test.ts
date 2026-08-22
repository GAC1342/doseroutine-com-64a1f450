import { describe, expect, it } from "vitest";
import { isMalformedQuantity, parsePortionGrams, parseQuantity } from "../portion-units";

/**
 * Invalid and mixed-unit strings must be rejected cleanly (null), never
 * half-read: a wrong grams value silently rescales every macro in a meal.
 */
describe("nutrient words mixed with a unit are rejected", () => {
  const cases = [
    "2 kg calories",
    "2 kg calorie",
    "2 g protein",
    "30 g carbs",
    "12 g fat",
    "5 g sugar",
    "3 g fiber",
    "1 cup calories",
    "250 ml sodium",
    "2 KG CALORIES",
    "  2 kg   calories  ",
  ];
  for (const input of cases) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      expect(isMalformedQuantity(input)).toBe(true);
      expect(parsePortionGrams(input)).toBeNull();
      expect(parseQuantity(input)).toBeNull();
    });
  }
});

describe("unknown or unsupported units are rejected", () => {
  const cases = [
    "3 stones",
    "1 stone",
    "2 drams",
    "4 pecks",
    "1 furlong",
    "2 scoops",
    "1 handful",
    "3 pinches",
    "300 calories",
    "5 kcal",
  ];
  for (const input of cases) {
    it(`returns null for ${JSON.stringify(input)}`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }
});

describe("two different measured units in one string are rejected", () => {
  const cases = [
    "2 kg 3 oz",
    "1 l 200 ml",
    "1 cup 2 tbsp",
    "3 oz 100 g",
    "2 kg 3 g",
    "1 kg kg",
    "2 g oz",
    "kg 2",
  ];
  for (const input of cases) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }
});

describe("legitimate strings still parse unchanged", () => {
  const cases: [string, number][] = [
    ["150 g", 150],
    ["2 kg", 2000],
    ["3 oz", 85],
    ["250ml", 250],
    ["1 1/2 kg", 1500],
    ["½ cup", 120],
    ["1 lb 4 oz", 567],
    ["1 cup (158 g)", 158],
    ["2 kg of chicken", 2000],
    ["2 pounds cake", 907.2],
  ];
  for (const [input, grams] of cases) {
    it(`${JSON.stringify(input)} → ${grams} g`, () => {
      expect(parsePortionGrams(input)).toBeCloseTo(grams, 1);
    });
  }
});

describe("rejection does not change macro calculations", () => {
  const per100 = { calories: 200, protein: 10 };
  const scale = (portion: string) => {
    const grams = parsePortionGrams(portion);
    if (grams == null) return null;
    return {
      calories: (per100.calories * grams) / 100,
      protein: (per100.protein * grams) / 100,
    };
  };

  it("invalid input yields no scaling at all", () => {
    expect(scale("2 kg calories")).toBeNull();
    expect(scale("3 stones")).toBeNull();
    expect(scale("2 kg 3 oz")).toBeNull();
  });

  it("valid input next to a rejected one is unaffected", () => {
    expect(scale("200 g")).toEqual({ calories: 400, protein: 20 });
    expect(scale("2 kg")).toEqual({ calories: 4000, protein: 200 });
  });
});
