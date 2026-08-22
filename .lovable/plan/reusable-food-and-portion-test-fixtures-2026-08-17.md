# Reusable food and portion test fixtures

Meal tests currently each hand-roll their own food objects: `meal-review-portion-scaling.test.tsx` has an inline chicken/broccoli draft, `portion-cue-labels.test.tsx` has a local `makeItem`, `portion-perf.test.ts` builds its own 12-item meal, and `meal-scale-math.test.ts` declares a yogurt/granola pair. Adding a new food to regression coverage today means editing several files and re-typing macros.

## What gets built

A single fixtures module, `src/test/fixtures/foods.ts`, holding:

**A food catalog** — one entry per well-known test food, each with a stable id, display name, matched-source name, per-100g macros (kcal/protein/carbs/fat, plus fiber, sugar, sodium, sat fat where relevant), the data source it should behave as (database / usda / ai / barcode), household portion chips, and the portion cue class it must map to.

Starting set, chosen to cover every cue class: chicken breast, salmon, egg, broccoli, mixed salad, brown rice, pasta, banana, almonds, olive oil, ranch dressing, cheddar, Greek yogurt, granola.

**Builders on top of the catalog**

- `foodFixture(key)` — the raw catalog entry.
- `makeMealItem(key, { grams?, ...overrides })` — a `MealItem` with macros scaled to the requested grams, portion string and source fields filled in.
- `makeMealDraft({ label?, items, ... })` — a `MealDraft` with sensible defaults for confidence, note and source.
- `makeMeal(keys[])` and `makeLargeMeal(n)` — multi-item meals, the second for the performance budgets.
- `portionsFor(foodId)` / `portionChipMocks(keys[])` — the household chips a food should offer, shaped for the `useQuery` mock the component tests already use.
- `expectedCue(key)` — the cue class and the regex a rendered cue label must match, so cue assertions stay in one place.

**A shared component-test harness**, `src/test/fixtures/meal-harness.tsx`, exporting the repeated `vi.mock` blocks (react-query portions, react-start, food-db functions, sonner, supabase client, image downscale) as one helper so a new review-sheet test starts with a single call instead of forty lines of mocks.

## Migration

Rewrite the four existing meal/portion tests to source their data from the fixtures, keeping every current assertion and expected number identical. If a number shifts, the fixture is wrong and gets corrected — not the assertion.

## Technical notes

- Fixtures live under `src/test/` (next to the existing `src/test-setup.ts`) and are excluded from the app bundle by never being imported from `src/`.
- Macros are stored per 100 g and scaled by the builder, so any gram amount is exact and consistent across tests.
- Everything is typed against `MealItem` / `MealDraft`, so a schema change surfaces in the fixtures first.
- Small self-test file (`src/test/fixtures/__tests__/foods.test.ts`) asserts each catalog food scales correctly and maps to its declared cue class, so the fixtures themselves can't drift silently.
