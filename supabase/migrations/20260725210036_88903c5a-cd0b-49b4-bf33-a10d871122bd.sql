-- Replace the permissive anon+authenticated insert policy with an
-- authenticated-only one. Anonymous events now flow through
-- /api/public/analytics which rate-limits per IP and uses the service
-- role client, so the anon INSERT grant on the table is no longer needed.

DROP POLICY IF EXISTS "anyone can insert bounded events" ON public.analytics_events;

REVOKE INSERT ON public.analytics_events FROM anon;

CREATE POLICY "authenticated users can insert own analytics events"
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND length(event_name) BETWEEN 1 AND 80
    AND (path IS NULL OR length(path) <= 300)
    AND (session_id IS NULL OR length(session_id) <= 80)
    AND pg_column_size(properties) <= 4096
  );