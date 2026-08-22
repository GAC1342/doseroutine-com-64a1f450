# Calendar UX overhaul + workout scheduling fixes + SEO link hygiene

Two tracks: (A) fix the workout/calendar experience the way you described, (B) finish the SEO link/content items.

## A. Workout scheduling bugs

What I confirmed in the code:

- The weekly schedule's inline editor only offers **name, time, length** — there is no day picker at all. That's why "the days to pick from are now gone" when you go back to edit.
- Dragging a session onto another day **overwrites** its day list with that single day (`weekdays: [weekday]`), so a Mon/Wed/Fri workout silently becomes one day only.
- Opening the add sheet from a specific day forces the selection to just that day and then **overwrites your remembered target days**, so the next add starts from one day instead of your usual pattern.

Fixes:

1. Add a Mon–Sun day-chip picker to the inline edit panel, pre-filled with the session's current days, so you can add/remove repeat days after creating a workout.
2. Change drag-and-drop to *move* the day it was dragged from to the dropped day, keeping the other days intact (with a "moved Wed → Thu" toast and undo).
3. Stop the per-day open from clobbering saved target days; the remembered pattern only updates when you deliberately change chips in multi-day mode.
4. Fix the day-mismatch risk end to end: one shared weekday helper (0 = Sunday) used by the picker, the save call, the week grid and the calendar day view, plus unit tests that a session saved on Tue/Thu shows on exactly Tue/Thu in every surface (including around midnight and across timezones).

## B. Calendar day tabs + organization

On the calendar page, tapping a day currently shows one long stacked list. Change it to a tabbed day panel:

```text
[ Mon 24 ]  ── Stack | Workout | Meals ──
   Stack   : doses due, taken/skipped, quick log
   Workout : scheduled sessions + exercises, log/edit, add
   Meals   : meals by slot with per-day macro summary
```

- Tabs remember the last one you used, deep-link via `?tab=`, and show a count badge so you can see at a glance what's on a day.
- Each tab gets one clear primary action (Log dose / Start workout / Add meal) instead of scattered buttons.

## C. Desktop layout

Pages are locked to a narrow mobile column (`max-w-3xl`) even on wide screens. On the calendar, fitness and food screens: keep the mobile layout untouched, and at `lg:` switch to a two-column layout (month calendar / list on the left, day detail on the right) inside a wider container. No behavior changes, only layout.

## D. Missing upper-body weight exercises

The catalog has only 18 upper-body lifts. Add the common gaps with the same metadata/illustration pattern as existing entries: dumbbell bench press, machine chest press, pec deck, chest-supported row, T-bar row, single-arm dumbbell row, straight-arm pulldown, shrug, Arnold press, upright row, rear-delt fly, landmine press, hammer curl, preacher curl, cable curl, close-grip bench, skull crusher, overhead triceps extension, triceps kickback.

## E. SEO items

1. Write `#benefits`, `#side-effects`, and `#timing` content for **black cohosh**, **D-chiro-inositol**, and **vitex agnus-castus** (the sections only render when the backend content exists, so this is a content migration plus the existing citation/evidence formatting).
2. Automated DOM check: a script that renders each page and fails when any in-page `#fragment` link has no matching rendered `id`, wired into the SEO CI workflow.
3. Thin-inbound-link pages: re-run the internal link crawl to regenerate the current list of ~53 pages, then add contextual links from the most relevant hubs (`/library`, `/goals`, `/for`, `/calculators`, related compound pages) so each has at least 3 relevant internal links.
4. Anchor-text CI gate: fail the build when a library-page internal link uses a raw URL as its text or falls below the descriptive-anchor threshold.

## Technical notes

- Scheduling logic lives in `src/lib/quick-add-workout.ts`, `src/lib/routine-schedule.ts`, `src/components/weekly-routine-schedule.tsx`, `src/components/add-to-workout-sheet.tsx`.
- Day panel: `src/components/day-food-workouts.tsx` rendered from `src/routes/_authenticated/timeline.tsx`.
- Catalog: `src/lib/muscle-groups.ts` (+ `exercise-art` entries).
- Compound sections read `content.benefits_md` / `side_effects_md` / `timing_md` from the backend, rendered by `src/routes/library.$slug.tsx`.
- New checks run in `.github/workflows/seo-qa-sweep.yml`; new unit tests under `src/lib/__tests__/`.

## Order of work

1. Scheduling bug fixes + tests (highest impact on real usage)
2. Calendar day tabs
3. Desktop layout widening
4. Upper-body exercises
5. SEO content, DOM fragment check, internal linking, anchor-text gate
