# Show where meal numbers came from, and why

The review sheet already shows a confidence dot and a one-line source note. This turns that into a clear provenance panel so you can see at a glance whether the numbers are manufacturer-published, read off a label in your photo, or a visual guess — and what pushed the confidence up or down.

## What you'll see

A "Where these numbers came from" block at the top of the review sheet, replacing the current single-line note:

- **Source chain** — three small chips in order of reliability: Barcode panel, Label in photo, Visual estimate. The one actually used is highlighted; the others are dimmed with a short reason (e.g. "No barcode detected").
- **Source detail line** — for barcode scans, the product code and that the data is the manufacturer's published panel; for label reads, that the Nutrition Facts panel in the photo was transcribed; for visual, that portions were estimated.
- **Confidence breakdown** — the high/medium/low badge plus the specific factors behind it, listed as short bullets:
  - the read source (published panel / transcribed label / visual estimate)
  - the calorie-vs-macro cross-check: "Calories 420 vs 405 kcal from macros — within 4%" (pass) or the mismatch warning already produced today, marked as the reason confidence was downgraded
  - any model note that isn't already covered
- **Manual edits marker** — once you change a number by hand, the panel notes that the totals now include your own edits, so provenance doesn't overstate accuracy.

Manual entries (no scan) show a simple "Entered by hand" state instead of the chips.

## Behaviour details

- Rescanning a photo refreshes the whole panel, including the chips and the cross-check line.
- Editing a saved meal shows the provenance recorded at scan time, since that's how the numbers were produced.
- Nothing about saving, macro math, or layout elsewhere changes; the panel keeps the existing card styling and token colors.

## Technical notes

- `src/lib/meal-nutrition.ts`: have `reconcileEstimate` return a structured `reconciliation` field (`{ stated, implied, driftPct, status: "ok" | "mismatch" | "not_applicable" }`) alongside the existing note, and add a `provenanceFactors(estimate)` helper that builds the bullet list. Keep the existing note string for backward compatibility.
- New `src/components/meal-provenance.tsx` renders the chips, detail line, and breakdown from `{ source, readFrom, confidence, barcode, reconciliation, note, edited }`.
- `src/components/meal-review-sheet.tsx` swaps its current confidence block for `<MealProvenance />`, tracks an `edited` flag when any macro/item input changes, and passes `barcode` and the reconciliation data through from the scan result.
- `src/routes/_authenticated/food.tsx` already carries `barcode` and `readFrom` into the draft; pass the stored values when opening a saved meal for edit.
- Extend `src/lib/__tests__/meal-scan-reconcile.test.ts` to cover the new structured reconciliation output and `provenanceFactors` for barcode, label, and visual cases.
