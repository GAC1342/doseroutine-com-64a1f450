# Unify workout planning, editing, and logging

## Audit findings

DoseRoutine currently exposes three overlapping ways to represent a planned workout:

1. **Saved routines** store the real exercise list, sets, reps, and illustration names.
2. **Weekly calendar sessions** decide when a saved routine appears, but the database still permits sessions with no saved routine attached.
3. **Workout logs** store completed workouts, but also support a second `planned` state.

That split causes the failure in the screenshot: the illustrated routine cards come from weekly sessions, while the empty message checks only workout logs. The illustrated cards also have no direct **Start / Log**, **Edit**, or **Remove** actions. In addition, the Weekly Plan tab currently exposes three separate editors for the same schedule, including a legacy “workout slot” editor that can create sessions with no exercises or illustrations.

## Build plan

### 1. Make illustrated saved routines the only planning path

- Remove the legacy workout-slot editor from the Weekly Plan screen.
- Remove the separate planned-workout path from the log sheet and calendar controls.
- Require every newly scheduled fitness workout to be backed by a saved routine with at least one exercise.
- Keep ordinary activity logging for completed runs, walks, sports, and other workouts; this change only consolidates **planning**.

### 2. Turn each planned calendar card into the workout control center

For every illustrated routine shown on a day:

- **Start workout** opens the workout logger prefilled with that routine’s exercises, sets, reps, duration, and selected date.
- **Edit routine** opens the full routine editor so exercise rows and schedule can be changed.
- **Reschedule** supports this occurrence or the repeating series.
- **Remove** supports this occurrence or the repeating series.
- After completion, the same calendar position shows the completed workout rather than a duplicate planned card.

### 3. Consolidate the Weekly Plan experience

- Replace the three overlapping schedule panels with one weekly routine planner.
- Each day shows the routine’s exercise illustrations and a concise exercise summary, not just a title/time.
- Tapping a routine edits its exercises and its weekly schedule in one flow.
- Adding a workout always starts with choosing or building an illustrated routine, then choosing days/time/repeat settings.
- Keep existing duplicate-week, repeat-until, day overrides, skips, reminders, and drag/reschedule behavior inside the unified editor.

### 4. Repair calendar state and empty messages

- Treat scheduled routine occurrences and completed logs as first-class items in the same day view.
- Never show “Nothing logged/planned” when illustrated workouts are visible.
- Use a true empty state only when the day has neither a scheduled routine nor a completed workout.
- Make calendar filters and dots operate on the unified planned/completed view.

### 5. Safely clean up existing split data

- Link recoverable legacy scheduled sessions to matching saved routines.
- Surface any remaining unlinked session as “Needs exercises” in the unified editor until the user attaches exercises; do not silently delete user data.
- Preserve completed history and avoid duplicating workouts when a planned routine is started or completed.

### 6. Verification

Add automated coverage for:

- An illustrated routine appears on every scheduled day.
- Start workout prefills the correct exercises and saves one completed workout.
- Edit routine updates every future occurrence without losing illustrations.
- Edit/remove one occurrence does not alter the series; edit/remove series does.
- A day with scheduled workouts never displays an empty state.
- A completed routine does not render twice as both planned and completed.
- Legacy empty sessions cannot be created from any current UI.

## Competitor pattern to follow

The implementation will follow the established model used by leading workout apps: **build one reusable exercise routine, schedule that routine, then start/log it from the calendar**. The calendar is not a second workout builder, and “planned” is not a separate copy of a workout. This is the clearest path to the Hevy/Strong-style experience the current UI was aiming for.

## Technical details

- Canonical workout definition: `workout_templates` + `workout_template_exercises`.
- Calendar recurrence: `workout_sessions`, always linked through `template_id` for new planned fitness workouts.
- Completed history: `workout_logs` + `workout_sets`.
- Existing rows remain protected by current per-user access rules; cleanup will be user-scoped and non-destructive.
