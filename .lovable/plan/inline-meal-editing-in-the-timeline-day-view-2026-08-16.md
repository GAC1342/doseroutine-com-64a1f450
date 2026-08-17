# Inline meal editing in the Timeline day view

Today, changing a logged meal's numbers means leaving the timeline and reopening the full review sheet on the Food page. This adds a quick, in-place edit right on the day panel.

## What you'll get

- Each meal row in the day view's Food card gets a small pencil button.
- Tapping it expands that row into a compact inline editor with four number fields: calories, protein, carbs, fat.
- Save and Cancel buttons; saving writes the adjusted values, closes the editor, and immediately refreshes the day totals (and the macro totals shown elsewhere for that day).
- An "Open full editor" link stays available for anything deeper (photo rescan, item list, slot/label changes), which keeps the review sheet as the place for heavier edits.
- Rows stay readable on small screens: the editor stacks to a 2x2 grid on mobile, single row on wider screens.

## Behaviour details

- Fields prefill with the currently effective value (adjusted value if set, otherwise the AI/barcode estimate).
- Blank or invalid input is treated as 0; negative values are clamped to 0.
- While saving, the buttons disable and show a saving state; a failed save shows an error toast and keeps the editor open with your input intact.
- Editing only one row at a time; opening another row closes the current one.

## Technical notes

- Edit `src/components/day-food-workouts.tsx` only (plus a small mutation helper if it keeps the file tidy).
- Local state `editingId` plus a draft object; save issues `supabase.from("meals").update({ adj_calories, adj_protein_g, adj_carbs_g, adj_fat_g }).eq("id", row.id)` via a `useMutation`.
- On success invalidate `["day-food-workouts", day]` and the macro/food query keys used by the Timeline and Today macro cards so totals update without a reload.
- No schema changes, no styling-token changes; reuse existing Input/Button primitives and current text sizes.
