ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS meal_type text,
  ADD COLUMN IF NOT EXISTS fiber_g numeric,
  ADD COLUMN IF NOT EXISTS health_score integer;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meals_meal_type_check') THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_meal_type_check
      CHECK (meal_type IS NULL OR meal_type IN ('breakfast','lunch','dinner','snack'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meals_health_score_check') THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_health_score_check
      CHECK (health_score IS NULL OR (health_score >= 1 AND health_score <= 10));
  END IF;
END $$;

UPDATE public.meals SET name = label WHERE name IS NULL;
UPDATE public.meals
   SET meal_type = lower(meal_slot)
 WHERE meal_type IS NULL
   AND lower(coalesce(meal_slot,'')) IN ('breakfast','lunch','dinner','snack');

CREATE INDEX IF NOT EXISTS meals_user_logged_at_idx ON public.meals (user_id, logged_at DESC);

ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS cache_key text;

CREATE UNIQUE INDEX IF NOT EXISTS foods_cache_key_idx ON public.foods (cache_key) WHERE cache_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS foods_gtin_idx ON public.foods (gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS foods_name_norm_idx ON public.foods (name_norm);