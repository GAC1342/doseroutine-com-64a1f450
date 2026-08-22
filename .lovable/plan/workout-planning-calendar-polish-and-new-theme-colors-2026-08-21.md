# Workout planning, calendar polish, and new theme colors

## 1. Duplicate week (one tap)

Add a "Duplicate to next week" action to the weekly training schedule.

- Copies every session shown in the current week into the next week, keeping the same repeat days, time, duration, and label.
- Sessions that already repeat weekly are recognized as "already covers next week" and skipped instead of duplicated, so you don't end up with doubles.
- One-off / non-repeating sessions are recreated on the matching day of next week.
- A toast confirms how many sessions were copied and offers Undo.

## 2. Desktop calendar hierarchy

- Tighten the day-detail panel: smaller vertical gaps, denser card padding at `lg:` and up, and a two-column layout for the day panel so the month grid and details sit side by side instead of stacking with a large empty gutter.
- Each section inside a day (Stack, Training, Meals) becomes collapsible with sensible defaults: sections with items open, empty sections collapsed to a single "Nothing planned — add" row.
- The open/closed choice is remembered per section in local storage so your preferred density sticks between visits.

## 3. Searchable upper-body exercise picker

- Add a search box plus filter chips (muscle group, equipment, push/pull) to the exercise picker used by "Add to workout".
- Results update as you type, match on exercise name and muscle group, and show the target muscle inline.
- Recently added exercises appear first when the search box is empty, so repeat picks take one tap.

## 4. Usage tracking for calendar tabs and day edits

Record anonymous, privacy-safe usage events via the existing analytics pipeline:

- `calendar_tab_open` with which tab (Stack / Training / Meals).
- `calendar_day_action` for the day-edit actions (edit time, rename, mark taken/skipped, add workout, add meal, duplicate week).
- No new tables — these ride on the existing analytics events store and show up in the admin analytics dashboard with a new "Calendar usage" breakdown.

## 5. Lighter page background

The current light background is a warm off-white (slightly beige). Shift it toward a cleaner, cooler near-white and reduce the warm tint on muted surfaces, keeping cards clearly distinct from the page. Dark mode is unchanged. Contrast lint and the accessibility checks run to confirm nothing drops below AA.

## 6. Neon theme colors

Add four new accent themes alongside the existing ones: Neon Blue, Neon Pink, Neon Green, Neon Yellow.

- Dark mode runs the true neon values.
- Light mode uses a deepened version of each hue so text and links on white still pass WCAG AA — same approach already used for Neon Mint. Neon yellow in particular needs a strong deepening in light mode.
- Safety/severity colors (warnings, interaction flags) stay fixed, as today — only the accent changes.
- The new themes are Pro, matching the other extended palettes.

## Technical notes

- `src/lib/routine-schedule.ts`: add a `duplicateWeekPlan` helper (pure, unit-tested) computing which rows need new inserts; `src/components/weekly-routine-schedule.tsx` wires the button, mutation, and undo.
- `src/components/day-food-workouts.tsx` and `src/routes/_authenticated/timeline.tsx`: collapsible sections, desktop two-column grid, persisted open state.
- `src/components/exercise-search-grid.tsx` / `add-to-workout-sheet.tsx`: search + facet chips over `src/lib/muscle-groups.ts`.
- Tracking uses the existing `trackEvent` from `src/lib/analytics.ts`.
- Background tokens (`--background`, `--muted`) in `src/styles.css`; new `[data-theme="neon-*"]` blocks plus entries in `COLOR_THEMES` in `src/lib/theme.ts`.
- Tests: routine duplication unit tests, theme-list/contrast test covering the new palettes, and the existing dark-contrast + axe CI gates.
