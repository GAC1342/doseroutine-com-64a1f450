/**
 * Singular / plural agreement and near-miss unit words.
 *
 * The parser accepts both "1 ounce" and "2 ounces", which means its unit
 * regexes carry optional-`s` branches. Those branches are exactly where false
 * positives creep in: a typo like "2 ouncess", a different word that happens
 * to start with a unit ("2 grande"), or a non-unit noun ("2 servings") must
 * NOT be read as a weight — a wrong grams value silently rescales every macro.
 *
 * Pinned here:
 *   1. singular and plural of the same unit scale linearly (1 vs 2)
 *   2. grammatically "wrong" agreement ("1 ounces", "2 ounce") still parses,
 *      because people type it and the amount is unambiguous
 *   3. near-miss words and typos parse to null rather than a guess
 */
import { describe, expect, it } from "vitest";
import { parsePortionGrams, parseQuantity } from "../portion-units";

const OZ = 28.3495;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** singular word, plural word, grams for one unit. */
const UNITS: [string, string, number][] = [
  ["gram", "grams", 1],
  ["kilogram", "kilograms", 1000],
  ["ounce", "ounces", OZ],
  ["pound", "pounds", LB],
  ["milliliter", "milliliters", 1],
  ["milliliter", "milliliters", 1],
  ["liter", "liters", 1000],
  ["litre", "litres", 1000],
  ["cup", "cups", 240],
  ["tablespoon", "tablespoons", 15],
  ["teaspoon", "teaspoons", 5],
];

describe("singular vs plural scales linearly", () => {
  for (const [singular, plural, perUnit] of UNITS) {
    it(`"1 ${singular}" is exactly half of "2 ${plural}"`, () => {
      const one = parsePortionGrams(`1 ${singular}`);
      const two = parsePortionGrams(`2 ${plural}`);

      expect(one, `1 ${singular} should parse`).not.toBeNull();
      expect(two, `2 ${plural} should parse`).not.toBeNull();
      expect(round1(one!)).toBeCloseTo(round1(perUnit), 1);
      expect(round1(two!)).toBeCloseTo(round1(perUnit * 2), 1);
      // parsePortionGrams rounds to 0.1 g, so allow one rounding step.
      expect(Math.abs(two! - one! * 2)).toBeLessThanOrEqual(0.15);
    });
  }
});

describe("mismatched grammatical agreement is still read as the same unit", () => {
  // People type "1 ounces" and "2 ounce" constantly; the amount is not
  // ambiguous, so refusing them would lose real data.
  for (const [singular, plural, perUnit] of UNITS) {
    it(`"1 ${plural}" and "2 ${singular}" parse like their correct forms`, () => {
      expect(round1(parsePortionGrams(`1 ${plural}`)!)).toBeCloseTo(round1(perUnit), 1);
      expect(round1(parsePortionGrams(`2 ${singular}`)!)).toBeCloseTo(round1(perUnit * 2), 1);
    });
  }

  it("keeps the quantity itself independent of the unit's plural form", () => {
    expect(parseQuantity("1 ounce")).toBe(1);
    expect(parseQuantity("2 ounces")).toBe(2);
    expect(parseQuantity("1 ounces")).toBe(1);
    expect(parseQuantity("2 ounce")).toBe(2);
  });
});

describe("near-miss unit words are not treated as units", () => {
  // Words that share a prefix or suffix with a real unit, plus double-plural
  // typos. Any of these parsing to a number would be a silent data-accuracy
  // bug, so null is the only correct answer.
  const nearMisses = [
    "2 ouncess",
    "2 gramms",
    "2 grammes",
    "2 kilogramms",
    "2 poundss",
    "2 litters",
    "2 mililiters",
    "2 milliliterss",
    "2 cupss",
    "2 tablespoonss",
    "2 grande",
    "2 grains",
    "2 lozenges",
    "2 loaves",
    "2 gallons",
    "2 quarts",
    "2 pints",
    "2 stones",
    "2 drams",
  ];

  for (const input of nearMisses) {
    it(`refuses "${input}"`, () => {
      expect(parsePortionGrams(input), `"${input}" must not be read as a weight`).toBeNull();
    });
  }
});

describe("a trailing food name after a real unit is kept", () => {
  // "2 pounds cake" is a real weight with the food named after it — the unit
  // still wins, unlike the near-misses above.
  it('reads "2 pounds cake" as a pound weight', () => {
    expect(round1(parsePortionGrams("2 pounds cake")!)).toBeCloseTo(round1(2 * LB), 1);
  });
});

describe("countable nouns are not units", () => {
  // These describe how many things, not how much mass — the parser must fall
  // through to the food's own portion table instead of inventing grams.
  const counts = ["1 serving", "2 servings", "1 slice", "2 slices", "1 piece", "2 pieces"];

  for (const input of counts) {
    it(`does not invent grams for "${input}"`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }
});

describe("unit-like substrings inside longer words are ignored", () => {
  // "l" and "g" are real units, so a bare-letter match must be word-bounded.
  const embedded = ["2 glasses", "2 large", "2 loaves", "2 lemons", "2 gummies", "2 links"];

  for (const input of embedded) {
    it(`refuses "${input}"`, () => {
      expect(parsePortionGrams(input)).toBeNull();
    });
  }

  it("still reads the standalone single-letter units", () => {
    expect(parsePortionGrams("2 g")).toBeCloseTo(2, 1);
    expect(parsePortionGrams("2 l")).toBeCloseTo(2000, 1);
  });
});
