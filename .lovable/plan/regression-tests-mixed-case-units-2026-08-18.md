# Regression tests: mixed-case units

Add a test file pinning case-insensitive unit recognition, so "2KG", "3oZ", "500 Grams", "1.5 KiloGrams" parse to the same grams — and produce the same macros — as their lowercase forms.

## What gets tested

1. Case folding — abbreviations and spelled-out units in upper, lower, and alternating case all resolve to one gram value, including no-space forms ("2KG", "3oZ") and compound weights ("1 LB 4 OZ").
2. Malformed input stays rejected regardless of case ("TWO KG", "-3 OZ", "KG 2").
3. Macro rescaling — a fixture food scaled from the mixed-case portion yields byte-identical totals to the lowercase portion, and scaling by servings on top of it stays consistent.

## Technical notes

- New file: `src/lib/__tests__/portion-mixed-case-units.test.ts`, following the shape of the just-added `portion-plural-units.test.ts`.
- Uses `parsePortionGrams` / `parseQuantity` / `isMalformedQuantity` from `src/lib/portion-units.ts`, with `makeMealItem` from `src/test/fixtures/foods.ts` and `scaleItems` / `totalsFor` / `roundTotals` from `src/lib/meal-nutrition.ts`.
- The parser lowercases its input up front, so these are expected to pass as guardrails. If any case combination fails, the fix would be a targeted change in `portion-units.ts`, reported before making it.
