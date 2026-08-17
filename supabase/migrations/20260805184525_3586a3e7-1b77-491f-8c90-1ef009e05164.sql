CREATE TABLE public.gsc_daily_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  site_url TEXT NOT NULL,
  sitemap_path TEXT,
  sitemap_last_downloaded TIMESTAMPTZ,
  sitemap_last_submitted TIMESTAMPTZ,
  sitemap_is_pending BOOLEAN,
  sitemap_submitted_urls INTEGER,
  sitemap_indexed_urls INTEGER,
  sitemap_errors INTEGER,
  sitemap_warnings INTEGER,
  sitemap_fetch_ok BOOLEAN,
  sitemap_url_count INTEGER,
  inspected_urls INTEGER NOT NULL DEFAULT 0,
  indexed_urls INTEGER NOT NULL DEFAULT 0,
  not_indexed_urls INTEGER NOT NULL DEFAULT 0,
  excluded_urls INTEGER NOT NULL DEFAULT 0,
  crawl_error_urls INTEGER NOT NULL DEFAULT 0,
  robots_blocked_urls INTEGER NOT NULL DEFAULT 0,
  rich_result_fail_urls INTEGER NOT NULL DEFAULT 0,
  coverage_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  clicks INTEGER,
  impressions INTEGER,
  ctr NUMERIC,
  avg_position NUMERIC,
  performance_range_start DATE,
  performance_range_end DATE,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  api_ok BOOLEAN NOT NULL DEFAULT true,
  api_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (snapshot_date, site_url)
);

GRANT ALL ON public.gsc_daily_snapshots TO service_role;

ALTER TABLE public.gsc_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.gsc_daily_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX gsc_daily_snapshots_date_idx
  ON public.gsc_daily_snapshots (snapshot_date DESC);

CREATE TRIGGER update_gsc_daily_snapshots_updated_at
  BEFORE UPDATE ON public.gsc_daily_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();