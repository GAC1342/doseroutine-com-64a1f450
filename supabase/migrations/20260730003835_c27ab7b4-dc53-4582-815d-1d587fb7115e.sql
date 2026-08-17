CREATE TABLE public.app_launch_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  platform text,
  utm_source text,
  ip_hash text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.app_launch_waitlist TO anon;
GRANT INSERT ON public.app_launch_waitlist TO authenticated;
GRANT ALL ON public.app_launch_waitlist TO service_role;

ALTER TABLE public.app_launch_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the app launch waitlist"
  ON public.app_launch_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can manage app launch waitlist"
  ON public.app_launch_waitlist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Helpful for deduplication and admin dashboards.
CREATE UNIQUE INDEX app_launch_waitlist_email_idx ON public.app_launch_waitlist (lower(email));