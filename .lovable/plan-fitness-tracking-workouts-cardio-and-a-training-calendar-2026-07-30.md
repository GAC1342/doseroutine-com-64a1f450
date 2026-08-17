# Fitness tracking: workouts, cardio, and a training calendar

Short answer: yes. Right now Body Metrics only stores point-in-time numbers (weight, body fat, tape measurements, four 1RM lifts). There is no way to record a workout you actually did, no cardio at all, and no month view of training. The `workout_sessions` table already exists in the database but is only used as a reminder anchor (planned time, days of week) — no screen reads or writes real sessions, and Export lists "Workouts" for a table that never gets filled.

This plan adds a proper Fitness section: log what you did, plan what you intend to do, and see it on a calendar that looks and behaves like the Stack timeline.

## What gets built

### 1. Log a workout
A "Log workout" sheet with:
- Type: Strength, Cardio (run, bike, row, swim, walk, elliptical), HIIT/Conditioning, Sport, Mobility/Yoga, Other
- Duration, perceived effort (RPE 1–10), optional calories
- Cardio fields: distance (mi/km), average pace, average and max heart rate
- Strength fields: repeating exercise rows — exercise name, sets, reps, weight — with automatic total volume (sets x reps x weight) and an estimated 1RM per lift
- Notes, and how it felt

Every number field uses the strict decimal input already used for doses, so scrolling or arrow keys can never change a value.

### 2. Plan ahead
The same sheet can save an entry as **planned** for a future date instead of **completed**. Planned entries show as outlines on the calendar and can be marked done (which converts them into a logged session, pre-filled) or skipped — the same taken/skipped language the Stack already uses.

Optional weekly repeat (for example, "Legs every Monday and Thursday") generates planned entries ahead, reusing the existing `days_of_week` idea from `workout_sessions`.

### 3. Fitness calendar
A month grid matching the Stack Timeline: dots per day coloured by session type, completed vs planned styling, tap a day to see that day's sessions, arrows to move between months, and a filter for All / Completed / Planned / Strength / Cardio. Built on the same timezone-safe date helpers the Stack calendar uses, so no day-boundary drift.

### 4. Progress that ties back to the stack
- Weekly summary strip: sessions, total minutes, cardio distance, strength volume, current training streak
- Personal records auto-detected from logged strength work, feeding the existing Bench/Squat/Deadlift/OHP cards on Body Metrics instead of requiring manual entry
- Cardio trend (distance and pace over time) and volume trend on the fitness page
- Workouts included in Doctor Report and the existing Export "Workouts" option, which currently exports nothing

### 5. Placement
A new **Fitness** page linked from More (next to Body Metrics and Progress Photos), with Body Metrics gaining a "Recent workouts" strip and a link across. Body Metrics stays the place for weight and measurements; Fitness is the place for activity.

## Technical notes

- New tables: `workout_logs` (user_id, performed_on, status completed/planned/skipped, type, duration_min, rpe, calories, distance_m, avg_pace_s, avg_hr, max_hr, notes) and `workout_sets` (workout_log_id, exercise, set_index, reps, weight_kg). Both with RLS scoped to `auth.uid()` plus grants to `authenticated` and `service_role`, and `updated_at` triggers.
- Existing `workout_sessions` stays as the reminder/scheduling anchor; the new tables hold actual and planned sessions. No destructive change to existing data.
- Storage is metric (kg, metres, seconds); display converts to lb/mi based on the user's existing unit preference, matching how Body Metrics already handles kg vs lb.
- New route `src/routes/_authenticated/fitness.tsx` with its own head metadata, reusing `src/lib/local-calendar.ts` for the month grid and the Timeline's calendar patterns for consistency.
- PR detection lives in a pure helper (`src/lib/workout-prs.ts`) with unit tests; calendar aggregation and unit conversion also get tests.

## Not included

- Apple Health / Google Fit automatic workout import (the Health Sync page already describes this as a separate integration)
- Wearable live heart-rate streaming
- Exercise library with demo videos

## Also worth noting

The Body Metrics screenshots show standard blue buttons and a spinner-style number field on "OHP (lb)" rather than the app's teal tokens and the strict decimal input. I will bring that page in line while building this, unless you would rather keep it separate.
