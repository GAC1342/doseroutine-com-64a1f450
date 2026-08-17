ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS meal_photo_retention_days smallint NOT NULL DEFAULT 30;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_meal_photo_retention_days_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_meal_photo_retention_days_check
  CHECK (meal_photo_retention_days IN (7, 30, 90));