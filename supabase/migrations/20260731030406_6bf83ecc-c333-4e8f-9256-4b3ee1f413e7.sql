ALTER TABLE public.meal_times ADD COLUMN IF NOT EXISTS alerts_on boolean NOT NULL DEFAULT true;

CREATE TABLE public.routine_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  routine_kind text NOT NULL CHECK (routine_kind IN ('workout','meal')),
  routine_id uuid NOT NULL,
  day_key text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push','inbox')),
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX routine_notification_log_unique
  ON public.routine_notification_log (routine_id, day_key, channel);
CREATE INDEX routine_notification_log_user_day
  ON public.routine_notification_log (user_id, day_key);

GRANT SELECT ON public.routine_notification_log TO authenticated;
GRANT ALL ON public.routine_notification_log TO service_role;

ALTER TABLE public.routine_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routine reminder log"
  ON public.routine_notification_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);