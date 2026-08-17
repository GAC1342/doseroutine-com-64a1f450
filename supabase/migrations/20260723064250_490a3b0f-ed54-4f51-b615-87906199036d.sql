ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grandfathered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET grandfathered = true WHERE grandfathered = false;