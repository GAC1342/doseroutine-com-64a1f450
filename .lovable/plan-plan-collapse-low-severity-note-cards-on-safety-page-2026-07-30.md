# Plan: Collapse low-severity NOTE cards on Safety page

## Goal
Reduce visual noise on `/safety` by collapsing blue "Note" interaction cards by default, since they are informational-only and currently take up as much room as Avoid/Caution warnings.

## Current state
- The Safety page renders one card per interaction, sorted Avoid → Caution → Note → Synergy.
- All cards are fully expanded: title, severity badge, recommendation/mechanism, source links.
- Users can filter to only "Note" via the severity chips, but the default "All" view shows every card expanded.

## Proposed change
1. **Default collapse for NOTE severity only**
   - In the unified card list, rows with `severity === "note"` render in a compact state by default.
   - The compact state shows: pair name, "Note" badge, and a one-line summary of the recommendation.
   - A "Show details" / chevron toggle expands the full mechanism and source links.

2. **Keep higher-severity cards expanded**
   - Avoid and Caution cards remain fully open on load so the user does not miss actionable warnings.
   - Synergy cards can also remain expanded (they are usually positive and less common), or we can collapse them alongside Note if you prefer.

3. **Remember the user's toggle state**
   - Use the existing `useTabViewState` hook for `/safety` to persist whether notes are expanded or collapsed.
   - This way a user who wants to scan all notes stays expanded after leaving and returning.

4. **Accessibility**
   - Toggle is a real button with `aria-expanded` and `aria-controls`.
   - Focus outline and tap target size preserved.

5. **Tests**
   - Add a component/unit test that verifies a NOTE card renders collapsed by default and expands on click.
   - Add a test that verifies Avoid/Caution cards are not collapsed.
   - Run the full test suite before pushing.

## Open question
Should Synergy cards also be collapsed by default, or only Note? They are also low-priority informational context.

## Files likely touched
- `src/routes/_authenticated/safety.tsx` — render logic for collapsed NOTE rows.
- `src/lib/tab-view-state.ts` — already in use; add the expanded/collapsed key.
- New test file under `src/routes/_authenticated/__tests__/safety-notes-collapse.test.tsx`.
