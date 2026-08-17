# Scan a bottle → auto-fill the label directions

Short answer: yes, and most of it already exists. The app already has a working camera
barcode scanner at the Scan tab (native camera on iOS/Android, browser fallback on the
web). What it does today is decode the barcode, then make you type the ingredient name to
match a compound. It does not look the product up, and it does not fill in dose or
directions.

This adds the missing half: scan the bottle, get the manufacturer's own label back
(brand, product name, amount per capsule, serving size, and the "Suggested Use"
directions), pre-filled into the add-to-stack form — and every field stays editable
before you save.

## Where the data comes from

- **NIH Dietary Supplement Label Database (DSLD)** — the US government's database of
  actual supplement labels. Free, no API key. Verified working: it returns brand,
  product name, amount per softgel/capsule, servings per day, and the label's
  "Suggested/Recommended/Usage/Directions" text.
- **Open Food Facts** — community product database, used as a second lookup when DSLD
  has no match (better coverage for non-US and food-style products).
- If neither has the barcode, the flow falls back to what happens today: search by name,
  or add manually. Nothing regresses.

Coverage caveat worth being upfront about: barcode-to-product matching is not universal.
Big US retail supplement brands hit often; small peptide vendors, research chemicals and
compounded medications essentially never will. Prescription medications are out of scope
here — they get no supplement label. The flow is built so a miss costs one tap, not a
dead end.

## What the user sees

1. On the **Your stack** page, an "Add by scanning" button next to the existing add
   control (mobile-first; it opens the camera directly in the installed app).
2. Point at the barcode. The decoded code appears for confirmation exactly as it does
   today.
3. A **product card** appears: brand, product name, and a plain summary — "1,200 mg fish
   oil per soft gel · label says take 1 soft gel daily".
4. Below it, the label's own directions quoted verbatim, with a small "from the
   manufacturer's label" note and a link to the source record.
5. "Use these details" pre-fills the add-to-stack form: matched compound, dose per
   capsule, unit, capsules per day, daily total, and time of day inferred from the
   directions when it says something like "with breakfast" or "before bed".
6. Everything is editable in the form before saving, and a "Start blank instead" link
   ignores the label entirely.

The existing capsule quick-set and paste-label reader stay as they are — this is a third
way into the same fields.

## Safety and honesty rules

- Label directions are shown as the manufacturer's text, never as DoseRoutine's advice,
  and never as a medical recommendation.
- Nothing is saved automatically. A scan only pre-fills a form.
- If the parsed amount fails the existing dose validation (zero, absurd, unparseable),
  the numbers are left blank and the directions are still shown as text.

## Technical notes

- New `src/lib/product-lookup.server.ts`: `lookupBarcode(code)` queries DSLD
  (`api.ods.od.nih.gov/dsld/v9/search-filter` by UPC, then `/label/{id}` for the record),
  falls back to Open Food Facts, and normalises both into one
  `ProductLabel { barcode, brand, name, servingSize, servingsPerDay, ingredients[],
  directions, sourceName, sourceUrl }`. Runs server-side so the external calls are
  proxied, cached and never expose the user's IP to third parties.
- New `src/lib/product-lookup.functions.ts`: `lookupProductByBarcode` server function
  (thin wrapper — declaration only) with Zod validation on the barcode, a 10-second
  timeout, and a graceful `{ found: false }` result on any upstream failure.
- Cache lookups in a new `product_labels` table keyed by barcode (schema + GRANTs +
  RLS: public `SELECT` to `authenticated`, writes only from the server function) so a
  repeat scan is instant and the external APIs are hit once per product.
- New `src/lib/label-directions.ts`: turns DSLD `servingSizes`, `ingredientRows` and the
  directions statement into `{ strengthPerUnit, unit, countPerDay, timeHint }`, reusing
  the unit conversion already in `src/lib/label-parse.ts` and validating through
  `validateCapsuleInput`.
- `src/routes/_authenticated/scan.tsx`: after the code is confirmed, call the lookup,
  render the product card, and pass the parsed values to the stack add flow via search
  params instead of only the raw code.
- `src/routes/_authenticated/stack.tsx`: read those prefill params, populate compound /
  dose / unit / count / time, and show a dismissible "pre-filled from the label" banner.
- Add an "Add by scanning" entry point on the stack page, shown when the scanner is
  supported on the device.
- Tests: unit tests for DSLD and Open Food Facts response normalisation (recorded
  fixtures, no live network in CI), directions parsing including "take 2 softgels twice
  daily", the no-match path, and a component test that a prefilled stack form is fully
  editable and saves the edited values rather than the label values.
