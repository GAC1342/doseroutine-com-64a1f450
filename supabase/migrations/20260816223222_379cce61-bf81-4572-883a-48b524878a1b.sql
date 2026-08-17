CREATE TABLE IF NOT EXISTS public.gsc_crawl_inspections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  site_url text NOT NULL,
  robots_txt_state text,
  page_fetch_state text,
  indexing_state text,
  verdict text,
  coverage_state text,
  last_crawl_time timestamptz,
  api_error text,
  is_blocked boolean NOT NULL DEFAULT false,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (url, site_url)
);

GRANT ALL ON public.gsc_crawl_inspections TO service_role;
GRANT SELECT ON public.gsc_crawl_inspections TO authenticated;

ALTER TABLE public.gsc_crawl_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view crawl inspections" ON public.gsc_crawl_inspections;
CREATE POLICY "Admins can view crawl inspections"
ON public.gsc_crawl_inspections
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_gsc_crawl_inspections_blocked ON public.gsc_crawl_inspections (is_blocked, checked_at DESC);