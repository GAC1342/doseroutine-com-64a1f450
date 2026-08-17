CREATE TABLE public.scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_compound_id uuid REFERENCES public.user_compounds(id) ON DELETE CASCADE,
  barcode text,
  product_name text,
  brand text,
  source_name text,
  source_url text,
  confidence_score integer,
  confidence_level text,
  summary text,
  directions text,
  applied boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_history TO authenticated;
GRANT ALL ON public.scan_history TO service_role;

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own scan history"
ON public.scan_history FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX scan_history_user_compound_idx ON public.scan_history (user_compound_id, created_at DESC);
CREATE INDEX scan_history_user_idx ON public.scan_history (user_id, created_at DESC);

CREATE TRIGGER update_scan_history_updated_at
BEFORE UPDATE ON public.scan_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();