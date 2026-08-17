# Search analytics: autocomplete, suggestions, and filter chips

Goal: see which typed terms and filters actually lead to useful searches (a suggestion opened, or results found), using the analytics you already collect — no new tracking vendor.

## What gets tracked

On the compound Library search (`/library`):

1. **Search committed** — when a user presses Enter or leaves the box with a query. Records the term, how many results matched, and whether the search was a dead end (zero results).
2. **Suggestion shown** — once per settled query while the dropdown is open: the term and how many suggestions appeared.
3. **Suggestion selected** — which suggestion was opened, its position in the list, whether it matched by name or by alias, and the term typed at the time. This is the strongest "useful search" signal.
4. **Filter chip used** — category chips, goal chips (on/off), "All goals", and the sort toggle. Records which chip, whether it was turned on or off, and the resulting result count.
5. **Zero-result clear** — when someone taps "Clear filters" from the empty state.

Same treatment for the blog list filters (search, tag chips, sort, page size) so both search surfaces report consistently.

Events are fire-and-forget, never block typing, and are skipped for bot traffic (existing behaviour of the tracker).

## Where you'll see it

A new **Search insights** card on the admin analytics page with a 7/30/90-day window:

- Top search terms by volume, with the share that ended in a suggestion being opened.
- Top zero-result terms (content gaps worth a new library entry or guide).
- Most-used filter chips, and which chips co-occur with successful searches.
- Suggestion click-through rate and average selected position.

## Technical notes

- Reuse `trackEvent` from `src/lib/analytics.ts`; no schema change — events land in `analytics_events` with structured `properties`.
- Event names: `search_committed`, `search_suggest_shown`, `search_suggest_selected`, `search_filter_chip`, `search_cleared`, each with a `surface` property (`library` | `blog`).
- Terms are lowercased and trimmed, capped at 80 chars; nothing user-identifying beyond the existing session id.
- Debounce `search_suggest_shown` (~400 ms after typing settles) so a single word doesn't emit one event per keystroke.
- Instrumentation points in `src/routes/library.index.tsx`: `openSuggestion`, `handleSearchKeyDown` Enter branch and input blur commit, `setCat`, `toggleGoal`, `clearGoals`, `setSort`, and the empty-state clear button. Blog equivalents in `src/routes/blog.index.tsx`.
- New `src/lib/search-analytics.ts` wrapper holding event names and payload shaping, with unit tests for normalisation and the debounce guard.
- New `src/lib/search-insights.functions.ts` server function (admin-gated like the existing funnel/traffic functions) aggregating events by window; rendered in a new section of `src/routes/_authenticated/admin/analytics.tsx`.
