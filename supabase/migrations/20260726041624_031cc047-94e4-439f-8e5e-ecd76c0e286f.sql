
CREATE TABLE public.seo_page_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  indexing_verdict TEXT,
  coverage_state TEXT,
  rich_result_types TEXT[] NOT NULL DEFAULT '{}',
  has_description_suffix BOOLEAN,
  meta_description TEXT,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.seo_page_snapshots TO service_role;

ALTER TABLE public.seo_page_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.seo_page_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX seo_page_snapshots_last_checked_idx
  ON public.seo_page_snapshots (last_checked_at DESC);
