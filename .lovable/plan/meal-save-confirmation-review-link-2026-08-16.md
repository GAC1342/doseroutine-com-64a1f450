# Meal Save Confirmation + Review Link

## Goal
After the user saves a meal, show a clear success confirmation with a quick way to review the logged entry later.

## What we'll change

1. **Richer success toast in `MealReviewSheet`**
   - Keep the existing `toast.success` call inside the `save()` function.
   - Expand the message to include the meal label and full macro breakdown.
   - Add a Sonner `action` labeled "Review" that navigates the user to the place they can see the saved meal again.

2. **Review destination**
   - Link to `/_authenticated/food` with the saved day preselected, because the Food page already lists meals for that day and lets the user edit them.
   - Use `Link` from `@tanstack/react-router` inside the toast action so it respects the app's routing.

3. **Accessibility / UX polish**
   - Set a reasonable `duration` so the toast stays on screen long enough to read and tap.
   - Ensure the toast text is plain and non-technical.
   - Keep the existing error toast unchanged.

## Files to edit
- `src/components/meal-review-sheet.tsx` — update the success toast after the Supabase insert/update succeeds.

## Out of scope
- No new pages or routes.
- No changes to the save logic itself.
- No database changes.

## Verification
- Type-check the project.
- Save a meal in the preview and confirm the toast shows the label, macros, and a working "Review" action that returns to the Food page for the same day.
