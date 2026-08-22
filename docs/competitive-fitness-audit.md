# Competitive audit: calendar, scheduling, and logging

Benchmarked against the apps users compare us to: **Strong** and **Hevy**
(strength logging), **Fitbod** (programming), **MacroFactor** and **MyFitnessPal**
(nutrition), **Apple Fitness / Apple Calendar** (day surfaces), and
**TrainingPeaks** (planned vs actual).

## What we already do right

- **One calendar for everything.** Stack doses, workouts, and meals live on the
  same grid. Strong and Hevy only show workouts; MyFitnessPal only shows food.
  Users tracking a protocol _and_ training have to run two apps elsewhere.
- **Planned vs actual.** We render a scheduled occurrence and a logged session
  distinctly, which is TrainingPeaks' core idea and absent from Strong/Hevy.
- **Recurrence with an end date and per-occurrence overrides.** Matches Apple
  Calendar semantics ("this workout only" vs "all repeats"), which is stronger
  than Hevy's routine model (no dates at all).
- **Exercise illustrations in the day panel.** Fitbod's biggest retention lever;
  most trackers show text rows only.
- **Offline-first nutrition cache and barcode confidence scoring.** Ahead of
  MyFitnessPal on scan reliability in poor connectivity.

## Where we were wrong (now fixed)

| Issue                                           | Proven pattern we adopted                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Days with plans looked identical to empty days  | Apple/Google Calendar dot markers: up to 3 colored dots per day, `+n` overflow, cell tint when anything is planned |
| Day panel showed "Workout" text with no content | Fitbod/Hevy session cards: exercise name, sets × reps × load, illustration thumbnail                               |
| Blank flash while the day loaded                | Skeleton shimmer rows (MacroFactor pattern) instead of an empty panel                                              |
| Meals crowded the workout view                  | Per-view content toggle (Apple Fitness "show/hide" filters), persisted                                             |
| Empty scheduled session gave no next step       | Explicit empty state with an "add exercises" action, Hevy-style                                                    |

## Where we still trail

1. **Rest-timer-to-next-set flow.** Strong auto-starts a rest timer on set
   completion and shows the previous session's numbers inline. We have a timer,
   but it is not wired into set logging.
2. **Progressive-overload suggestions.** Fitbod proposes the next load from
   history. We display history but don't suggest.
3. **Routine templates marketplace.** Hevy's shared routines drive most of its
   organic growth. We have export/import but no discovery surface.
4. **Week-at-a-glance volume.** TrainingPeaks shows planned vs completed volume
   per week; ours requires opening each day.
5. **Onboarding-to-first-log time.** MacroFactor gets a first log in under 60
   seconds. Our first-run path still routes through profile setup.

## Recommended next moves, in priority order

1. Wire the rest timer into set completion and surface "last time: 3×8 @ 60 kg"
   on every set row. Highest proven retention impact per effort.
2. Add a weekly summary strip above the calendar: planned vs completed sessions,
   total volume, meals logged.
3. Suggest next-session load from the last two logged sessions (simple linear
   progression, user-overridable).
4. Shorten first-run: allow logging before profile completion, backfill later.
5. Make routine templates shareable by link, then list popular ones.
