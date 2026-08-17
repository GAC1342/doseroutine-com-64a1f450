CREATE TABLE public.label_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scan_history_id uuid REFERENCES public.scan_history(id) ON DELETE SET NULL,
  barcode text,
  product_name text,
  brand text,
  source_name text,
  source_url text,
  confidence_score integer,
  reason text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_reports TO authenticated;
GRANT ALL ON public.label_reports TO service_role;

ALTER TABLE public.label_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own label reports"
ON public.label_reports FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX label_reports_barcode_idx ON public.label_reports (barcode, created_at DESC);
CREATE INDEX label_reports_user_idx ON public.label_reports (user_id, created_at DESC);

CREATE TRIGGER update_label_reports_updated_at
BEFORE UPDATE ON public.label_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();