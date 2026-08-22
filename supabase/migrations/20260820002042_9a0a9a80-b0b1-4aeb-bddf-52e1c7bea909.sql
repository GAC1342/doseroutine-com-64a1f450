ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS workout_sessions_template_id_idx
  ON public.workout_sessions (template_id);