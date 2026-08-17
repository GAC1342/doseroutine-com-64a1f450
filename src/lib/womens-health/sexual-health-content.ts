import type { WomensCompoundContent } from "@/components/womens-compound-article";

const HUB = { slug: "sexual-health" as const, title: "Sexual Health & Libido for Women" };
const REVIEWED = "2026-07-27";

const RELATED = [
  { slug: "testosterone-women", name: "Low-dose testosterone (interactions)" },
  { slug: "maca-libido", name: "Maca" },
  { slug: "l-arginine-women", name: "L-Arginine" },
  { slug: "tribulus-women", name: "Tribulus Terrestris" },
  { slug: "vaginal-probiotics", name: "Vaginal Probiotics" },
  { slug: "ashwagandha-women", name: "Ashwagandha (women)" },
];
const rel = (ex: string) => RELATED.filter((r) => r.slug !== ex).slice(0, 4);

const CITE_INTERACTION =
  "Use the DoseRoutine interaction checker at doseroutine.com/interaction-checker to add every libido supplement plus your SSRI, HRT, or birth control in one view.";

export const TESTOSTERONE_WOMEN: WomensCompoundContent = {
  slug: "testosterone-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Low-dose Testosterone (women)",
  h1: "Low-Dose Testosterone for Women: Interaction & Safety Reference",
  summary:
    "Low-dose transdermal testosterone is an off-label prescription in most countries for postmenopausal hypoactive sexual desire disorder (HSDD). At physiologic female doses (5–10 mg/day of a 1% cream, or a fraction of a male 50 mg patch), it has moderate evidence for improving sexual desire and satisfaction. This page is not a dosing guide — testosterone is a prescription and requires clinician supervision, baseline and follow-up labs (total T, free T, SHBG, lipids, liver enzymes). Instead, this page covers interactions relevant to women considering or already on testosterone: HRT, birth control, blood thinners, and lipid medications. Evidence level: moderate for postmenopausal HSDD; interaction data drawn from broader androgen pharmacology.",
  keyFacts: {
    doseRange:
      "Prescription-managed only. Typical: 5–10 mg/day of 1% testosterone cream or a fraction of a male-formulation patch.",
    forms:
      "Transdermal cream/gel (preferred), patches (male formulations divided), pellets (long-acting, harder to titrate)",
    evidence: "Moderate",
    mainRisks: "Acne, hirsutism, voice deepening (rare at physiologic doses), lipid changes.",
  },
  research: [
    {
      heading: "Global position statement and indication",
      body: "The Global Consensus Position Statement on the Use of Testosterone Therapy for Women (Davis et al., Climacteric 2019; co-endorsed by the Endocrine Society, IMS, NAMS, ISSWSH, and the Royal College of Obstetricians & Gynaecologists) endorses low-dose transdermal testosterone as the only evidence-based indication for postmenopausal hypoactive sexual desire disorder (HSDD) after other contributors — relationship factors, depression, medication side-effects, vaginal atrophy — have been addressed. It explicitly recommends against systemic testosterone for cognition, bone density, cardiometabolic prevention, or general wellbeing because trial data don't support those uses.",
    },
    {
      heading: "Meta-analytic effect size for HSDD",
      body: "Islam et al. (Lancet Diabetes & Endocrinology 2019) pooled 36 RCTs across 8,480 women and found transdermal testosterone increased satisfying sexual events by roughly one extra event per month vs placebo, with corresponding improvements in desire, arousal, orgasm, pleasure, and self-image and a fall in personal distress. Effect size is modest but consistent, and larger than most non-hormonal options for postmenopausal HSDD.",
    },
    {
      heading: "Landmark RCTs — patch and cream",
      body: "The APHRODITE trial (Davis et al., NEJM 2008) tested a 300 µg/day testosterone patch in surgically and naturally postmenopausal women with HSDD and found significant increases in satisfying sexual events at 24 weeks. LIBERATE (Kingsberg et al., 2007) confirmed benefit in surgically menopausal women on estrogen. More recent transdermal-cream trials (e.g., Fooladi et al.) reproduce the effect with a titratable dose that keeps total testosterone in the upper-quartile female physiologic range.",
    },
    {
      heading: "Route of administration and pharmacology",
      body: "Transdermal cream/gel and patches produce steady physiologic levels. Injectable and pellet formulations frequently overshoot into supraphysiologic ranges, driving virilizing side-effects and lipid deterioration; these routes are not recommended in any current women's guideline. Oral methyltestosterone is hepatotoxic and abandoned in modern practice.",
    },
    {
      heading: "SHBG, free testosterone, and combined therapy",
      body: "Because oral estrogens (including most combined oral contraceptives) roughly double SHBG, they can cut calculated free testosterone in half at any given total-T level. Free-testosterone response — not total T alone — best tracks with symptomatic benefit. Transdermal estradiol has a much smaller effect on SHBG, which is why guidelines pair testosterone with transdermal, not oral, estrogen when possible.",
    },
    {
      heading: "Safety signals — cardiovascular, breast, endometrium",
      body: "Short-to-medium-term data (up to 24 months) show no significant adverse cardiovascular or breast signal at physiologic doses. Small HDL reductions are seen with oral (not transdermal) androgens. Long-term (>2 year) breast and CV outcome data remain limited, which is why every position statement recommends periodic reassessment rather than indefinite empirical use.",
    },
    {
      heading: "Monitoring and de-escalation",
      body: "NAMS 2020 and the Endocrine Society recommend baseline total T, SHBG, and lipids; recheck total T at 6–12 weeks to confirm the level sits within the reference range for young women; then every 6 months once stable. If no meaningful benefit at 6 months, testosterone should be stopped rather than dose-escalated into supraphysiologic ranges.",
    },
  ],
  interactions: [
    {
      with: "HRT (estradiol, progesterone)",
      mechanism:
        "Estradiol raises SHBG, which lowers free testosterone; oral estradiol has larger SHBG effect than transdermal.",
      watchFor:
        "Follow SHBG and free T; transdermal estradiol interferes less with testosterone dosing.",
    },
    {
      with: "Combined oral contraceptives",
      mechanism: "COCs sharply raise SHBG and reduce free testosterone.",
      watchFor:
        "COC users may need higher testosterone dosing or a transition to non-COC contraception.",
    },
    {
      with: "Blood thinners (warfarin)",
      mechanism: "Testosterone can potentiate warfarin — increased bleeding risk.",
      watchFor: "Monitor INR when starting or dose-changing testosterone.",
    },
    {
      with: "Insulin and oral diabetes medication",
      mechanism:
        "Testosterone improves insulin sensitivity — hypoglycemia risk if dose isn't adjusted.",
      watchFor: "Monitor glucose.",
    },
    {
      with: "Corticosteroids",
      mechanism: "Additive fluid retention and mood effects.",
      watchFor: "Monitor BP and mood.",
    },
    {
      with: "Aromatase inhibitors",
      mechanism: "Testosterone would be converted to estradiol; AI blocks that conversion.",
      watchFor: "Use only under oncology supervision.",
    },
  ],
  cautions: [
    "Prescription-only medication — do not source outside a prescriber.",
    "Baseline labs required: total T, free T, SHBG, lipids, ALT/AST.",
    "Pregnancy — absolutely contraindicated (fetal virilization).",
    "Hormone-sensitive cancer history — oncology sign-off required.",
    "Undiagnosed vaginal bleeding — investigate before starting.",
  ],
  faq: [
    {
      q: "Is low-dose testosterone safe for women?",
      a: "At physiologic female doses managed by an experienced clinician, safety is reasonable in short-to-medium term. Long-term cardiovascular and breast-cancer outcomes are less well characterised than for men's TRT. It should not be self-sourced or dosed without labs.",
    },
    {
      q: "Does testosterone interact with HRT?",
      a: "Yes — the interaction is with SHBG. Oral estradiol raises SHBG substantially, which reduces free testosterone, and can require higher testosterone dosing to reach target free-T. Transdermal estradiol has less SHBG effect and is often preferred when combining with testosterone.",
    },
    {
      q: "Can I take testosterone with birth control?",
      a: "Combined oral contraceptives (COCs) sharply raise SHBG and reduce free testosterone — many women on COCs report low libido partly for this reason. If you're on a COC and considering testosterone, discuss with your prescriber about alternative contraception (non-hormonal, LNG-IUD).",
    },
    {
      q: "Does testosterone cause hair loss in women?",
      a: "At true physiologic doses, hair effects are usually minimal. At supraphysiologic levels, androgenic alopecia and hirsutism can occur. Regular lab monitoring prevents most of this.",
    },
    {
      q: "What labs should be monitored on testosterone?",
      a: "Baseline and follow-up: total T, free T, SHBG, LH, FSH, lipids, ALT/AST. Frequency: 6–12 weeks after starting, then every 6 months once stable.",
    },
    {
      q: "When during the day should transdermal testosterone be applied?",
      a: "Most prescribers recommend once-daily morning application to mirror the normal female circadian testosterone peak and reduce sleep-timed androgen spikes. Rotate application sites (inner thigh, lower abdomen) and wash hands after to avoid unintentional transfer to a partner or child.",
    },
    {
      q: "How long before I feel any effect from low-dose testosterone?",
      a: "Sexual-desire changes typically start at 4–6 weeks and peak around 12 weeks. If there is no meaningful benefit at 6 months of correctly dosed therapy with free-T in the female physiologic range, guidelines recommend stopping rather than escalating into supraphysiologic doses.",
    },
    {
      q: "Can I take testosterone if I've had breast cancer?",
      a: "Any hormone-sensitive cancer history requires oncology sign-off before starting. Testosterone can aromatize to estradiol, so risk depends on receptor status, current endocrine therapy (e.g., aromatase inhibitors), and time since treatment. Do not self-start.",
    },
    {
      q: "Does testosterone interact with warfarin or other blood thinners?",
      a: "Yes — testosterone can potentiate warfarin and raise bleeding risk. Recheck INR 1–2 weeks after starting testosterone and after any dose change. For DOACs (apixaban, rivaroxaban) the interaction is smaller but still worth flagging to your prescriber.",
    },
    {
      q: "Where can I check testosterone interactions with my other supplements?",
      a: CITE_INTERACTION,
    },
  ],
  sources: [
    {
      label:
        "Davis SR et al. Climacteric 2019 — Global consensus position statement on testosterone therapy for women.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31438316/",
    },
    {
      label:
        "Islam RM et al. Lancet Diabetes Endocrinol 2019 — Safety and efficacy of testosterone for women: systematic review and meta-analysis of 36 RCTs.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31353194/",
    },
    {
      label:
        "Davis SR et al. NEJM 2008 — Testosterone patch for low sexual desire in surgically menopausal women (APHRODITE).",
      url: "https://pubmed.ncbi.nlm.nih.gov/18987368/",
    },
    {
      label: "Fooladi E et al. Menopause 2014 — Testosterone cream in postmenopausal HSDD.",
      url: "https://pubmed.ncbi.nlm.nih.gov/24149926/",
    },
    {
      label:
        "Parish SJ et al. J Womens Health 2021 — International Society for the Study of Women's Sexual Health clinical practice guideline for testosterone.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33797277/",
    },
    {
      label: "NAMS 2020 Position Statement — Testosterone therapy for women.",
      url: "https://menopause.org/publications/professional-publications/position-statements",
    },
    {
      label:
        "Wierman ME et al. J Clin Endocrinol Metab 2014 — Endocrine Society clinical practice guideline: androgen therapy in women.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25279570/",
    },
  ],
  related: rel("testosterone-women"),
  lastReviewed: REVIEWED,
};

