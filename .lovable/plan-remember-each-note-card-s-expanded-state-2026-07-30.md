# Remember each NOTE card's expanded state

Today the Safety page only remembers one thing: whether you last used "Expand all notes" or "Collapse all notes". Opening a single NOTE card is forgotten as soon as you leave the page — the per-card open/closed state lives in temporary component state.

This change makes the Safety page remember every NOTE card individually, so when you come back the exact same notes are still open.

## What changes

- Expanding or collapsing an individual NOTE card is saved per pair (e.g. Magnesium + Zinc), not just globally.
- Returning to Safety — after switching tabs, reloading, or reopening the app — restores exactly which notes were open and which were closed.
- "Expand all notes" / "Collapse all notes" still work and now set every card's saved state at once.
- Cards for pairs that are no longer in your stack stop being remembered, so the saved list doesn't grow forever.
- Filtering by severity or tag hides cards without forgetting their open/closed state; unhiding them brings back the same state.

## Technical notes

- `src/routes/_authenticated/safety.tsx`: replace the `useState<Set<string>>` for `expandedIds` with a persisted field in the existing `useTabViewState("/safety", …)` object — add `expandedNotes: string[]` alongside `severity`, `notesExpanded`, `query`, `tags`, `tagMode`.
- Keep the existing card key scheme (`rule-<aId>-<bId>` / `note-<noteId>`) as the identity for each remembered card.
- `notesExpanded` stays as the default for cards never toggled by hand, so the current behaviour (notes collapsed on first visit) is unchanged; `expandedNotes` records explicit per-card overrides. A card is open when it is in `expandedNotes`, closed otherwise.
- `expandAllNotes` sets `expandedNotes` to the current note keys plus `notesExpanded: true`; `collapseAllNotes` clears it and sets `notesExpanded: false`.
- Prune saved keys against the currently rendered note keys on load (bounded to the keys that exist in the stack) so the stored array stays small — `useTabViewState` already merges unknown fields safely across releases.
- Add unit coverage for the toggle/prune/expand-all helpers, pulling that logic into a small pure helper (e.g. `src/lib/note-expansion.ts`) so it can be tested without rendering the page.
