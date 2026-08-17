CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('meal-photo-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'meal-photo-cleanup');

SELECT cron.schedule(
  'meal-photo-cleanup',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://project--b76a384e-67c0-4f04-b53e-b70d374f6ac7.lovable.app/api/public/hooks/meal-photo-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);