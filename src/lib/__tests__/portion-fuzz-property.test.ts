/**
 * Property-based (fuzz) regression tests for portion parsing and macro rescaling.
 *
 * The example-based suites pin the cases we already thought of. These generate
 * thousands of random quantity strings — random magnitudes, random units,
 * random cosmetic noise, and random malformed shapes — and assert the
 * invariants that must hold for *every* input:
 *   1. parsing never throws and never returns a non-positive or non-finite value
 *   2. cosmetic noise (case, padding, decimal separator, trailing zeros) can
 *      never change the parsed grams
 *   3. macro rescaling from parsed grams stays proportional and never
 *      double-rounds
 *   4. malformed shapes are rejected outright rather than half-read
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  formatGrams,
  isMalformedQuantity,
  normalizePortionInput,
  parsePortionGrams,
  parseQuantity,
} from "../portion-units";
import { foodFixture, makeMealItem } from "@/test/fixtures/foods";
import { roundMacro, scaleItems, totalsFor } from "@/lib/meal-nutrition";

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Weight/volume units the parser converts, with their gram factor. */
const UNITS: [string, number][] = [
  ["g", 1],
  ["gram", 1],
  ["grams", 1],
  ["kg", 1000],
  ["kilogram", 1000],
  ["kilograms", 1000],
  ["mg", 0.001],
  ["oz", 28.3495],
  ["ounce", 28.3495],
  ["ounces", 28.3495],
  ["lb", 453.592],
  ["lbs", 453.592],
  ["pound", 453.592],
  ["pounds", 453.592],
  ["ml", 1],
  ["milliliter", 1],
  ["milliliters", 1],
  ["l", 1000],
  ["liter", 1000],
  ["liters", 1000],
];

const unitArb = fc.constantFrom(...UNITS);

/** Positive amounts with at most four decimals, kept in realistic ranges. */
const amountArb = fc
  .tuple(fc.integer({ min: 0, max: 5000 }), fc.integer({ min: 0, max: 9999 }))
  .map(([whole, frac]) => {
    const value = whole + frac / 10000;
    return value > 0 ? value : 0.25;
  });

/** Random mix of upper/lower case for a unit spelling. */
const casedArb = (word: string) =>
  fc.array(fc.boolean(), { minLength: word.length, maxLength: word.length }).map((mask) =>
    word
      .split("")
      .map((c, i) => (mask[i] ? c.toUpperCase() : c))
      .join(""),
  );

const padArb = fc.constantFrom("", " ", "  ", "\t", "\n", "\u00a0", " \t ");

describe("fuzz: any well-formed amount + unit parses to the exact gram value", () => {
  it("holds across random amounts and unit spellings", () => {
    fc.assert(
      fc.property(amountArb, unitArb, (amount, [unit, factor]) => {
        // Below 0.0001 g the parser has no representable value left and
        // correctly rejects the portion, so those inputs are out of scope.
        fc.pre(amount * factor >= 0.0001);
        const text = `${amount} ${unit}`;
        const grams = parsePortionGrams(text);
        const expected = round1(amount * factor);
        expect(grams).not.toBeNull();
        expect(Number.isFinite(grams!)).toBe(true);
        expect(grams!).toBeGreaterThan(0);
        if (expected === 0) {
          // Sub-0.05 g amounts ("0.25 mg") keep four decimals instead of
          // rounding away to a meaningless zero.
          expect(grams!).toBe(Math.round(amount * factor * 10000) / 10000);
          return;
        }
        expect(grams).toBe(expected);
        // The parser's contract: never more than one decimal of grams.
        expect(grams!).toBe(round1(grams!));
      }),

      { numRuns: 600 },
    );
  });
});

describe("fuzz: cosmetic noise never changes the parsed grams", () => {
  it("case, padding, tabs and non-breaking spaces are inert", () => {
    fc.assert(
      fc.property(
        amountArb,
        unitArb.chain(([unit, factor]) =>
          casedArb(unit).map((cased) => [cased, unit, factor] as const),
        ),
        padArb,
        padArb,
        fc.boolean(),
        (amount, [cased, unit], lead, trail, spaceBetween) => {
          const canonical = parsePortionGrams(`${amount} ${unit}`);
          const noisy = parsePortionGrams(
            `${lead}${amount}${spaceBetween ? " " : ""}${cased}${trail}`,
          );
          expect(noisy).toBe(canonical);
        },
      ),
      { numRuns: 600 },
    );
  });

  it("trailing zeros and comma decimals read the same as the plain form", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 1, max: 99 }),
        unitArb,
        fc.integer({ min: 1, max: 3 }),
        (whole, frac, [unit], zeros) => {
          const decimals = String(frac).padStart(2, "0");
          const plain = `${whole}.${decimals} ${unit}`;
          const padded = `${whole}.${decimals}${"0".repeat(zeros)} ${unit}`;
          const comma = `${whole},${decimals} ${unit}`;
          const base = parsePortionGrams(plain);
          expect(parsePortionGrams(padded)).toBe(base);
          expect(parsePortionGrams(comma)).toBe(base);
        },
      ),
      { numRuns: 400 },
    );
  });
});

