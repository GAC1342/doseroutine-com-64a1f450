
-- 1. is_admin: switch to SECURITY INVOKER (safe: admins table has RLS for self-read)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE lower(email) = lower(auth.jwt()->>'email')
  );
$$;

-- 2. Revoke EXECUTE from anon/authenticated/PUBLIC on remaining SECURITY DEFINER functions.
--    Trigger functions run under the table owner regardless of EXECUTE grants.
--    get_shared_protocol is now invoked only server-side via the service role.
REVOKE ALL ON FUNCTION public.get_shared_protocol(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adjust_vial_on_dose_change() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_shared_protocol(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
