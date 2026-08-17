# Safety Page Search Box

## Goal
Add a search input to the Safety page so users can quickly find specific NOTE (and other severity) interaction cards among a long list.

## What will change

### 1. Search input UI
- Add a search field between the page header and the `SeverityFilter`.
- Use an `Input` with an inline search icon and a clear (×) button that appears when the query is non-empty.
- Placeholder: "Search interactions, compounds, or notes…"
- The input is a standard text field; no submit button required (live filtering).

### 2. Filtering behavior
- Filter the existing `visibleCards` list by the current search query.
- Match against:
  - Both compound names (`a.name`, `b.name`)
  - Rule recommendation and mechanism text
  - User note text
- Matching is case-insensitive and trims whitespace.
- The search works together with the existing severity filter: the list is first filtered by severity, then by search query.
- When the query is empty, the full severity-filtered list is shown (current behavior).

### 3. Persistence
- Store `query` in the existing `useTabViewState("/safety")` shape alongside `severity` and `notesExpanded`.
- Returning to the Safety page restores the last search query.

### 4. Empty states
- If a search query yields no matches, show a friendly empty message like:
  "No interactions match ‘omega’. Try a different term or clear the filter."
- Existing severity-only empty state is preserved when no severity matches exist.

### 5. Tests
- Add a new regression test file `src/routes/_authenticated/__tests__/safety-search.test.tsx` covering:
  - Searching by compound name filters the list.
  - Searching by note/recommendation text filters the list.
  - Clearing the search restores all visible cards.
  - Searching with no matches shows the empty message.

## Technical notes
- Keep changes inside `src/routes/_authenticated/safety.tsx` and the new test file.
- Reuse existing `Input` from `@/components/ui/input` if available; otherwise create a minimal styled input.
- The search state is local and does not require backend changes.
