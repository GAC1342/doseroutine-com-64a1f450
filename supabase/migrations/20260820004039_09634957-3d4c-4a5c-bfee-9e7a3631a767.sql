ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS interval_weeks integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS anchor_date date,
  ADD COLUMN IF NOT EXISTS skipped_dates date[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_interval_weeks_check;
ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_interval_weeks_check CHECK (interval_weeks BETWEEN 1 AND 4);