export const MACA_LIBIDO: WomensCompoundContent = {
  slug: "maca-libido",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Maca (libido context)",
  h1: "Maca for Women's Libido: Evidence, Dosage & Interactions",
  summary:
    "Maca (Lepidium meyenii) is a Peruvian root traditionally used for stamina and libido. It is non-hormonal — it doesn't raise estradiol or testosterone in most measurements. Small human trials (typically 1.5–3 g/day of dried maca powder for 6–12 weeks) show modest improvements in sexual desire, particularly in postmenopausal women and in women with SSRI-induced low libido. Effects on mood and energy are smaller. Yellow, red, and black maca are marketed for slightly different uses; the differentiating evidence is thin. Safety is excellent — no meaningful drug interactions and no hormonal effects on tumor markers. Evidence level: limited but positive for desire; especially notable for SSRI-induced libido.",
  keyFacts: {
    doseRange: "1.5–3 g/day dried maca powder or gelatinized capsules",
    forms:
      "Powder (mixed into smoothies, mild flavor), capsules, gelatinized (removes raw starches, easier on GI)",
    evidence: "Limited",
    mainRisks: "Goitrogenic compounds (very high raw doses); use gelatinized to reduce.",
  },
  research: [
    {
      heading: "SSRI-induced sexual dysfunction — the strongest use case",
      body: "Dording et al. (CNS Neurosci Ther 2008) conducted a double-blind RCT of maca root 1.5 g vs 3.0 g/day for 12 weeks in patients with remitted depression and SSRI-induced sexual dysfunction. The 3 g arm showed a significant improvement on the Arizona Sexual Experience Scale (ASEX) and the Massachusetts General Hospital Sexual Function Questionnaire, without loss of antidepressant benefit. This is arguably maca's most robust indication and is disproportionately relevant to women, who report SSRI sexual side-effects at higher rates than men.",
    },
    {
      heading: "Postmenopausal desire and psychological wellbeing",
      body: "Brooks et al. (Menopause 2008) tested 3.5 g/day powdered maca vs placebo for 6 weeks in early-postmenopausal women and found significant reductions in psychological symptoms — including anxiety and depression — and improvements in sexual dysfunction scores, without changes in serum estradiol, FSH, LH, or SHBG. This reinforces that maca acts independently of measurable sex-steroid pathways.",
    },
    {
      heading: "Systematic review",
      body: "Shin et al. (BMC Complement Altern Med 2010) reviewed four RCTs (n=131) using maca for sexual function. Two of three trials in healthy adults and postmenopausal women showed favourable effects on subjective desire and function; the quality of evidence was rated 'limited' due to small sample sizes and heterogenous formulations but the direction of effect was consistent.",
    },
    {
      heading: "Non-hormonal mechanism",
      body: "Multiple biomarker studies (Gonzales et al., Andrologia 2003; Meissner et al., Menopause Rev 2005) confirm that at 1.5–3 g/day maca does not measurably alter serum estradiol, testosterone, LH, FSH, prolactin, or SHBG. Proposed mechanisms include central serotonergic and dopaminergic modulation, and MAO-A activity in some in-vitro work — which is why the SSRI-sparing effect is biologically plausible without pharmacokinetic interference.",
    },
    {
      heading: "Colour phenotypes — thin differentiating evidence",
      body: "Gonzales-Arimborgo et al. (Pharmaceuticals 2016) compared black and red maca vs placebo in perimenopausal women and reported small differences in mood and sexual desire favouring black maca, but the trial was underpowered to establish colour-specific superiority. Marketing separates yellow, red, and black maca more aggressively than the evidence supports.",
    },
    {
      heading: "Bone-density signal (limited)",
      body: "Meissner et al. (Int J Biomed Sci 2006) reported small improvements in bone-turnover markers in postmenopausal women on 2 g/day maca-gelatinizado over 4 months. The signal is preliminary and shouldn't be used to replace vitamin D, calcium, resistance training, or (where indicated) HRT/bisphosphonates for osteoporosis prevention.",
    },
    {
      heading: "Goitrogens and gelatinization",
      body: "Raw maca contains glucosinolates that can be goitrogenic at very high intakes in iodine-deficient individuals. Gelatinization (a heat process removing raw starches) both improves GI tolerance and reduces glucosinolate load, which is why gelatinized product is preferred if you take levothyroxine or have thyroid disease.",
    },
  ],
  interactions: [
    {
      with: "SSRIs (fluoxetine, sertraline, escitalopram)",
      mechanism:
        "Non-hormonal — maca doesn't interact with SSRI clearance. Trials show it can partially offset SSRI-induced low libido without destabilizing mood.",
      watchFor: "Positive interaction; still discuss with prescriber.",
    },
    { with: "HRT", mechanism: "No known pharmacokinetic interaction.", watchFor: "None specific." },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None specific." },
    {
      with: "Thyroid medication",
      mechanism:
        "Raw maca has goitrogens; gelatinized product removes most. High raw intake could theoretically affect thyroid function in iodine-deficient users.",
      watchFor: "Use gelatinized maca if on levothyroxine or with thyroid disease.",
    },
    {
      with: "Blood pressure medication",
      mechanism: "Minimal effect on BP in trials.",
      watchFor: "None specific.",
    },
  ],
  cautions: [
    "Thyroid disease — use gelatinized maca to reduce goitrogenic compounds.",
    "Pregnancy and breastfeeding — insufficient data.",
    "Hormone-sensitive cancers — although maca doesn't measurably raise hormones, discuss with oncology.",
    "Give it 6–12 weeks at 1.5–3 g/day before judging.",
  ],
  faq: [
    {
      q: "Does maca work for women's libido?",
      a: "The best evidence is in postmenopausal women and in women with SSRI-induced low libido. Effect size is modest but real. It's non-hormonal, so it doesn't 'fix' desire caused by hormone deficiency the way HRT or low-dose testosterone can.",
    },
    {
      q: "Can I take maca with an SSRI?",
      a: "Yes — this is one of maca's best-supported uses. Small trials specifically show it can improve SSRI-induced low libido without destabilizing mood. Discuss with your prescriber, but there's no known negative interaction.",
    },
    {
      q: "Which maca color is best?",
      a: "Marketing separates yellow (general), red (women's hormones and prostate in men), and black (energy and cognition). The differentiating evidence is thin. Yellow or a mixed-color 'tri-color' product is a reasonable default.",
    },
    {
      q: "How long does maca take to work?",
      a: "Most trials show benefit at 6–12 weeks of 1.5–3 g/day. If you've taken a fair dose consistently for 12 weeks with zero subjective change, it's not going to.",
    },
    {
      q: "Does maca raise hormone levels?",
      a: "In most trials, no. Maca doesn't measurably change estradiol, testosterone, LH, FSH, or prolactin. This makes it a reasonable choice for women who want to avoid phytoestrogens or hormonal effects.",
    },
    {
      q: "What time of day should maca be taken?",
      a: "Morning or early afternoon works best because maca is mildly stimulating for some users and evening doses can disrupt sleep. Take with food to reduce mild GI upset that a small minority of new users report in the first two weeks.",
    },
    {
      q: "Is maca safe to use long-term?",
      a: "Human trials up to 12 weeks show good tolerability. Extended traditional use in Peru suggests long-term safety is likely reasonable, but there is no formal data beyond about 6 months. Periodic breaks (e.g., 5 days on, 2 off) are a sensible conservative pattern.",
    },
    {
      q: "Does maca interact with levothyroxine or thyroid medication?",
      a: "Raw maca contains glucosinolates that are theoretically goitrogenic at very high intakes in iodine-deficient users. Gelatinized maca strips out most of these compounds and is the preferred form if you take levothyroxine or have Hashimoto's. Separate dosing from levothyroxine by 4 hours regardless.",
    },
    {
      q: "Is maca safe during pregnancy or breastfeeding?",
      a: "There is insufficient human safety data during pregnancy and lactation, so mainstream guidance is to avoid maca in both. Traditional culinary use of small amounts is a much smaller exposure than supplemental 1.5–3 g/day and is not the same question.",
    },
    { q: "Where can I check maca interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label:
        "Dording CM et al. CNS Neurosci Ther 2008 — Maca for antidepressant-induced sexual dysfunction (RCT).",
      url: "https://pubmed.ncbi.nlm.nih.gov/18801111/",
    },
    {
      label:
        "Shin BC et al. BMC Complement Altern Med 2010 — Maca for sexual dysfunction: systematic review of RCTs.",
      url: "https://pubmed.ncbi.nlm.nih.gov/20691074/",
    },
    {
      label:
        "Brooks NA et al. Menopause 2008 — Maca reduces psychological symptoms in postmenopausal women without hormonal change.",
      url: "https://pubmed.ncbi.nlm.nih.gov/18784609/",
    },
    {
      label:
        "Meissner HO et al. Menopause Rev 2005 — Maca-gelatinizado in early postmenopausal women.",
      url: "https://pubmed.ncbi.nlm.nih.gov/16278139/",
    },
    {
      label:
        "Gonzales-Arimborgo C et al. Pharmaceuticals 2016 — Black vs red maca in perimenopausal women.",
      url: "https://pubmed.ncbi.nlm.nih.gov/27548190/",
    },
    {
      label: "Gonzales GF et al. Andrologia 2003 — Maca and serum reproductive hormones.",
      url: "https://pubmed.ncbi.nlm.nih.gov/14636027/",
    },
    {
      label: "Lee MS et al. Maturitas 2011 — Maca for menopausal symptoms: systematic review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/21840656/",
    },
  ],
  related: rel("maca-libido"),
  lastReviewed: REVIEWED,
};

