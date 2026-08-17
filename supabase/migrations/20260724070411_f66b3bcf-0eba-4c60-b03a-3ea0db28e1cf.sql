
CREATE TABLE public.not_found_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL CHECK (char_length(path) <= 500),
  referrer text CHECK (referrer IS NULL OR char_length(referrer) <= 1000),
  user_agent text CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  ip_hash text CHECK (ip_hash IS NULL OR char_length(ip_hash) <= 64),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX not_found_log_occurred_at_idx ON public.not_found_log (occurred_at DESC);
CREATE INDEX not_found_log_path_idx ON public.not_found_log (path);
CREATE INDEX not_found_log_dedup_idx ON public.not_found_log (path, ip_hash, occurred_at DESC);

GRANT ALL ON public.not_found_log TO service_role;

ALTER TABLE public.not_found_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read not_found_log"
  ON public.not_found_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
