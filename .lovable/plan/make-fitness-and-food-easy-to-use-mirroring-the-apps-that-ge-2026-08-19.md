# Make Fitness and Food easy to use (mirroring the apps that get this right)

## What's wrong today

- The exercise library — muscle-group picker, searchable exercises with illustrations, saved custom exercises — exists, but it is buried near the bottom of the "Log workout" sheet and only shows for strength-type workouts. There is no way to just browse exercises.
- Recurring workout scheduling ("Routine") sits far below the calendar on the Fitness page, under the monthly stats, the breakdown chart and a booty-workout link — most people will never scroll that far.
- "Meal times" (a food thing) is on the Fitness page, while meal logging is on Food, weekly planning is on Meal plan, and scanning is on Scan. Four places, no obvious front door.
- Neither Fitness nor Food is in the bottom bar; both hide inside More.

## The proven patterns we'll copy

- **Strong / Hevy (workouts):** one screen with a big "Start / Log workout" button, your saved Routines listed right under it, a separate Exercises library tab you can browse any time, and history below.
- **MyFitnessPal / MacroFactor (food):** a single Diary screen for the day with fixed meal sections (Breakfast, Lunch, Dinner, Snacks), calories and macros at the top, and one "+" per section that offers Scan photo / Scan barcode / Search / Recent.

## 1. Navigation

Bottom bar becomes: **Today · Stack · Fitness · Food · More**.
Safety and Timeline move into More's "Quick access" list at the top (they stay one tap away, and both are still in the desktop sidebar). Five tabs keeps labels readable on a phone; six starts truncating.

## 2. Fitness page — four tabs

`Workout · Routine · Exercises · Body`, opening on Workout.

**Workout** (the default): a full-width **Start workout** button, then Today's plan (anything scheduled for today, with Log / Skip), then This week's summary, then the calendar and history. The monthly breakdown chart and personal records move to the bottom.

**Routine**: recurring training only — the existing routine planner, promoted out of the bottom of the page and given a clearer "Weekly schedule" layout showing Mon-Sun with what's planned on each day, plus reminders per session. Meal times move off this page entirely.

**Exercises**: the exercise library as its own browsable screen — search, muscle-group filter, illustration for each, plus "My exercises". Tapping an exercise offers *Add to today's workout* / *Add to a routine* / *View history & PRs*. The same picker stays inside the log sheet, moved to the top of the Exercises section and shown for every workout type, not just strength.

**Body**: unchanged (weight, measurements, photos link).

## 3. Food page — three tabs

`Diary · Plan · Times`, opening on Diary.

**Diary**: the day at a glance — date arrows, calories/protein/carbs/fat ring at the top, then fixed sections **Breakfast · Lunch · Dinner · Snacks**. Each section lists what's logged and has a "+" that opens one Add food sheet with four clear choices: **Scan photo · Scan barcode · Search food · Recent / repeat**. Everything still lands in the existing review sheet before saving, so nothing is saved without you checking it.

**Plan**: the existing weekly meal planner and grocery list, unchanged in function.

**Times**: meal times moved here from Fitness, since they're food, not training.

The standalone Scan page keeps working and, when it recognises food, hands off into the same Diary review sheet.

## 4. Small friction fixes

- One consistent "Add" action per screen instead of Plan/Log/+ variants.
- Empty states that tell you what to do next ("No workouts yet — start one, or build a weekly routine") instead of a bare "Nothing logged".
- More menu regrouped: a single **Fitness & Food** group (Fitness, Food, Meal plan, Scan, Progress photos, Health sync) instead of them being scattered.

## Technical notes

- `src/components/app-shell.tsx`: TABS becomes Today/Stack/Fitness/Food/More; Safety and Timeline move into SECONDARY. Route prefetch map updated for the new tabs.
- `src/routes/_authenticated/fitness.tsx`: `view` search param extends to `workout | routine | exercises | body` (old `workouts` value redirects to `workout` so existing links and the Today strip keep working). The page splits into panel components; the current `WorkoutsPanel` body is divided across the Workout and Routine tabs. `RoutinePlannerCard table="meal_times"` moves to Food.
- New `src/components/exercise-library-panel.tsx` reusing `ExerciseSearchGrid`, `MuscleGroupPicker`, `exercise-options`, `custom-exercises` and `workout-prs`, with an action sheet on tap. `workout-log-sheet.tsx` reorders its Exercises section to the top and drops the strength-only gate on the picker.
- `src/routes/_authenticated/food.tsx`: adds a `view` search param (`diary | plan | times`) and a slot-grouped diary built on the existing `meals` query and `MEAL_SLOT_LABELS`; a shared `AddFoodSheet` fronts the existing photo-scan, barcode, search and repeat paths, all of which continue through `MealReviewSheet`. `/meal-plan` stays as a route and is embedded as the Plan tab so existing links keep working.
- No database changes. No changes to adherence logic, scanning logic, or meal macro maths — this is navigation and layout.
- Tests: extend the existing fitness/food route tests for the new tab params and old-value redirects; add a small test that every bottom-tab destination resolves.
