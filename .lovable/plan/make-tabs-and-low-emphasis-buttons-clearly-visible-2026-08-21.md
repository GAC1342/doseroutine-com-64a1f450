# Make tabs and low-emphasis buttons clearly visible

## The problem

The tab strips (Stack / Training / Meals on the calendar, and the same pattern elsewhere) sit on a track color that is almost the same as the page: the page background is 99.2% lightness and the track is 96.6% — about a 2% difference. The selected tab is then painted in the page background color with a faint shadow, so nothing reads as a control. Ghost and outline buttons have the same issue: their hover/idle surfaces are near-invisible on the new lighter background.

## What will change

1. **A single shared segmented-control look**
   - One reusable "segmented tabs" component with a clearly visible track (a defined surface plus a border), and a selected tab that is unmistakable: white/card surface, real border, stronger shadow, semibold text, and a primary-colored accent (text + thin underline/left tint) so the active tab reads at a glance and is not signalled by color alone.
   - Inactive tabs get proper foreground contrast (not the faintest muted gray) and a visible hover/pressed state.
   - Count badges become real badges (rounded pill with its own background) instead of tiny gray digits.
   - Full keyboard focus ring on every tab, 44px minimum tap height on mobile.

2. **Token fixes**
   - Add distinct surface tokens so "track" and "page" can never collapse into each other again: slightly deepen the light-mode `--muted` / `--secondary` / `--accent` surfaces and darken `--border` a touch, keeping cards clearly white against them. Dark mode gets the equivalent separation.
   - Verify with the existing contrast lint and axe checks that nothing drops below WCAG AA.

3. **Audit and convert every tab strip**
   Replace ad-hoc tab markup with the shared component on:
   - Calendar day tabs and the calendar range / dose filter chip rows (`timeline.tsx`)
   - Fitness tabs, Food tabs, Stack tabs
   - Muscle group picker, workout breakdown, repeat meal card
   - Insights (index + metric), admin analytics, install funnel, funnel widget, search insights, zero-result analyzer, landing conversions
   - The shadcn `Tabs` primitive itself, so any future use inherits the new look

4. **Low-emphasis buttons**
   - `ghost` and `outline` button variants get a visible resting boundary or tint (not just hover), and the filter/segment chips get a stronger unselected border so they read as tappable.

5. **Regression guard**
   - Extend the existing dark/light contrast lint script with a check that any element pairing a "track" surface against the page background keeps a minimum lightness delta, so this can't silently regress again.
   - Add a small test asserting the active tab has both a non-color cue (weight/border) and sufficient contrast.

## Technical notes

- New `src/components/ui/segmented-tabs.tsx`; `src/components/ui/tabs.tsx` restyled to match.
- Tokens in `src/styles.css` (`--muted`, `--secondary`, `--accent`, `--border`, plus new `--surface-track`), light and dark blocks, and applied across the neon/extended themes.
- Lint extension in `scripts/check-dark-contrast.mjs`; tests under `src/components/__tests__/`.
- No behavior, routing, or data changes — presentation only.
