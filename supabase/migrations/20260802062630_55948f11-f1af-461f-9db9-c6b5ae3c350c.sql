select cron.unschedule('stackwise-sitemap-health-daily');
select cron.schedule(
  'doseroutine-sitemap-health-daily',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://doseroutine.com/api/public/hooks/sitemap-health',
    headers := jsonb_build_object('Content-Type','application/json','x-admin-secret','sw_sitemap_9a3f7c1e5b2d8f4a6c0e9b7d1f3a5c8e2b4d6f0a'),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  ) AS request_id;
  $$
);
select cron.schedule(
  'doseroutine-sitemap-health-weekly-summary',
  '10 13 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://doseroutine.com/api/public/hooks/sitemap-health?force=summary',
    headers := jsonb_build_object('Content-Type','application/json','x-admin-secret','sw_sitemap_9a3f7c1e5b2d8f4a6c0e9b7d1f3a5c8e2b4d6f0a'),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  ) AS request_id;
  $$
);