export const L_ARGININE_WOMEN: WomensCompoundContent = {
  slug: "l-arginine-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "L-Arginine (for women)",
  h1: "L-Arginine for Women: Blood Flow, Libido, and Interactions",
  summary:
    "L-arginine is an amino acid and precursor to nitric oxide (NO). By raising NO, it briefly relaxes blood vessels, which is the mechanism behind its use for erectile function in men and — in women — for genital blood flow. Evidence in women is limited: a few small trials with combined arginine + supplement formulas (ArginMax) show modest improvements in arousal and satisfaction. Standalone L-arginine at 3–6 g/day is less well studied. The most important consideration is interactions: nitrates (nitroglycerin, isosorbide) and PDE5 inhibitors (sildenafil) already increase NO, so combining with L-arginine creates real hypotension risk. Evidence level: limited for women's sexual outcomes; strong for the interaction warnings.",
  keyFacts: {
    doseRange: "3–6 g/day for vascular effects; higher acute doses (5 g) 60–90 min before activity",
    forms:
      "Powder (best for grams-per-day dosing), capsules (many needed), L-citrulline (converts to arginine, better absorbed)",
    evidence: "Limited",
    mainRisks:
      "Hypotension when combined with nitrates or PDE5 inhibitors. Herpes reactivation in prone individuals.",
  },
  research: [
    {
      heading: "ArginMax RCTs in women",
      body: "Ito et al. (J Sex Marital Ther 2006) randomised 108 women aged 22–73 with self-reported low libido to ArginMax (containing L-arginine, ginseng, damiana, and multivitamins) vs placebo for 4 weeks. The active arm reported significantly greater improvements in desire, satisfaction, and frequency of intercourse, particularly in peri- and postmenopausal subgroups. Because the product is a blend, arginine's isolated contribution can't be quantified, but the vasodilator rationale is coherent with the observed genital-arousal effect.",
    },
    {
      heading: "L-citrulline pharmacology and superiority for chronic dosing",
      body: "Schwedhelm et al. (Br J Clin Pharmacol 2008) showed that oral L-citrulline raises plasma arginine and NO metabolites more efficiently than equivalent-dose oral L-arginine, because citrulline bypasses hepatic and intestinal arginase. 3 g L-citrulline produces plasma arginine curves comparable to ~6 g L-arginine, with less GI upset. For chronic once-daily dosing aimed at vascular effects, citrulline is generally the better molecule.",
    },
    {
      heading: "Nitric oxide, endothelial function, and genital blood flow",
      body: "Bode-Böger et al. (Circulation 1998) demonstrated that intravenous and oral L-arginine improve endothelium-dependent vasodilation in humans with hypercholesterolemia. The clitoral and vaginal vasculature share the same NO-cGMP signalling pathway as penile tissue, providing the mechanistic basis for topical and oral arginine formulations aimed at female genital arousal.",
    },
    {
      heading: "Topical arginine gels",
      body: "Ferguson et al. (J Sex Marital Ther 2003) tested a topical arginine-menthol-based gel (Zestra) in women with sexual dysfunction and found significant improvements in desire and arousal vs placebo. Systemic exposure is negligible with topical use, which sidesteps most of the oral-arginine interaction warnings.",
    },
    {
      heading: "Cardiovascular safety signal after MI",
      body: "The VINTAGE MI trial (Schulman et al., JAMA 2006) added L-arginine 3 g TID to standard post-infarct care and was terminated early after excess mortality in the arginine arm. This has driven the caution against high-dose oral arginine within months of an acute coronary event, regardless of gender.",
    },
    {
      heading: "Pregnancy and pre-eclampsia (obstetric supervision only)",
      body: "Rytlewski et al. (Eur J Obstet Gynecol 2012) and later meta-analyses (Camarena Pulido et al., 2016) suggest L-arginine can modestly lower blood pressure and improve fetal outcomes in high-risk pregnancies via placental NO. This is not a self-supplementation indication — dosing occurs under obstetric care with monitored BP.",
    },
    {
      heading: "Herpes reactivation and the arginine:lysine ratio",
      body: "In-vitro and clinical observations (Griffith et al., Dermatologica 1987) suggest arginine promotes HSV replication while lysine inhibits it. Women prone to genital herpes or oral cold sores who use gram-doses of arginine may experience more frequent outbreaks; co-supplementing 1–3 g lysine, or switching to citrulline, largely mitigates this.",
    },
  ],
  interactions: [
    {
      with: "Nitrates (nitroglycerin, isosorbide)",
      mechanism: "Additive NO increase — severe hypotension risk.",
      watchFor: "Do not combine. Full stop.",
    },
    {
      with: "PDE5 inhibitors (sildenafil, tadalafil)",
      mechanism: "Both increase NO signalling — additive hypotension.",
      watchFor: "Avoid combining without clinician review.",
    },
    {
      with: "Blood pressure medication",
      mechanism: "Modest additive BP lowering.",
      watchFor: "Monitor BP; start at lower arginine dose.",
    },
    {
      with: "HRT and birth control",
      mechanism: "No known interaction.",
      watchFor: "None specific.",
    },
    {
      with: "Blood thinners",
      mechanism: "Weak antiplatelet effect; clinically minor at typical doses.",
      watchFor: "Monitor at high doses (>6 g/day).",
    },
    {
      with: "Anti-herpes medications (acyclovir, valacyclovir)",
      mechanism: "Arginine can promote herpes replication; lysine competes.",
      watchFor: "If prone to cold sores, add lysine or use L-citrulline instead.",
    },
  ],
  cautions: [
    "History of hypotension or fainting.",
    "On nitrates or PDE5 inhibitors — do not combine.",
    "Recent heart attack — arginine after MI has shown mortality signal in some trials; avoid.",
    "Frequent cold sores or genital herpes — consider L-citrulline instead.",
  ],
  faq: [
    {
      q: "Does L-arginine work for women's libido?",
      a: "The direct evidence is limited. Combination products (ArginMax) show modest benefit, but you can't isolate the arginine's contribution. Mechanistically, more blood flow to genital tissue is plausible; subjectively, results in trials are modest.",
    },
    {
      q: "L-arginine or L-citrulline for women?",
      a: "L-citrulline is better absorbed and converts to arginine in the body. 3 g L-citrulline gives comparable arginine levels to 6 g L-arginine and is often better tolerated.",
    },
    {
      q: "Can I take L-arginine with sildenafil?",
      a: "Not without clinician supervision. Both raise NO signalling — combining creates additive hypotension risk. This is one of the more important interactions to know.",
    },
    {
      q: "Does L-arginine interact with HRT or birth control?",
      a: "No known interaction with sex hormones. The interactions to worry about are nitrates and PDE5 inhibitors.",
    },
    {
      q: "Can L-arginine cause cold sores?",
      a: "Arginine competes with lysine at cellular uptake sites, and lysine helps suppress HSV replication. In herpes-prone people, high-dose L-arginine can occasionally trigger a flare. Balance with lysine, or use L-citrulline.",
    },
    {
      q: "What is the safest way to time L-arginine with blood pressure medication?",
      a: "If your BP is already well-controlled on medication, start at the lower end (3 g/day) and take arginine at a different time of day than your antihypertensive to reduce additive BP drops. Check standing BP for the first two weeks and stop if you get lightheaded on standing.",
    },
    {
      q: "How long before sex should acute-dose L-arginine be taken?",
      a: "For the vasodilator effect, most protocols use 5 g taken 60–90 minutes before activity on an empty stomach. Taking it with a high-protein meal blunts absorption. This is separate from chronic 3–6 g/day dosing for endothelial support.",
    },
    {
      q: "Is L-arginine safe after a recent heart attack?",
      a: "No — avoid it. The VINTAGE MI trial (JAMA 2006) was stopped early because L-arginine 3 g three times daily after myocardial infarction was associated with excess mortality. Cardiology clearance is essential before any oral arginine within the first year post-MI.",
    },
    {
      q: "Can I combine L-arginine with metformin or diabetes medication?",
      a: "There's no direct pharmacokinetic interaction, but arginine has mild insulin-sensitizing and vasodilatory effects that can add to metformin or sulfonylureas. Monitor fasting glucose the first two weeks; hypoglycemia is uncommon but has been reported at higher arginine doses.",
    },
    { q: "Where can I check L-arginine interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label:
        "Ito TY et al. J Sex Marital Ther 2006 — ArginMax RCT in women with sexual dysfunction.",
      url: "https://pubmed.ncbi.nlm.nih.gov/17127611/",
    },
    {
      label:
        "Schwedhelm E et al. Br J Clin Pharmacol 2008 — L-citrulline pharmacokinetics and arginine bioavailability.",
      url: "https://pubmed.ncbi.nlm.nih.gov/17662090/",
    },
    {
      label:
        "Bode-Böger SM et al. Circulation 1998 — L-arginine and endothelium-dependent vasodilation.",
      url: "https://pubmed.ncbi.nlm.nih.gov/9635314/",
    },
    {
      label: "Ferguson DM et al. J Sex Marital Ther 2003 — Topical Zestra for female arousal.",
      url: "https://pubmed.ncbi.nlm.nih.gov/12746145/",
    },
    {
      label: "Schulman SP et al. JAMA 2006 — L-arginine post-MI (VINTAGE MI) mortality signal.",
      url: "https://pubmed.ncbi.nlm.nih.gov/16391217/",
    },
    {
      label: "Rytlewski K et al. Eur J Obstet Gynecol 2012 — L-arginine in pregnancy.",
      url: "https://pubmed.ncbi.nlm.nih.gov/22608197/",
    },
    {
      label:
        "Camarena Pulido EE et al. Hypertens Pregnancy 2016 — L-arginine and pre-eclampsia meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/26910127/",
    },
  ],
  related: rel("l-arginine-women"),
  lastReviewed: REVIEWED,
};

