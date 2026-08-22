# Performance budget tests for portion parsing and recalculation

Add a benchmark-style test that fails when the hot portion-scaling path gets slow, so a future refactor that adds an expensive lookup or regex is caught in CI rather than felt as UI lag when a user drags servings.

## What gets measured

The functions that run on every keystroke and every servings change:

- `parsePortionGrams` and `parseQuantity` (`src/lib/portion-units.ts`) — free-typed amounts like "200 g", "1 lb 4 oz", "1,5 kg".
- `visualHintFor` / `cueClassFor` — the cue label recomputed alongside each parse.
- `rescaleItemToGrams` (`src/components/food-portion-picker.tsx`) — per-item macro rescale.
- `scaleItems` + `totalsFor` + `roundTotals` (`src/lib/meal-nutrition.ts`) — the whole-meal recalculation.

## Budgets

Measured as average time per call over a warmed loop, on a realistic 12-item meal:

- Single parse + cue: under 0.05 ms per call (10,000 iterations).
- Single item rescale: under 0.02 ms per call.
- Full meal recalculation (scale 12 items + totals + rounding): under 1 ms per call.
- A rapid-slider burst (60 consecutive full recalcs, one per frame) under 30 ms total.

Budgets are set roughly 5-10x above measured local timings so they flag real regressions rather than normal machine noise.

## Making it stable in CI

- Warm-up pass before timing, so first-call JIT cost is excluded.
- Timing uses `performance.now()` around a loop; the assertion is on the average, never a single call.
- Best-of-3 runs: the test retries the loop up to three times and asserts against the fastest average, which absorbs a one-off scheduler stall on a noisy runner.
- Budgets can be relaxed on slow runners through an optional `PERF_BUDGET_MULTIPLIER` env var (defaults to 1), so the same file works locally and in CI without editing thresholds.
- Failure messages print the measured average and the budget, so the output says how far over it went.

## Files

- New: `src/lib/__tests__/portion-perf.test.ts` — all budgets plus a small `measure()` helper.
- No production code changes.
