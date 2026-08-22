import { describe, expect, it } from "vitest";
import { rescaleItemToGrams } from "@/components/food-portion-picker";
import { roundMacro, roundTotals, totalsFor, type MealItem } from "@/lib/meal-nutrition";
import { formatGrams, parsePortionGrams } from "@/lib/portion-units";

/**
 * Full portion → grams → rescaled macros → displayed totals flow, driven by
 * mixed-case user typing ("2KG", "3oZ"). Casing is cosmetic: the numbers a
 * user finally sees must be identical to the canonical lowercase spelling.
 */

/** A 100 g reference item, the shape the review sheet works with. */
function baseItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    name: "Chicken breast",
    portion: "100 g",
    grams: 100,
    calories: 165,
    protein_g: 31,
    carbs_g: 0,
    fat_g: 3.6,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 74,
    satfat_g: 1,
    dataSource: "usda",
    ...overrides,
  };
}

/** The exact pipeline the review sheet runs when a portion is retyped. */
function applyPortion(item: MealItem, typed: string) {
  const grams = parsePortionGrams(typed);
  if (grams == null) return null;
  const next: MealItem = { ...item, ...rescaleItemToGrams(item, grams), portion: typed };
  const totals = roundTotals(totalsFor([next]));
  return {
    grams,
    item: next,
    display: {
      portion: formatGrams(next.grams ?? 0),
      calories: `${totals.calories} kcal`,
      protein: `${roundMacro(totals.protein_g)} g protein`,
      carbs: `${roundMacro(totals.carbs_g)} g carbs`,
      fat: `${roundMacro(totals.fat_g)} g fat`,
    },
  };
}

describe("mixed-case portions produce the correct displayed macros", () => {
  it('"2KG" scales a 100 g item by exactly 20x', () => {
    const out = applyPortion(baseItem(), "2KG");
    expect(out).not.toBeNull();
    expect(out!.grams).toBe(2000);
    expect(out!.display).toEqual({
      portion: "2000 g",
      calories: "3300 kcal",
      protein: "620 g protein",
      carbs: "0 g carbs",
      fat: "72 g fat",
    });
  });

  it('"3oZ" scales a 100 g item to 85 g', () => {
    const out = applyPortion(baseItem(), "3oZ");
    expect(out).not.toBeNull();
    expect(out!.grams).toBeCloseTo(85, 1);
    expect(out!.display).toEqual({
      portion: "85 g",
      calories: "140 kcal",
      protein: "26.4 g protein",
      carbs: "0 g carbs",
      fat: "3.1 g fat",
    });
  });

  it("extended nutrients follow the same scale factor", () => {
    const out = applyPortion(baseItem(), "250ML");
    expect(out!.item.sodium_mg).toBe(185);
    expect(out!.item.satfat_g).toBeCloseTo(2.5, 1);
  });
});

describe("casing never changes the displayed numbers", () => {
  const pairs: [string, string][] = [
    ["2kg", "2KG"],
    ["2kg", "2Kg"],
    ["3oz", "3oZ"],
    ["3oz", "3 OZ"],
    ["1.5 lb", "1.5 LB"],
    ["250ml", "250ML"],
    ["0.5 l", "0.5 L"],
    ["2 kilograms", "2 KiloGrams"],
    ["1 cup", "1 CUP"],
    ["2 tbsp", "2 TBSP"],
  ];
  for (const [lower, mixed] of pairs) {
    it(`${JSON.stringify(mixed)} matches ${JSON.stringify(lower)}`, () => {
      const a = applyPortion(baseItem(), lower);
      const b = applyPortion(baseItem(), mixed);
      expect(b).not.toBeNull();
      expect(b!.grams).toBe(a!.grams);
      expect(b!.display).toEqual(a!.display);
    });
  }
});

describe("multi-item meals stay consistent across casing", () => {
  it("totals for a mixed-case meal equal the lowercase meal", () => {
    const rice = baseItem({
      name: "Rice",
      calories: 130,
      protein_g: 2.7,
      carbs_g: 28,
      fat_g: 0.3,
    });

    const build = (chickenPortion: string, ricePortion: string) => {
      const a = applyPortion(baseItem(), chickenPortion)!.item;
      const b = applyPortion(rice, ricePortion)!.item;
      return roundTotals(totalsFor([a, b]));
    };

    expect(build("3oZ", "250G")).toEqual(build("3 oz", "250 g"));
    expect(build("3 oz", "250 g").calories).toBe(465);
  });
});

describe("invalid mixed-case input leaves macros untouched", () => {
  const rejected = ["2KG CALORIES", "3 STONES", "2KG 3OZ"];
  for (const typed of rejected) {
    it(`${JSON.stringify(typed)} is rejected and nothing rescales`, () => {
      expect(applyPortion(baseItem(), typed)).toBeNull();
      expect(rescaleItemToGrams(baseItem(), parsePortionGrams(typed) ?? 0)).toEqual({});
    });
  }
});
