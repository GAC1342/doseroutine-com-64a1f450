/**
 * Regression checks for plural, spelled-out portion units.
 *
 * People type "2 kilograms" and "3 ounces" as readily as "2 kg" and "3 oz".
 * If a plural spelling stops being recognized the portion silently parses to
 * null, the grams never update, and every macro in the review sheet keeps the
 * old numbers — a data-accuracy bug with no visible error. These tests pin
 * both halves: unit recognition, and the macro rescale that depends on it.
 */
import { describe, expect, it } from "vitest";
import { isMalformedQuantity, parsePortionGrams, parseQuantity } from "../portion-units";
import { foodFixture, makeMealItem } from "@/test/fixtures/foods";
import { roundTotals, scaleItems, totalsFor } from "@/lib/meal-nutrition";

const OZ = 28.3495;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

describe("plural units parse like their singular and abbreviated forms", () => {
  const equivalents: [string, string[], number][] = [
    ["kilograms", ["2 kilograms", "2 kilogram", "2 kg", "2KILOGRAMS", "2kilograms"], 2000],
    ["ounces", ["3 ounces", "3 ounce", "3 oz", "3 OUNCES", "3ounces"], round1(3 * OZ)],
    ["pounds", ["2 pounds", "2 pound", "2 lbs", "2 lb", "2POUNDS"], round1(2 * LB)],
    ["grams", ["500 grams", "500 gram", "500 g", "500GRAMS", "500grams"], 500],
    ["milliliters", ["250 milliliters", "250 milliliters", "250 ml"], 250],
    ["liters", ["1 liters", "1 litre", "1 l", "1 liter"], 1000],
  ];

  for (const [unit, spellings, grams] of equivalents) {
    it(`recognizes every spelling of ${unit}`, () => {
      for (const spelling of spellings) {
        expect(parsePortionGrams(spelling), spelling).toBeCloseTo(grams, 1);
      }
    });
  }

  it("keeps decimal and comma amounts on plural units", () => {
    expect(parsePortionGrams("1.5 kilograms")).toBeCloseTo(1500, 1);
    expect(parsePortionGrams("1,5 kilograms")).toBeCloseTo(1500, 1);
    expect(parsePortionGrams("2.5 ounces")).toBeCloseTo(round1(2.5 * OZ), 1);
    expect(parsePortionGrams("1,200 grams")).toBeCloseTo(1200, 1);
  });

  it("handles fractional and compound plural weights", () => {
    expect(parsePortionGrams("3/4 pounds")).toBeCloseTo(round1(0.75 * LB), 1);
    expect(parsePortionGrams("1 1/2 kilograms")).toBeCloseTo(1500, 1);
    expect(parsePortionGrams("½ kilograms")).toBeCloseTo(500, 1);
    expect(parsePortionGrams("1 pounds 4 ounces")).toBeCloseTo(round1(LB + 4 * OZ), 1);
  });

  it("still prefers a parenthesised gram weight over the plural unit", () => {
    expect(parsePortionGrams("2 cups (240 g)")).toBeCloseTo(240, 1);
  });
});

describe("plural units with a bad quantity stay rejected", () => {
  const bad = [
    "two kilograms",
    "-2 ounces",
    "kilograms 2",
    "1,,5 kilograms",
    "ounces",
    "2 servings",
  ];

  for (const input of bad) {
    it(`rejects "${input}"`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }

  it("flags malformed quantities before the unit is even read", () => {
    expect(isMalformedQuantity("1,,5 kilograms")).toBe(true);
    expect(isMalformedQuantity("2 kilograms")).toBe(false);
    expect(parseQuantity("3 ounces")).toBe(3);
    expect(parseQuantity("two ounces")).toBeNull();
  });
});

describe("macros rescale identically for plural and abbreviated units", () => {
  /** Macros for a fixture food at whatever grams the portion string parses to. */
  function macrosFor(key: Parameters<typeof makeMealItem>[0], portion: string) {
    const grams = parsePortionGrams(portion);
    expect(grams, `"${portion}" must parse to grams`).not.toBeNull();
    return roundTotals(totalsFor([makeMealItem(key, { grams: grams! })]));
  }

  it("scales chicken the same from '3 ounces' as from '3 oz'", () => {
    const plural = macrosFor("chicken", "3 ounces");
    expect(plural).toEqual(macrosFor("chicken", "3 oz"));

    // And the numbers are the real per-100 g math, not a coincidental match.
    const per100 = foodFixture("chicken").per100;
    const factor = (3 * OZ) / 100;
    expect(plural.calories).toBe(Math.round(per100.calories * factor));
    expect(plural.protein_g).toBeCloseTo(round1(per100.protein_g * factor), 1);
  });

  it("scales a bulk-prep weight the same from '2 kilograms' as from '2 kg'", () => {
    expect(macrosFor("rice", "2 kilograms")).toEqual(macrosFor("rice", "2 kg"));
    expect(macrosFor("groundBeef", "2 pounds")).toEqual(macrosFor("groundBeef", "2 lb"));
    expect(macrosFor("oatmeal", "500 grams")).toEqual(macrosFor("oatmeal", "500 g"));
  });

  it("carries plural-unit grams through a servings change", () => {
    const grams = parsePortionGrams("3 ounces")!;
    const items = [makeMealItem("salmon", { grams })];
    const doubled = roundTotals(totalsFor(scaleItems(items, 2)));
    const single = roundTotals(totalsFor(items));

    expect(doubled.calories).toBe(single.calories * 2);
    expect(doubled.protein_g).toBeCloseTo(single.protein_g * 2, 1);
  });
});
