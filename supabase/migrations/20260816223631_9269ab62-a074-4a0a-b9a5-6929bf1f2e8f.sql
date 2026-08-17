CREATE TABLE IF NOT EXISTS public.redirect_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_url text NOT NULL,
  expected_url text NOT NULL,
  reason text,
  status integer,
  location text,
  target_status integer,
  target_redirects boolean NOT NULL DEFAULT false,
  from_robots_allowed boolean,
  to_robots_allowed boolean,
  fetch_error text,
  is_failing boolean NOT NULL DEFAULT false,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_url)
);

GRANT ALL ON public.redirect_verifications TO service_role;
GRANT SELECT ON public.redirect_verifications TO authenticated;

ALTER TABLE public.redirect_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view redirect verifications" ON public.redirect_verifications;
CREATE POLICY "Admins can view redirect verifications"
ON public.redirect_verifications
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_redirect_verifications_failing ON public.redirect_verifications (is_failing, checked_at DESC);