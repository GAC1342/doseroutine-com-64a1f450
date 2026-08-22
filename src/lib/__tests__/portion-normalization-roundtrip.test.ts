/**
 * Round-trip guarantees for the portion normalization path.
 *
 * `normalizePortionInput` is the single canonical spelling every parser reads.
 * Its job: cosmetic differences a user or a formatter can produce — padding,
 * tabs, non-breaking spaces, casing, comma vs dot decimals, trailing zeros,
 * unicode fractions — must collapse to the same text, and therefore to the
 * same grams and the same rescaled macros. These tests pin that contract in
 * both directions: normalize(x) parses like x, and format(parse(x)) re-parses
 * to the value it printed.
 */
import { describe, expect, it } from "vitest";
import {
  formatGrams,
  normalizePortionInput,
  parsePortionGrams,
  parseQuantity,
} from "../portion-units";
import { makeMealItem } from "@/test/fixtures/foods";
import { scaleItems, totalsFor } from "@/lib/meal-nutrition";

describe("normalizePortionInput produces one canonical spelling", () => {
  const cases: [string, string][] = [
    ["  2  KG ", "2 kg"],
    ["\t3\tOZ\n", "3 oz"],
    ["2\u00a0kg", "2 kg"],
    ["1,5 l", "1.5 l"],
    ["1.2500 lb", "1.25 lb"],
    ["2.0 kg", "2 kg"],
    ["150.00 g", "150 g"],
    ["2 fl  oz", "2 fl oz"],
    ["1 ½ Cups", "1.5 cups"],
    ["½ CUP", "0.5 cup"],
    ["1,000.50 g", "1000.5 g"],
    ["1.000,50 g", "1000.5 g"],
  ];

  for (const [input, expected] of cases) {
    it(`normalizes ${JSON.stringify(input)}`, () => {
      expect(normalizePortionInput(input)).toBe(expected);
    });
  }

  it("is idempotent", () => {
    for (const [input] of cases) {
      const once = normalizePortionInput(input);
      expect(normalizePortionInput(once)).toBe(once);
    }
  });

  it("handles null and undefined", () => {
    expect(normalizePortionInput(null)).toBe("");
    expect(normalizePortionInput(undefined)).toBe("");
  });
});

describe("normalized text parses identically to the raw text", () => {
  const inputs = [
    "  2  KG ",
    "\t3\tOZ\n",
    "1,5 l",
    "1.2500 lb",
    "2.0 kg",
    "150.00 g",
    "2 fl  oz",
    "1 ½ Cups",
    "¾ lb",
    "1 lb 4 oz",
    "1 cup (158 g)",
    "1 1/2 kg",
    "1,000.50 g",
    "487.5000 ml",
  ];

  for (const input of inputs) {
    it(`round-trips ${JSON.stringify(input)}`, () => {
      const raw = parsePortionGrams(input);
      const normalized = parsePortionGrams(normalizePortionInput(input));
      expect(normalized).toBe(raw);
      expect(parseQuantity(normalizePortionInput(input))).toBe(parseQuantity(input));
    });
  }
});

describe("formatter output round-trips", () => {
  const grams = [0.5, 1, 12.3, 28.3, 99.9, 100, 150.4, 453.6, 1000, 2500.6];

  for (const g of grams) {
    it(`re-parses formatGrams(${g}) to a stable value`, () => {
      const printed = formatGrams(g);
      const reparsed = parsePortionGrams(printed);
      expect(reparsed).not.toBeNull();
      // Printing the re-parsed value must give the same string back.
      expect(formatGrams(reparsed!)).toBe(printed);
      // And re-normalizing the printed string changes nothing.
      expect(normalizePortionInput(printed)).toBe(printed);
    });
  }

  it("formatter output survives cosmetic mangling", () => {
    for (const g of grams) {
      const printed = formatGrams(g);
      const mangled = ` ${printed.toUpperCase().replace(" ", "\u00a0")} `;
      expect(parsePortionGrams(mangled)).toBe(parsePortionGrams(printed));
    }
  });
});

describe("macros are identical across cosmetic spellings", () => {
  const spellings: [string, string[]][] = [
    ["150 g", ["  150 G ", "150.00 g", "150,00 g", "150\u00a0g", "\t150 g\n"]],
    ["1.25 lb", ["1.2500 LB", "1,25 lb", " 1.25   lb "]],
    ["0.5 cup", ["½ CUP", "0.500 cup", " .5 cup ".replace(" .5", " 0.5")]],
  ];

  for (const [canonical, variants] of spellings) {
    it(`${canonical} matches its variants`, () => {
      const base = parsePortionGrams(canonical);
      expect(base).not.toBeNull();
      const item = (g: number) => makeMealItem("chicken", { grams: g });
      const expected = totalsFor(scaleItems([item(base!)], base! / 100));

      for (const variant of variants) {
        const g = parsePortionGrams(variant);
        expect(g, `variant ${JSON.stringify(variant)}`).toBe(base);
        expect(totalsFor(scaleItems([item(g!)], g! / 100))).toEqual(expected);
      }
    });
  }
});
