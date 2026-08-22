/**
 * Number-format regression checks for portion parsing.
 *
 * People type portions in whatever format their keyboard and country give
 * them: "1.5 kg", "1,5 kg", "1 200 g", "1,200 g", "1 lb 4 oz". All of them
 * have to land on the same grams, because that number drives every macro
 * rescale in the meal review sheet.
 */
import { describe, expect, it } from "vitest";
import {
  formatGrams,
  normalizeNumberFormats,
  parsePortionGrams,
  parseQuantity,
} from "../portion-units";

const OZ = 28.3495;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

describe("metric formats", () => {
  const cases: [string, number][] = [
    ["150 g", 150],
    ["150g", 150],
    ["150 G", 150],
    ["150.5 g", 150.5],
    ["150,5 g", 150.5],
    ["0.5 kg", 500],
    ["0,5 kg", 500],
    ["1.5 kg", 1500],
    ["1,5 kg", 1500],
    ["1 200 g", 1200],
    ["1\u00a0200 g", 1200],
    ["1,200 g", 1200],
    ["1,200.5 g", 1200.5],
    ["250 ml", 250],
    ["1 l", 1000],
    ["500 mg", 0.5],
    ["2 kg", 2000],
  ];

  it.each(cases)("parses %s", (input, expected) => {
    expect(parsePortionGrams(input)).toBeCloseTo(expected, 1);
  });
});

describe("imperial formats", () => {
  const cases: [string, number][] = [
    ["3 oz", round1(3 * OZ)],
    ["8oz", round1(8 * OZ)],
    ["3.5 oz", round1(3.5 * OZ)],
    ["3,5 oz", round1(3.5 * OZ)],
    ["3 ounces", round1(3 * OZ)],
    ["1 lb", round1(LB)],
    ["2 lbs", round1(2 * LB)],
    ["1.5 lb", round1(1.5 * LB)],
    ["1,5 lb", round1(1.5 * LB)],
    ["1 pound", round1(LB)],
    ["1 lb 4 oz", round1(LB + 4 * OZ)],
    ["2 lb 3.5 oz", round1(2 * LB + 3.5 * OZ)],
    ["2 lbs 3,5 ounces", round1(2 * LB + 3.5 * OZ)],
  ];

  it.each(cases)("parses %s", (input, expected) => {
    expect(parsePortionGrams(input)).toBeCloseTo(expected, 1);
  });

  it("reads the same grams whether written metric or imperial", () => {
    const imperial = parsePortionGrams("1 lb 4 oz")!;
    const metric = parsePortionGrams("566,8 g")!;
    expect(Math.abs(imperial - metric)).toBeLessThan(0.5);
  });
});

describe("household measures", () => {
  const cases: [string, number][] = [
    ["1 cup", 240],
    ["1.5 cups", 360],
    ["1,5 cups", 360],
    ["1 1/2 cups", 360],
    ["½ cup", 120],
    ["¾ cup", 180],
    ["2 tbsp", 30],
    ["1 tsp", 5],
    ["2 fl oz", 60],
  ];

  it.each(cases)("parses %s", (input, expected) => {
    expect(parsePortionGrams(input)).toBeCloseTo(expected, 1);
  });

  it("does not treat a fraction's whole number as digit grouping", () => {
    expect(parseQuantity("1 1/2")).toBeCloseTo(1.5, 5);
    expect(parseQuantity("1,5")).toBeCloseTo(1.5, 5);
    expect(parseQuantity("1 200")).toBeCloseTo(1200, 5);
  });
});

