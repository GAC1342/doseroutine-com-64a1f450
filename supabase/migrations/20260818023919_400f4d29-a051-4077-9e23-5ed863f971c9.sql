CREATE TABLE public.meal_timing_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  with_food_window_min integer NOT NULL DEFAULT 30,
  workout_window_min integer NOT NULL DEFAULT 90,
  empty_stomach_gap_min integer NOT NULL DEFAULT 60,
  first_meal_protein_g integer NOT NULL DEFAULT 30,
  late_meal_hour integer NOT NULL DEFAULT 21,
  max_meals_per_day numeric NOT NULL DEFAULT 5,
  suggestions_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_timing_presets TO authenticated;
GRANT ALL ON public.meal_timing_presets TO service_role;

ALTER TABLE public.meal_timing_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own timing presets"
ON public.meal_timing_presets FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER meal_timing_presets_set_updated_at
BEFORE UPDATE ON public.meal_timing_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();