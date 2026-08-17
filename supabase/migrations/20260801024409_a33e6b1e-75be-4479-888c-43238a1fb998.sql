ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ending_email_at timestamptz;

CREATE INDEX IF NOT EXISTS subscriptions_trial_warning_idx
  ON public.subscriptions (status, current_period_end)
  WHERE trial_ending_email_at IS NULL;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'trial-ending-reminders') then
    perform cron.unschedule('trial-ending-reminders');
  end if;
end$$;

select cron.schedule(
  'trial-ending-reminders',
  '32 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://doseroutine.com/api/public/hooks/trial-ending-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);