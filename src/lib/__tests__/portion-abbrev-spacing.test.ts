/**
 * Abbreviation + spacing matrix for the portion parser.
 *
 * People type the same amount half a dozen ways: "3 oz", "3oz", "3 OZ",
 * "3 ozs", "250ml", "250 ML", "1 L", "1l". Every one of those has to land on
 * the same grams value — if a variant silently parses to null the review sheet
 * keeps stale macros with no visible error. This suite pins the six common
 * abbreviations (kg, g, oz, lb, ml, l) across spacing, casing, plural and
 * decimal variants.
 */
import { describe, expect, it } from "vitest";
import { isMalformedQuantity, parsePortionGrams, parseQuantity } from "../portion-units";

const OZ = 28.3495;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** amount, abbreviation variants, expected grams (rounded to 0.1). */
const MATRIX: { unit: string; variants: string[]; grams: number }[] = [
  {
    unit: "kg",
    variants: ["2 kg", "2kg", "2 KG", "2Kg", "2 kgs", "2kgs", "2  kg", "2\tkg"],
    grams: 2000,
  },
  {
    unit: "g",
    variants: ["500 g", "500g", "500 G", "500 gm", "500gm", "500  g"],
    grams: 500,
  },
  {
    unit: "oz",
    variants: ["3 oz", "3oz", "3 OZ", "3 Oz", "3 ozs", "3ozs", "3  oz"],
    grams: round1(3 * OZ),
  },
  {
    unit: "lb",
    variants: ["2 lb", "2lb", "2 LB", "2 lbs", "2lbs", "2  lb"],
    grams: round1(2 * LB),
  },
  {
    unit: "ml",
    variants: ["250 ml", "250ml", "250 ML", "250 mL", "250  ml"],
    grams: 250,
  },
  {
    unit: "l",
    variants: ["1 l", "1l", "1 L", "1  l"],
    grams: 1000,
  },
];

describe("abbreviated units parse identically across spacing and casing", () => {
  for (const { unit, variants, grams } of MATRIX) {
    it(`reads every "${unit}" variant as ${grams} g`, () => {
      for (const variant of variants) {
        const parsed = parsePortionGrams(variant);
        expect(parsed, `"${variant}" should parse`).not.toBeNull();
        expect(round1(parsed!), `"${variant}"`).toBeCloseTo(grams, 1);
      }
    });

    it(`treats every "${unit}" variant as well formed`, () => {
      for (const variant of variants) {
        expect(isMalformedQuantity(variant), `"${variant}"`).toBe(false);
      }
    });

    it(`reads the same quantity out of every "${unit}" variant`, () => {
      const amounts = variants.map((v) => parseQuantity(v));
      for (const [index, amount] of amounts.entries()) {
        expect(amount, `"${variants[index]}"`).not.toBeNull();
        expect(amount, `"${variants[index]}"`).toBeCloseTo(amounts[0]!, 4);
      }
    });
  }
});

describe("decimal and fractional amounts keep working with abbreviations", () => {
  const cases: [string, number][] = [
    ["1.5 kg", 1500],
    ["1.5kg", 1500],
    ["0.5 lb", round1(0.5 * LB)],
    ["0.5lb", round1(0.5 * LB)],
    ["1,5 l", 1500], // decimal comma
    ["1,5l", 1500],
    ["½ lb", round1(0.5 * LB)],
    ["1.75 oz", round1(1.75 * OZ)],
    ["1.75oz", round1(1.75 * OZ)],
    ["12.5 ml", 12.5],
    ["1,200 g", 1200], // thousands comma
    ["1200g", 1200],
  ];

  for (const [input, grams] of cases) {
    it(`"${input}" → ${grams} g`, () => {
      const parsed = parsePortionGrams(input);
      expect(parsed).not.toBeNull();
      expect(round1(parsed!)).toBeCloseTo(grams, 1);
    });
  }
});

describe("abbreviations still reject malformed input", () => {
  const bad = ["kg 2", "2 kg kg", "oz", "ml 250", "2 g oz", "1e3 kg", "-3 oz", "2..5 kg"];

  for (const input of bad) {
    it(`refuses "${input}"`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }
});