export const TRIBULUS_WOMEN: WomensCompoundContent = {
  slug: "tribulus-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Tribulus Terrestris (women)",
  h1: "Tribulus Terrestris for Women: What the Evidence Actually Says",
  summary:
    "Tribulus terrestris is a Mediterranean plant marketed as a testosterone booster in men and a libido enhancer in both sexes. The men's-testosterone claim is mostly wrong. In women, small RCTs at 500–1500 mg/day of a standardized extract (usually 40–60% saponins) have shown modest but statistically significant improvements in sexual desire and satisfaction, particularly in postmenopausal women and in women with hypoactive sexual desire disorder. It doesn't reliably change measured testosterone levels. Safety is generally good; the main concern is that quality varies widely across brands. Evidence level: limited-to-moderate for postmenopausal desire; nothing meaningful in younger women.",
  keyFacts: {
    doseRange:
      "500–1500 mg/day standardized extract (40–60% saponins, protodioscin content matters)",
    forms: "Capsules (standardized), tinctures (variable), whole herb (low potency)",
    evidence: "Limited",
    mainRisks:
      "Product quality varies. Some reports of prostate enlargement in men (not relevant to women).",
  },
  research: [
    {
      heading: "Postmenopausal HSDD — best-quality women's RCT",
      body: "Vale et al. (J Sex Med 2018) randomised 60 postmenopausal women with HSDD to Tribulus terrestris 750 mg/day (standardized) vs placebo for 120 days. The Tribulus arm showed statistically significant improvements in Female Sexual Function Index (FSFI) desire, arousal, lubrication, orgasm, and satisfaction domains, and reductions in Female Sexual Distress Scale scores. Total and free testosterone did not rise, consistent with a non-androgenic mechanism.",
    },
    {
      heading: "Premenopausal HSDD",
      body: "Akhtari et al. (Daru 2014) tested Tribulus 7.5 mg/kg/day (roughly 500 mg for a 65-kg woman) vs placebo in premenopausal women with HSDD for 4 weeks. FSFI desire and arousal improved significantly in the active arm, though the effect size was smaller than in the postmenopausal cohort — plausibly because premenopausal desire has more contributors that a botanical doesn't reach.",
    },
    {
      heading: "Testosterone unchanged — mechanism is not androgenic",
      body: "Neychev and Mitev (J Ethnopharmacol 2016) reviewed 12 human studies and concluded Tribulus does not reliably raise serum testosterone in men or women, including at doses higher than typical women's use. Proposed alternative mechanisms include enhanced NO signalling, mild androgen-receptor priming, and central dopaminergic effects. Do not use Tribulus expecting a hormonal effect.",
    },
    {
      heading: "Cardiometabolic exploratory data",
      body: "Small trials (Samani et al., Iran J Reprod Med; Sengupta et al.) report modest reductions in fasting glucose, HbA1c, and LDL in Tribulus-treated patients. These are secondary endpoints in libido trials and shouldn't be relied on as a primary indication.",
    },
    {
      heading: "Standardization is everything — protodioscin content",
      body: "Kostova and Dinchev (Phytochemistry 2005) characterised the saponin profile of Tribulus and identified protodioscin as the leading candidate active compound. Independent HPLC surveys of commercial products (Ganzera et al., Planta Med 2001) found 10-fold differences in protodioscin between brands — a big driver of the trial-to-trial variability. Look for products specifying % protodioscin, ideally 20%+, or mg of protodioscin per capsule.",
    },
    {
      heading: "Safety envelope",
      body: "Adverse events across women's trials at 500–1500 mg/day are minor (occasional GI upset, transient insomnia). Long-term safety data past 6 months are limited. Case reports of hepatotoxicity are rare and confounded by contaminated multi-ingredient products, but they warrant stopping the product and checking LFTs if unexplained fatigue, jaundice, or RUQ discomfort develop.",
    },
    {
      heading: "What Tribulus does not do",
      body: "There is no credible evidence that Tribulus enhances athletic performance, muscle mass, or fertility in either sex; systematic reviews (Pokrywka et al., 2014) are consistently negative on these outcomes. Marketing that positions Tribulus as a 'natural testosterone booster' misrepresents the human data.",
    },
  ],
  interactions: [
    {
      with: "HRT",
      mechanism:
        "No known pharmacokinetic interaction. Adding a low-effect botanical to well-titrated HRT may complicate attribution.",
      watchFor: "Not typically combined without a reason.",
    },
    { with: "Birth control", mechanism: "No documented interaction.", watchFor: "None specific." },
    {
      with: "Blood pressure medication",
      mechanism: "Mild BP-lowering in some animal data; not clinically significant.",
      watchFor: "None specific.",
    },
    {
      with: "Diabetes medication",
      mechanism: "Modest glucose-lowering in some studies.",
      watchFor: "Monitor if diabetic and on insulin.",
    },
    {
      with: "Lithium",
      mechanism: "Tribulus has mild diuretic effect; could theoretically raise lithium levels.",
      watchFor: "Avoid or monitor lithium.",
    },
    { with: "SSRIs", mechanism: "No known interaction.", watchFor: "None specific." },
  ],
  cautions: [
    "Pregnancy and breastfeeding — insufficient data; avoid.",
    "Hormone-sensitive cancer history — discuss with oncology.",
    "Poor product quality is the biggest risk — buy from brands that specify protodioscin content.",
    "Give it 8–12 weeks before judging effect.",
  ],
  faq: [
    {
      q: "Does Tribulus work for women's libido?",
      a: "In postmenopausal women with HSDD, small RCTs show modest but real improvement at 750 mg/day of standardized extract over 90 days. In younger women, effects are smaller. It's not a first-line intervention — sleep, stress, relationship factors, and (where appropriate) prescription options usually outperform.",
    },
    {
      q: "Does Tribulus raise testosterone in women?",
      a: "No — multiple studies show no reliable testosterone increase from Tribulus in men or women. The libido effect appears to work through a different mechanism, possibly CNS-mediated.",
    },
    {
      q: "Can I take Tribulus with HRT?",
      a: "There's no known pharmacokinetic conflict, but combining a modest-effect botanical with well-titrated HRT rarely adds meaningful benefit. Not typically combined without a specific reason.",
    },
    {
      q: "Is Tribulus safe with birth control?",
      a: "Yes — no documented interaction with hormonal contraceptives.",
    },
    {
      q: "How do I pick a good Tribulus product?",
      a: "Look for a product that specifies percentage protodioscin (target: 20% or higher) or milligrams protodioscin per serving. Bulgarian-sourced Tribulus historically has higher saponin content. Avoid products that just list 'Tribulus extract' with no standardization detail.",
    },
    {
      q: "Should Tribulus be taken in the morning or evening?",
      a: "Morning or split morning/early-afternoon dosing is best. Some users report mild activation or sleep disturbance with evening doses of standardized saponin extracts, especially at the higher end (1000–1500 mg/day). Take with food to reduce occasional GI upset.",
    },
    {
      q: "How long is it safe to stay on Tribulus continuously?",
      a: "Adverse-event data at 500–1500 mg/day are reassuring out to 3–6 months in women's trials. Beyond that, cycling — e.g., 8–12 weeks on and 4 weeks off — is a sensible conservative pattern given the thin long-term human data.",
    },
    {
      q: "Does Tribulus interact with lithium or diuretics?",
      a: "Tribulus has a mild diuretic effect that could theoretically raise serum lithium by concentrating it, and it may add to loop or thiazide diuretics' fluid loss. If you take lithium, either avoid Tribulus or check a lithium level 2 weeks after starting under psychiatry supervision.",
    },
    {
      q: "Can Tribulus be used with a hormone-sensitive cancer history?",
      a: "Even though Tribulus doesn't reliably raise measured testosterone or estradiol, hormone-sensitive cancer survivorship (breast, endometrial, ovarian) is a case for oncology sign-off before any libido botanical. Testosterone therapy, DHEA, or vaginal estrogen may be more appropriate under specialist supervision.",
    },
    { q: "Where can I check Tribulus interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Vale FBC et al. J Sex Med 2018 — Tribulus terrestris in postmenopausal HSDD (RCT).",
      url: "https://pubmed.ncbi.nlm.nih.gov/29433827/",
    },
    {
      label: "Akhtari E et al. Daru 2014 — Tribulus in premenopausal HSDD.",
      url: "https://pubmed.ncbi.nlm.nih.gov/24773615/",
    },
    {
      label:
        "Neychev V, Mitev V. J Ethnopharmacol 2016 — Tribulus and androgen levels: review of human studies.",
      url: "https://pubmed.ncbi.nlm.nih.gov/26658354/",
    },
    {
      label: "Kostova I, Dinchev D. Phytochemistry 2005 — Saponins in Tribulus terrestris.",
      url: "https://pubmed.ncbi.nlm.nih.gov/15877988/",
    },
    {
      label:
        "Ganzera M et al. Planta Med 2001 — HPLC standardization of commercial Tribulus products.",
      url: "https://pubmed.ncbi.nlm.nih.gov/11582544/",
    },
    {
      label:
        "Pokrywka A et al. Biol Sport 2014 — Tribulus, testosterone, and athletic performance: systematic review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25177097/",
    },
    {
      label:
        "Postigo S et al. Rev Bras Ginecol Obstet 2016 — Tribulus in women with sexual dysfunction.",
      url: "https://pubmed.ncbi.nlm.nih.gov/26856082/",
    },
  ],
  related: rel("tribulus-women"),
  lastReviewed: REVIEWED,
};

