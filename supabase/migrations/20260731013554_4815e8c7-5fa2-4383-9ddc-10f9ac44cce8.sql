REVOKE EXECUTE ON FUNCTION public.closed_testing_funnel_by_source() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.closed_testing_funnel_by_source() TO service_role;