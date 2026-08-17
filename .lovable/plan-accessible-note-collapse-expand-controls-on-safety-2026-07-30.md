# Accessible NOTE collapse/expand controls on Safety

## What's there today
On `/safety`, low-severity NOTE cards (`WarningCard` and `UserNoteCard` in `src/routes/_authenticated/safety.tsx`) collapse behind a chevron button. Each button already has `aria-expanded` and an `aria-label`, but:

- The button has no `aria-controls`, so assistive tech can't tell which region it opens.
- The expandable body has no `id`, no `role="region"`, and no accessible name.
- The "Expand all notes" / "Collapse all notes" button carries no state semantics and announces nothing when pressed.
- Collapsed content is removed from the DOM with no announcement, so screen reader users get no confirmation that a toggle did anything.
- There is no keyboard shortcut to close an expanded card, and toggling from the "all" button can leave focus stranded.

## What we'll change

### ARIA wiring
- Give each card's expandable body a stable `id` (derived from the existing `cardKey` via `useId`), plus `role="region"` and `aria-labelledby` pointing at the card's pair title (e.g. "Omega-3 + Vitamin D").
- Add `aria-controls={bodyId}` to each chevron toggle so the relationship is explicit.
- Keep `aria-expanded` accurate and give the toggle a clearer accessible name that includes the pair: "Expand details for Omega-3 + Vitamin D".
- Mark the chevron icons `aria-hidden`.

### Keyboard navigation
- Pressing `Escape` while focus is inside an expanded NOTE card collapses it and returns focus to that card's toggle button.
- Keep the toggle a native `<button>` so Enter/Space work by default; ensure a visible `focus-visible` ring on both the toggle and the "all" button.
- Ensure the toggle stays in tab order in both states and never loses focus when the card re-renders after toggling.

### Bulk control
- Give the "Expand all notes" / "Collapse all notes" button `aria-expanded` reflecting the current bulk state and a stable accessible name.
- Add a polite `aria-live` status region on the Safety page announcing results such as "3 notes expanded" / "3 notes collapsed" after the bulk action.

## Testing
- Extend `src/routes/_authenticated/__tests__/safety-notes-collapse.test.tsx` with assertions for `aria-controls` matching the body `id`, `role="region"` with an accessible name, `aria-expanded` on both the per-card and bulk controls, and Escape-to-collapse with focus returning to the toggle.
- Add an axe pass over rendered NOTE cards in expanded and collapsed states, matching the existing pattern in `src/components/breadcrumbs.a11y.test.tsx`.
- Run the existing suite to confirm no regressions in expansion memory or filtering.

## Notes
No new dependencies. Behaviour, persistence of per-card expansion state, and the existing filter/search logic stay exactly as they are — this is an accessibility and keyboard-affordance pass only.
