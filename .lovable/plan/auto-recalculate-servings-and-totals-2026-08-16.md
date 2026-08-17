# Auto-recalculate servings and totals

Today the meal review sheet only updates numbers when you tap **Recalculate**. Change it so the meal total and item list update the moment you change "Servings eaten" or type a corrected Nutrition Facts number.

## Behaviour

- Typing a corrected calorie/protein/carb/fat value sets the new per-serving basis, and the meal total immediately reflects that value multiplied by the current servings eaten.
- Changing "Servings eaten" (including decimals like 1.5) instantly rescales the meal total and every item in the list, with a short debounce so partial typing (e.g. "1." or empty) doesn't blow up the numbers.
- Invalid or empty servings input leaves the last valid numbers in place and shows a quiet inline hint instead of an error toast.
- The "Per serving: … currently showing …" helper line stays and updates live.
- The **Recalculate** button is removed; a small "Updates automatically" note replaces it. **Reset to items** keeps its current behaviour (clears overrides, servings back to 1).
- Portion buttons keep resetting servings to 1, as today.

## Technical notes

In `src/components/meal-review-sheet.tsx`:

- Treat `perServingBase` as the single source of truth: when the user edits a total field, store the typed value as the per-serving basis (divide out nothing — the panel is per serving), and derive the displayed override as `base × servings`.
- Replace the imperative `recalculateServings()` with an effect keyed on debounced servings + per-serving base that recomputes `override` and scales items from a stored `baseItems`-at-1-serving snapshot, so repeated changes never compound rounding.
- Keep `appliedServings` only for scaling the item list relative to its last applied factor, or drop it in favour of always scaling from the 1-serving snapshot (preferred, avoids drift).
- No toast on every keystroke; keep the success toast only on save.
- Run type-check, lint, and the existing test suite; update any test that asserted the Recalculate button.