describe("locale grouping vs decimal separators never swap", () => {
  // Both separators present: the rightmost one is always the decimal mark.
  const cases: [string, number][] = [
    ["1.000,5 kg", 1000500],
    ["1,000.5 kg", 1000500],
    ["1.000,5 g", 1000.5],
    ["1,000.5 g", 1000.5],
    ["1.000,5 lb", round1(1000.5 * LB)],
    ["1,000.5 lb", round1(1000.5 * LB)],
    ["1.000,25 ml", 1000.3],
    ["1,000.25 ml", 1000.3],
    ["1.234.567,8 g", 1234567.8],
    ["1,234,567.8 g", 1234567.8],
    ["12.345,6 g", 12345.6],
    ["12,345.6 g", 12345.6],
    ["1 000,5 g", 1000.5],
    ["1\u00a0000.5 g", 1000.5],
  ];

  it.each(cases)("parses %s", (input, expected) => {
    expect(parsePortionGrams(input)).toBeCloseTo(expected, 1);
  });

  it("reads EU and US spellings of the same amount identically", () => {
    for (const [eu, us] of [
      ["1.000,5 kg", "1,000.5 kg"],
      ["2.500,75 g", "2,500.75 g"],
      ["1.234.567,8 g", "1,234,567.8 g"],
    ] as const) {
      expect(parsePortionGrams(eu)).toBe(parsePortionGrams(us));
    }
  });

  it("never mistakes a grouped thousand for a decimal", () => {
    // If grouping were read as a decimal these would collapse to ~1 g.
    expect(parsePortionGrams("1.000,5 g")!).toBeGreaterThan(1000);
    expect(parsePortionGrams("1,000.5 g")!).toBeGreaterThan(1000);
  });

  it("never mistakes a decimal for grouping", () => {
    // If the decimal were read as grouping these would explode to ~15005 g.
    expect(parsePortionGrams("1,5 kg")).toBeCloseTo(1500, 1);
    expect(parsePortionGrams("1.5 kg")).toBeCloseTo(1500, 1);
    expect(parsePortionGrams("150,5 g")).toBeCloseTo(150.5, 1);
    expect(parsePortionGrams("150.5 g")).toBeCloseTo(150.5, 1);
  });

  it("normalises to a single canonical numeric form", () => {
    expect(normalizeNumberFormats("1.000,5 kg")).toBe("1000.5 kg");
    expect(normalizeNumberFormats("1,000.5 lb")).toBe("1000.5 lb");
    expect(normalizeNumberFormats("1.234.567,8")).toBe("1234567.8");
    expect(normalizeNumberFormats("1,234,567.8")).toBe("1234567.8");
    // No separators, fractions and plain decimals stay untouched.
    expect(normalizeNumberFormats("1 1/2 cups")).toBe("1 1/2 cups");
    expect(normalizeNumberFormats("2.5 oz")).toBe("2.5 oz");
  });

  it("applies the rule to grams inside a label", () => {
    expect(parsePortionGrams("1 pack (1.000,5 g)")).toBeCloseTo(1000.5, 1);
    expect(parsePortionGrams("1 pack (1,000.5 g)")).toBeCloseTo(1000.5, 1);
  });

  it("keeps quantities consistent for household measures", () => {
    expect(parseQuantity("1.000,5")).toBeCloseTo(1000.5, 5);
    expect(parseQuantity("1,000.5")).toBeCloseTo(1000.5, 5);
  });
});

describe("labels that carry a gram weight", () => {
  const cases: [string, number][] = [
    ["1 cup (158 g)", 158],
    ["1 cup (158,5 g)", 158.5],
    ["2 slices (56 g)", 56],
    ["1 serving (240 ml)", 240],
  ];

  it.each(cases)("prefers the parenthesised grams in %s", (input, expected) => {
    expect(parsePortionGrams(input)).toBeCloseTo(expected, 1);
  });
});

describe("input that carries no measurable amount", () => {
  const cases = ["1 serving", "a handful", "", "   ", "some rice", "abc g", "g", "-5 g"];

  it.each(cases)("returns null for %j", (input) => {
    expect(parsePortionGrams(input)).toBeNull();
  });

  it("returns null for null and undefined", () => {
    expect(parsePortionGrams(null)).toBeNull();
    expect(parsePortionGrams(undefined)).toBeNull();
  });
});

describe("round trip through formatGrams", () => {
  const inputs = ["150 g", "1,5 kg", "3 oz", "1 lb 4 oz", "1 200 g", "1,5 cups"];

  it.each(inputs)("re-parses its own formatted output for %s", (input) => {
    const grams = parsePortionGrams(input)!;
    expect(grams).toBeGreaterThan(0);
    const reparsed = parsePortionGrams(formatGrams(grams))!;
    expect(Math.abs(reparsed - grams)).toBeLessThanOrEqual(0.5);
  });
});
