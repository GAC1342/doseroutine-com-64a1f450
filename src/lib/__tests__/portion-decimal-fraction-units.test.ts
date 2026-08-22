/**
 * Decimal and fractional amounts on spelled-out units.
 *
 * People type "2.5 kilograms", "1/2 liters", "1 1/2 cups" and "¾ pounds" just
 * as often as clean integers. Each has to reach grams exactly, because grams
 * is the multiplier every macro in the review sheet is rescaled from — a
 * half-read amount silently halves or doubles the day's calories.
 *
 * Pinned here: recognition (grams), equivalence between decimal / fraction /
 * unicode-fraction spellings of the same amount, and the macro rescale that
 * depends on the parsed grams.
 */
import { describe, expect, it } from "vitest";
import { isMalformedQuantity, parsePortionGrams, parseQuantity } from "../portion-units";
import { foodFixture, makeMealItem } from "@/test/fixtures/foods";
import { roundTotals, scaleItems, totalsFor } from "@/lib/meal-nutrition";

const OZ = 28.3495;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

describe("decimal amounts on spelled-out units", () => {
  const cases: [string, number][] = [
    ["2.5 kilograms", 2500],
    ["2.5 kilogram", 2500],
    ["2,5 kilograms", 2500], // decimal comma
    ["0.25 kilograms", 250],
    ["12.5 grams", 12.5],
    ["2.5 ounces", round1(2.5 * OZ)],
    ["1.25 pounds", round1(1.25 * LB)],
    ["0.75 liters", 750],
    ["1.5 liters", 1500],
    ["333.3 milliliters", 333.3],
    ["1.5 cups", 360],
    ["2.5 tablespoons", 37.5],
    ["1.5 teaspoons", 7.5],
  ];

  for (const [input, grams] of cases) {
    it(`"${input}" → ${grams} g`, () => {
      const parsed = parsePortionGrams(input);
      expect(parsed, `"${input}" should parse`).not.toBeNull();
      expect(round1(parsed!), `"${input}"`).toBeCloseTo(grams, 1);
      expect(isMalformedQuantity(input), `"${input}"`).toBe(false);
    });
  }
});

describe("fractional amounts on spelled-out units", () => {
  const cases: [string, number][] = [
    ["1/2 liters", 500],
    ["1/2 liter", 500],
    ["1/4 liters", 250],
    ["3/4 pounds", round1(0.75 * LB)],
    ["1/2 kilograms", 500],
    ["1 1/2 kilograms", 1500],
    ["1 1/4 pounds", round1(1.25 * LB)],
    ["1/2 ounces", round1(0.5 * OZ)],
    ["1 1/2 cups", 360],
    ["1/3 cups", 80],
    ["2 1/2 tablespoons", 37.5],
  ];

  for (const [input, grams] of cases) {
    it(`"${input}" → ${grams} g`, () => {
      const parsed = parsePortionGrams(input);
      expect(parsed, `"${input}" should parse`).not.toBeNull();
      expect(round1(parsed!), `"${input}"`).toBeCloseTo(grams, 1);
    });
  }
});

describe("decimal, fraction and unicode-fraction spellings agree", () => {
  const equivalents: [string, string[]][] = [
    ["0.5 liters", ["1/2 liters", "½ liters", "1/2 l", "0.5 l", "½ l"]],
    ["2.5 kilograms", ["2 1/2 kilograms", "2½ kilograms", "2.5 kg", "2,5 kg"]],
    ["0.75 pounds", ["3/4 pounds", "¾ pounds", "0.75 lb", "3/4 lb"]],
    ["1.5 cups", ["1 1/2 cups", "1½ cups", "1.5 cup"]],
    ["0.25 ounces", ["1/4 ounces", "¼ ounces", "0.25 oz"]],
  ];

  for (const [canonical, variants] of equivalents) {
    it(`"${canonical}" matches ${variants.length} equivalent spellings`, () => {
      const base = parsePortionGrams(canonical);
      expect(base, `"${canonical}" should parse`).not.toBeNull();
      for (const variant of variants) {
        const parsed = parsePortionGrams(variant);
        expect(parsed, `"${variant}" should parse`).not.toBeNull();
        expect(round1(parsed!), `"${variant}"`).toBeCloseTo(round1(base!), 1);
      }
    });

    it(`"${canonical}" yields the same quantity as its variants`, () => {
      const base = parseQuantity(canonical);
      expect(base).not.toBeNull();
      for (const variant of variants) {
        expect(parseQuantity(variant), `"${variant}"`).toBeCloseTo(base!, 3);
      }
    });
  }
});

describe("macros rescale correctly from decimal and fractional amounts", () => {
  function macrosFor(key: Parameters<typeof makeMealItem>[0], portion: string) {
    const grams = parsePortionGrams(portion);
    expect(grams, `"${portion}" must parse to grams`).not.toBeNull();
    return roundTotals(totalsFor([makeMealItem(key, { grams: grams! })]));
  }

  it("scales chicken the same from '2.5 ounces' as from '2 1/2 ounces'", () => {
    const decimal = macrosFor("chicken", "2.5 ounces");
    expect(decimal).toEqual(macrosFor("chicken", "2 1/2 ounces"));
    expect(decimal).toEqual(macrosFor("chicken", "2½ ounces"));

    const per100 = foodFixture("chicken").per100;
    const factor = (2.5 * OZ) / 100;
    expect(decimal.calories).toBe(Math.round(per100.calories * factor));
    expect(decimal.protein_g).toBeCloseTo(round1(per100.protein_g * factor), 1);
  });

  it("halves the macros when the amount halves", () => {
    const full = macrosFor("rice", "1 kilograms");
    const half = macrosFor("rice", "0.5 kilograms");
    const halfFraction = macrosFor("rice", "1/2 kilograms");

    expect(half).toEqual(halfFraction);
    expect(half.calories).toBeCloseTo(full.calories / 2, 0);
    expect(half.protein_g).toBeCloseTo(full.protein_g / 2, 0);
  });

  it("carries a fractional-litre amount through a servings change", () => {
    const grams = parsePortionGrams("1/2 liters")!;
    expect(grams).toBeCloseTo(500, 1);

    const items = [makeMealItem("oatmeal", { grams })];
    const single = roundTotals(totalsFor(items));
    const doubled = roundTotals(totalsFor(scaleItems(items, 2)));

    expect(doubled.calories).toBe(single.calories * 2);
    expect(doubled.protein_g).toBeCloseTo(single.protein_g * 2, 1);
  });
});

describe("broken decimals and fractions stay rejected", () => {
  const bad = [
    "2..5 kilograms",
    "2,,5 kilograms",
    "1/0 liters",
    ".5 kilograms",
    "2.5.5 kilograms",
    "-2.5 kilograms",
    "half a liter",
    "2. kilograms",
  ];

  for (const input of bad) {
    it(`refuses "${input}"`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }
});
