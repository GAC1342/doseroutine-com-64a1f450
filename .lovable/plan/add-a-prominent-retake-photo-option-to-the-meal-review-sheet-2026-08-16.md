# Add a prominent "Retake photo" option to the meal review sheet

## Goal
Make it easy to re-capture or re-select the meal photo directly from the review sheet before saving, so the user can fix a bad photo without hunting inside the "Scan again" collapsible section.

## What will change
1. **Prominent retake trigger near the photo thumbnail**
   - In `src/components/meal-review-sheet.tsx`, add a visible "Retake photo" button (camera icon + text) next to/over the existing meal thumbnail in the summary card.
   - The button reuses the existing hidden file input (`rescanRef`) with `capture="environment"` so it opens the camera on mobile and the file picker on desktop.

2. **Replace-and-rescan behavior**
   - When a new photo is chosen, replace `newPhoto` with the downscaled data URL.
   - Run a fresh scan in `both` mode (barcode + photo OCR) against the new image.
   - Update estimate items, totals, confidence, source, readFrom, and barcode state from the new scan result, just like the existing rescan flow.

3. **Keep existing rescan options intact**
   - Leave the "Numbers look wrong? Scan again" details section as-is for fine-grained control (photo-only, barcode-only, both).

4. **Accessibility**
   - Use a real `<button>` with an accessible label.
   - Disable the retake button while a scan or save is in progress.

## Files to edit
- `src/components/meal-review-sheet.tsx`

## Verification
- Type-check and lint pass.
- Existing tests pass.
- Manual check: opening the review sheet shows the "Retake photo" control and selecting a new image updates the photo and macro totals.
