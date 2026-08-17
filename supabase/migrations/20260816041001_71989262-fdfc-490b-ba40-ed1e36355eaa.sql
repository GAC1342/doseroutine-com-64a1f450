ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS meal_slot text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS ai_confidence text,
  ADD COLUMN IF NOT EXISTS ai_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS meals_user_logged_at_idx ON public.meals (user_id, logged_at DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_calories numeric,
  ADD COLUMN IF NOT EXISTS target_protein_g numeric,
  ADD COLUMN IF NOT EXISTS target_carbs_g numeric,
  ADD COLUMN IF NOT EXISTS target_fat_g numeric;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals TO authenticated;
GRANT ALL ON public.meals TO service_role;