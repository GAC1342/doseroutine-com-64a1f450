CREATE TABLE public.workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  workout_type text NOT NULL DEFAULT 'strength',
  duration_min numeric,
  rpe numeric,
  calories numeric,
  distance_m numeric,
  target_pace_s numeric,
  target_hr numeric,
  notes text,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workout_templates_user_idx ON public.workout_templates (user_id, name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workout templates"
ON public.workout_templates FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workout_template_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise text NOT NULL,
  set_index integer NOT NULL DEFAULT 0,
  sets integer,
  reps numeric,
  weight_kg numeric,
  rest_seconds integer,
  tempo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workout_template_exercises_template_idx ON public.workout_template_exercises (template_id, set_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_template_exercises TO authenticated;
GRANT ALL ON public.workout_template_exercises TO service_role;

ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workout template exercises"
ON public.workout_template_exercises FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_workout_templates_updated_at
BEFORE UPDATE ON public.workout_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_template_exercises_updated_at
BEFORE UPDATE ON public.workout_template_exercises
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();