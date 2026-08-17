
SELECT cron.schedule(
  'doseroutine-notfound-spike-check',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://doseroutine.com/api/public/hooks/notfound-spike-check',
    headers := jsonb_build_object('Content-Type','application/json','x-admin-secret','sw_sitemap_9a3f7c1e5b2d8f4a6c0e9b7d1f3a5c8e2b4d6f0a'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);
