# Universal Barcode Scanner — food, supplements, medications

One scan that routes to the right database, falls back to reading the label with the camera, and adds the result to either your food diary or your stack.

## What exists today

- Scanner (`src/lib/barcode-scanner.ts`) handles EAN-13/8, UPC-A/E, Code 128/39, QR — no DataMatrix, no GS1 parsing, single-read accept, no torch or viewfinder overlay.
- Two separate lookup paths that don't know about each other:
  - Food: Open Food Facts only, cached in the `foods` table by GTIN.
  - Supplements: NIH DSLD → Open Food Facts → USDA, sequential, no cache.
- No medication lookup at all, no unified result shape, no label-photo fallback, no `barcode_cache` table.

## What gets built

### 1. Scanner hardware layer
Add DataMatrix to the accepted formats, continuous scanning with a dimmed viewfinder overlay, torch toggle, "Type code manually" link, and a two-reads-in-a-row debounce before it locks in a code and fires a haptic tap. Normalize UPC-E to UPC-A and pad to EAN-13 while keeping the raw value. Parse GS1 Application Identifiers from DataMatrix/QR: GTIN (01), lot (10), expiry (17), serial (21).

### 2. One routing lookup, run in parallel
A single server function replaces both current lookup paths. Cache hit returns instantly; otherwise openFDA (medications), Open Food Facts (food), NIH DSLD (supplement facts panels) and a generic UPC lookup all fire at once with a 4-second cap each, and the winner is picked by priority. Typical result ~1 second instead of three sequential misses.

Medication detection: a UPC starting with 3 carries a 10-digit NDC in digits 2–11; we derive it, try the three standard 11-digit paddings, and query openFDA. Canadian products get a "type your DIN" input backed by Health Canada's drug product database, since DINs are frequently not barcoded.

Everything is mapped into one shape: code, category (food/supplement/medication/other), name, brand, image, source, confidence, serving, per-serving macros, ingredient rows with amount/unit/%DV, a medication block, and any GS1 lot/expiry.

### 3. Label-photo fallback
When no database knows the code, the sheet says "Not in our database yet — snap the facts panel" with a label-shaped framing guide. The vision model reads Nutrition Facts, Supplement Facts or Drug Facts into the same shape — every ingredient row with amount, unit and %DV, proprietary blends kept as one row with sub-ingredients, unreadable numbers returned as null rather than guessed. On save it's written to the cache keyed by that barcode, so nobody scans it blind again.

### 4. Category-aware review sheet
- Food: today's flow — serving stepper, macros, "Add to today".
- Supplement: product image, brand, name, serving stepper in label units (2 capsules) with 1 / ½ / custom, ingredient table with %DV bars, macros only when they exist. "Add to today" logs it; when an ingredient fuzzy-matches your compound library, a second "Add to my stack" button creates a dose entry at the label amount.
- Medication: generic + brand, strength, form, route, OTC/Rx badge, NDC, plus lot/expiry when the DataMatrix carried it. "Add to my stack / log dose" and "Check interactions" preloading the active ingredient. No calories, and the same "not medical advice" footer used by the interaction checker.
- Unknown: whatever we have, plus the snap-the-panel button.

### 5. Quality and growth loop
Edits to a barcode-sourced value are recorded as corrections; once three different users make the same correction, it's promoted into the cache. An admin view lists unresolved codes by scan count. Scan analytics record which source won and how long it took. Cache pre-warming from a CSV of the top US supplements and OTC meds is left as a follow-up until you supply the file.

## Caveats built into the UI

- DSLD is US-only and misses roughly a quarter of shelf products — the label-photo path is the safety net, not a nicety.
- Open Food Facts is crowd-sourced, so every food result carries a "Report wrong info" link.
- The free generic UPC tier allows 100 lookups/day; it's the last resort in the chain and the code is written so a paid key can be dropped in later.
- Medication scanning is informational logging only.

## Technical notes

- New table `barcode_cache` (code PK, payload jsonb, source, category, updated_at) with grants + RLS: authenticated read/insert, service role full. New table `barcode_corrections` (code, field, old, new, user_id) scoped to `auth.uid()`.
- New `src/lib/gs1.ts` (AI parsing) and `src/lib/ndc.ts` (UPC→NDC-10, 11-digit paddings, GTIN-14 stripping), both pure and unit-tested.
- New `src/lib/product-lookup.server.ts` rewrite: `Promise.allSettled` over openFDA / OFF / DSLD / UPC-generic, plus `lookup-barcode` exposed through `createServerFn`, not an edge function (this project is TanStack Start).
- `analyze-meal.server.ts` gains `mode: "label"` with a dedicated panel-reading system prompt via the Lovable AI Gateway.
- `barcode-scan-sheet.tsx` and `quick-add-meal-sheet.tsx` route through the new unified result; `quick-meal-review.tsx` gains supplement and medication renderers.
- Existing food-cache behaviour in `foods` is preserved so nothing already scanned regresses.
- Unit tests for NDC/GS1/normalization and the source-priority picker; existing barcode tests kept green.

## Suggested order

1. Normalization + scanner upgrade (GS1, DataMatrix, viewfinder, torch, debounce).
2. Unified routing lookup + `barcode_cache`.
3. Category-aware review sheet with stack/interaction actions.
4. Label-photo fallback.
5. Corrections, admin misses view, scan analytics.
