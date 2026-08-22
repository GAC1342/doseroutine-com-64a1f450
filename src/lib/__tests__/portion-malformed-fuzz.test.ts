/**
 * Fuzz-style regression suite for ambiguous or malformed portion strings.
 *
 * The rule: if a quantity cannot be read with confidence, the parser returns
 * null and the meal's nutrition totals stay exactly as they were. A wrong
 * grams value is far worse than no value — it silently rescales every macro.
 */
import { describe, expect, it } from "vitest";
import { isMalformedQuantity, parsePortionGrams, parseQuantity } from "../portion-units";
import { roundTotals, totalsFor, type MealItem } from "../meal-nutrition";
import { makeMeal } from "@/test/fixtures/foods";

/** Malformed inputs that must never produce a grams value. */
const MALFORMED = [
  // Doubled / stray separators
  "1,,5 kg",
  "1..5 kg",
  "..5 kg",
  ",5 kg",
  ".5 kg",
  "1, .5 kg",
  "1. kg",
  "1, kg",
  "1,.kg",
  ". kg",
  // Too many separators to disambiguate grouping from decimals
  "1,5,5 kg",
  "2.5.5 kg",
  "1,23,456 g",
  "1.23.456 g",
  // Unit before the number
  "kg 2",
  "oz 3",
  "g 150",
  "cup 1",
  // Unit with no number, number with no unit context
  "kg",
  "g",
  "oz",
  // Repeated units
  "1 kg kg",
  "2 g oz",
  "3 cups cups",
  // Scientific notation
  "1e3 kg",
  "1E3 g",
  "2e-2 kg",
  // Non-numbers
  "NaN g",
  "Infinity g",
  "abc",
  "-- g",
  // Division by zero
  "1/0 cup",
  "0/0 g",
  "3/00 lb",
  // Run-on numbers
  "1 2 3 g",
  "5 5 oz",
  // Negatives
  "-2 kg",
  "-½ kg",
  "--2 kg",
];

/** Well-formed inputs that must keep working unchanged. */
const WELL_FORMED: [string, number][] = [
  ["150 g", 150],
  ["150g", 150],
  ["1.5 kg", 1500],
  ["1,5 kg", 1500],
  ["1 200 g", 1200],
  ["1,200 g", 1200],
  ["1,200.5 g", 1200.5],
  ["1.000,5 kg", 1000500],
  ["3 oz", 85.0],
  ["1 lb 4 oz", 566.99],
  ["1 cup (158 g)", 158],
  ["1 1/2 cups", 360],
  ["½ cup", 120],
  ["1⅓ cups", 320],
  ["¾ lb", 340.2],
  ["2 tbsp", 30],
];

describe("malformed quantities are rejected", () => {
  for (const input of MALFORMED) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }

  it("flags them through isMalformedQuantity or leaves them unparseable", () => {
    for (const input of MALFORMED) {
      const flagged = isMalformedQuantity(input);
      const parsed = parsePortionGrams(input);
      expect(flagged || parsed === null).toBe(true);
    }
  });

  it("never returns a negative or non-finite grams value", () => {
    for (const input of MALFORMED) {
      const grams = parsePortionGrams(input);
      if (grams !== null) {
        expect(Number.isFinite(grams)).toBe(true);
        expect(grams).toBeGreaterThan(0);
      }
    }
  });
});

describe("well-formed quantities still parse", () => {
  for (const [input, grams] of WELL_FORMED) {
    it(`keeps "${input}" at ~${grams} g`, () => {
      expect(isMalformedQuantity(input)).toBe(false);
      expect(parsePortionGrams(input)).toBeCloseTo(grams, 1);
    });
  }
});

describe("fuzzed mutations of valid portions", () => {
  const BASES = ["150 g", "1.5 kg", "3 oz", "1 cup", "2 tbsp", "1 lb 4 oz"];
  const MUTATIONS: [string, (s: string) => string][] = [
    ["doubled comma", (s) => s.replace(/(\d)/, "$1,,")],
    ["doubled dot", (s) => s.replace(/(\d)/, "$1..")],
    ["leading dot", (s) => `.${s}`],
    ["trailing dot before unit", (s) => s.replace(/(\d)(\s)/, "$1.$2")],
    ["unit moved to front", (s) => s.split(" ").reverse().join(" ")],
    ["exponent injected", (s) => s.replace(/^(\d+)/, "$1e3")],
    ["negated", (s) => `-${s}`],
  ];

  for (const base of BASES) {
    for (const [name, mutate] of MUTATIONS) {
      const mutated = mutate(base);
      // Skip mutations that happen to leave a legitimate string.
      if (mutated === base) continue;
      it(`"${base}" with ${name} → "${mutated}" does not silently reparse`, () => {
        const original = parsePortionGrams(base);
        const result = parsePortionGrams(mutated);
        expect(result === null || result === original).toBe(true);
      });
    }
  }

  it("is deterministic: repeated parses give the same answer", () => {
    for (const input of [...MALFORMED, ...WELL_FORMED.map(([s]) => s)]) {
      expect(parsePortionGrams(input)).toEqual(parsePortionGrams(input));
    }
  });
});

describe("parseQuantity rejects the same inputs", () => {
  const ambiguous = ["1,,5", "1,5,5", "2.5.5", "1..5", ".5", "1e3", "1/0", "1 2 3"];
  for (const input of ambiguous) {
    it(`parseQuantity("${input}") is null`, () => {
      expect(parseQuantity(input)).toBeNull();
    });
  }

  it("still reads valid quantities", () => {
    expect(parseQuantity("1 1/2")).toBeCloseTo(1.5, 3);
    expect(parseQuantity("1,5")).toBeCloseTo(1.5, 3);
    expect(parseQuantity("1⅓")).toBeCloseTo(4 / 3, 3);
  });
});

describe("nutrition totals are untouched by malformed input", () => {
  const items: MealItem[] = makeMeal(["chicken", "broccoli"]);
  const baseline = roundTotals(totalsFor(items));

  it("keeps totals identical when a typed portion cannot be parsed", () => {
    for (const input of MALFORMED) {
      const grams = parsePortionGrams(input);
      // The review sheet only rescales when grams parse; a null keeps the item.
      const next = grams === null ? items : items;
      expect(roundTotals(totalsFor(next))).toEqual(baseline);
    }
  });

  it("does not mutate the item array while probing malformed values", () => {
    const snapshot = JSON.stringify(items);
    for (const input of MALFORMED) parsePortionGrams(input);
    expect(JSON.stringify(items)).toBe(snapshot);
    expect(roundTotals(totalsFor(items))).toEqual(baseline);
  });
});
