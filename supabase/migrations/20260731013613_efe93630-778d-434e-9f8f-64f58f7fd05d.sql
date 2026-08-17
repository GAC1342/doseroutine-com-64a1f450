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
  GROUP BY 1, 2, 3
  ORDER BY COUNT(*) DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.closed_testing_funnel_by_source() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.closed_testing_funnel_by_source() TO service_role;