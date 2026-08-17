# Undo the last recalculation

Add a one-step undo in the meal review sheet so you can revert the numbers back to how they were right before the last automatic servings recalculation.

## What you'll see

- When a recalculation runs (you change "Servings eaten" and the totals/items rescale), a small line appears under the servings field: "Scaled to 2 servings" with an **Undo** button.
- Clicking **Undo** restores the previous totals, item quantities, servings value, and validation state exactly as they were before that recalculation.
- The undo entry clears once you make a new edit (hand-typing a total, editing an item, changing portion, rescanning, resetting, or reopening the sheet), so it never restores stale numbers.
- Only the most recent recalculation can be undone (single step), which matches the request and keeps the UI simple.

## Technical notes

All changes are in `src/components/meal-review-sheet.tsx`:

- Add a `lastRecalc` state holding a snapshot: `{ items, override, overrideRaw, servings, appliedServings, perServingBase, servingsBase }`.
- In the debounced servings `useEffect` (currently lines ~265-301), capture the pre-change values into `lastRecalc` before applying the scaled results.
- Add `undoRecalc()` that restores every field from the snapshot (including `servingsBase.current`), clears `warningConfirmed`, and then clears `lastRecalc`.
- Guard against the restore re-triggering the effect by restoring `servings` and `appliedServings` together (the effect early-returns when `parsed === appliedServings`).
- Clear `lastRecalc` in `applyPortion`, `updateItem`, `updateTotal`, `resetToItems`, the rescan handler, and the open/draft reset effect.
- Render the undo row next to the servings input (~line 886) using existing button styling; no new components or tokens.
- Extend the existing meal tests with a case asserting the snapshot restore logic returns the prior totals.
