
-- Backfill goal_tags for compounds missing them, based on category + name keywords
UPDATE compounds SET goal_tags = ARRAY['weight-loss']::text[]
WHERE (goal_tags IS NULL OR array_length(goal_tags,1) IS NULL)
  AND (category='glp1' OR name ~* 'semaglutide|tirzepatide|liraglutide|retatrutide|orlistat|phentermine|bupropion|naltrexone|topiramate|contrave|qsymia|wegovy|ozempic|mounjaro|zepbound|saxenda');

UPDATE compounds SET goal_tags = ARRAY['muscle','recovery']::text[]
WHERE (goal_tags IS NULL OR array_length(goal_tags,1) IS NULL)
  AND (name ~* 'testosterone|nandrolone|oxandrolone|anavar|trenbolone|stanozolol|winstrol|deca|primobolan|masteron|dianabol|anadrol|hgh|somatropin|ipamorelin|cjc|tesamorelin|mk-677|ibutamoren|clenbuterol|clen|ostarine|ligandrol|rad-140|yk-11|s-23|s-4|andarine|cardarine|gw-501516|sr-9009');

UPDATE compounds SET goal_tags = ARRAY['recovery']::text[]
WHERE (goal_tags IS NULL OR array_length(goal_tags,1) IS NULL)
  AND (name ~* 'bpc|tb-500|tb500|thymosin|ghk|pentosan|collagen|glucosamine|chondroitin|msm|curcumin|boswellia|arnica|bromelain|ibuprofen|naproxen|diclofenac|celecoxib|meloxicam|prednisone|methylprednisolone');

UPDATE compounds SET goal_tags = ARRAY['brain']::text[]
WHERE (goal_tags IS NULL OR array_length(goal_tags,1) IS NULL)
  AND (name ~* 'modafinil|armodafinil|adderall|vyvanse|ritalin|methylphenidate|amphetamine|atomoxetine|guanfacine|piracetam|aniracetam|oxiracetam|phenylpiracetam|noopept|semax|selank|cerebrolysin|dihexa|racetam|choline|alpha-gpc|citicoline|huperzine|bacopa|lion|rhodiola|ashwagandha|l-theanine|caffeine|nicotine|ketamine|psilocybin|mdma|lsd|amantadine|memantine|donepezil|rivastigmine|galantamine|escitalopram|sertraline|fluoxetine|paroxetine|venlafaxine|duloxetine|bupropion|mirtazapine|trazodone|buspirone|alprazolam|clonazepam|diazepam|lorazepam|zolpidem|melatonin|magnesium threonate');

UPDATE compounds SET goal_tags = ARRAY['longevity']::text[]
WHERE (goal_tags IS NULL OR array_length(goal_tags,1) IS NULL)
  AND (name ~* 'metformin|rapamycin|sirolimus|acarbose|dasatinib|quercetin|fisetin|spermidine|nmn|nr|nicotinamide|resveratrol|pterostilbene|senolytic|epithalon|epitalon|glynac|nac|glycine|taurine|sulforaphane|berberine|astaxanthin|hyaluronic|ldn|low.dose.naltrexone|gdf|klotho|17.?alpha.?estradiol|urolithin');

UPDATE compounds SET goal_tags = ARRAY['mitochondria','longevity']::text[]
WHERE (goal_tags IS NULL OR array_length(goal_tags,1) IS NULL)
  AND (name ~* 'coq10|ubiquinol|pqq|mitoq|shilajit|d.?ribose|creatine|l.?carnitine|acetyl.?l.?carnitine|alpha.?lipoic|ala|methylene blue|mots.?c');

UPDATE compounds SET goal_tags = ARRAY['endurance']::text[]
WHERE (goal_tags IS NULL OR array_length(goal_tags,1) IS NULL)
  AND (name ~* 'beta.?alanine|beetroot|nitrate|citrulline|arginine|cordyceps|epo|erythropoietin|aicar|epicatechin');

-- Cardio / BP / diabetes meds default to longevity bucket (metabolic health)
UPDATE compounds SET goal_tags = ARRAY['longevity']::text[]
WHERE (goal_tags IS NULL OR array_length(goal_tags,1) IS NULL)
  AND category='medication'
  AND name ~* 'statin|atorvastatin|rosuvastatin|simvastatin|pravastatin|ezetimibe|pcsk9|lisinopril|losartan|valsartan|amlodipine|hydrochlorothiazide|metoprolol|carvedilol|propranolol|bisoprolol|spironolactone|aspirin|clopidogrel|warfarin|apixaban|rivaroxaban|insulin|glipizide|glimepiride|sitagliptin|linagliptin|empagliflozin|dapagliflozin|canagliflozin|pioglitazone';

-- Vitamins / minerals default to longevity
UPDATE compounds SET goal_tags = ARRAY['longevity']::text[]
WHERE (goal_tags IS NULL OR array_length(goal_tags,1) IS NULL)
  AND category IN ('vitamin','mineral');

-- Any remaining untagged -> longevity as safe default
UPDATE compounds SET goal_tags = ARRAY['longevity']::text[]
WHERE goal_tags IS NULL OR array_length(goal_tags,1) IS NULL;
