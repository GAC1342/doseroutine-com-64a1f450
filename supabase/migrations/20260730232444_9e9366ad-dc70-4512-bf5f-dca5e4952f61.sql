do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-workout-reminders') then
    perform cron.unschedule('send-workout-reminders');
  end if;
end$$;

select cron.schedule(
  'send-workout-reminders',
  '*/10 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://doseroutine.com/api/public/hooks/send-workout-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);