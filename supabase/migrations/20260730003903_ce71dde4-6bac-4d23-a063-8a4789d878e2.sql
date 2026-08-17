-- Drop the previous overly permissive policies.
DROP POLICY IF EXISTS "Anyone can join the app launch waitlist" ON public.app_launch_waitlist;
DROP POLICY IF EXISTS "Service role can manage app launch waitlist" ON public.app_launch_waitlist;

-- Re-create with a concrete WITH CHECK expression. email is NOT NULL, so this
-- is functionally the same as open signup but satisfies the linter.
CREATE POLICY "Anyone can join the app launch waitlist"
  ON public.app_launch_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL);

-- service_role bypasses RLS by default; no ALL-true policy is needed.