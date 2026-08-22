/**
 * Regression checks for high-precision portion quantities.
 *
 * Converted recipes, kitchen-scale readouts and CSV imports produce amounts
 * like "0.3333 kg" and "1.2500 lb". Two things can silently go wrong: the
 * parser drops or mis-rounds the fractional part, or the macro rescale
 * compounds rounding so calories/protein land a unit off. Neither surfaces an
 * error — the numbers just quietly become wrong. These tests pin the gram
 * rounding and the macro rescale that depends on it.
 */
import { describe, expect, it } from "vitest";
import { formatGrams, parsePortionGrams } from "../portion-units";
import { foodFixture, makeMealItem } from "@/test/fixtures/foods";
import { roundMacro, roundTotals, scaleItems, totalsFor } from "@/lib/meal-nutrition";

const G = 1;
const KG = 1000;
const OZ = 28.3495;
const LB = 453.592;
const ML = 1;
const L = 1000;

/** The parser's documented gram rounding (one decimal). */
const round1 = (n: number) => Math.round(n * 10) / 10;

describe("high-precision quantities parse to the expected grams", () => {
  const cases: [string, number][] = [
    ["0.3333 kg", 0.3333 * KG],
    ["1.2500 lb", 1.25 * LB],
    ["2.7500 oz", 2.75 * OZ],
    ["0.1250 l", 0.125 * L],
    ["1.0625 kg", 1.0625 * KG],
    ["0.6667 lb", 0.6667 * LB],
    ["12.3456 g", 12.3456 * G],
    ["487.5000 ml", 487.5 * ML],
  ];

  for (const [input, exact] of cases) {
    it(`parses ${input}`, () => {
      expect(parsePortionGrams(input)).toBe(round1(exact));
    });
  }

  it("never returns more than one decimal of grams", () => {
    for (const [input] of cases) {
      const grams = parsePortionGrams(input)!;
      expect(Number.isFinite(grams)).toBe(true);
      expect(grams).toBe(round1(grams));
    }
  });
});

describe("trailing zeros never change a result", () => {
  const equivalents: [string, string][] = [
    ["1.2500 lb", "1.25 lb"],
    ["2.500 kg", "2.5 kg"],
    ["3.0000 oz", "3 oz"],
    ["0.5000 l", "0.5 l"],
    ["150.00 g", "150 g"],
  ];

  for (const [padded, plain] of equivalents) {
    it(`"${padded}" equals "${plain}"`, () => {
      expect(parsePortionGrams(padded)).toBe(parsePortionGrams(plain));
    });
  }

  it("produces identical macros through the rescale", () => {
    const base = makeMealItem("chicken", { grams: 100 });
    for (const [padded, plain] of equivalents) {
      const a = scaleItems([base], parsePortionGrams(padded)! / 100);
      const b = scaleItems([base], parsePortionGrams(plain)! / 100);
      expect(a, padded).toEqual(b);
    }
  });
});

describe("rounding is stable and spelling-independent", () => {
  it("returns the same grams on repeated calls", () => {
    for (const input of ["0.3333 kg", "0.6667 lb", "2.7500 oz", "1.0625 kg"]) {
      const first = parsePortionGrams(input);
      for (let i = 0; i < 5; i += 1) expect(parsePortionGrams(input)).toBe(first);
    }
  });

  it("matches across abbreviation, plural and mixed-case spellings", () => {
    const groups: string[][] = [
      ["0.3333 kg", "0.3333 kilograms", "0.3333 kilogram", "0.3333 KG", "0.3333KiloGrams"],
      ["1.2500 lb", "1.2500 lbs", "1.2500 pounds", "1.2500 POUNDS", "1.2500Lb"],
      ["2.7500 oz", "2.7500 ounces", "2.7500 OZ", "2.7500oZ"],
      ["0.1250 l", "0.1250 liters", "0.1250 litres", "0.1250 L"],
    ];
    for (const group of groups) {
      const expected = parsePortionGrams(group[0]!);
      expect(expected).not.toBeNull();
      for (const spelling of group) expect(parsePortionGrams(spelling), spelling).toBe(expected);
    }
  });

  it("rounds exact half-way gram values the same way every time", () => {
    // 0.12345 kg = 123.45 g and 1.2345 g both sit on a .x5 boundary.
    for (const input of ["0.12345 kg", "1.2345 g", "0.00025 kg"]) {
      const first = parsePortionGrams(input);
      expect(parsePortionGrams(input)).toBe(first);
      if (first != null) expect(first).toBe(round1(first));
    }
  });

  it("survives surrounding whitespace unchanged", () => {
    expect(parsePortionGrams("  0.3333  kg ")).toBe(parsePortionGrams("0.3333 kg"));
    expect(parsePortionGrams("\t1.2500 lb\n")).toBe(parsePortionGrams("1.2500 lb"));
  });
});