export const VAGINAL_PROBIOTICS: WomensCompoundContent = {
  slug: "vaginal-probiotics",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Vaginal Probiotics",
  h1: "Vaginal Probiotics: L. crispatus, L. rhamnosus & Recurrent UTI/BV",
  summary:
    "Not all probiotics reach the vaginal microbiome — strain matters. Lactobacillus crispatus (CTV-05) and Lactobacillus rhamnosus GR-1 (often combined with L. reuteri RC-14) are the strains with real RCT evidence for reducing bacterial vaginosis (BV) recurrence and recurrent urinary tract infections. Generic 'women's probiotic' blends without strain identification typically don't have this data. Effects show up over 4–12 weeks of daily dosing. Safety is excellent. Vaginal probiotics don't replace antibiotic treatment for active infection; they reduce recurrence rates after treatment. Evidence level: moderate for specific strains and specific conditions.",
  keyFacts: {
    doseRange: "1–10 billion CFU/day of clinically-studied strains (dose depends on strain)",
    forms:
      "Oral capsules (studied), vaginal suppositories (also studied for direct urogenital colonization)",
    evidence: "Moderate",
    mainRisks: "Minimal. Very rare probiotic bacteremia in severely immunocompromised patients.",
  },
  research: [
    {
      heading: "Landmark BV-recurrence RCT (Lactin-V)",
      body: "Cohen et al. (NEJM 2020) randomised 228 women with recurrent bacterial vaginosis to intravaginal Lactobacillus crispatus CTV-05 (Lactin-V) vs placebo after standard metronidazole treatment. BV recurrence at 12 weeks was 30% in the Lactin-V arm vs 45% in placebo (RR 0.66; p=0.01) — the first large, well-controlled trial to show a live-biotherapeutic effect on the vaginal microbiome. Colonization persisted at 24 weeks in a subset of participants.",
    },
    {
      heading: "Gut-to-vagina translocation with oral GR-1/RC-14",
      body: "Reid et al. (FEMS Immunol Med Microbiol 2003) demonstrated using strain-specific PCR that oral Lactobacillus rhamnosus GR-1 and L. reuteri RC-14 can migrate from the GI tract to the vagina, displacing gardnerella and candida species. This mechanistic finding underpins the case for oral (not just intravaginal) probiotics for urogenital health and is why the GR-1/RC-14 pairing dominates the women's-health probiotic literature.",
    },
    {
      heading: "Recurrent UTI prevention",
      body: "Beerepoot et al. (Arch Intern Med 2012) compared oral L. rhamnosus GR-1 + L. reuteri RC-14 vs trimethoprim-sulfamethoxazole for one year in women with recurrent UTI. The probiotic was not statistically non-inferior to antibiotics on UTI count, but it produced no resistance development — a meaningful long-term advantage. Stapleton et al. (Clin Infect Dis 2011) separately showed intravaginal L. crispatus reduces UTI recurrence in premenopausal women.",
    },
    {
      heading: "Postmenopausal urogenital ecology",
      body: "Petricevic et al. (BJOG 2008) and Bohbot et al. (J Gynecol Obstet Biol Reprod 2018) show that combining vaginal estrogen with lactobacillus probiotics restores acidic pH and lactobacillus dominance more effectively than either intervention alone in postmenopausal women — directly relevant to GSM (genitourinary syndrome of menopause) and recurrent UTI in that population.",
    },
    {
      heading: "Candida (yeast) — weaker signal",
      body: "Xie et al. (Cochrane 2017) meta-analysed probiotics for recurrent vulvovaginal candidiasis and found modest short-term benefit as an adjunct to conventional antifungals, but low-quality evidence overall. Probiotics should not replace fluconazole for acute candida; the case for prevention is real but weaker than for BV.",
    },
    {
      heading: "Safety and immunocompromised populations",
      body: "Systematic safety reviews (Doron & Snydman, Clin Infect Dis 2015) document that lactobacillus bacteremia is exceedingly rare (<1 per million exposures) and essentially confined to severely immunocompromised patients with central venous access. For the general adult female population, safety is excellent.",
    },
    {
      heading: "Strain, dose, and product-selection",
      body: "The Alliance for the Advancement of Clinical Probiotic Science (2021) and Infectious Diseases Society of America position papers emphasise that clinical benefit does not generalise across strains. Products should list specific strains (e.g., L. crispatus CTV-05, L. rhamnosus GR-1, L. reuteri RC-14) at CFU counts matching published trials; generic 'women's probiotic blends' should be treated as unproven.",
    },
  ],
  interactions: [
    {
      with: "Antibiotics",
      mechanism: "Antibiotics kill probiotic bacteria and vice versa.",
      watchFor:
        "Take probiotics 2–4 hours away from antibiotics; continue probiotics 2–4 weeks after antibiotic course finishes.",
    },
    {
      with: "HRT (systemic and vaginal estrogen)",
      mechanism: "Vaginal estrogen supports lactobacillus growth — synergistic.",
      watchFor: "Positive combination.",
    },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None specific." },
    {
      with: "Immunosuppressants",
      mechanism: "Very rare bacteremia risk in severely immunocompromised patients.",
      watchFor: "Discuss with transplant or immunology team before starting.",
    },
    {
      with: "Antifungal medication",
      mechanism: "May affect probiotic bacteria depending on the antifungal.",
      watchFor: "Separate timing.",
    },
  ],
  cautions: [
    "Active bacterial vaginosis or UTI — use antibiotics first; probiotics prevent recurrence.",
    "Severely immunocompromised — discuss with clinician.",
    "Choose products that list specific strains at defined CFU counts.",
    "Refrigerated products need refrigeration; check storage requirements.",
  ],
  faq: [
    {
      q: "Which strains actually work for women?",
      a: "For BV recurrence: Lactobacillus crispatus CTV-05. For UTI recurrence and vaginal colonization: L. rhamnosus GR-1 + L. reuteri RC-14. For general vaginal microbiome support: L. crispatus, L. gasseri, L. jensenii. Avoid unspecified 'lactobacillus blend' products.",
    },
    {
      q: "Do vaginal probiotics prevent yeast infections?",
      a: "The evidence is weaker for candida than for BV or UTI. Some data suggests L. rhamnosus GR-1 may reduce recurrent yeast, but the effect is smaller than the antibiotic-prevention effect.",
    },
    {
      q: "Oral or vaginal probiotics for women?",
      a: "Both work through different mechanisms. Oral GR-1/RC-14 can migrate from gut to vagina. Vaginal suppositories (CTV-05) directly colonize the urogenital tract. For BV recurrence, vaginal application has stronger direct data.",
    },
    {
      q: "Do vaginal probiotics interact with birth control or HRT?",
      a: "No — no negative interactions. Vaginal estrogen actually helps probiotic strains colonize by lowering vaginal pH, so it's a positive combination for postmenopausal women.",
    },
    {
      q: "How long until vaginal probiotics work?",
      a: "Recurrent BV prevention: measurable at 8–12 weeks. UTI recurrence: 4–12 weeks. Not an acute treatment — for that, you need antibiotics.",
    },
    {
      q: "What time of day should vaginal probiotics be taken?",
      a: "Oral GR-1/RC-14 capsules are usually taken once daily with food — timing is not critical, but consistency is. Intravaginal suppositories (L. crispatus CTV-05) are typically applied at bedtime so the product isn't dislodged by activity and has hours of contact with the mucosa.",
    },
    {
      q: "Can I use vaginal probiotics during my period?",
      a: "For oral capsules, yes — no reason to pause. For intravaginal suppositories, most protocols skip application on heavy-flow days because menstrual flushing reduces contact time; resume on light days or immediately after the period ends.",
    },
    {
      q: "Do probiotics interact with fluconazole or other antifungals?",
      a: "Systemic antifungals (fluconazole, itraconazole) don't kill lactobacillus and can be used alongside vaginal probiotics — this is actually the standard combination for recurrent yeast prevention. Separate oral doses by 2–4 hours if you want to be conservative.",
    },
    {
      q: "Are vaginal probiotics safe during pregnancy?",
      a: "Lactobacillus species from validated products have a strong safety record in pregnancy trials, particularly for BV recurrence prevention. Discuss with your obstetric provider before starting any intravaginal product during pregnancy; oral capsules are generally considered lower risk.",
    },
    { q: "Where can I check probiotic interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label:
        "Cohen CR et al. NEJM 2020 — Lactobacillus crispatus CTV-05 (Lactin-V) for BV recurrence.",
      url: "https://pubmed.ncbi.nlm.nih.gov/32286830/",
    },
    {
      label:
        "Reid G et al. FEMS Immunol Med Microbiol 2003 — Oral L. rhamnosus GR-1/L. reuteri RC-14 vaginal colonization.",
      url: "https://pubmed.ncbi.nlm.nih.gov/12604203/",
    },
    {
      label:
        "Beerepoot MA et al. Arch Intern Med 2012 — Lactobacillus vs TMP-SMX for recurrent UTI.",
      url: "https://pubmed.ncbi.nlm.nih.gov/22641948/",
    },
    {
      label:
        "Stapleton AE et al. Clin Infect Dis 2011 — Intravaginal L. crispatus for recurrent UTI.",
      url: "https://pubmed.ncbi.nlm.nih.gov/21498386/",
    },
    {
      label:
        "Xie HY et al. Cochrane Database Syst Rev 2017 — Probiotics for vulvovaginal candidiasis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29168557/",
    },
    {
      label: "Doron S, Snydman DR. Clin Infect Dis 2015 — Safety of probiotics.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25922398/",
    },
    {
      label: "Petricevic L et al. BJOG 2008 — Vaginal L. rhamnosus GR-1 postmenopause.",
      url: "https://pubmed.ncbi.nlm.nih.gov/18715433/",
    },
  ],
  related: rel("vaginal-probiotics"),
  lastReviewed: REVIEWED,
};

