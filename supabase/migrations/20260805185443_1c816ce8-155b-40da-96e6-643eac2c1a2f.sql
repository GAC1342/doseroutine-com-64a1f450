CREATE TABLE public.index_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  triggered_by uuid,
  source text NOT NULL DEFAULT 'manual',
  site_url text NOT NULL,
  sitemap_url text NOT NULL,
  sitemap_submit_ok boolean NOT NULL DEFAULT false,
  sitemap_submit_error text,
  sitemap_url_count integer,
  sitemap_last_downloaded timestamptz,
  sitemap_is_pending boolean,
  indexnow_ok boolean NOT NULL DEFAULT false,
  indexnow_submitted integer NOT NULL DEFAULT 0,
  indexnow_error text,
  duration_ms integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.index_submissions TO authenticated;
GRANT ALL ON public.index_submissions TO service_role;

ALTER TABLE public.index_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read index submissions"
ON public.index_submissions FOR SELECT TO authenticated
USING (public.is_admin());

CREATE INDEX idx_index_submissions_created_at ON public.index_submissions (created_at DESC);