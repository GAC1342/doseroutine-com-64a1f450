CREATE TABLE public.logging_reminder_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  meals_enabled boolean NOT NULL DEFAULT true,
  doses_enabled boolean NOT NULL DEFAULT true,
  breakfast_by time NOT NULL DEFAULT '10:30',
  lunch_by time NOT NULL DEFAULT '14:30',
  dinner_by time NOT NULL DEFAULT '20:30',
  quiet_after time NOT NULL DEFAULT '21:30',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logging_reminder_settings TO authenticated;
GRANT ALL ON public.logging_reminder_settings TO service_role;

ALTER TABLE public.logging_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own logging reminder settings"
ON public.logging_reminder_settings FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER logging_reminder_settings_set_updated_at
BEFORE UPDATE ON public.logging_reminder_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.grocery_list_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week_start date NOT NULL,
  name text NOT NULL,
  quantity text,
  checked boolean NOT NULL DEFAULT false,
  is_custom boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start, name)
);

CREATE INDEX grocery_list_overrides_user_week_idx ON public.grocery_list_overrides (user_id, week_start);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_list_overrides TO authenticated;
GRANT ALL ON public.grocery_list_overrides TO service_role;

ALTER TABLE public.grocery_list_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own grocery list items"
ON public.grocery_list_overrides FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER grocery_list_overrides_set_updated_at
BEFORE UPDATE ON public.grocery_list_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();