# Regression tests: stray whitespace in portions

Pin that padded and loosely spaced portions ("  2  kg ", "\t3   oz\n") parse to the same grams and macros as the tidy form. Pasted label text and voice input routinely carry extra spaces, and a normalization slip there would either drop the unit or split the number, leaving macros stale with no visible error.

## What gets tested

1. Whitespace equivalence — leading, trailing, doubled, and tab/newline separators around amount and unit resolve to one gram value, for abbreviations, spelled-out units, and household units ("  1  cup ", " 2   TBSP ").
2. Multi-token portions survive padding — compound weights ("  1  lb   4  oz "), mixed fractions ("  1 1/2   kg "), and parenthesised gram overrides ("  2 cups   ( 240 g ) ").
3. Whitespace does not create false numbers — " 1 200 g" still reads as 1200 g (grouping), while genuinely ambiguous "2 3 kg" stays rejected, and malformed inputs stay rejected when padded (" -3  oz ", "  kg 2 ").
4. Macro rescaling — a fixture food scaled from a padded portion yields totals identical to the trimmed portion, and stays identical through a servings change.
5. Unicode spaces as a bonus case — non-breaking (U+00A0), narrow no-break (U+202F), and thin (U+2009) separators behave the same as a plain space.

## Technical notes

- New file: `src/lib/__tests__/portion-whitespace.test.ts`, matching the shape of `portion-plural-units.test.ts` and `portion-mixed-case-units.test.ts`.
- Exotic space characters written as `\u00a0` / `\u202f` / `\u2009` escapes so they stay visible in source.
- Uses `parsePortionGrams` / `parseQuantity` / `isMalformedQuantity` from `src/lib/portion-units.ts`, with `makeMealItem` from `src/test/fixtures/foods.ts` and `scaleItems` / `totalsFor` / `roundTotals` from `src/lib/meal-nutrition.ts`.
- The parser trims and collapses whitespace before unit lookup, so these are expected to pass as guardrails. Any failure gets a targeted fix in `portion-units.ts`, reported before making it.
