
INSERT INTO public.compounds (name, slug, aliases, category, default_unit, typical_timing, food_rule, is_injectable, is_controlled, goal_tags, education_md)
VALUES
 ('Black Cohosh','black-cohosh', ARRAY['Actaea racemosa','Cimicifuga racemosa'],'supplement','mg','evening','with_food',false,false, ARRAY['menopause','womens-longevity'], 'Botanical studied for hot flashes and night sweats during perimenopause and menopause. Typical study doses are 20-40 mg of standardised extract once or twice daily; effects build over 4-8 weeks. Rare reports of liver enzyme elevation make periodic bloodwork sensible on long-term use.'),
 ('Red Clover','red-clover', ARRAY['Trifolium pratense'],'supplement','mg','morning','with_food',false,false, ARRAY['menopause','womens-longevity'], 'Source of isoflavones (biochanin A, formononetin) researched for menopausal vasomotor symptoms and bone density. Common doses supply 40-80 mg isoflavones daily. Discuss with a clinician if you have a hormone-sensitive condition.'),
 ('Soy Isoflavones','soy-isoflavones', ARRAY['genistein','daidzein','equol'],'supplement','mg','morning','with_food',false,false, ARRAY['menopause','womens-longevity','longevity'], 'Phytoestrogens that weakly bind estrogen receptors. Studied for hot flash frequency, bone mineral density and cardiovascular markers. 40-80 mg/day is the usual research range; benefits are strongest in people who produce equol.'),
 ('Vitex (Chasteberry)','vitex-agnus-castus', ARRAY['chasteberry','chaste tree'],'supplement','mg','morning','empty_stomach',false,false, ARRAY['fertility','menopause'], 'Acts on dopamine receptors to lower prolactin, which is why it is studied for luteal-phase support, cycle regularity and PMS. Typical doses are 20-40 mg of standardised extract each morning; give it three cycles. Can interact with dopaminergic medication and hormonal birth control.'),
 ('Evening Primrose Oil','evening-primrose-oil', ARRAY['EPO','gamma-linolenic acid'],'supplement','mg','evening','with_food',false,false, ARRAY['menopause','womens-longevity'], 'Supplies gamma-linolenic acid (GLA). Researched for cyclical breast tenderness, skin barrier support and menopausal comfort. Common doses are 1000-3000 mg/day providing roughly 8-10% GLA.'),
 ('Dong Quai','dong-quai', ARRAY['Angelica sinensis'],'supplement','mg','evening','with_food',false,false, ARRAY['menopause','fertility'], 'Traditional Chinese herb used in menopause and cycle formulas, usually alongside other botanicals rather than alone. Evidence as a single agent is weak. Can increase bleeding risk with anticoagulants and causes photosensitivity in some people.'),
 ('D-Chiro-Inositol','d-chiro-inositol', ARRAY['DCI'],'supplement','mg','morning','either',false,false, ARRAY['fertility','metabolic'], 'Paired with myo-inositol in a 40:1 ratio for PCOS protocols. Used alone at high doses it can worsen egg quality, so keep it as the minor partner (roughly 50 mg against 4 g myo-inositol daily).')
ON CONFLICT (slug) DO NOTHING;

UPDATE public.compounds SET goal_tags = (SELECT array_agg(DISTINCT x) FROM unnest(goal_tags || ARRAY['womens-longevity']) x)
WHERE slug IN ('collagen','calcium','vitamin-d3','vitamin-k2','magnesium-glycinate','iron','omega-3','creatine','nmn','nr','resveratrol','spermidine','coq10','dhea','progesterone','estradiol','estradiol-valerate','hyaluronic-acid-oral','folate','vitamin-b9-folate','ashwagandha','maca-root','inositol');

UPDATE public.compounds SET goal_tags = (SELECT array_agg(DISTINCT x) FROM unnest(goal_tags || ARRAY['fertility']) x)
WHERE slug IN ('inositol','coq10','folate','vitamin-b9-folate','vitamin-d3','iron','omega-3','progesterone','dhea');

UPDATE public.compounds SET goal_tags = (SELECT array_agg(DISTINCT x) FROM unnest(goal_tags || ARRAY['menopause']) x)
WHERE slug IN ('estradiol','estradiol-valerate','progesterone','dhea','maca-root','magnesium-glycinate','calcium','vitamin-d3','vitamin-k2','collagen','creatine','ashwagandha');

UPDATE public.compounds SET goal_tags = (SELECT array_agg(DISTINCT x) FROM unnest(goal_tags || ARRAY['libido']) x)
WHERE slug IN ('pt-141','tadalafil','sildenafil','l-arginine','panax-ginseng','shilajit','dhea','testosterone-cypionate','estradiol','ashwagandha','fadogia-agrestis','zinc-picolinate');

UPDATE public.compounds SET goal_tags = (SELECT array_agg(DISTINCT x) FROM unnest(goal_tags || ARRAY['mens-longevity']) x)
WHERE slug IN ('tadalafil','shilajit','omega-3','vitamin-d3','coq10','nmn','creatine','ashwagandha','tongkat-ali','testosterone-cypionate','magnesium-glycinate','vitamin-k2');
