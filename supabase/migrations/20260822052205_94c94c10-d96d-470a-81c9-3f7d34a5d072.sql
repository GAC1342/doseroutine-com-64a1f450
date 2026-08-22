CREATE TABLE public.barcode_cache (
  code text PRIMARY KEY,
  category text NOT NULL DEFAULT 'other',
  source text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.barcode_cache TO authenticated;
GRANT ALL ON public.barcode_cache TO service_role;
ALTER TABLE public.barcode_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read the shared barcode cache"
  ON public.barcode_cache FOR SELECT TO authenticated USING (true);
CREATE TRIGGER barcode_cache_set_updated_at
  BEFORE UPDATE ON public.barcode_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.barcode_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  field text NOT NULL,
  old_value text,
  new_value text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX barcode_corrections_code_field_idx ON public.barcode_corrections (code, field);
GRANT SELECT, INSERT ON public.barcode_corrections TO authenticated;
GRANT ALL ON public.barcode_corrections TO service_role;
ALTER TABLE public.barcode_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own barcode corrections"
  ON public.barcode_corrections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add their own barcode corrections"
  ON public.barcode_corrections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.barcode_scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  category text,
  source text,
  resolved boolean NOT NULL DEFAULT false,
  latency_ms integer,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX barcode_scan_events_code_idx ON public.barcode_scan_events (code);
CREATE INDEX barcode_scan_events_resolved_idx ON public.barcode_scan_events (resolved, created_at DESC);
GRANT SELECT, INSERT ON public.barcode_scan_events TO authenticated;
GRANT ALL ON public.barcode_scan_events TO service_role;
ALTER TABLE public.barcode_scan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own scan events"
  ON public.barcode_scan_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add their own scan events"
  ON public.barcode_scan_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);