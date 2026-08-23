REVOKE EXECUTE ON FUNCTION public.barcode_scan_stats(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.barcode_miss_report(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.barcode_scan_stats(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.barcode_miss_report(integer, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_shared_routine(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_routine_share_view(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_routine_share_save(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_routine(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_routine_share_view(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_routine_share_save(text) TO anon, authenticated, service_role;