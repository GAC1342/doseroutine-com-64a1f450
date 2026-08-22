# Make workout scheduling available from every routine edit

## What is broken

The scheduling engine and database fields already support multiple weekdays, repeat intervals, and an optional end date. The failure is in the user flow:

- The main **Edit workout** sheet explicitly hides all weekly controls whenever an existing workout is being edited (`!seed.log`).
- Saved template editing only exposes rename/delete; it does not expose its weekly schedule.
- Full recurrence controls live separately under **Fitness → Weekly plan**, so editing a workout from the normal calendar/log route does not reveal them.
- The weekly calendar's inline editor can change days, but not the repeat interval or end date.
- Existing end-to-end tests navigate with the obsolete `?tab=routine` parameter while the route now reads `?view=routine`, and they can skip when the expected UI is absent. That allowed the missing real-world edit flow to pass unnoticed.

## Implementation

1. **Create one shared schedule editor**
   - Use a consistent Monday–Sunday multi-select row.
   - Include repeat mode: one-time, every week, every 2/3/4 weeks.
   - Include start time and optional “repeat until” date, with an explicit “No end date” action.
   - Show a plain summary such as “Every week on Mon, Wed, Fri at 5:30 PM”.
   - Keep controls touch-friendly, accessible, and readable in every theme.

2. **Put scheduling inside every relevant edit flow**
   - In **Edit workout**, show and populate the schedule controls for planned and recurring workouts instead of hiding them for existing records.
   - In the saved-routine/template flow, add an obvious **Schedule / Edit schedule** action beside the routine, using its existing recurring assignment when present.
   - In the weekly calendar inline editor, add frequency and repeat-until controls alongside weekdays, time, and duration.
   - Keep one-time completed workout logs separate so editing workout history does not accidentally create a recurrence.

3. **Persist edits to the correct model**
   - Continue storing reusable exercise content in the workout template and recurrence in its linked `workout_sessions` row.
   - Update an existing recurrence in place; never create duplicate weekly rows when days or frequency change.
   - Allow adding/removing weekdays, changing interval, moving the end date forward, clearing it to no end, and converting between one-time and repeating.
   - Preserve conflict detection and refresh Today, calendar, and timeline views immediately after save.

4. **Remove duplicated and misleading scheduling UI**
   - Reuse the shared editor across the workout sheet, routine list, and weekly calendar rather than maintaining three different day pickers.
   - Keep the Weekly plan tab as the overview, but do not require users to discover it before they can schedule a routine.

5. **Add non-skipping regression coverage**
   - Fix route navigation to use `?view=routine`.
   - Add a seeded end-to-end test that creates a routine, edits it from the normal workout/routine edit action, selects multiple days, enables weekly repeat, sets an end date, reloads, and verifies persistence.
   - Test changing weekdays/frequency, clearing the end date, preventing duplicate rows, and confirming occurrences on Today/calendar/timeline.
   - Add mobile viewport coverage so the controls and save action remain visible above the keyboard and bottom navigation.

## Technical surfaces

Primary files: `workout-log-sheet.tsx`, `weekly-routine-schedule.tsx`, `repeat-weekly-routine.tsx`, `add-to-workout-sheet.tsx`, the shared weekday/schedule controls, and recurrence persistence helpers. Existing data fields (`days_of_week`, `interval_weeks`, `anchor_date`, `repeat_until`, `template_id`) are sufficient; no schema change is expected.
