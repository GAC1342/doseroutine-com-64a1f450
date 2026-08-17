CREATE TABLE public.product_labels (
  barcode TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_labels TO authenticated;
GRANT ALL ON public.product_labels TO service_role;

ALTER TABLE public.product_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read cached product labels"
ON public.product_labels
FOR SELECT
TO authenticated
USING (true);