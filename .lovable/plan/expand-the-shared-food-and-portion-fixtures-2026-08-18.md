# Expand the shared food and portion fixtures

Goal: widen the shared test catalog so the existing regression suites automatically cover more real-world foods and more portion-chip shapes, without changing app behaviour.

## What gets added

New foods in the shared catalog (each with per-100 g macros, a cue class, a realistic serving, and household chips):

- Protein: ground beef 90/10, canned tuna, firm tofu, shrimp, rotisserie chicken thigh
- Grain/starch: baked potato, quinoa, black beans, whole-grain bread slice, oatmeal
- Vegetable/fruit: spinach (raw, very light per cup), baby carrots, apple, blueberries, avocado
- Nuts/fat/sauce/cheese: peanut butter, walnuts, butter, hummus, marinara, cottage cheese
- Packaged/barcode: protein bar, sweetened almond milk, whey shake, tortilla chips

Data sources spread across database, USDA, barcode, and AI so provenance paths get exercised.

## Portion chip coverage

Chips are extended on both new and existing foods to cover the formats real users tap and type:

- Fractional cups: `1/2 cup`, `1/3 cup`, `3/4 cup`
- Unicode fractions: `½ cup`, `¼ cup`
- Imperial weights: `4 oz`, `1 lb`, compound `1 lb 4 oz`
- Count-based: `1 slice`, `2 slices`, `1 medium`, `10 chips`
- Volume: `1 tbsp`, `1 tsp`, `250 ml`
- Very small (5 g butter) and very large (400 g bowl) amounts, to test cue suppression

## Why this improves coverage for free

The fixture self-tests already iterate every catalog key, so each new food is automatically checked for linear macro scaling, correct cue classification, and the expected visual cue at its default serving. Portion parsing, portion-scaling, perf, and review-sheet tests read from the same catalog, so they pick up the new combinations too.

## Technical notes

- Files touched: `src/test/fixtures/foods.ts` (catalog entries plus a small number of named combo meals such as "GLP-1 protein-first plate" and "packaged snack meal"), and `src/test/fixtures/__tests__/foods.test.ts` for chip-format assertions.
- Every new food's `cueClass` must match what `cueClassFor` in `src/lib/portion-units.ts` returns for its name; where a name would not match any pattern (e.g. a shake), the fixture declares `any` rather than changing app code.
- Chip labels will be round-tripped through `parsePortionGrams` in a new test so a chip that the parser cannot read never enters the catalog.
- No source files under `src/lib` or `src/components` change; this is test-fixture work only.
