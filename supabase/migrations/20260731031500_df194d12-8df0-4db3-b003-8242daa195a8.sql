ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_alert_limit integer NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.profiles.daily_alert_limit IS
  'Max buzzing notifications (push/email) per local calendar day. 0 = unlimited.';

ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS day_key text;

CREATE INDEX IF NOT EXISTS notification_log_user_day_idx
  ON public.notification_log (user_id, day_key);

CREATE INDEX IF NOT EXISTS routine_notification_log_user_day_status_idx
  ON public.routine_notification_log (user_id, day_key, status);