describe("macro rescaling stays consistent at high precision", () => {
  const cases: [string, number][] = [
    ["0.3333 kg", 0.3333 * KG],
    ["1.2500 lb", 1.25 * LB],
    ["2.7500 oz", 2.75 * OZ],
    ["0.1250 kg", 0.125 * KG],
  ];

  for (const [portion, exact] of cases) {
    it(`scales chicken macros for ${portion}`, () => {
      const food = foodFixture("chicken");
      const grams = parsePortionGrams(portion)!;
      expect(grams).toBe(round1(exact));

      const base = makeMealItem("chicken", { grams: 100 });
      const [scaled] = scaleItems([base], grams / 100);

      const f = grams / 100;
      expect(scaled!.calories).toBe(roundMacro(food.per100.calories * f, "kcal"));
      expect(scaled!.protein_g).toBe(roundMacro(food.per100.protein_g * f));
      expect(scaled!.carbs_g).toBe(roundMacro(food.per100.carbs_g * f));
      expect(scaled!.fat_g).toBe(roundMacro(food.per100.fat_g * f));
    });
  }

  it("keeps totals equal to the sum of the rounded items (no double rounding)", () => {
    const grams = parsePortionGrams("1.2500 lb")!;
    const items = scaleItems(
      [makeMealItem("chicken", { grams: 100 }), makeMealItem("rice", { grams: 100 })],
      grams / 100,
    );
    const totals = roundTotals(totalsFor(items));
    expect(totals.calories).toBe(items.reduce((sum, i) => sum + i.calories, 0));
    expect(totals.protein_g).toBe(round1(items.reduce((sum, i) => sum + i.protein_g, 0)));
    expect(totals.carbs_g).toBe(round1(items.reduce((sum, i) => sum + i.carbs_g, 0)));
    expect(totals.fat_g).toBe(round1(items.reduce((sum, i) => sum + i.fat_g, 0)));
  });

  it("scaling twice by halves matches scaling once by the full factor", () => {
    const grams = parsePortionGrams("0.3333 kg")!;
    const base = makeMealItem("chicken", { grams: 100 });
    const once = scaleItems([base], grams / 100)[0]!;
    const direct = roundMacro((foodFixture("chicken").per100.calories * grams) / 100, "kcal");
    expect(once.calories).toBe(direct);
  });
});

describe("format/parse round trips are idempotent", () => {
  for (const input of ["0.3333 kg", "1.2500 lb", "2.7500 oz", "12.3456 g", "0.1250 l"]) {
    it(`round trips ${input}`, () => {
      const grams = parsePortionGrams(input)!;
      const label = formatGrams(grams);
      const reparsed = parsePortionGrams(label)!;
      // formatGrams rounds to whole grams at/above 100 g; re-parsing is stable
      // from there on.
      expect(parsePortionGrams(formatGrams(reparsed))).toBe(reparsed);
      expect(Math.abs(reparsed - grams)).toBeLessThanOrEqual(0.5);
    });
  }
});

describe("malformed high-precision inputs stay rejected", () => {
  for (const input of [
    "0..3333 kg",
    "1.2500.5 lb",
    "-0.5 kg",
    "0.3333.. kg",
    "1,2500,5 lb",
    ".  3333 kg",
    "kg 0.3333",
  ]) {
    it(`rejects "${input}"`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }

  it("rejects a zero amount however it is padded", () => {
    expect(parsePortionGrams("0.0000 kg")).toBeNull();
    expect(parsePortionGrams("0.00 lb")).toBeNull();
  });
});