describe("fuzz: malformed shapes are rejected, never half-read", () => {
  const malformedArb = fc
    .tuple(
      fc.integer({ min: 1, max: 999 }),
      unitArb,
      fc.constantFrom<(n: number, u: string) => string>(
        (n, u) => `${n},,5 ${u}`,
        (n, u) => `${n}. ${u}`,
        (n, u) => `${n}, ${u}`,
        (n, u) => `${u} ${n}`,
        (n, u) => `${n}e3 ${u}`,
        (n, u) => `${n}.5.5 ${u}`,
        (_n, u) => `1/0 ${u}`,
        (n, u) => `${n} ${u} ${u}`,
        (n, u) => `.  ${n} ${u}`,
      ),
    )
    .map(([n, [unit], shape]) => shape(n, unit));

  it("returns null for every generated malformed string", () => {
    fc.assert(
      fc.property(malformedArb, (text) => {
        expect(isMalformedQuantity(text) || parsePortionGrams(text) === null).toBe(true);
        expect(parsePortionGrams(text)).toBeNull();
      }),
      { numRuns: 500 },
    );
  });

  it("zero and negative amounts are never a portion", () => {
    fc.assert(
      fc.property(unitArb, fc.integer({ min: 0, max: 4 }), ([unit], zeros) => {
        expect(parsePortionGrams(`0${zeros ? `.${"0".repeat(zeros)}` : ""} ${unit}`)).toBeNull();
        expect(parsePortionGrams(`-5 ${unit}`)).toBeNull();
      }),
      { numRuns: 200 },
    );
  });

  it("never throws on arbitrary text", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (text) => {
        expect(() => parsePortionGrams(text)).not.toThrow();
        expect(() => parseQuantity(text)).not.toThrow();
        expect(() => normalizePortionInput(text)).not.toThrow();
        const grams = parsePortionGrams(text);
        if (grams !== null) {
          expect(Number.isFinite(grams)).toBe(true);
          expect(grams).toBeGreaterThan(0);
        }
      }),
      { numRuns: 500 },
    );
  });
});

describe("fuzz: macro rescaling from parsed grams stays proportional", () => {
  const food = foodFixture("chicken");
  const per100 = food.per100;

  it("scaling by parsed grams matches the direct ratio", () => {
    fc.assert(
      fc.property(amountArb, unitArb, (amount, [unit]) => {
        const grams = parsePortionGrams(`${amount} ${unit}`);
        if (grams === null) return;
        const factor = grams / 100;
        if (!Number.isFinite(factor) || factor <= 0 || factor > 1000) return;

        const base = makeMealItem("chicken", { grams: 100 });
        const [scaled] = scaleItems([base], factor);
        expect(scaled!.calories).toBe(roundMacro(base.calories * factor, "kcal"));
        expect(scaled!.protein_g).toBe(roundMacro(base.protein_g * factor));
        expect(base.calories).toBe(Math.round(per100.calories));
      }),
      { numRuns: 400 },
    );
  });

  it("cosmetically different spellings of the same amount give identical macros", () => {
    fc.assert(
      fc.property(amountArb, unitArb, padArb, (amount, [unit], pad) => {
        const canonicalGrams = parsePortionGrams(`${amount} ${unit}`);
        const noisyGrams = parsePortionGrams(`${pad}${amount}${pad}${unit.toUpperCase()}${pad}`);
        if (canonicalGrams === null || noisyGrams === null) return;

        const item = (grams: number) => makeMealItem("chicken", { grams });
        const a = totalsFor(scaleItems([item(canonicalGrams)], canonicalGrams / 100));
        const b = totalsFor(scaleItems([item(noisyGrams)], noisyGrams / 100));
        expect(b).toEqual(a);
      }),
      { numRuns: 300 },
    );
  });

  it("formatter output re-parses to the value it printed", () => {
    fc.assert(
      fc.property(amountArb, unitArb, (amount, [unit]) => {
        const grams = parsePortionGrams(`${amount} ${unit}`);
        if (grams === null) return;
        const printed = formatGrams(grams);
        if (!printed) return;
        const reparsed = parsePortionGrams(printed);
        expect(reparsed).not.toBeNull();
        // formatGrams rounds to whole grams at/above 100 — the reprint of the
        // reparsed value must then be stable (idempotent).
        expect(formatGrams(reparsed!)).toBe(printed);
      }),
      { numRuns: 500 },
    );
  });
});