export const ASHWAGANDHA_WOMEN: WomensCompoundContent = {
  slug: "ashwagandha-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Ashwagandha (for women)",
  h1: "Ashwagandha for Women: Stress, Sleep, Libido, and Thyroid Cautions",
  summary:
    "Ashwagandha (Withania somnifera) is an adaptogen with meaningful RCT evidence in women for reducing perceived stress, improving sleep quality, and — in one trial — improving sexual function in women with HSDD. Standardized extracts (KSM-66 or Shoden) at 300–600 mg/day are the doses used in most trials. The most important cautions for women are: it can push TSH down (relevant if you have hypothyroidism or hyperthyroidism), it modulates cortisol (may interact with corticosteroids and mood medications), and it's immunostimulant (avoid with immunosuppressants). It should not be used in pregnancy. Evidence level: moderate for stress and sleep; limited for libido; strong for the thyroid and immunosuppressant cautions.",
  keyFacts: {
    doseRange:
      "300–600 mg/day standardized extract (KSM-66 or Shoden); 5% withanolide content is the standard",
    forms: "Standardized extract capsules (KSM-66, Shoden), raw powder (less consistent dosing)",
    evidence: "Moderate",
    mainRisks:
      "Lowers TSH (thyroid caution). Immunostimulant. Not for pregnancy. Rare hepatotoxicity.",
  },
  research: [
    {
      heading: "Perceived stress and cortisol — foundational RCT",
      body: "Chandrasekhar et al. (Indian J Psychol Med 2012) randomised 64 chronically stressed adults to KSM-66 300 mg BID vs placebo for 60 days. The active arm showed 44% reduction in Perceived Stress Scale scores and 27.9% reduction in serum morning cortisol vs placebo, with significant improvements in Depression Anxiety Stress Scale subscores. This trial is the reference dose (300 mg BID) for most subsequent adult protocols.",
    },
    {
      heading: "Sleep quality — dose-ranging RCT",
      body: "Salve et al. (Cureus 2019) randomised 60 adults with self-reported non-restorative sleep to KSM-66 250 mg or 600 mg daily for 8 weeks. Both arms improved sleep-onset latency, total sleep time, and Pittsburgh Sleep Quality Index scores vs placebo, with the 600 mg arm showing larger effects. Kelgane et al. (Cureus 2020) extended this in older adults (65–80) with insomnia and confirmed improvements in sleep quality and mental alertness at 600 mg/day for 12 weeks.",
    },
    {
      heading: "Female sexual function in HSDD",
      body: "Dongre et al. (BioMed Res Int 2015) randomised 50 women with HSDD to KSM-66 300 mg BID vs placebo for 8 weeks. FSFI total, arousal, lubrication, orgasm, and satisfaction all improved significantly vs placebo, with a corresponding rise in number of successful sexual encounters. Effect appears mediated through stress and cortisol pathways rather than sex-steroid changes.",
    },
    {
      heading: "Thyroid — TSH suppression is real",
      body: "Sharma et al. (J Altern Complement Med 2018) tested KSM-66 600 mg/day for 8 weeks in patients with subclinical hypothyroidism and found significant reductions in TSH and increases in free T3 and free T4 vs placebo. The same mechanism is a hazard in euthyroid patients on levothyroxine — they can drift into over-replacement — and in patients with Graves' or nodular hyperthyroidism, who can worsen. This is the single most important safety point for women.",
    },
    {
      heading: "Muscle, strength, and testosterone (mixed relevance to women)",
      body: "Wankhede et al. (J Int Soc Sports Nutr 2015) showed KSM-66 600 mg/day increased strength and lean mass with a modest testosterone rise in resistance-trained men. Women-specific strength data (Sandhu et al., Ayu 2010) show smaller but positive effects on VO₂ max and endurance. Serum testosterone changes in women are minor and clinically irrelevant.",
    },
    {
      heading: "Rare hepatotoxicity signal",
      body: "Case series (Björnsson et al., Liver Int 2020; Lubarska et al., Nutrients 2023) describe idiosyncratic cholestatic or mixed hepatitis with ashwagandha, typically resolving after discontinuation. Absolute risk appears low, but ashwagandha should be stopped and LFTs checked if jaundice, dark urine, or persistent RUQ discomfort emerge.",
    },
    {
      heading: "Pregnancy contraindication",
      body: "Traditional Ayurvedic texts and animal reproductive-toxicity data document abortifacient potential, and the herb is uniformly contraindicated during pregnancy across every reputable modern monograph (WHO, Health Canada, EMA HMPC). Breastfeeding data are insufficient — avoid.",
    },
    {
      heading: "Immune modulation",
      body: "Mikolai et al. (J Altern Complement Med 2009) demonstrated that ashwagandha up-regulates CD4/CD8 counts and NK cell activity in healthy volunteers — beneficial in general use, but a mechanistic reason to avoid combination with immunosuppressive therapy (post-transplant, biologics for autoimmune disease).",
    },
  ],
  interactions: [
    {
      with: "Thyroid medication (levothyroxine)",
      mechanism:
        "Ashwagandha lowers TSH and raises T4 — can cause over-replacement in patients on levothyroxine.",
      watchFor: "Check TSH 6–8 weeks after starting; dose adjustment may be needed.",
    },
    {
      with: "Immunosuppressants (cyclosporine, tacrolimus, biologics)",
      mechanism: "Ashwagandha is immunostimulant — theoretical antagonism.",
      watchFor: "Avoid without transplant/rheumatology sign-off.",
    },
    {
      with: "Sedatives, benzodiazepines, alcohol",
      mechanism: "Additive CNS sedation.",
      watchFor: "Take sedative-heavy doses in evening; avoid driving after.",
    },
    {
      with: "Corticosteroids",
      mechanism:
        "Ashwagandha lowers cortisol; adding to prescribed steroids may destabilize dosing.",
      watchFor: "Discuss with prescriber.",
    },
    {
      with: "Diabetes medication",
      mechanism: "Ashwagandha modestly lowers blood glucose.",
      watchFor: "Monitor if on insulin or sulfonylureas.",
    },
    {
      with: "HRT and birth control",
      mechanism: "No known interaction.",
      watchFor: "None specific.",
    },
    {
      with: "SSRIs",
      mechanism: "No known pharmacokinetic interaction; some mood benefit reported.",
      watchFor: "None specific.",
    },
  ],
  cautions: [
    "Pregnancy — contraindicated (potential abortifacient effect).",
    "Breastfeeding — insufficient data; avoid.",
    "Hyperthyroidism or Graves' disease — ashwagandha can worsen it.",
    "Hashimoto's or hypothyroidism on levothyroxine — monitor TSH.",
    "Autoimmune disease on immunosuppressants — avoid.",
    "Rare case reports of hepatotoxicity — stop if RUQ pain, jaundice, or unexplained fatigue.",
  ],
  faq: [
    {
      q: "Does ashwagandha work for women's stress?",
      a: "Yes, moderately. Multiple RCTs at 300–600 mg/day standardized extract show reductions in perceived stress and cortisol over 60–90 days. Effect size is meaningful but not enormous.",
    },
    {
      q: "Can I take ashwagandha with levothyroxine?",
      a: "Cautiously. Ashwagandha lowers TSH and raises free T4 — this can cause over-replacement in patients on thyroid hormone. If you take it, monitor TSH 6–8 weeks after starting and be prepared for dose adjustment.",
    },
    {
      q: "Does ashwagandha help women's libido?",
      a: "One RCT in women with HSDD showed benefit at 300 mg BID over 8 weeks. It's a reasonable choice specifically if stress is a driver of low desire, since ashwagandha primarily works on stress and cortisol.",
    },
    {
      q: "Can I take ashwagandha with SSRIs?",
      a: "No known pharmacokinetic conflict. Some users report additive mood benefit. Discuss with your prescriber, especially if adjusting SSRI dosing.",
    },
    {
      q: "Is ashwagandha safe with HRT?",
      a: "Yes — no known interaction with sex hormones. The important interactions are thyroid, immunosuppressant, sedative, and cortisol-related.",
    },
    {
      q: "How long does ashwagandha take to work?",
      a: "Stress and sleep effects show up at 2–4 weeks; sexual function outcomes at 8 weeks. Give it 8 weeks at 300–600 mg/day before judging.",
    },
    {
      q: "Should ashwagandha be taken in the morning or at night?",
      a: "Split dosing (e.g., 300 mg morning + 300 mg early evening) is what most RCTs used. A single evening dose is fine — and often preferred — if sleep is your primary target. Take with food to reduce mild GI upset in the first two weeks.",
    },
    {
      q: "How long can ashwagandha be used continuously?",
      a: "Trials commonly run 8–12 weeks with a safety envelope out to about 6 months. Because of the TSH-lowering effect and rare hepatotoxicity signal, an annual break or intermittent 8-weeks-on / 2-weeks-off cycle is a sensible conservative pattern, plus periodic LFT/TSH monitoring if using longer term.",
    },
    {
      q: "Can ashwagandha be combined with birth control?",
      a: "There is no known pharmacokinetic interaction with combined oral contraceptives or progestin-only pills, so co-use is generally considered safe. The interactions to actually watch for are with thyroid medication, immunosuppressants, sedatives, and corticosteroids.",
    },
    {
      q: "Does ashwagandha interact with anesthesia before surgery?",
      a: "Yes — because of its sedative and central-nervous-system effects, ashwagandha can add to anesthetic and benzodiazepine sedation. Stop it at least 2 weeks before any planned surgery and tell your anesthesiologist you have been taking it.",
    },
    { q: "Where can I check ashwagandha interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label:
        "Chandrasekhar K et al. Indian J Psychol Med 2012 — KSM-66 ashwagandha for stress and cortisol (RCT).",
      url: "https://pubmed.ncbi.nlm.nih.gov/23439798/",
    },
    {
      label: "Salve J et al. Cureus 2019 — Ashwagandha and sleep quality: dose-ranging RCT.",
      url: "https://pubmed.ncbi.nlm.nih.gov/32021735/",
    },
    {
      label: "Kelgane SB et al. Cureus 2020 — Ashwagandha in elderly with insomnia.",
      url: "https://pubmed.ncbi.nlm.nih.gov/32137026/",
    },
    {
      label:
        "Dongre S et al. BioMed Res Int 2015 — Ashwagandha and female sexual function (HSDD RCT).",
      url: "https://pubmed.ncbi.nlm.nih.gov/26504795/",
    },
    {
      label:
        "Sharma AK et al. J Altern Complement Med 2018 — Ashwagandha in subclinical hypothyroidism.",
      url: "https://pubmed.ncbi.nlm.nih.gov/28829155/",
    },
    {
      label: "Björnsson HK et al. Liver Int 2020 — Ashwagandha-induced liver injury case series.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31536176/",
    },
    {
      label:
        "Wankhede S et al. J Int Soc Sports Nutr 2015 — Ashwagandha for muscle strength and recovery.",
      url: "https://pubmed.ncbi.nlm.nih.gov/26609282/",
    },
  ],
  related: rel("ashwagandha-women"),
  lastReviewed: REVIEWED,
};
