CREATE TABLE public.user_pair_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compound_a_id uuid NOT NULL REFERENCES public.compounds(id) ON DELETE CASCADE,
  compound_b_id uuid NOT NULL REFERENCES public.compounds(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('info','caution','avoid')),
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 500),
  source text CHECK (source IS NULL OR char_length(source) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_pair_notes_ordered CHECK (compound_a_id < compound_b_id),
  CONSTRAINT user_pair_notes_unique UNIQUE (user_id, compound_a_id, compound_b_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_pair_notes TO authenticated;
GRANT ALL ON public.user_pair_notes TO service_role;

ALTER TABLE public.user_pair_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own pair notes"
  ON public.user_pair_notes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_pair_notes_updated_at
  BEFORE UPDATE ON public.user_pair_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX user_pair_notes_user_idx ON public.user_pair_notes(user_id);