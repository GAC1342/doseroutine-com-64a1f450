ALTER TABLE public.meal_timing_presets
  ADD COLUMN IF NOT EXISTS auto_mode text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS auto_weekdays smallint[] NOT NULL DEFAULT '{}';

ALTER TABLE public.meal_timing_presets
  DROP CONSTRAINT IF EXISTS meal_timing_presets_auto_mode_check;
ALTER TABLE public.meal_timing_presets
  ADD CONSTRAINT meal_timing_presets_auto_mode_check
  CHECK (auto_mode IN ('off','workout_days','rest_days','weekdays'));