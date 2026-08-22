# Getting more out of the USDA key

Short answer: yes. Today the key is used for two things only — a name search during scan grounding, and one-off imports on the admin food screen. It pulls four numbers per food (calories, protein, carbs, fat) and throws the rest away. There is more in the same free API that would directly improve scan accuracy.

## What we're leaving on the table today

Verified in `src/lib/usda.server.ts` and `src/lib/food-db.server.ts`:

- USDA returns a `foodPortions` list per food ("1 cup, chopped = 91 g", "1 medium breast = 174 g"). We read only the first gram weight into `default_portion_g` and discard the rest — so most catalog foods show no household chips in the review sheet, and the size cue falls back to a generic hand/object.
- We request only 4 nutrients. USDA also carries fiber, sugars, sodium and saturated fat for the same food, at no extra call.
- We restrict the search to Foundation / SR Legacy / Survey. USDA's Branded set includes GTIN/UPC barcodes, which is a free second source when Open Food Facts has no match for a scanned barcode.
- Every USDA hit is a live call on the scan path. Common foods (chicken breast, rice, egg, banana) are re-fetched per new user instead of already being in our catalog.

## Proposed work, in order of payoff

1. **Import USDA household portions.** On any USDA import or first grounding hit, fetch the food's detail record and write its portion rows into `food_portions` (label, grams, sort order), capped to a handful of sensible ones. Effect: real chips like "1 cup chopped (91 g)" in the review sheet, and food-accurate size cues instead of generic ones.
2. **Capture fiber, sugar, sodium, saturated fat.** Add the columns to `foods`, pull the extra nutrient ids, and surface them in the review sheet's nutrition detail and in daily totals. Existing rows keep working (null = unknown).
3. **Barcode fallback to USDA Branded.** When Open Food Facts returns nothing for a scanned barcode, query USDA Branded by GTIN before falling back to a visual AI estimate.
4. **Pre-seed the catalog with common foods.** A one-time admin action that imports the ~300 most-logged everyday foods with their portions, so the majority of scans resolve locally: faster, more consistent, and independent of the API being up.
5. **Plausibility guard on AI estimates.** When the scanner has no catalog or USDA match, compare its per-100 g calories against the nearest USDA food of the same class and flag the item in the review sheet when it is wildly off, rather than saving a silent bad number.

Items 1–3 are the accuracy wins; 4 is speed and resilience; 5 is a safety net. They are independent, so we can do any subset.

## Technical notes

- Files: `src/lib/usda.server.ts` (detail fetch, extra nutrient ids, branded/GTIN search), `src/lib/food-db.server.ts` (persist portions and new columns), `src/lib/food-resolver.server.ts` (barcode fallback, plausibility check), `src/components/food-portion-picker.tsx` and `src/components/meal-review-sheet.tsx` (show the new fields), `src/routes/_authenticated/admin/food-catalog.tsx` (seed action).
- One migration: nullable `fiber_100g`, `sugar_100g`, `sodium_100mg`, `satfat_100g` on `foods`, with GRANTs unchanged since the table already has them.
- USDA's free key allows 1,000 requests/hour per key. Detail fetches only happen on first sight of a food, and everything is cached in our own `foods` table, so normal traffic stays far below that; the seed job needs simple rate limiting.
- Every USDA path stays fail-soft: on error or missing key we degrade to what we do today, never block a scan.
