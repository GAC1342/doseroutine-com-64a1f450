ALTER TABLE public.vial_inventory
  ADD COLUMN IF NOT EXISTS cost_per_vial numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';