/**
 * Whitespace + casing regression net for unit parsing.
 *
 * Pasted label text and phone keyboards produce padded, oddly-spaced, mixed
 * case strings: "  2   Kilograms  ", "3 OZ", "250\tML", "1 Fl  Oz". None of
 * those differences may change the parsed grams — if one does, the review
 * sheet rescales every macro from a wrong number with no visible error.
 *
 * The rule pinned here: cosmetic-only edits (padding, repeated/exotic spaces,
 * tabs and newlines, letter case) are invariants of parsePortionGrams,
 * parseQuantity and normalizePortionInput.
 */
import { describe, expect, it } from "vitest";
import {
  isMalformedQuantity,
  normalizePortionInput,
  parsePortionGrams,
  parseQuantity,
} from "../portion-units";

const OZ = 28.3495;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** canonical input → cosmetic variants that must parse identically. */
const VARIANTS: { canonical: string; grams: number; variants: string[] }[] = [
  {
    canonical: "2 kilograms",
    grams: 2000,
    variants: [
      "  2   Kilograms  ",
      "2 KILOGRAMS",
      "2\tkilograms",
      "2\nkilograms",
      "2\u00a0Kilograms",
      "  2 KG  ",
      "2   kg",
      "2 Kgs",
    ],
  },
  {
    canonical: "3 oz",
    grams: round1(3 * OZ),
    variants: ["3 OZ", " 3 oz ", "3   Oz", "3\tOZ", "3 Ounces", "3 OUNCE", "  3ozs "],
  },
  {
    canonical: "500 g",
    grams: 500,
    variants: ["  500 G ", "500\tg", "500   Grams", "500 GRAM", "500\u202fg", "500 Gm"],
  },
  {
    canonical: "1.5 lb",
    grams: round1(1.5 * LB),
    variants: ["  1.5 LB ", "1.5\tlbs", "1.5   Pounds", "1.5 POUND", "1,5 Lb"],
  },
  {
    canonical: "250 ml",
    grams: 250,
    variants: ["250 ML", " 250   mL ", "250\tml", "250 Milliliters", "250 MILLILITRE"],
  },
  {
    canonical: "1 l",
    grams: 1000,
    variants: ["1 L", "  1   l  ", "1\tL", "1 Liter", "1 LITRES"],
  },
  {
    canonical: "2 tbsp",
    grams: 30,
    variants: ["2 TBSP", "  2   Tbsp ", "2\ttablespoons", "2 Tablespoon"],
  },
  {
    canonical: "1 cup",
    grams: 240,
    variants: ["1 CUP", " 1   Cups ", "1\tcup"],
  },
  {
    canonical: "2 fl oz",
    grams: 60,
    variants: ["2 FL OZ", "  2 Fl  Oz ", "2\tfl\toz"],
  },
];

describe("padding, spacing and casing never change the parsed grams", () => {
  for (const { canonical, grams, variants } of VARIANTS) {
    it(`"${canonical}" is stable across ${variants.length} cosmetic variants`, () => {
      const base = parsePortionGrams(canonical);
      expect(base, `"${canonical}" should parse`).not.toBeNull();
      expect(round1(base!)).toBeCloseTo(grams, 1);

      for (const variant of variants) {
        const parsed = parsePortionGrams(variant);
        expect(parsed, `${JSON.stringify(variant)} should parse`).not.toBeNull();
        expect(round1(parsed!), JSON.stringify(variant)).toBeCloseTo(grams, 1);
      }
    });

    it(`"${canonical}" variants are never flagged malformed`, () => {
      for (const variant of variants) {
        expect(isMalformedQuantity(variant), JSON.stringify(variant)).toBe(false);
      }
    });

    it(`"${canonical}" variants yield the same numeric quantity`, () => {
      const base = parseQuantity(canonical);
      expect(base).not.toBeNull();
      for (const variant of variants) {
        expect(parseQuantity(variant), JSON.stringify(variant)).toBeCloseTo(base!, 4);
      }
    });
  }
});

describe("normalizePortionInput collapses cosmetic differences", () => {
  const cases: [string, string][] = [
    ["  2   Kilograms  ", "2 kilograms"],
    ["3 OZ", "3 oz"],
    ["250\tML", "250 ml"],
    ["1 Fl  Oz", "1 fl oz"],
    ["  1.50 LB ", "1.5 lb"],
    ["1\u00a0000 G", "1000 g"],
  ];

  for (const [raw, expected] of cases) {
    it(`${JSON.stringify(raw)} → "${expected}"`, () => {
      expect(normalizePortionInput(raw)).toBe(expected);
    });
  }

  it("is idempotent", () => {
    for (const [raw] of cases) {
      const once = normalizePortionInput(raw);
      expect(normalizePortionInput(once)).toBe(once);
    }
  });
});

describe("whitespace and casing do not rescue malformed input", () => {
  const bad = ["  KG   2 ", "2  KG  KG", "  OZ  ", "  2 G   OZ ", "  -3   Oz "];

  for (const input of bad) {
    it(`still refuses ${JSON.stringify(input)}`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }
});
