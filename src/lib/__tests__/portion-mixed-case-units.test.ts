/**
 * Regression checks for mixed-case portion units.
 *
 * Phone keyboards auto-capitalize, so "2KG" and "3oZ" are typed as often as
 * "2kg" and "3oz". If casing ever leaks into unit lookup the portion parses to
 * null, grams stay stale, and every macro in the review sheet silently keeps
 * the old numbers. These tests pin case-insensitive recognition and the macro
 * rescale that depends on it.
 */
import { describe, expect, it } from "vitest";
import { isMalformedQuantity, parsePortionGrams, parseQuantity } from "../portion-units";
import { makeMealItem } from "@/test/fixtures/foods";
import { roundTotals, scaleItems, totalsFor } from "@/lib/meal-nutrition";

const OZ = 28.3495;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

describe("unit recognition ignores casing", () => {
  const groups: [string, string, string[]][] = [
    ["kg abbreviation", "2kg", ["2KG", "2Kg", "2kG", "2 KG", "2 Kg"]],
    ["oz abbreviation", "3oz", ["3OZ", "3oZ", "3Oz", "3 OZ", "3 oZ"]],
    ["lb abbreviation", "2lb", ["2LB", "2Lb", "2 LBS", "2 Lbs"]],
    ["gram abbreviation", "500g", ["500G", "500 G", "500 g"]],
    ["ml abbreviation", "250ml", ["250ML", "250Ml", "250 mL"]],
    ["spelled-out grams", "500 grams", ["500 Grams", "500 GRAMS", "500 GrAmS"]],
    ["spelled-out kilograms", "1.5 kilograms", ["1.5 KiloGrams", "1.5 KILOGRAMS", "1.5 Kilogram"]],
    ["spelled-out ounces", "3 ounces", ["3 Ounces", "3 OUNCES", "3 OuNcEs"]],
    ["spelled-out pounds", "2 pounds", ["2 Pounds", "2 POUNDS", "2 Pound"]],
    ["cups", "1 cup", ["1 Cup", "1 CUP", "1 CuP"]],
    ["tablespoons", "2 tbsp", ["2 TBSP", "2 Tbsp", "2 TableSpoons"]],
  ];

  for (const [label, canonical, variants] of groups) {
    it(`parses ${label} the same in any case`, () => {
      const expected = parsePortionGrams(canonical);
      expect(expected, `"${canonical}" must parse to grams`).not.toBeNull();
      for (const variant of variants) {
        expect(parsePortionGrams(variant), variant).toBeCloseTo(expected!, 1);
      }
    });
  }

  it("parses uppercase compound imperial weights", () => {
    const expected = round1(LB + 4 * OZ);
    expect(parsePortionGrams("1 LB 4 OZ")).toBeCloseTo(expected, 1);
    expect(parsePortionGrams("1 Lb 4 Oz")).toBeCloseTo(expected, 1);
    expect(parsePortionGrams("1 POUND 4 OUNCES")).toBeCloseTo(expected, 1);
  });

  it("keeps fractions, decimals and comma decimals working in mixed case", () => {
    expect(parsePortionGrams("1,5KG")).toBeCloseTo(1500, 1);
    expect(parsePortionGrams("3/4 LB")).toBeCloseTo(round1(0.75 * LB), 1);
    expect(parsePortionGrams("1 1/2 Kg")).toBeCloseTo(1500, 1);
    expect(parsePortionGrams("½ KG")).toBeCloseTo(500, 1);
  });

  it("still prefers a parenthesised gram weight regardless of case", () => {
    expect(parsePortionGrams("2 CUPS (240 G)")).toBeCloseTo(240, 1);
    expect(parsePortionGrams("2 Cups (240 g)")).toBeCloseTo(240, 1);
  });
});

describe("mixed-case units with a bad quantity stay rejected", () => {
  const bad = ["TWO KG", "-3 OZ", "KG 2", "1,,5 KG", "OUNCES", "2 SERVINGS"];

  for (const input of bad) {
    it(`rejects "${input}"`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }

  it("flags malformed quantities the same way in upper case", () => {
    expect(isMalformedQuantity("1,,5 KG")).toBe(isMalformedQuantity("1,,5 kg"));
    expect(isMalformedQuantity("2 KG")).toBe(false);
    expect(parseQuantity("3 OZ")).toBe(3);
    expect(parseQuantity("TWO OZ")).toBeNull();
  });
});

describe("macros rescale identically for mixed-case units", () => {
  function macrosFor(key: Parameters<typeof makeMealItem>[0], portion: string) {
    const grams = parsePortionGrams(portion);
    expect(grams, `"${portion}" must parse to grams`).not.toBeNull();
    return roundTotals(totalsFor([makeMealItem(key, { grams: grams! })]));
  }

  it("scales chicken the same from '3oZ' as from '3oz'", () => {
    expect(macrosFor("chicken", "3oZ")).toEqual(macrosFor("chicken", "3oz"));
    expect(macrosFor("chicken", "3 OUNCES")).toEqual(macrosFor("chicken", "3 ounces"));
  });

  it("scales bulk weights the same from '2KG' as from '2kg'", () => {
    expect(macrosFor("rice", "2KG")).toEqual(macrosFor("rice", "2kg"));
    expect(macrosFor("groundBeef", "2 LB")).toEqual(macrosFor("groundBeef", "2 lb"));
    expect(macrosFor("oatmeal", "500 GRAMS")).toEqual(macrosFor("oatmeal", "500 grams"));
  });

  it("carries mixed-case grams through a servings change", () => {
    const grams = parsePortionGrams("3oZ")!;
    expect(grams).toBeCloseTo(parsePortionGrams("3oz")!, 1);

    const items = [makeMealItem("salmon", { grams })];
    const single = roundTotals(totalsFor(items));
    const doubled = roundTotals(totalsFor(scaleItems(items, 2)));

    expect(doubled.calories).toBe(single.calories * 2);
    expect(doubled.protein_g).toBeCloseTo(single.protein_g * 2, 1);
  });
});
