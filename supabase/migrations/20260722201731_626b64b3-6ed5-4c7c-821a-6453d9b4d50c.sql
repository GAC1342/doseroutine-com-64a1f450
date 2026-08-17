
CREATE TABLE public.body_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC,
  body_fat_pct NUMERIC,
  waist_cm NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, checked_at)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_checkins TO authenticated;
GRANT ALL ON public.body_checkins TO service_role;

ALTER TABLE public.body_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_checkins" ON public.body_checkins
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX body_checkins_user_date_idx ON public.body_checkins (user_id, checked_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_body_checkins_updated_at
  BEFORE UPDATE ON public.body_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
