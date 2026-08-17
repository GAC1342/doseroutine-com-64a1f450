
CREATE TABLE public.lab_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  ref_low NUMERIC,
  ref_high NUMERIC,
  ref_low_male NUMERIC,
  ref_high_male NUMERIC,
  ref_low_female NUMERIC,
  ref_high_female NUMERIC,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 100
);
GRANT SELECT ON public.lab_markers TO anon, authenticated;
GRANT ALL ON public.lab_markers TO service_role;
ALTER TABLE public.lab_markers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_markers readable by everyone" ON public.lab_markers FOR SELECT USING (true);

CREATE TABLE public.lab_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drawn_on DATE NOT NULL,
  lab_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_panels TO authenticated;
GRANT ALL ON public.lab_panels TO service_role;
ALTER TABLE public.lab_panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lab_panels" ON public.lab_panels FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER lab_panels_updated_at BEFORE UPDATE ON public.lab_panels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  panel_id UUID NOT NULL REFERENCES public.lab_panels(id) ON DELETE CASCADE,
  marker_slug TEXT NOT NULL REFERENCES public.lab_markers(slug),
  value NUMERIC NOT NULL,
  unit TEXT,
  ref_low NUMERIC,
  ref_high NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_results TO authenticated;
GRANT ALL ON public.lab_results TO service_role;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lab_results" ON public.lab_results FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX lab_results_user_marker_idx ON public.lab_results (user_id, marker_slug, created_at DESC);

INSERT INTO public.lab_markers (slug, name, category, unit, ref_low_male, ref_high_male, ref_low_female, ref_high_female, ref_low, ref_high, sort_order) VALUES
  ('total_testosterone', 'Total Testosterone', 'Hormones', 'ng/dL', 300, 1000, 15, 70, NULL, NULL, 10),
  ('free_testosterone', 'Free Testosterone', 'Hormones', 'pg/mL', 46, 224, 0.2, 5.0, NULL, NULL, 20),
  ('estradiol', 'Estradiol (E2, sensitive)', 'Hormones', 'pg/mL', 10, 40, 15, 350, NULL, NULL, 30),
  ('shbg', 'SHBG', 'Hormones', 'nmol/L', 10, 57, 18, 144, NULL, NULL, 40),
  ('lh', 'LH', 'Hormones', 'mIU/mL', 1.7, 8.6, 2, 12, NULL, NULL, 50),
  ('fsh', 'FSH', 'Hormones', 'mIU/mL', 1.5, 12.4, 3, 10, NULL, NULL, 60),
  ('prolactin', 'Prolactin', 'Hormones', 'ng/mL', 4, 15, 5, 25, NULL, NULL, 70),
  ('dht', 'DHT', 'Hormones', 'ng/dL', 30, 85, 4, 22, NULL, NULL, 80),
  ('progesterone', 'Progesterone', 'Hormones', 'ng/mL', 0.14, 2.06, 0.2, 25, NULL, NULL, 90),
  ('cortisol_am', 'Cortisol (AM)', 'Hormones', 'µg/dL', NULL, NULL, NULL, NULL, 6.2, 19.4, 100),
  ('tsh', 'TSH', 'Thyroid', 'µIU/mL', NULL, NULL, NULL, NULL, 0.45, 4.5, 110),
  ('free_t4', 'Free T4', 'Thyroid', 'ng/dL', NULL, NULL, NULL, NULL, 0.82, 1.77, 120),
  ('free_t3', 'Free T3', 'Thyroid', 'pg/mL', NULL, NULL, NULL, NULL, 2.0, 4.4, 130),
  ('reverse_t3', 'Reverse T3', 'Thyroid', 'ng/dL', NULL, NULL, NULL, NULL, 9.2, 24.1, 140),
  ('hematocrit', 'Hematocrit', 'CBC', '%', 38.3, 48.6, 35.5, 44.9, NULL, NULL, 200),
  ('hemoglobin', 'Hemoglobin', 'CBC', 'g/dL', 13.2, 16.6, 11.6, 15, NULL, NULL, 210),
  ('rbc', 'RBC', 'CBC', 'M/µL', 4.35, 5.65, 3.92, 5.13, NULL, NULL, 220),
  ('wbc', 'WBC', 'CBC', 'K/µL', NULL, NULL, NULL, NULL, 3.4, 10.8, 230),
  ('platelets', 'Platelets', 'CBC', 'K/µL', NULL, NULL, NULL, NULL, 150, 450, 240),
  ('total_cholesterol', 'Total Cholesterol', 'Lipids', 'mg/dL', NULL, NULL, NULL, NULL, 100, 199, 300),
  ('ldl', 'LDL', 'Lipids', 'mg/dL', NULL, NULL, NULL, NULL, 0, 99, 310),
  ('hdl', 'HDL', 'Lipids', 'mg/dL', 40, 100, 50, 100, NULL, NULL, 320),
  ('triglycerides', 'Triglycerides', 'Lipids', 'mg/dL', NULL, NULL, NULL, NULL, 0, 149, 330),
  ('apo_b', 'ApoB', 'Lipids', 'mg/dL', NULL, NULL, NULL, NULL, 40, 100, 340),
  ('lp_a', 'Lp(a)', 'Lipids', 'nmol/L', NULL, NULL, NULL, NULL, 0, 75, 350),
  ('glucose_fasting', 'Glucose (Fasting)', 'Metabolic', 'mg/dL', NULL, NULL, NULL, NULL, 65, 99, 400),
  ('hba1c', 'HbA1c', 'Metabolic', '%', NULL, NULL, NULL, NULL, 4.0, 5.6, 410),
  ('insulin_fasting', 'Insulin (Fasting)', 'Metabolic', 'µIU/mL', NULL, NULL, NULL, NULL, 2.6, 24.9, 420),
  ('homa_ir', 'HOMA-IR', 'Metabolic', '', NULL, NULL, NULL, NULL, 0.5, 1.4, 430),
  ('alt', 'ALT', 'Liver', 'U/L', NULL, NULL, NULL, NULL, 0, 44, 500),
  ('ast', 'AST', 'Liver', 'U/L', NULL, NULL, NULL, NULL, 0, 40, 510),
  ('ggt', 'GGT', 'Liver', 'U/L', NULL, NULL, NULL, NULL, 0, 65, 520),
  ('creatinine', 'Creatinine', 'Kidney', 'mg/dL', 0.76, 1.27, 0.57, 1.0, NULL, NULL, 600),
  ('egfr', 'eGFR', 'Kidney', 'mL/min', NULL, NULL, NULL, NULL, 60, 200, 610),
  ('bun', 'BUN', 'Kidney', 'mg/dL', NULL, NULL, NULL, NULL, 6, 24, 620),
  ('psa', 'PSA', 'Prostate', 'ng/mL', NULL, NULL, NULL, NULL, 0, 4.0, 700),
  ('igf_1', 'IGF-1', 'Growth', 'ng/mL', NULL, NULL, NULL, NULL, 88, 246, 800),
  ('vitamin_d', 'Vitamin D (25-OH)', 'Vitamins', 'ng/mL', NULL, NULL, NULL, NULL, 30, 100, 900),
  ('b12', 'Vitamin B12', 'Vitamins', 'pg/mL', NULL, NULL, NULL, NULL, 232, 1245, 910),
  ('ferritin', 'Ferritin', 'Iron', 'ng/mL', 30, 400, 15, 150, NULL, NULL, 920),
  ('crp_hs', 'hs-CRP', 'Inflammation', 'mg/L', NULL, NULL, NULL, NULL, 0, 1.0, 950)
ON CONFLICT (slug) DO NOTHING;
