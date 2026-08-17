# Show how recalculation scales the numbers

Make the servings maths visible in the meal review sheet, so it is obvious how the per-serving Nutrition Facts become the logged meal total and the item quantities.

## What you'll see

Under "Servings eaten", the existing one-line "Per serving: ..." note is replaced by an expandable **How this was calculated** breakdown:

- A small table with a row per macro: per-serving value x servings = total, e.g. `Calories  240  x 2  = 480 kcal`.
- A line stating the rule in words: "Every number below the panel is the per-serving value multiplied by the servings you ate."
- An **Items scaled** section listing each item with its one-serving quantity and the scaled quantity actually being logged (e.g. `Greek yogurt  170 g -> 340 g`), collapsed by default when there are more than three items.
- A note when the numbers came from a hand-typed override rather than the scan, so you know which basis was used.
- Rounding note when a scaled value was rounded, so the totals row and the item rows never look contradictory.

The breakdown only appears once a per-serving basis exists (i.e. after a scan/override), collapses by default on small screens, and does not change any saved values — it is display only. The Undo control added previously stays where it is.

## Technical notes

Work stays in `src/components/meal-review-sheet.tsx`, presentation only:

- Derive a `scaleBreakdown` memo from the existing `perServingBase`, `appliedServings`, `servingsBase.current` items, and `items`, producing macro rows and item rows (one-serving qty vs current qty).
- Render inside the existing servings card using the project's `Collapsible` + `Button` primitives and existing tokens; no new colors or components.
- Keep the summary line visible when collapsed so nothing is lost for users who don't expand.
- Add unit coverage for the breakdown derivation helper (extracted as a pure function in `src/lib/meal-nutrition.ts`) in `src/lib/__tests__/meal-scan-reconcile.test.ts`.
