# High-precision portion quantities: rounding regression tests

Pin how the app handles portions typed with extra decimal places — "0.3333 kg", "1.2500 lb", "2.7500 oz" — so grams and the rescaled macros round the same way every time and never drift as the parser changes.

## Why this matters

Portions with four decimals come from converted recipes, scale readouts, and CSV imports. Two things can silently go wrong: the parser drops or mis-rounds the fractional part, or the macro rescale compounds rounding so calories/protein land a unit off. Neither shows an error — the numbers just quietly become wrong.

## What gets added

A new test file, `src/lib/__tests__/portion-high-precision.test.ts`, matching the style of the existing portion suites (plural units, mixed case, whitespace). No product code changes unless a test uncovers a real bug.

Coverage:

- **Gram parsing precision** — "0.3333 kg", "1.2500 lb", "2.7500 oz", "0.1250 l", "1.0625 kg" each parse to the expected gram value under the parser's documented one-decimal rounding.
- **Trailing-zero equivalence** — "1.2500 lb" equals "1.25 lb", "2.500 kg" equals "2.5 kg", including through the macro rescale, so padding never changes a result.
- **Rounding stability** — repeating decimals ("0.3333 kg", "0.6667 lb") and exact half-way values (values that land on x.x5 grams) always resolve to the same number on repeated calls, and stay consistent across the abbreviation, plural, and mixed-case spellings of the same unit.
- **Macro rescale consistency** — using the shared food fixtures, scale an item by the ratio derived from a high-precision portion and assert the scaled calories/protein/carbs/fat match a directly computed expectation; also assert totals equal the sum of rounded items (no double-rounding drift).
- **Idempotence** — parsing then re-formatting a high-precision portion and parsing again returns the same grams.
- **Guardrails** — malformed high-precision inputs ("0..3333 kg", "1.2500.5 lb", "-0.5 kg") still return null rather than a partial number.

## Technical notes

- Uses `parsePortionGrams` and `formatGrams` from `src/lib/portion-units.ts` (which rounds gram results to one decimal via `round1`), plus `scaleItems`, `totalsFor`, and `roundTotals` from `src/lib/meal-nutrition.ts`.
- Reuses `foodFixture` / `makeMealItem` from `src/test/fixtures/foods.ts` so the expectations stay tied to the shared fixture data.
- Expected values are computed from the unit constants (oz 28.3495 g, lb 453.592 g) rather than hardcoded magic numbers, so a unit-table correction shows up as one intentional change.
- If any case reveals an actual rounding defect, the fix goes in `portion-units.ts` / `meal-nutrition.ts` and is called out separately rather than the test being loosened to match the bug.
- Verified with `npx vitest run src/lib/__tests__/portion-high-precision.test.ts` plus the existing portion suites to confirm no regressions.
