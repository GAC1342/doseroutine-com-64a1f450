DROP POLICY IF EXISTS "Anyone can join the app launch waitlist" ON public.app_launch_waitlist;
REVOKE INSERT, SELECT, UPDATE, DELETE ON public.app_launch_waitlist FROM anon, authenticated;
GRANT ALL ON public.app_launch_waitlist TO service_role;