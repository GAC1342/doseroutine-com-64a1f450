ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS fiber_100g numeric,
  ADD COLUMN IF NOT EXISTS sugar_100g numeric,
  ADD COLUMN IF NOT EXISTS sodium_100mg numeric,
  ADD COLUMN IF NOT EXISTS satfat_100g numeric,
  ADD COLUMN IF NOT EXISTS gtin text;

CREATE INDEX IF NOT EXISTS foods_gtin_idx ON public.foods (gtin) WHERE gtin IS NOT NULL;