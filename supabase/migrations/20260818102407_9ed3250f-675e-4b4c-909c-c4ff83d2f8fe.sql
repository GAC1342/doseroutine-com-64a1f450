CREATE TABLE public.sitemap_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  fingerprint text NOT NULL,
  url_count integer NOT NULL,
  article_count integer NOT NULL DEFAULT 0,
  image_count integer NOT NULL DEFAULT 0,
  changed boolean NOT NULL DEFAULT false,
  resubmitted boolean NOT NULL DEFAULT false,
  resubmit_ok boolean,
  regressions jsonb NOT NULL DEFAULT '[]'::jsonb,
  xml text
);

GRANT ALL ON public.sitemap_snapshots TO service_role;

ALTER TABLE public.sitemap_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX sitemap_snapshots_created_at_idx ON public.sitemap_snapshots (created_at DESC);

select cron.schedule(
  'doseroutine-sitemap-resubmit-daily',
  '25 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://doseroutine.com/api/public/hooks/sitemap-resubmit',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', current_setting('app.settings.cron_secret', true)),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  ) AS request_id;
  $$
);