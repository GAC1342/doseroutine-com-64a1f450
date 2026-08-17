ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pause_start date,
  ADD COLUMN IF NOT EXISTS pause_end date,
  ADD COLUMN IF NOT EXISTS pause_reason text;