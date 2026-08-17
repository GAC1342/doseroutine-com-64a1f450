CREATE TABLE public.custom_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  workout_type text,
  family text NOT NULL DEFAULT 'other',
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX custom_exercises_user_name_idx
  ON public.custom_exercises (user_id, lower(trim(name)));

CREATE INDEX custom_exercises_user_family_idx
  ON public.custom_exercises (user_id, family);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_exercises TO authenticated;
GRANT ALL ON public.custom_exercises TO service_role;

ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own custom exercises"
  ON public.custom_exercises
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_custom_exercises_updated_at
  BEFORE UPDATE ON public.custom_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();