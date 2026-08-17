ALTER TABLE public.closed_testing_signups
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS landing_path text,
  ADD COLUMN IF NOT EXISTS attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS installed_at timestamptz,
  ADD COLUMN IF NOT EXISTS retained_14d_at timestamptz;

CREATE INDEX IF NOT EXISTS closed_testing_signups_utm_source_idx
  ON public.closed_testing_signups (utm_source);

CREATE OR REPLACE FUNCTION public.closed_testing_funnel_by_source()
RETURNS TABLE (
  source text,
  medium text,
  campaign text,
  signups bigint,
  invited bigint,
  installed bigint,
  retained_14d bigint,
  converted bigint,
  first_signup timestamptz,
  last_signup timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(s.utm_source, ''), 'direct') AS source,
    COALESCE(NULLIF(s.utm_medium, ''), 'none') AS medium,
    COALESCE(NULLIF(s.utm_campaign, ''), 'none') AS campaign,
    COUNT(*)::bigint AS signups,
    COUNT(s.invited_at)::bigint AS invited,
    COUNT(s.installed_at)::bigint AS installed,
    COUNT(s.retained_14d_at)::bigint AS retained_14d,
    COUNT(s.converted_at)::bigint AS converted,
    MIN(s.created_at) AS first_signup,
    MAX(s.created_at) AS last_signup
  FROM public.closed_testing_signups s
  WHERE public.is_admin()
  GROUP BY 1, 2, 3
  ORDER BY COUNT(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.closed_testing_funnel_by_source() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.closed_testing_funnel_by_source() TO authenticated, service_role;