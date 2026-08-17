
-- 1. Add goal_tags to compounds
ALTER TABLE public.compounds ADD COLUMN IF NOT EXISTS goal_tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS compounds_goal_tags_idx ON public.compounds USING gin(goal_tags);

-- 2. Allow anon read on compounds and interaction_rules for public library
GRANT SELECT ON public.compounds TO anon;
GRANT SELECT ON public.interaction_rules TO anon;

DROP POLICY IF EXISTS read_compounds ON public.compounds;
CREATE POLICY read_compounds ON public.compounds FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS read_rules ON public.interaction_rules;
CREATE POLICY read_rules ON public.interaction_rules FOR SELECT TO anon, authenticated USING (true);

-- 3. compound_content table (SEO copy)
CREATE TABLE IF NOT EXISTS public.compound_content (
  compound_id uuid PRIMARY KEY REFERENCES public.compounds(id) ON DELETE CASCADE,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  body_md text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compound_content TO anon, authenticated;
GRANT ALL ON public.compound_content TO service_role;
ALTER TABLE public.compound_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_compound_content ON public.compound_content FOR SELECT TO anon, authenticated USING (true);

-- 4. goal_content table (hub-page copy)
CREATE TABLE IF NOT EXISTS public.goal_content (
  slug text PRIMARY KEY,
  title text NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  intro_md text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.goal_content TO anon, authenticated;
GRANT ALL ON public.goal_content TO service_role;
ALTER TABLE public.goal_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_goal_content ON public.goal_content FOR SELECT TO anon, authenticated USING (true);

-- 5. Backfill goal_tags heuristically
-- weight-loss: GLP-1 peptides + thermogenics
UPDATE public.compounds SET goal_tags = array_append(goal_tags,'weight-loss')
  WHERE lower(name) ~ '(semaglutide|tirzepatide|retatrutide|liraglutide|aod|cagrilintide|mounjaro|ozempic|wegovy|zepbound|l-carnitine|berberine|metformin)' AND NOT ('weight-loss' = ANY(goal_tags));

-- muscle: anabolics, IGF, GH secretagogues, creatine, protein cofactors
UPDATE public.compounds SET goal_tags = array_append(goal_tags,'muscle')
  WHERE (category = 'hormone' OR lower(name) ~ '(igf|mgf|ghrp|ipamorelin|sermorelin|tesamorelin|cjc|hexarelin|mk-677|ibutamoren|creatine|hmb|leucine|bpc)') AND NOT ('muscle' = ANY(goal_tags));

-- recovery: healing peptides
UPDATE public.compounds SET goal_tags = array_append(goal_tags,'recovery')
  WHERE lower(name) ~ '(bpc|tb-500|tb500|thymosin|ghk|larazotide|ss-31|kpv|pentadeca|epithalon)' AND NOT ('recovery' = ANY(goal_tags));

-- brain / nootropics
UPDATE public.compounds SET goal_tags = array_append(goal_tags,'brain')
  WHERE lower(name) ~ '(selank|semax|cerebrolysin|dihexa|noopept|piracetam|omega|dha|epa|lion|bacopa|l-theanine|caffeine|creatine|choline|alpha-gpc)' AND NOT ('brain' = ANY(goal_tags));

-- longevity
UPDATE public.compounds SET goal_tags = array_append(goal_tags,'longevity')
  WHERE lower(name) ~ '(epithalon|nad|nmn|nr|rapamycin|resveratrol|spermidine|metformin|glycine|taurine|astaxanthin|quercetin|fisetin|thymalin)' AND NOT ('longevity' = ANY(goal_tags));

-- mitochondria
UPDATE public.compounds SET goal_tags = array_append(goal_tags,'mitochondria')
  WHERE lower(name) ~ '(ss-31|coq10|ubiquinol|pqq|nad|nmn|nr|methylene blue|urolithin|mots-c|humanin)' AND NOT ('mitochondria' = ANY(goal_tags));

-- endurance
UPDATE public.compounds SET goal_tags = array_append(goal_tags,'endurance')
  WHERE lower(name) ~ '(mots-c|aicar|epo|creatine|beta-alanine|nitrate|beetroot|cordyceps|rhodiola|caffeine|carnitine)' AND NOT ('endurance' = ANY(goal_tags));
