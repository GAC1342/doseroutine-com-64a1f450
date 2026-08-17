
CREATE TABLE public.shared_protocols (
  token text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Shared stack',
  snapshot jsonb NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shared_protocols TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_protocols TO authenticated;
GRANT ALL ON public.shared_protocols TO service_role;

ALTER TABLE public.shared_protocols ENABLE ROW LEVEL SECURITY;

-- Anyone with the token (i.e. the URL) can read it
CREATE POLICY "Anyone can read shared protocols"
  ON public.shared_protocols FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert their own shared protocols"
  ON public.shared_protocols FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own shared protocols"
  ON public.shared_protocols FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE INDEX shared_protocols_owner_idx ON public.shared_protocols(owner_id);
