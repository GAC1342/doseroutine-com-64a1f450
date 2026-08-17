ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS scheduled_time time;

CREATE TABLE public.workout_reminder_settings (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  lead_minutes integer NOT NULL DEFAULT 30,
  missed_enabled boolean NOT NULL DEFAULT true,
  missed_check_hour integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_reminder_settings TO authenticated;
GRANT ALL ON public.workout_reminder_settings TO service_role;

ALTER TABLE public.workout_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workout reminder settings"
ON public.workout_reminder_settings FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_workout_reminder_settings_updated_at
BEFORE UPDATE ON public.workout_reminder_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workout_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_log_id uuid NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  kind text NOT NULL,
  channel text NOT NULL,
  status text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_log_id, kind, channel)
);

GRANT SELECT ON public.workout_notification_log TO authenticated;
GRANT ALL ON public.workout_notification_log TO service_role;

ALTER TABLE public.workout_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workout notification log"
ON public.workout_notification_log FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_workout_logs_planned ON public.workout_logs (status, performed_on) WHERE status = 'planned';