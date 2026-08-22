ALTER TABLE public.food_portions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';