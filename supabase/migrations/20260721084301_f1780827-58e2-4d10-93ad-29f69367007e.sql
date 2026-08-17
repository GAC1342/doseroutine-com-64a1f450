
DROP POLICY "anyone can insert events" ON public.analytics_events;
CREATE POLICY "anyone can insert bounded events" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(event_name) BETWEEN 1 AND 80
    AND (path IS NULL OR length(path) <= 300)
    AND (session_id IS NULL OR length(session_id) <= 80)
    AND pg_column_size(properties) <= 4096
    AND (user_id IS NULL OR user_id = auth.uid())
  );
