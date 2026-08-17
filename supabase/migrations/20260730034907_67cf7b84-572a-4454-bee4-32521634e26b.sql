ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'teal',
  ADD COLUMN IF NOT EXISTS color_scheme text NOT NULL DEFAULT 'system';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_theme_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_theme_check
  CHECK (theme IN ('teal','blue','turquoise','indigo','green','violet','graphite'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_color_scheme_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_color_scheme_check
  CHECK (color_scheme IN ('light','dark','system'));