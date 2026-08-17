do $$
begin
  if exists (select 1 from cron.job where jobname = 'meal-photo-cleanup') then
    perform cron.unschedule('meal-photo-cleanup');
  end if;
end$$;

select cron.schedule(
  'meal-photo-cleanup',
  '0 3 * * 0',
  $cron$
  SELECT net.http_post(
    url := 'https://doseroutine.com/api/public/hooks/meal-photo-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);