/**
 * Regression checks for unit strings typed without a space ("2kg", "3oz").
 *
 * Phone keyboards make the space easy to skip, so the parser has to treat
 * "3oz" exactly like "3 oz" — and the grams it returns must rescale an item's
 * macros to the same numbers either way.
 */
import { describe, expect, it } from "vitest";
import { parsePortionGrams } from "../portion-units";
import { roundTotals, scaleItems, totalsFor, type MealItem } from "../meal-nutrition";
import { foodFixture, makeMealItem } from "@/test/fixtures/foods";

const OZ = 28.3495;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

describe("units typed without a space", () => {
  const cases: [string, number][] = [
    ["2kg", 2000],
    ["0.5kg", 500],
    ["1,5kg", 1500],
    ["150g", 150],
    ["150G", 150],
    ["500mg", 0.5],
    ["3oz", round1(3 * OZ)],
    ["3OZ", round1(3 * OZ)],
    ["12oz", round1(12 * OZ)],
    ["1lb", round1(LB)],
    ["2lbs", round1(2 * LB)],
    ["250ml", 250],
    ["1l", 1000],
    ["1.5kg", 1500],
  ];

  for (const [input, grams] of cases) {
    it(`parses "${input}" as ${grams} g`, () => {
      expect(parsePortionGrams(input)).toBeCloseTo(grams, 1);
    });
  }

  it("matches the spaced form exactly", () => {
    const pairs: [string, string][] = [
      ["2kg", "2 kg"],
      ["3oz", "3 oz"],
      ["150g", "150 g"],
      ["1lb", "1 lb"],
      ["250ml", "250 ml"],
    ];
    for (const [tight, spaced] of pairs) {
      expect(parsePortionGrams(tight)).toBe(parsePortionGrams(spaced));
    }
  });

  it("still ignores unmeasurable text", () => {
    expect(parsePortionGrams("1serving")).toBeNull();
    expect(parsePortionGrams("-2kg")).toBeNull();
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

describe("macros rescale from no-space portions", () => {
  it('rescales chicken to a free-typed "3oz"', () => {
    const food = foodFixture("chicken");
    const base = makeMealItem("chicken", { grams: 100 });
    const grams = parsePortionGrams("3oz");
    expect(grams).not.toBeNull();

    const scaled = rescaleTo(base, food.per100, grams!);
    const expectedFactor = (3 * OZ) / 100;
    expect(scaled.calories).toBe(Math.round(food.per100.calories * expectedFactor));
    expect(scaled.protein_g).toBeCloseTo(round1(food.per100.protein_g * expectedFactor), 1);
    expect(scaled.grams).toBeCloseTo(round1(3 * OZ), 1);
  });

  it('gives identical macros for "2kg" and "2 kg"', () => {
    const food = foodFixture("broccoli");
    const base = makeMealItem("broccoli", { grams: 100 });
    const tight = rescaleTo(base, food.per100, parsePortionGrams("2kg")!);
    const spaced = rescaleTo(base, food.per100, parsePortionGrams("2 kg")!);
    expect(tight).toEqual(spaced);
    expect(tight.calories).toBe(Math.round(food.per100.calories * 20));
  });

  it("keeps meal totals consistent after a no-space rescale", () => {
    const food = foodFixture("chicken");
    const base = makeMealItem("chicken", { grams: 100 });
    const items = [rescaleTo(base, food.per100, parsePortionGrams("200g")!)];
    const totals = roundTotals(totalsFor(items));
    expect(totals.calories).toBe(Math.round(food.per100.calories * 2));

    // Doubling via servings equals typing "400g" directly.
    const viaServings = roundTotals(totalsFor(scaleItems(items, 2)));
    const viaTyping = roundTotals(
      totalsFor([rescaleTo(base, food.per100, parsePortionGrams("400g")!)]),
    );
    expect(viaServings.calories).toBe(viaTyping.calories);
    expect(viaServings.protein_g).toBeCloseTo(viaTyping.protein_g, 1);
  });
});
