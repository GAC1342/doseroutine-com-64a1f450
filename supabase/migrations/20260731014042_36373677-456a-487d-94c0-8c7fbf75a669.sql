ALTER TABLE public.closed_testing_signups
  ADD COLUMN IF NOT EXISTS welcome_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS install_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedback_prompt_at timestamptz,
  ADD COLUMN IF NOT EXISTS wrapup_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS sequence_opted_out boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS closed_testing_signups_sequence_idx
  ON public.closed_testing_signups (sequence_opted_out, invited_at, created_at);

do $$
begin
  if exists (select 1 from cron.job where jobname = 'tester-onboarding-sequence') then
    perform cron.unschedule('tester-onboarding-sequence');
  end if;
end$$;

select cron.schedule(
  'tester-onboarding-sequence',
  '17 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://doseroutine.com/api/public/hooks/tester-onboarding-sequence',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);