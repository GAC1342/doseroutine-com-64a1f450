# Unified date windows + workout/meal times on your calendar

## Part 1 — One shared date-window calculation

Today and Timeline each build their own "last 30 days" window with slightly
different code, so they can drift apart (different cut-off instant, different
inclusive/exclusive end, and Today's day boundary uses the profile timezone
while the history query uses raw UTC math).

What changes:

- Add `historyWindow(now, tz, days)` to the existing shared helper
  (`src/lib/today-window.ts`), returning one `{ start, end }` pair anchored to
  local calendar-day boundaries in the user's timezone.
- Today, Timeline, and `fetchAdherenceEvents` all call that one helper instead
  of building `Date.now() - 30 * 86_400_000` themselves.
- Timeline also resolves the timezone before its history query (today it
  fetches history first, then the timezone), so both screens use the same zone
  for the same rows.
- Add tests asserting Today and Timeline produce byte-identical start/end for
  the same clock, timezone, and window length — including across a DST change.

No visible change; the two screens simply can no longer disagree.

## Part 2 — Workout routine on the calendar

Short answer: not hard. The database table for it already exists and is unused
by the app — `workout_sessions` already stores `label`, `kind`, `planned_time`,
`days_of_week`, and an `active` on/off flag, plus pre-alert and at-time alert
fields. Nothing in the app currently reads or writes it.

What to build:

- A "Routine" section on `/fitness` where you add recurring sessions: name,
  type (strength / cardio / mobility), time of day, which weekdays, on/off
  toggle.
- Those sessions appear on the Today screen in the same timeline as doses, as
  their own row style so workouts never get counted in dose adherence.
- The `/fitness` calendar shows planned sessions alongside logged ones, so you
  can see planned vs actually done.
- Tapping a planned session opens the existing workout log sheet pre-filled.
- Reuses the existing workout reminder settings and reminder job — no new
  notification plumbing.

## Part 3 — Meal times on the calendar

Also not hard, and a smaller job than workouts. A `meals` table already exists
for logged meals with macros, but there is no concept of a *planned* meal time.

What to build:

- A small "Meal times" setting: name the slots you care about (Breakfast,
  Lunch, Dinner, Pre-workout, etc.), each with a time and an on/off toggle.
- Those slots show on Today as light anchor rows, mainly so "take with food"
  doses line up visually against when you actually eat.
- Optional check-off that links to a logged meal in the existing meals table.
- Excluded from adherence scoring — they are anchors, not doses.

## Suggested order

1. Part 1 (window unification) — small, removes a real drift bug.
2. Part 2 (workout routine) — biggest value, table already exists.
3. Part 3 (meal times) — quick add once Today can render non-dose rows.

## Technical notes

- New helper: `historyWindow(now, tz, days)` in `src/lib/today-window.ts`;
  callers updated in `src/routes/_authenticated/today.tsx`,
  `src/routes/_authenticated/timeline.tsx`, and `fetchAdherenceEvents` in
  `src/lib/adherence.ts`.
- Workout routine reads/writes existing `workout_sessions`; no migration
  needed beyond confirming row-level security policies and grants for that
  table.
- Meal times need one new small table (`meal_times`) with the standard
  per-user policies and grants.
- Today's render path gets a typed union row (dose | workout | meal) so
  non-dose rows are structurally excluded from adherence math.
