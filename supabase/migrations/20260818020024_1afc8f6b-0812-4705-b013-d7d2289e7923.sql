CREATE TABLE public.meal_plan_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  planned_on date NOT NULL,
  meal_slot text NOT NULL DEFAULT 'lunch',
  label text NOT NULL,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_meal_id uuid,
  logged_meal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX meal_plan_slots_user_day_idx ON public.meal_plan_slots (user_id, planned_on);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_slots TO authenticated;
GRANT ALL ON public.meal_plan_slots TO service_role;

ALTER TABLE public.meal_plan_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own meal plan slots"
ON public.meal_plan_slots FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER meal_plan_slots_set_updated_at
BEFORE UPDATE ON public.meal_plan_slots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();