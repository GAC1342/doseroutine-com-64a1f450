CREATE TABLE public.meal_timing_rules (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  with_food_window_min integer NOT NULL DEFAULT 30,
  workout_window_min integer NOT NULL DEFAULT 90,
  empty_stomach_gap_min integer NOT NULL DEFAULT 45,
  first_meal_protein_g integer NOT NULL DEFAULT 35,
  late_meal_hour integer NOT NULL DEFAULT 21,
  max_meals_per_day numeric NOT NULL DEFAULT 3.5,
  suggestions_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_timing_rules TO authenticated;
GRANT ALL ON public.meal_timing_rules TO service_role;

ALTER TABLE public.meal_timing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own meal timing rules"
  ON public.meal_timing_rules FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER meal_timing_rules_set_updated_at
  BEFORE UPDATE ON public.meal_timing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.logging_reminder_settings
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;