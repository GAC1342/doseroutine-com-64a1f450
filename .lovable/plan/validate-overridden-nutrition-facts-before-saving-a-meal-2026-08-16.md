# Validate overridden Nutrition Facts before saving a meal

## Goal
Warn the user and block save when overridden Nutrition Facts values are inconsistent or impossible (negative numbers, extreme values, calorie/macro mismatch), while keeping the current auto-recalculation behavior intact.

## What will change

### 1. Validation rules for overrides
Add a small validator in `src/lib/meal-nutrition.ts` that checks a `MealTotals` object and returns a list of issues:
- Any macro < 0 (currently clamped silently to 0 — we will surface a warning instead).
- Calories > 0 but protein + carbs + fat all 0 (unlikely pure-alcohol edge case; flag as a warning, not a blocker).
- Atwater mismatch: calories differ by more than ±30% from `protein×4 + carbs×4 + fat×9` when all macros are present. Treat as a warning the user can still save after confirming.
- Any single value above a generous ceiling (e.g., 10,000 kcal or 2,000 g of a macro) treated as a hard error.

### 2. Inline warnings in the review sheet
In `src/components/meal-review-sheet.tsx`:
- Replace the silent `Math.max(0, …)` clamp in `updateTotal` with parsed value preservation, then run validation.
- Show a red/amber inline message under the "Meal total" grid when a hard error or warning exists.
- Highlight the offending input with a ring/border color.
- Keep the existing auto-recalculation for servings, but re-validate after every recalc.

### 3. Item-level validation
Apply the same rules to each item row, because item edits also feed the final totals. Show a compact warning icon + tooltip on rows with problems.

### 4. Save gating
- Disable the **Save meal** button while any hard error exists.
- If only warnings exist, keep the button enabled but show a confirm toast/dialog on first save attempt explaining the mismatch, with a "Save anyway" option.
- Reset the confirmation requirement if the user changes the values again.

### 5. Tests
Add component tests in `src/components/__tests__/meal-review-sheet.test.tsx` (or the existing equivalent) covering:
- Negative override value shows an error and disables save.
- Atwater mismatch shows a warning but allows save after confirming.
- Item-level negative macro is flagged.

## Out of scope
- Changing the auto-recalculation math.
- Changing the scan/OCR flow.
- Server-side validation (the save payload already comes from client state; we will keep client-side gating).

## Verification
- Type-check and lint pass.
- New and existing meal-review tests pass.
- Manual smoke test: enter a negative override → error appears, save disabled; enter a calorie/macro mismatch → warning appears, save allowed after confirm.
