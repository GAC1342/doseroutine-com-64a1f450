# Full unicode fraction support in portion parsing

## What's already there

`src/lib/portion-units.ts` already maps 18 vulgar fractions (½ ⅓ ⅔ ¼ ¾ ⅕ ⅖ ⅗ ⅘ ⅙ ⅚ ⅐ ⅛ ⅜ ⅝ ⅞ ⅑ ⅒) to decimals, and `src/lib/__tests__/portion-unicode-fractions.test.ts` covers a handful of them (⅛, ⅔ appear; ⅕ and the rarer sevenths/ninths/tenths do not).

The gap is that two later matchers still hardcode a short fraction set — the household-measure regex and the unit-word strip both use the character class `[\d\s./½¼¾⅓⅔]`, so any fraction outside those five can fall out of those paths. Plus the fraction slash form (`1⁄5`) and the "no space before unit" form (`⅕cup`) are untested for the rarer glyphs.

## Changes

1. **Single source of truth for fraction characters** — replace the two hardcoded `[\d\s./½¼¾⅓⅔]` classes with a class built from the existing `FRACTION_CHARS` constant, so every fraction in the map works in every matcher. Add `↉` (0/3) to the map for completeness.
2. **Verify normalization order** — confirm the malformed-quantity guard and `normalizePortionInput` run before these matchers so exotic glyphs are never rejected as malformed.
3. **Tests** — extend `portion-unicode-fractions.test.ts` (or add a companion spec) to assert, for **all** supported glyphs:
   - `normalizeUnicodeFractions` produces the expected 4-decimal value (⅛ → 0.125, ⅕ → 0.2, ⅐ → 0.1429, ⅒ → 0.1)
   - mixed forms ("2⅕ cups", "1 ⅛ lb") add whole + fraction
   - grams rescaling matches the decimal equivalent (`"⅕ cup"` grams equal `"0.2 cup"` grams) for weight and household units
   - fraction-slash input (`1⁄5 cup`) and no-space input (`⅕cup`) parse identically
   - macro rescaling by servings stays consistent between glyph and decimal input

## Verification

Run the portion test suites (`portion-unicode-fractions`, `portion-normalization-roundtrip`, `portion-fuzz-property`, `portion-cues`) plus typecheck. No UI, styling, or schema changes.
