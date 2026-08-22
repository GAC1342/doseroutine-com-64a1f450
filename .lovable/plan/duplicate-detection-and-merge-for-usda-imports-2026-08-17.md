# Duplicate detection and merge for USDA imports

Today an import only avoids duplicates when the exact same USDA record (same source + FDC id) is re-imported — that upserts in place. Anything else (a second USDA entry for "Chicken breast, raw", or a food already in the catalog from a barcode scan or manual entry) creates a second, redundant food. This adds detection before the import lands, and a merge action instead of a silent second row.

## What changes for you

1. **USDA search results flag likely duplicates.** Each result shows one of: "Already imported", "Possible duplicate of <existing food>", or nothing.
2. **Import asks before creating a redundant food.** When a close match already exists, clicking Import opens a small dialog with a side-by-side comparison (name, brand, calories/protein/carbs/fat per 100 g, source, times logged) and three choices:
   - **Merge into existing** — refresh the existing food with USDA's numbers and portions, add the USDA name as an alias, keep its id so logged meals and stats stay intact.
   - **Import as separate food** — proceed as today (for genuinely different foods, e.g. raw vs cooked).
   - **Cancel.**
3. **Catalog-wide duplicate review.** A new "Possible duplicates" panel on the food catalog admin page lists existing duplicate clusters found in the catalog (not just at import time) with a Merge button per pair.
4. **Bulk seeding respects it.** The "Seed common foods" run skips names that already match an existing food (it partly does) and reports how many were skipped as duplicates.
5. **Everything is undoable.** Merges are written to the change history and can be reverted in one click, like every other catalog change.

## How duplicates are detected

Scored candidate match, no schema change required:

- Exact `name_norm` equality, or an existing alias equal to the incoming `name_norm` (strong).
- Same GTIN/barcode (strong).
- Normalized-token overlap (Jaccard over words after dropping stop tokens like "raw", "cooked", "nfs", "upc") above a threshold, **and** macros within tolerance (kcal within 15%, each macro within 20% per 100 g) (probable).
- Same brand + high name overlap (probable).

Strong hits are auto-suggested as merges; probable hits are shown as "possible duplicate" and require an explicit choice. Nothing is merged without an admin click.

## Technical notes

- New `src/lib/food-dedupe.ts` (pure, unit-testable): `normalizeTokens`, `macrosClose`, `scoreDuplicate`, `classifyDuplicate` returning `"exact" | "strong" | "probable" | "none"` with a reason string.
- New server helpers in `src/lib/food-admin.server.ts`: `findDuplicateCandidates(admin, incoming)` (queries `foods` by name_norm, alias, gtin, and an ilike prefix on the leading token) and `mergeFoods(admin, { keepId, mergeId, applyNutrition })` which re-points `food_portions` and `food_aliases` to `keepId`, dedupes portion labels, inserts the losing name as an alias, optionally overwrites nutrition columns, then deletes the losing row.
- New server functions in `src/lib/food-admin.functions.ts` (all behind `assertAdmin`): `adminCheckUsdaDuplicate`, `adminMergeFoods`, `adminListDuplicateClusters`. `adminUsdaSearch` gains a `duplicateOf` field per result; `adminImportUsdaFood` gains an optional `force` flag and returns `{ status: "duplicate", candidates }` when a strong/probable match exists and `force` is not set.
- Audit: new action `food.merge` in `AuditAction`, storing the full snapshot (losing food + its portions and aliases + the winner's pre-merge row) in `before`. `revertAudit` gains a `food.merge` branch that restores the losing food and the winner's prior nutrition, and removes the alias added by the merge.
- UI in `src/routes/_authenticated/admin/food-catalog.tsx`: duplicate badge on USDA results, a merge dialog (shadcn `AlertDialog`/`Dialog` with a two-column comparison), and a "Possible duplicates" card.
- Tests: `src/lib/__tests__/food-dedupe.test.ts` covering exact/alias/gtin/token-overlap/macro-tolerance cases and negatives (raw vs cooked chicken must not merge; whole vs skim milk must not merge).

No styling or layout changes outside the new admin controls; no changes to the user-facing meal scanner behaviour beyond fewer redundant catalog entries.
