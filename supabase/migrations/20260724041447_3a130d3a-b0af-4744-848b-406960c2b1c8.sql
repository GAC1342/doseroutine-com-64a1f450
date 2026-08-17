UPDATE public.compound_content
SET meta_title = REPLACE(meta_title, 'Stackwise', 'DoseRoutine'),
    meta_description = REPLACE(meta_description, 'Stackwise', 'DoseRoutine'),
    body_md = REPLACE(body_md, 'Stackwise', 'DoseRoutine'),
    overview_md = REPLACE(overview_md, 'Stackwise', 'DoseRoutine'),
    mechanism_md = REPLACE(mechanism_md, 'Stackwise', 'DoseRoutine'),
    benefits_md = REPLACE(benefits_md, 'Stackwise', 'DoseRoutine'),
    evidence_md = REPLACE(evidence_md, 'Stackwise', 'DoseRoutine'),
    side_effects_md = REPLACE(side_effects_md, 'Stackwise', 'DoseRoutine'),
    warnings_md = REPLACE(warnings_md, 'Stackwise', 'DoseRoutine'),
    contraindications_md = REPLACE(contraindications_md, 'Stackwise', 'DoseRoutine'),
    do_not_mix_md = REPLACE(do_not_mix_md, 'Stackwise', 'DoseRoutine'),
    timing_md = REPLACE(timing_md, 'Stackwise', 'DoseRoutine'),
    faq_md = REPLACE(faq_md, 'Stackwise', 'DoseRoutine'),
    sources_md = REPLACE(sources_md, 'Stackwise', 'DoseRoutine')
WHERE meta_title ILIKE '%Stackwise%'
   OR meta_description ILIKE '%Stackwise%'
   OR body_md ILIKE '%Stackwise%'
   OR overview_md ILIKE '%Stackwise%'
   OR mechanism_md ILIKE '%Stackwise%'
   OR benefits_md ILIKE '%Stackwise%'
   OR evidence_md ILIKE '%Stackwise%'
   OR side_effects_md ILIKE '%Stackwise%'
   OR warnings_md ILIKE '%Stackwise%'
   OR contraindications_md ILIKE '%Stackwise%'
   OR do_not_mix_md ILIKE '%Stackwise%'
   OR timing_md ILIKE '%Stackwise%'
   OR faq_md ILIKE '%Stackwise%'
   OR sources_md ILIKE '%Stackwise%';