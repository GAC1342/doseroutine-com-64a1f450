/**
 * Regression checks for stray whitespace in portion strings.
 *
 * Pasted label text, OCR output and voice input arrive padded: "  2  kg ",
 * "\t3   oz\n". If normalization ever slips, the unit is dropped or the number
 * splits, the portion parses to null, and every macro in the review sheet
 * silently keeps its old value. These tests pin parsing and the macro rescale
 * that depends on it.
 */
import { describe, expect, it } from "vitest";
import { isMalformedQuantity, parsePortionGrams, parseQuantity } from "../portion-units";
import { makeMealItem } from "@/test/fixtures/foods";
import { roundTotals, scaleItems, totalsFor } from "@/lib/meal-nutrition";

const OZ = 28.3495;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

describe("padded and loosely spaced portions parse like the tidy form", () => {
  const groups: [string, string, string[]][] = [
    ["kg abbreviation", "2 kg", ["  2  kg ", "\t2\tkg\n", "2   kg", " 2 kg  "]],
    ["oz abbreviation", "3 oz", ["  3  oz ", "\n3   oz\t", " 3 oz "]],
    ["gram abbreviation", "500 g", ["  500   g  ", "\t500 g "]],
    ["spelled-out grams", "500 grams", ["  500   grams ", " 500 grams\n"]],
    ["spelled-out kilograms", "1.5 kilograms", ["  1.5   kilograms ", "\t1.5 kilograms\t"]],
    ["cups", "1 cup", ["  1  cup ", " 1   cup\n"]],
    ["tablespoons", "2 tbsp", ["  2   tbsp ", " 2 TBSP  ", "\t2  TBSP\n"]],
    ["fluid ounces", "2 fl oz", ["  2  fl oz ", " 2 fl  oz\n"]],
  ];

  for (const [label, canonical, padded] of groups) {
    it(`parses ${label} the same however it is padded`, () => {
      const expected = parsePortionGrams(canonical);
      expect(expected, `"${canonical}" must parse to grams`).not.toBeNull();
      for (const variant of padded) {
        expect(parsePortionGrams(variant), JSON.stringify(variant)).toBeCloseTo(expected!, 1);
      }
    });
  }

  it("keeps multi-token portions intact when padded", () => {
    expect(parsePortionGrams("  1  lb   4  oz ")).toBeCloseTo(round1(LB + 4 * OZ), 1);
    expect(parsePortionGrams("  1 1/2   kg ")).toBeCloseTo(1500, 1);
    expect(parsePortionGrams("  3 / 4   lb ")).toBeCloseTo(round1(0.75 * LB), 1);
    expect(parsePortionGrams("  ½   kg ")).toBeCloseTo(500, 1);
  });

  it("still prefers a padded parenthesised gram weight", () => {
    expect(parsePortionGrams("  2 cups   ( 240 g ) ")).toBeCloseTo(240, 1);
    expect(parsePortionGrams("2 cups (240 g)")).toBeCloseTo(240, 1);
  });

  it("treats non-breaking, narrow and thin spaces like a plain space", () => {
    const expected = parsePortionGrams("2 kg")!;
    for (const space of ["\u00a0", "\u202f", "\u2009"]) {
      expect(parsePortionGrams(`2${space}kg`), space.codePointAt(0)?.toString(16)).toBeCloseTo(
        expected,
        1,
      );
    }
    expect(parsePortionGrams("3\u00a0ounces")).toBeCloseTo(round1(3 * OZ), 1);
  });
});

describe("whitespace never invents or splits a number", () => {
  it("reads a grouping space as thousands, not two numbers", () => {
    expect(parsePortionGrams(" 1 200 g")).toBeCloseTo(1200, 1);
    expect(parsePortionGrams("  1\u00a0200   g ")).toBeCloseTo(1200, 1);
    expect(parsePortionGrams("1,200 g")).toBeCloseTo(1200, 1);
  });

  it("rejects genuinely ambiguous two-number portions", () => {
    expect(parsePortionGrams("2 3 kg")).toBeNull();
    expect(parsePortionGrams("  2   3  kg ")).toBeNull();
  });

  const bad = [" -3  oz ", "  kg 2 ", "  two   kg ", " 1,,5  kg ", "   ", "  oz  "];
  for (const input of bad) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }

  it("flags padded malformed quantities the same as trimmed ones", () => {
    expect(isMalformedQuantity(" 1,,5  kg ")).toBe(isMalformedQuantity("1,,5 kg"));
    expect(isMalformedQuantity("  2  kg ")).toBe(false);
    expect(parseQuantity("  3   oz ")).toBe(3);
    expect(parseQuantity("  two  oz ")).toBeNull();
  });
});

describe("macros rescale identically for padded portions", () => {
  function macrosFor(key: Parameters<typeof makeMealItem>[0], portion: string) {
    const grams = parsePortionGrams(portion);
    expect(grams, `${JSON.stringify(portion)} must parse to grams`).not.toBeNull();
    return roundTotals(totalsFor([makeMealItem(key, { grams: grams! })]));
  }

  it("scales chicken the same from '  3  oz ' as from '3 oz'", () => {
    expect(macrosFor("chicken", "  3  oz ")).toEqual(macrosFor("chicken", "3 oz"));
    expect(macrosFor("chicken", "\t3   ounces\n")).toEqual(macrosFor("chicken", "3 ounces"));
  });

  it("scales bulk weights the same when padded", () => {
    expect(macrosFor("rice", "  2   kg ")).toEqual(macrosFor("rice", "2 kg"));
    expect(macrosFor("groundBeef", " 2  lb\n")).toEqual(macrosFor("groundBeef", "2 lb"));
    expect(macrosFor("oatmeal", "  500   grams ")).toEqual(macrosFor("oatmeal", "500 grams"));
  });

  it("carries padded grams through a servings change", () => {
    const grams = parsePortionGrams("  3  oz ")!;
    expect(grams).toBeCloseTo(parsePortionGrams("3 oz")!, 1);

    const items = [makeMealItem("salmon", { grams })];
    const single = roundTotals(totalsFor(items));
    const doubled = roundTotals(totalsFor(scaleItems(items, 2)));

    expect(doubled.calories).toBe(single.calories * 2);
    expect(doubled.protein_g).toBeCloseTo(single.protein_g * 2, 1);
  });
});
