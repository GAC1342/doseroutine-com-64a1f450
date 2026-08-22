# Meal scan accuracy engine

Goal: move photo-based meal logging from "one AI guess" to a grounded, self-improving system.

## What gets built

### 1. Proprietary food database
A `foods` table in our backend that becomes the single source of truth the scanner resolves against. Every food carries per-100g macros, common household portions, aliases for matching, a source label (USDA / Open Food Facts / curated / user-verified), and a quality score. Seeded with a curated core set of the most-logged foods (chicken breast, rice, eggs, oats, etc.) so accuracy improves immediately, then grown automatically from USDA lookups and verified user corrections.

### 2. USDA FoodData Central integration
Search + detail lookups against USDA (Foundation, SR Legacy, Survey/FNDDS branches — the ones with real lab-measured macros). Results are cached into our own `foods` table on first use, so repeat lookups are instant and offline-safe. Resolution order per detected item:
Open Food Facts barcode → our verified food → USDA match → AI estimate (lowest confidence).

### 3. Meal recognition, grounded
Rather than trusting the model's numbers, the vision step is narrowed to *identification*: what foods, what visible portion, how confident. Those names are then matched against the food database, and macros come from the database, not the model. Fuzzy matching with aliases and a confidence threshold decides whether we use a match or fall back to the AI estimate. Each item shows the user where its numbers came from.

### 4. Portion-size reference system
A portions table of household measures per food (1 cup cooked rice = 158g, 1 medium egg = 50g, palm of chicken = 100g, etc.) plus visual reference hints (deck of cards, fist, golf ball). The review sheet gets a portion picker so users adjust "1 cup" instead of guessing grams, and the vision step is prompted to report portions in these same reference units.

### 5. Correction feedback loop
Every user edit in the review sheet is recorded as a correction: what the AI said vs. what the user saved. That data is used three ways — corrected foods get promoted into the food database as user-verified entries, repeated corrections for the same food adjust its default portion, and an admin view surfaces the worst-performing items so we can fix them at the source. Corrections from the same user also pre-fill next time they scan that food.

## Technical notes

- New tables: `foods`, `food_portions`, `food_aliases`, `meal_scan_corrections`, with RLS (public read on the food catalog, per-user rows for corrections) and GRANTs.
- New server functions in `src/lib/food-db.functions.ts` and `usda.server.ts`; `meal-scan.server.ts` is refactored so the vision call returns identification only and a new resolver assembles the macros.
- USDA FoodData Central needs a free API key (api.data.gov) stored as a backend secret — I'll request it when we get there.
- Atwater 4-4-9 validation stays and now also flags database/AI disagreement.
- No styling or layout rewrites; the review sheet gains a source badge and a portion picker in the existing design.
- Tests: resolver unit tests (barcode > verified > USDA > AI), portion conversion math, and a correction-writes-back integration test.

## Sequence
1. Schema + curated seed data
2. USDA client + cache-into-our-DB
3. Resolver + refactored scan pipeline
4. Portion picker in review sheet
5. Correction capture, promotion, and admin quality view
