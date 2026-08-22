# Portion parsing: metric + imperial regression checks

Goal: make sure a typed portion is read the same way no matter how the number is written — "1.5 kg", "1,5 kg", "1 200 g", "3 oz", "1 lb 4 oz" — and lock that behaviour in with tests.

## What the current code does

`parsePortionGrams` in `src/lib/portion-units.ts` matches numbers with the pattern `\d+(\.\d+)?` only. Confirmed consequences today:

- `"1,5 kg"` (European decimal comma) reads the leading `1` and returns 1000 g instead of 1500 g.
- `"1,200 g"` (US thousands separator) reads `1` and returns 1 g instead of 1200 g.
- `"1 200 g"` / non-breaking-space grouping is read as 1 g.
- `"1 lb 4 oz"` returns only the pound part (the trailing ounces are dropped).

Everything else already checked out: `"150 g"`, `"3 oz"`, `"8oz"`, `"1 cup (158 g)"`, `"1 1/2 cups"`, `"½ cup"`, `"2 tbsp"`, mg/kg/ml/l all parse correctly.

## The fix

1. Add a small number-normalizer used by both `parseQuantity` and `parsePortionGrams`:
   - strip spaces/non-breaking spaces used as digit grouping (`1 200` → `1200`),
   - treat a comma as a thousands separator when it is followed by exactly three digits and more digits are not decimal-like (`1,200` → `1200`),
   - otherwise treat a comma as a decimal point (`1,5` → `1.5`),
   - leave fraction and unicode-fraction handling exactly as it is.
2. Support compound imperial weights: `"1 lb 4 oz"`, `"2 lb 3.5 oz"` sum both parts.
3. Keep the existing precedence rules unchanged: parenthesised grams still win, then a direct unit, then household measures.

No UI, styling, or scaling-behaviour changes — the review sheet keeps calling the same function.

## Regression tests

New `src/lib/__tests__/portion-parsing-formats.test.ts` covering, as a table of input → expected grams:

- Metric: `150 g`, `150g`, `0.5 kg`, `1,5 kg`, `1 200 g`, `1,200 g`, `250 ml`, `1 l`, `500 mg`.
- Imperial: `3 oz`, `8oz`, `3.5 oz`, `3,5 oz`, `1 lb`, `2 lbs`, `1 lb 4 oz`.
- Household: `1 cup`, `1.5 cups`, `1,5 cups`, `1 1/2 cups`, `½ cup`, `2 tbsp`, `1 tsp`, `2 fl oz`.
- Mixed labels: `1 cup (158 g)`, `1 cup (158,5 g)`, `2 slices (56 g)`.
- Non-measurable / bad input: `1 serving`, `a handful`, empty, null, `-5 g`, `abc g` all return null.
- Round-trip: parsed grams fed back through `formatGrams` and re-parsed give the same value.

Extend `src/components/__tests__/meal-review-portion-scaling.test.tsx` with two cases: typing `1,5 kg` and `1 lb 4 oz` into an item's portion field rescales that item's macros and the meal totals to the same result as the equivalent gram entry.

## Technical notes

- Files touched: `src/lib/portion-units.ts` (normalizer + compound imperial), one new test file, one extended test file.
- `bun run test:portion-scaling` picks up the new files after adding them to that script's glob, so the existing CI job (`.github/workflows/meal-portion-scaling.yml`) gates on them with no workflow change beyond the script list.
