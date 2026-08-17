CREATE TABLE public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  performed_on date NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','planned','skipped')),
  workout_type text NOT NULL DEFAULT 'strength',
  title text,
  duration_min numeric,
  rpe numeric,
  calories numeric,
  distance_m numeric,
  avg_pace_s numeric,
  avg_hr numeric,
  max_hr numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workout_logs_user_date_idx ON public.workout_logs (user_id, performed_on DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_logs TO authenticated;
GRANT ALL ON public.workout_logs TO service_role;

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workout logs"
ON public.workout_logs FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id uuid NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise text NOT NULL,
  set_index integer NOT NULL DEFAULT 0,
  sets integer,
  reps numeric,
  weight_kg numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workout_sets_log_idx ON public.workout_sets (workout_log_id, set_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workout sets"
ON public.workout_sets FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_workout_logs_updated_at
BEFORE UPDATE ON public.workout_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_sets_updated_at
BEFORE UPDATE ON public.workout_sets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();