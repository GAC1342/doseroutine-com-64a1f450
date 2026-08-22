/**
 * Unicode fraction regression checks.
 *
 * Recipe text and phone keyboards produce "½ cup", "1⅓ cups", "¾ lb" and the
 * fraction-slash form "1⁄2 cup". All of them must parse to the same grams as
 * their ASCII equivalents, in both metric and imperial units, because that
 * number drives every macro rescale in the meal review sheet.
 */
import { describe, expect, it } from "vitest";
import { normalizeUnicodeFractions, parsePortionGrams, parseQuantity } from "../portion-units";
import { roundTotals, totalsFor, type MealItem } from "../meal-nutrition";
import { foodFixture, makeMealItem } from "@/test/fixtures/foods";

const OZ = 28.3495;
const LB = 453.592;
const CUP = 240;
const TBSP = 15;
const TSP = 5;
const round1 = (n: number) => Math.round(n * 10) / 10;

describe("normalizeUnicodeFractions", () => {
  const cases: [string, string][] = [
    ["½ cup", "0.5 cup"],
    ["¼ cup", "0.25 cup"],
    ["¾ lb", "0.75 lb"],
    ["⅓ cup", "0.3333 cup"],
    ["1⅓ cups", "1.3333 cups"],
    ["1 ½ lb", "1.5 lb"],
    ["2½ kg", "2.5 kg"],
    ["⅛ tsp", "0.125 tsp"],
    ["⅞ cup", "0.875 cup"],
    ["1⁄2 cup", "1/2 cup"],
  ];
  for (const [input, expected] of cases) {
    it(`rewrites "${input}"`, () => {
      expect(normalizeUnicodeFractions(input)).toBe(expected);
    });
  }

  it("leaves plain numbers and ASCII fractions alone", () => {
    expect(normalizeUnicodeFractions("1 1/2 cups")).toBe("1 1/2 cups");
    expect(normalizeUnicodeFractions("150 g")).toBe("150 g");
  });
});

describe("parseQuantity with unicode fractions", () => {
  const cases: [string, number][] = [
    ["½", 0.5],
    ["¼", 0.25],
    ["¾", 0.75],
    ["⅓", 0.3333],
    ["⅔", 0.6667],
    ["⅛", 0.125],
    ["1½", 1.5],
    ["1 ½", 1.5],
    ["1⅓", 1.3333],
    ["2⅔", 2.6667],
    ["1⁄2", 0.5],
    ["1 1/2", 1.5],
  ];
  for (const [input, value] of cases) {
    it(`reads "${input}" as ${value}`, () => {
      expect(parseQuantity(input)).toBeCloseTo(value, 3);
    });
  }
});

describe("household measures with unicode fractions", () => {
  const cases: [string, number][] = [
    ["½ cup", round1(0.5 * CUP)],
    ["1½ cups", round1(1.5 * CUP)],
    ["1 ½ cups", round1(1.5 * CUP)],
    ["1⅓ cups", round1((4 / 3) * CUP)],
    ["⅔ cup", round1((2 / 3) * CUP)],
    ["¼ cup", round1(0.25 * CUP)],
    ["1⁄2 cup", round1(0.5 * CUP)],
    ["½ tbsp", round1(0.5 * TBSP)],
    ["¾ tablespoon", round1(0.75 * TBSP)],
    ["¼ tsp", round1(0.25 * TSP)],
    ["⅛ teaspoon", round1(0.125 * TSP)],
  ];
  for (const [input, grams] of cases) {
    it(`parses "${input}" as ${grams} g`, () => {
      expect(parsePortionGrams(input)).toBeCloseTo(grams, 1);
    });
  }

  it("matches the ASCII fraction form", () => {
    expect(parsePortionGrams("½ cup")).toBe(parsePortionGrams("1/2 cup"));
    expect(parsePortionGrams("1⅓ cups")).toBeCloseTo(parsePortionGrams("1 1/3 cups")!, 1);
  });
});

describe("weights with unicode fractions", () => {
  const cases: [string, number][] = [
    // Metric
    ["½ kg", 500],
    ["½kg", 500],
    ["1½ kg", 1500],
    ["¼ kg", 250],
    ["⅓ kg", round1((1 / 3) * 1000)],
    ["½ l", 500],
    ["½ g", 0.5],
    // Imperial
    ["¾ lb", round1(0.75 * LB)],
    ["½ lb", round1(0.5 * LB)],
    ["1½ lbs", round1(1.5 * LB)],
    ["½ oz", round1(0.5 * OZ)],
    ["2½ oz", round1(2.5 * OZ)],
    ["3/4 lb", round1(0.75 * LB)],
    ["1 1/2 kg", 1500],
  ];
  for (const [input, grams] of cases) {
    it(`parses "${input}" as ~${grams} g`, () => {
      expect(parsePortionGrams(input)).toBeCloseTo(grams, 0);
    });
  }

  it("still prefers a parenthesised gram weight", () => {
    expect(parsePortionGrams("½ cup (114 g)")).toBe(114);
  });

  it("returns null when there is no measurable amount", () => {
    expect(parsePortionGrams("½ serving")).toBeNull();
    expect(parsePortionGrams("-½ kg")).toBeNull();
  });
});

/** Rescale an item to a gram weight using its per-100 g basis. */
function rescaleTo(
  item: MealItem,
  per100: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  grams: number,
): MealItem {
  const f = grams / 100;
  return {
    ...item,
    grams: round1(grams),
    portion: `${round1(grams)} g`,
    calories: Math.round(per100.calories * f),
    protein_g: round1(per100.protein_g * f),
    carbs_g: round1(per100.carbs_g * f),
    fat_g: round1(per100.fat_g * f),
  };
}

describe("macros rescale from unicode fraction portions", () => {
  it('scales chicken for "¾ lb"', () => {
    const food = foodFixture("chicken");
    const base = makeMealItem("chicken", { grams: 100 });
    const grams = parsePortionGrams("¾ lb");
    expect(grams).not.toBeNull();
    const scaled = rescaleTo(base, food.per100, grams!);
    const factor = (0.75 * LB) / 100;
    expect(scaled.calories).toBe(Math.round(food.per100.calories * factor));
    expect(scaled.protein_g).toBeCloseTo(round1(food.per100.protein_g * factor), 1);
  });

  it('gives identical totals for "1½ cups" and "1 1/2 cups"', () => {
    const food = foodFixture("broccoli");
    const base = makeMealItem("broccoli", { grams: 100 });
    const unicode = rescaleTo(base, food.per100, parsePortionGrams("1½ cups")!);
    const ascii = rescaleTo(base, food.per100, parsePortionGrams("1 1/2 cups")!);
    expect(unicode).toEqual(ascii);
    expect(roundTotals(totalsFor([unicode]))).toEqual(roundTotals(totalsFor([ascii])));
  });

  it('halving via "½ kg" equals "500 g"', () => {
    const food = foodFixture("chicken");
    const base = makeMealItem("chicken", { grams: 100 });
    const half = rescaleTo(base, food.per100, parsePortionGrams("½ kg")!);
    const grams = rescaleTo(base, food.per100, parsePortionGrams("500 g")!);
    expect(roundTotals(totalsFor([half])).calories).toBe(roundTotals(totalsFor([grams])).calories);
  });
});
