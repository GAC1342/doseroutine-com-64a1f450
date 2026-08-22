INSERT INTO public.compound_content (compound_id, meta_title, meta_description, body_md, benefits_md, side_effects_md, timing_md)
SELECT c.id, v.meta_title, v.meta_description,
       '## Benefits' || E'\n\n' || v.benefits || E'\n\n' ||
       '## Side effects' || E'\n\n' || v.side_effects || E'\n\n' ||
       '## Timing' || E'\n\n' || v.timing,
       v.benefits, v.side_effects, v.timing
FROM (VALUES
('black-cohosh',
'Black Cohosh: Benefits, Side Effects and Timing',
'What black cohosh is studied for in menopause, its liver-related safety warning, and how it is usually dosed and timed day to day.',
'Black cohosh (Actaea racemosa) is studied mainly for menopausal symptom relief. The strongest signal is for vasomotor symptoms — hot flashes and night sweats — where several randomized trials of standardized extracts report a moderate reduction in frequency and severity versus placebo over 8 to 12 weeks. Results are mixed: some well-run trials find no benefit beyond placebo, and effect sizes are smaller than those seen with hormone therapy.

Secondary outcomes reported in trials include better sleep continuity (largely a downstream effect of fewer night sweats), lower Kupperman index scores, and modest improvement in mood and irritability. Black cohosh is not estrogenic in the classic sense; current thinking points to serotonergic and dopaminergic activity rather than estrogen-receptor binding, which is why it is often considered by people who cannot or prefer not to use estrogen.

It is not established for bone density, cardiovascular protection, fertility, or vaginal dryness. Treat those uses as unsupported.',
'Most people tolerate standardized black cohosh extract at typical doses. The commonly reported effects are mild and dose-related: stomach upset, nausea, headache, dizziness, and rash. Some users report breast tenderness or spotting, which is worth reporting to a clinician rather than pushing through.

The important rare risk is liver injury. Case reports of hepatitis and elevated liver enzymes led several regulators to require a liver warning on black cohosh products. Causality has not been proven and the incidence appears very low, but stop immediately and seek care for yellowing skin or eyes, dark urine, right-upper-abdominal pain, or unexplained fatigue.

Avoid black cohosh in pregnancy and breastfeeding, and discuss it first if you have liver disease, a history of hormone-sensitive breast cancer, or take medicines processed heavily by the liver. Do not combine it with other hepatotoxic supplements without medical supervision.',
'Black cohosh is taken daily rather than as needed — the effect builds and is usually judged after 4 to 12 weeks of consistent use. Standardized extracts are typically dosed once or twice daily, with the split dose favored when nausea appears at a single larger dose.

Taking it with food reduces stomach upset and does not appear to blunt the effect. Many people put the dose in the evening because night sweats are the symptom they most want covered, but there is no strong pharmacokinetic reason to prefer morning or evening; consistency matters more than clock time.

Reassess after about 12 weeks. Trials rarely run past 6 to 12 months, so extended use should be a deliberate decision made with a clinician, alongside periodic liver-enzyme checks if you continue long term.'),
('d-chiro-inositol',
'D-Chiro-Inositol: Benefits, Side Effects and Timing',
'What D-chiro-inositol does for insulin signaling and PCOS, why the 40:1 myo-inositol ratio matters, and how it is dosed through the day.',
'D-chiro-inositol (DCI) is an inositol stereoisomer studied mostly in polycystic ovary syndrome (PCOS) and insulin resistance. It acts as a second messenger in insulin signaling, and trials report improved insulin sensitivity markers, lower fasting insulin, and better HOMA-IR in women with PCOS.

Downstream of that, studies report lower free testosterone and improved ovulation frequency in some PCOS populations. Most modern practice favors a myo-inositol to D-chiro-inositol blend in roughly a 40:1 ratio, which mirrors the physiological plasma ratio; trials using high-dose DCI alone have reported worse oocyte quality, so more DCI is not better.

Evidence outside PCOS and insulin resistance — for weight loss, mood, or general metabolic health in people without insulin resistance — is thin and should not drive a purchase decision.',
'D-chiro-inositol is generally well tolerated. Reported effects are mainly gastrointestinal and dose-dependent: nausea, gas, bloating, and loose stools, mostly at higher intakes. Headache and dizziness show up occasionally in trial reports.

The specific concern with DCI is dose. High isolated doses (often described as above roughly 1,200 mg daily) have been associated in fertility research with reduced oocyte quality and blunted ovarian response — a paradoxical worsening of the outcome many people take it for. This is the main argument for the 40:1 myo-inositol blend rather than DCI alone.

People on insulin or insulin-sensitizing drugs such as metformin should watch for additive glucose-lowering and discuss dosing with their clinician. It is not established as safe in pregnancy at high isolated doses; standard prenatal advice applies.',
'D-chiro-inositol is a daily supplement, not an acute one. Benefits on insulin markers and cycle regularity typically take 8 to 12 weeks to show, and most trials run 12 to 24 weeks.

Splitting the daily amount into a morning and evening dose is standard and helps limit gastrointestinal upset. Taking it with meals is the usual approach; it is water-soluble and does not need dietary fat for absorption.

If you take a myo-inositol / D-chiro-inositol blend, keep the ratio near 40:1 and do not stack extra isolated DCI on top of it. Separate the dose from high-dose caffeine or stimulants only if you notice sleep disruption from an evening dose — otherwise timing is flexible.'),
('vitex-agnus-castus',
'Vitex Agnus-Castus: Benefits, Side Effects and Timing',
'What chasteberry is studied for in PMS and cyclical breast pain, who should avoid it, and how it is dosed across the menstrual cycle.',
'Vitex agnus-castus (chasteberry) is studied primarily for premenstrual syndrome (PMS) and cyclical breast pain. Randomized trials of standardized extracts report meaningful reductions in PMS symptom scores — irritability, mood swings, breast tenderness, and bloating — versus placebo over about three menstrual cycles, and it is among the better-evidenced botanicals for that use.

For mastalgia (cyclical breast pain) several trials report reduced pain intensity. There is weaker, more mixed evidence for luteal-phase support and for cycle regularity in women with mildly elevated prolactin; vitex appears to act on dopamine D2 receptors in the pituitary, lowering prolactin, which is the plausible mechanism behind those effects.

It is not established as a fertility treatment, a menopause hot-flash remedy, or a testosterone-related supplement, despite frequent marketing claims in those directions.',
'Vitex is usually well tolerated. The common reported effects are mild: nausea, headache, gastrointestinal upset, acne, and itching or rash. Some users notice changes in cycle length or spotting during the first two or three cycles as the pattern settles.

Because it lowers prolactin through dopaminergic activity, vitex can theoretically interact with dopamine agonists (such as bromocriptine or cabergoline) and dopamine antagonists (many antipsychotics and some anti-nausea drugs). Discuss it first if you take any of those. It may also interfere with hormonal contraception and with fertility treatment, so raise it with your clinician rather than adding it silently.

Avoid vitex in pregnancy and breastfeeding — it can reduce prolactin and therefore milk supply — and avoid it with hormone-sensitive conditions unless a clinician has cleared it.',
'Vitex is taken once daily and works cumulatively; it is not a symptom-day rescue supplement. Standardized extracts are conventionally taken in the morning on an empty stomach, based on the idea of matching the early-morning prolactin rhythm, though trial evidence for morning-versus-evening timing is weak.

Take it every day of the cycle, not just the luteal phase, unless a clinician directs otherwise. Judge the result after three full menstrual cycles — most trials measure their primary outcome at cycle three, and shorter self-trials tend to be inconclusive.

If it works, periodic reassessment (roughly every 6 months) is reasonable rather than indefinite use, and stop before planned pregnancy or fertility treatment unless your clinician advises otherwise.')
) AS v(slug, meta_title, meta_description, benefits, side_effects, timing)
JOIN public.compounds c ON c.slug = v.slug
ON CONFLICT (compound_id) DO UPDATE SET
  benefits_md = COALESCE(public.compound_content.benefits_md, EXCLUDED.benefits_md),
  side_effects_md = COALESCE(public.compound_content.side_effects_md, EXCLUDED.side_effects_md),
  timing_md = COALESCE(public.compound_content.timing_md, EXCLUDED.timing_md);