/**
 * Property-based casing checks for portion units.
 *
 * The example-based suites pin a handful of hand-written variants ("2KG",
 * "3oZ"). This suite generates random casing for *every* supported unit
 * spelling, against random amounts and random fixture foods, and asserts the
 * parsed grams and the rescaled macros are byte-identical to the canonical
 * lowercase form. Casing must never be able to change a number a user sees.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isMalformedQuantity, parsePortionGrams } from "../portion-units";
import { FOOD_KEYS, makeMealItem } from "@/test/fixtures/foods";
import { roundTotals, scaleItems, totalsFor } from "@/lib/meal-nutrition";

/** Every unit spelling the parser accepts, weight/volume plus household. */
const UNIT_SPELLINGS = [
  "g",
  "gram",
  "grams",
  "gm",
  "kg",
  "kilogram",
  "kilograms",
  "mg",
  "milligram",
  "milligrams",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "ml",
  "milliliter",
  "milliliters",
  "milliliter",
  "milliliters",
  "l",
  "liter",
  "liters",
  "litre",
  "litres",
  "tsp",
  "teaspoon",
  "teaspoons",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "cup",
  "cups",
  "fl oz",
] as const;

/** Household units only parse from the start of the string. */
const HOUSEHOLD = new Set([
  "tsp",
  "teaspoon",
  "teaspoons",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "cup",
  "cups",
  "fl oz",
]);

/** Apply a per-character upper/lower mask, leaving non-letters alone. */
function recase(unit: string, mask: boolean[]): string {
  let i = 0;
  return unit.replace(/[a-z]/g, (ch) => {
    const upper = mask[i % mask.length] ?? false;
    i += 1;
    return upper ? ch.toUpperCase() : ch;
  });
}

const unitArb = fc.constantFrom(...UNIT_SPELLINGS);
const maskArb = fc.array(fc.boolean(), { minLength: 1, maxLength: 12 });
const amountArb = fc.constantFrom(
  "1",
  "2",
  "3",
  "5",
  "8",
  "12",
  "100",
  "250",
  "500",
  "0.5",
  "1.5",
  "2.25",
  "3/4",
  "1 1/2",
);
const foodArb = fc.constantFrom(...FOOD_KEYS);
// Separator between amount and unit: "fl oz" needs one to stay readable.
const gapArb = fc.constantFrom("", " ", "  ");

function macrosFor(key: (typeof FOOD_KEYS)[number], grams: number) {
  return roundTotals(totalsFor([makeMealItem(key, { grams })]));
}

describe("random casing never changes how a portion parses", () => {
  it("parses to the same grams as the lowercase unit", () => {
    fc.assert(
      fc.property(amountArb, unitArb, maskArb, gapArb, (amount, unit, mask, gap) => {
        const separator = unit.includes(" ") && gap === "" ? " " : gap;
        const canonical = `${amount}${separator}${unit}`;
        const mixed = `${amount}${separator}${recase(unit, mask)}`;

        const expected = parsePortionGrams(canonical);
        expect(parsePortionGrams(mixed), `${mixed} vs ${canonical}`).toEqual(expected);
      }),
      { numRuns: 600 },
    );
  });

  it("resolves every supported unit spelling to real grams in lowercase", () => {
    // Guards the property above from passing vacuously on null === null.
    for (const unit of UNIT_SPELLINGS) {
      const portion = `2 ${unit}`;
      expect(parsePortionGrams(portion), portion).not.toBeNull();
    }
  });

  it("agrees with the lowercase form on malformed-quantity rejection", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("two", "-3", "1,,5", "", "1e5"),
        unitArb,
        maskArb,
        (amount, unit, mask) => {
          const canonical = `${amount} ${unit}`;
          const mixed = `${amount} ${recase(unit, mask)}`;
          expect(isMalformedQuantity(mixed)).toBe(isMalformedQuantity(canonical));
          expect(parsePortionGrams(mixed)).toEqual(parsePortionGrams(canonical));
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("random casing never changes rescaled macros", () => {
  it("produces identical totals for mixed-case and lowercase portions", () => {
    fc.assert(
      fc.property(foodArb, amountArb, unitArb, maskArb, gapArb, (food, amount, unit, mask, gap) => {
        const separator = unit.includes(" ") && gap === "" ? " " : gap;
        const canonicalGrams = parsePortionGrams(`${amount}${separator}${unit}`);
        const mixedGrams = parsePortionGrams(`${amount}${separator}${recase(unit, mask)}`);
        if (canonicalGrams === null || mixedGrams === null) {
          expect(mixedGrams).toEqual(canonicalGrams);
          return;
        }
        expect(macrosFor(food, mixedGrams)).toEqual(macrosFor(food, canonicalGrams));
      }),
      { numRuns: 400 },
    );
  });

  it("stays identical after a servings change", () => {
    fc.assert(
      fc.property(
        foodArb,
        amountArb,
        unitArb,
        maskArb,
        fc.integer({ min: 2, max: 4 }),
        (food, amount, unit, mask, servings) => {
          const separator = unit.includes(" ") ? " " : "";
          const canonicalGrams = parsePortionGrams(`${amount}${separator}${unit}`);
          const mixedGrams = parsePortionGrams(`${amount}${separator}${recase(unit, mask)}`);
          if (canonicalGrams === null || mixedGrams === null) return;

          const scaled = (grams: number) =>
            roundTotals(totalsFor(scaleItems([makeMealItem(food, { grams })], servings)));
          expect(scaled(mixedGrams)).toEqual(scaled(canonicalGrams));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("only reports a unit as unparseable when the lowercase form is too", () => {
    // Fixed sweep over every spelling with a simple amount, all-caps.
    for (const unit of UNIT_SPELLINGS) {
      const upper = unit.toUpperCase();
      expect(parsePortionGrams(`2 ${upper}`), upper).toEqual(parsePortionGrams(`2 ${unit}`));
    }
  });
});
