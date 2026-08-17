CREATE TABLE public.side_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_compound_id uuid REFERENCES public.user_compounds(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  symptom text NOT NULL,
  severity smallint NOT NULL CHECK (severity BETWEEN 1 AND 5),
  notes text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.side_effects TO authenticated;
GRANT ALL ON public.side_effects TO service_role;

ALTER TABLE public.side_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own side effects"
  ON public.side_effects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX side_effects_user_time_idx ON public.side_effects (user_id, occurred_at DESC);

CREATE TRIGGER side_effects_updated_at
  BEFORE UPDATE ON public.side_effects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();