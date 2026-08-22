# Regression tests: plural unit inputs

Add a focused test file covering plural spelled-out units ("2 kilograms", "3 ounces", "2 pounds", "500 grams", "1.5 liters") so unit recognition and the macro rescale that depends on it can't silently regress.

## What gets tested

1. Unit recognition — each plural spelling parses to the same grams as its singular and abbreviated form ("3 ounces" = "3 ounce" = "3 oz"), including mixed casing, no-space variants, and decimal/comma amounts.
2. Malformed guard — plural units with a bad quantity ("two kilograms", "-2 ounces") are still rejected rather than silently parsed.
3. Macro rescaling — a fixture food's macros scaled from a plural-unit portion produce the same totals as the equivalent abbreviated portion, so a recognition miss shows up as a macro mismatch, not just a parse mismatch.

## Technical notes

- New file: `src/lib/__tests__/portion-plural-units.test.ts`, matching the style of the existing `portion-parsing-formats.test.ts`.
- Uses `parsePortionGrams` / `parseQuantity` / `isMalformedQuantity` from `src/lib/portion-units.ts`, plus `makeMeal` from `src/test/fixtures/foods.ts` and `scaleItems` / `totalsFor` / `roundTotals` from `src/lib/meal-nutrition.ts` for the rescale assertions.
- Tolerance for imperial conversions uses the same rounding helper the existing format tests use.
- No source changes planned. If a plural spelling turns out not to be recognized, the fix would be a small addition to the unit pattern in `portion-units.ts` — flagged before changing it.
