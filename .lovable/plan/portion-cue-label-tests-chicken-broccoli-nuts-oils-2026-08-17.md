# Portion cue label tests: chicken, broccoli, nuts, oils

## What exists today

`src/lib/__tests__/portion-cues.test.ts` already covers the pure cue function for all four foods: chicken maps to "deck of cards"/"palm", broccoli to "fist"/"cupped hand", almonds to "small handful", olive oil to "thumb tip", plus free-typed gram and ounce input.

What is **not** covered: the cue label actually rendered in the UI next to a selected food item. `src/components/food-portion-picker.tsx` computes the hint from `item.name` only, so nothing today asserts that the label a user sees matches the food they picked.

## What to add

A new component test `src/components/__tests__/portion-cue-labels.test.tsx` that renders the portion picker once per food and asserts the on-screen cue text:

- Chicken breast (~85 g) shows a deck-of-cards / palm cue and never a produce or thumb-tip cue.
- Broccoli (~180 g) shows a fist / cupped-hand cue and never a meat cue.
- Almonds (~30 g) shows a small-handful cue.
- Olive oil (~15 g) shows a thumb-tip cue.
- Switching the selected item from chicken to broccoli updates the visible label (guards against a stale cue when the matched food changes).
- Picking a preset chip and typing a free amount ("200 g") both keep the label tied to the same food.

Each assertion reads the rendered text, not the helper's return value, so a future wiring mistake in the picker fails the test.

## Technical notes

- Vitest + Testing Library, same setup as `src/components/__tests__/meal-review-portion-scaling.test.tsx`.
- Items are built from the `MealItem` shape in `src/lib/meal-nutrition.ts` (name, grams, per-100g macros).
- Test only asserts current behavior — the cue derived from the item's own name. No production code changes in this step.
