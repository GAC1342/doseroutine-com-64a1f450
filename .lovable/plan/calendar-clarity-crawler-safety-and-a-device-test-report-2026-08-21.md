# Calendar clarity, crawler safety, and a device-test report

Seven items, grouped into three shippable chunks plus a written audit.

## 1. Calendar day dots (the biggest usability win)

Today a date only gets a dot when a workout was **logged**. Recurring scheduled
sessions and meal anchors leave the day looking empty, which is why your month
view reads as blank even when the week is fully planned.

Adopt the convention Google Calendar, Apple Calendar and Fitbod all share:

```text
   21          22          23
   • •         •           • • • +2
 done+plan   1 meal      busy day
```

- Up to three dots per day, then a `+n` overflow count — never wraps the cell.
- Colour = category (strength / cardio / mind-body / sport / meal).
- Fill = state: solid for completed, hollow/faded for still-planned.
- Screen-reader label per day: "2 workouts logged, 1 scheduled, 1 meal".
- A day with anything on it also gets a subtle outline so "planned vs empty" is
  readable at a glance without counting dots.

To do this the month grid needs the recurring schedule for the whole month, not
just the selected day (it currently computes routine occurrences for one day).

## 2. Day panel polish

- **Meal toggle** — a small "Meals" show/hide switch in the day header, separate
  from workouts, remembered between visits.
- **Skeletons** — while the routine templates load, the expanded day shows
  shimmer rows in the shape of the exercise list (thumbnail + two text lines)
  instead of an empty gap.
- **Clearer empty states** — distinguish three cases: no routine attached to the
  session ("Attach exercises"), routine attached but empty, and a routine that
  failed to load ("Couldn't load this session — retry").
- **Sync check** — automated coverage that the exercises and illustrations shown
  for a given day match whichever session filter is active, and stay correct
  when switching between a single workout and the All view on the same day.

## 3. Crawler + protected-route e2e suite

New spec that hits `/today`, `/insights`, `/food`, `/fitness`, `/progress` and
other gated paths with Googlebot/GPTBot/Bingbot user agents, asserting each one:

- redirects to `/auth` or renders a signed-out shell (never a data view),
- carries `noindex` (or is disallowed in robots.txt),
- returns zero private data in the HTML — no emails, user IDs, dose names,
  logged foods, or workout titles,
- exposes no private data in the SSR payload embedded in the page.

Also assert `robots.txt` disallows the whole authenticated surface, so this
can't silently regress when a new gated route is added.

## 4. Device smoke-test report page

A new internal page at `/admin/device-smoke` that aggregates the iOS and Android
keyboard/bottom-control smoke runs:

- one row per assertion with pass/fail, device profile (iPhone, iPad portrait /
  landscape / undocked, Android), and last-run timestamp,
- failing rows deep-link to the exact spec file and line,
- a printable hardware checklist section (real UIKit keyboard, split keyboard,
  edge-swipe back, universal links, airplane-mode fresh install) with tick boxes,
- fed by the Playwright JSON reporter output committed by the test run, so the
  page reflects the last real run rather than hard-coded text.

## 5. Written competitive audit (no code)

A comparison of DoseRoutine against the apps people actually stick with —
MacroFactor / MyFitnessPal (food), Strong / Hevy / Fitbod (workouts), Cronometer
(micronutrients), Apple Fitness (calendar and rings) — covering:

- what we already do as well or better (peptide/compound tracking depth,
  protocol-aware nutrition, evidence citations),
- where we're behind (calendar legibility, first-run guidance, session templates
  as first-class objects, quick-repeat of yesterday's workout),
- a prioritised "steal this, make it ours" list with effort vs impact.

Delivered as a document in the repo plus a summary in chat — no product changes
made from it without your sign-off.

## Technical notes

- New `src/lib/calendar-day-markers.ts` (pure dot/overflow/label builder, unit
  tested) consumed by the month grid in `src/routes/_authenticated/fitness.tsx`.
- Month-wide recurrence: extend `routine-schedule.ts` with a `routineForRange`
  helper so the grid gets scheduled occurrences per day in one pass.
- Meal toggle state persisted in localStorage alongside the existing fitness
  view preference.
- Skeletons reuse the existing `Skeleton` + `LoadingStatus` components.
- New specs: `e2e/crawler-protected-routes.spec.ts`,
  `e2e/calendar-day-sync.spec.ts`; report page reads the Playwright JSON summary
  under a committed results file.
- Report page lives under the existing `/admin` gate, same pattern as
  `admin/health` and `admin/schema-report`.
