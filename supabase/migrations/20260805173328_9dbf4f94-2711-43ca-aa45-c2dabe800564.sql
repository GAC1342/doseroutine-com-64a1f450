CREATE TABLE public.compound_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compound_slug text NOT NULL,
  pmid text NOT NULL,
  title text NOT NULL,
  journal text,
  year text,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (compound_slug, pmid)
);
CREATE INDEX compound_references_slug_idx ON public.compound_references (compound_slug, position);
GRANT SELECT ON public.compound_references TO anon;
GRANT SELECT ON public.compound_references TO authenticated;
GRANT ALL ON public.compound_references TO service_role;
ALTER TABLE public.compound_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Compound references are public" ON public.compound_references FOR SELECT TO anon, authenticated USING (true);