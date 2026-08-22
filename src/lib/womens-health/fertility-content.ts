import type { WomensCompoundContent } from "@/components/womens-compound-article";

const HUB = { slug: "fertility-cycle" as const, title: "Fertility & Cycle Support" };
const REVIEWED = "2026-07-27";

const RELATED = [
  { slug: "myo-inositol", name: "Myo-Inositol" },
  { slug: "d-chiro-inositol", name: "D-Chiro-Inositol" },
  { slug: "coq10-fertility", name: "CoQ10 (egg quality)" },
  { slug: "vitamin-d-fertility", name: "Vitamin D (fertility)" },
  { slug: "folate-vs-folic-acid", name: "Folate vs Folic Acid" },
  { slug: "iron-cycle", name: "Iron (cycle context)" },
  { slug: "b6-luteal", name: "Vitamin B6 (luteal phase)" },
];
const rel = (ex: string) => RELATED.filter((r) => r.slug !== ex).slice(0, 4);

const CITE_INTERACTION =
  "Use the DoseRoutine interaction checker at doseroutine.com/interaction-checker to add every fertility supplement plus your prenatal, thyroid medication, or fertility prescription in one view.";

export const MYO_INOSITOL: WomensCompoundContent = {
  slug: "myo-inositol",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Myo-Inositol",
  h1: "Myo-Inositol for Women: PCOS, Fertility, and Insulin Sensitivity",
  summary:
    "Myo-inositol is a sugar-alcohol that acts as a secondary messenger for insulin signalling and follicle-stimulating hormone. It's the single most-studied natural intervention for polycystic ovary syndrome (PCOS). At 2 g twice daily (usually combined with D-chiro-inositol at a 40:1 ratio), it improves insulin sensitivity, cycle regularity, ovulation rate, and androgen markers in PCOS. Multiple RCTs show effect sizes comparable to metformin for a subset of patients, with fewer GI side effects. It's also used off-label for gestational diabetes prevention and for pre-IVF egg quality support. Safety is excellent. Evidence level: strong for PCOS; moderate for fertility outcomes.",
  keyFacts: {
    doseRange: "2 g twice daily myo-inositol (± 50 mg D-chiro-inositol; 40:1 ratio is standard)",
    forms: "Powder (best for grams-per-day dosing), capsules (many capsules needed)",
    evidence: "Strong",
    mainRisks: "Very well tolerated. Mild GI at high doses.",
  },
  research: [
    {
      heading: "Mechanism: insulin and FSH second messenger",
      body: "Myo-inositol phosphoglycan mediators are downstream of both insulin and FSH receptors. In PCOS, tissue-level inositol depletion (with urinary wasting of myo-inositol and a shifted myo:D-chiro ratio) is a leading biochemical explanation for the coexisting insulin resistance and ovulatory dysfunction. Repletion at 2 g twice daily normalises intracellular signalling within roughly 8-12 weeks, which aligns with the timescale on which ovulation and cycle regularity return in trials.",
    },
    {
      heading: "Unfer 2017 meta-analysis (PCOS)",
      body: "Unfer et al. (Endocrine Journal 2017, updated from 2016) pooled 9 RCTs of inositol in PCOS. Myo-inositol significantly reduced HOMA-IR, fasting insulin, free testosterone and LH:FSH ratio, and increased ovulation rate versus placebo. Effect sizes for HOMA-IR were in the range typically seen with lifestyle intervention plus low-dose metformin.",
    },
    {
      heading: "Facchinetti 2019 head-to-head vs metformin",
      body: "Facchinetti et al. (Gynecol Endocrinol 2019) meta-analyzed head-to-head RCTs of inositol versus metformin in PCOS. Metabolic markers (HOMA-IR, BMI, testosterone) and ovulation rates were statistically equivalent, but the metformin arm had substantially higher GI adverse events and drop-outs. This is the strongest justification for offering myo-inositol as a first-line option in patients who cannot tolerate metformin.",
    },
    {
      heading: "Oocyte quality and IVF outcomes",
      body: "Zheng et al. (Gynecol Endocrinol 2017) and multiple pre-IVF cohorts showed that 2 g BID myo-inositol plus 200-400 mcg folic acid for 3 months before stimulation improved oocyte maturation rate, reduced immature (GV) oocytes, and modestly improved fertilization rate in women with PCOS undergoing ICSI. Papaleo et al. (Fertil Steril 2009) previously showed similar improvements in gonadotropin dose required.",
    },
    {
      heading: "Gestational diabetes prevention",
      body: "In three Italian RCTs (D'Anna et al., Diabetes Care 2013 and 2015; Matarrelli et al., J Matern Fetal Neonatal Med 2013) in women at high GDM risk (obesity, family history, prior GDM, or PCOS), 2 g BID myo-inositol from the first trimester reduced GDM incidence by roughly 50-65%. This is one of the few nutraceutical interventions with a positive Cochrane signal for GDM prevention.",
    },
    {
      heading: "The 40:1 myo:D-chiro ratio",
      body: "Nordio & Proietti (Eur Rev Med Pharmacol Sci 2012) showed that a 40:1 myo:D-chiro ratio outperformed either isoform alone for combined metabolic and reproductive endpoints. The ratio was chosen because it mirrors the physiologic plasma ratio in healthy women; PCOS is characterised by relative myo-inositol depletion with preserved or elevated D-chiro.",
    },
    {
      heading: "Safety and pregnancy exposure",
      body: "Cumulative pregnancy exposure across GDM prevention trials exceeds several thousand women without safety signals for the mother or fetus. Adverse events across the entire literature are almost exclusively mild GI (bloating, loose stools) at doses above 4 g/day and typically resolve with dose splitting.",
    },
  ],
  interactions: [
    {
      with: "Metformin",
      mechanism: "Both improve insulin sensitivity — additive effect; some clinicians combine.",
      watchFor: "Monitor glucose; combining is safe and often synergistic.",
    },
    {
      with: "Fertility medication (letrozole, clomid)",
      mechanism: "No pharmacokinetic conflict; often combined in PCOS protocols.",
      watchFor: "None specific.",
    },
    {
      with: "Birth control (COCs)",
      mechanism: "No known interaction. Some PCOS patients use both.",
      watchFor: "None specific.",
    },
    { with: "Thyroid medication", mechanism: "No known interaction.", watchFor: "None specific." },
    {
      with: "Insulin",
      mechanism: "Additive glucose-lowering.",
      watchFor: "Monitor glucose closely if diabetic on insulin.",
    },
    {
      with: "SSRIs and lithium",
      mechanism:
        "Very high inositol doses have been tested in psychiatric conditions with mixed results; no PK conflict.",
      watchFor: "None specific at PCOS doses.",
    },
  ],
  cautions: [
    "Type 1 or insulin-dependent Type 2 diabetes — monitor glucose closely.",
    "Pregnancy — appears safe and is often specifically used; stay under obstetric supervision.",
    "Give it 3 months at 2 g BID before judging PCOS effect.",
    "Products labelled 'inositol blend' without stated myo:D-chiro ratio can vary widely; specify the ratio.",
  ],
  faq: [
    {
      q: "How does myo-inositol help PCOS?",
      a: "Myo-inositol acts as a secondary messenger for insulin and FSH. In PCOS — where insulin resistance drives androgen excess and ovulatory dysfunction — restoring inositol signalling improves insulin sensitivity, lowers androgens, and often restores ovulation. Effects appear at 3 months in most trials.",
    },
    {
      q: "Myo-inositol or metformin for PCOS?",
      a: "Meta-analyses show comparable metabolic and ovulation outcomes for the two. Inositol has better GI tolerability. Metformin has more decades of data and is cheaper. Many clinicians combine both. Discuss with your reproductive endocrinologist.",
    },
    {
      q: "What ratio of myo-inositol to D-chiro-inositol?",
      a: "The 40:1 ratio (2000 mg myo + 50 mg D-chiro) is the most studied. It mirrors the ratio found naturally in plasma. Products using different ratios have less evidence and, in some cases, worse outcomes than pure myo-inositol.",
    },
    {
      q: "Does myo-inositol interact with birth control?",
      a: "No — no known interaction. Some PCOS patients on birth control add myo-inositol for insulin and metabolic support.",
    },
    {
      q: "Can I take myo-inositol during pregnancy?",
      a: "Appears safe and is specifically used for gestational diabetes prevention in high-risk women. Stay under obstetric supervision.",
    },
    { q: "Where can I check myo-inositol interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Unfer V et al. Endocrine J 2017 - Inositols in PCOS: updated meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/27321119/",
    },
    {
      label:
        "Facchinetti F et al. Gynecol Endocrinol 2019 - Inositol vs metformin in PCOS meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30614282/",
    },
    {
      label:
        "D'Anna R et al. Diabetes Care 2013 - Myo-inositol for GDM prevention in obese pregnant women.",
      url: "https://pubmed.ncbi.nlm.nih.gov/23193218/",
    },
    {
      label:
        "D'Anna R et al. Diabetes Care 2015 - Myo-inositol GDM prevention in women with family history.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25617381/",
    },
    {
      label:
        "Papaleo E et al. Fertil Steril 2009 - Myo-inositol reduces gonadotropin requirement in IVF.",
      url: "https://pubmed.ncbi.nlm.nih.gov/18710713/",
    },
    {
      label: "Zheng X et al. Gynecol Endocrinol 2017 - Myo-inositol + folic acid pre-ICSI in PCOS.",
      url: "https://pubmed.ncbi.nlm.nih.gov/28277112/",
    },
    {
      label:
        "Nordio M, Proietti E. Eur Rev Med Pharmacol Sci 2012 - 40:1 myo:D-chiro ratio in PCOS.",
      url: "https://pubmed.ncbi.nlm.nih.gov/22913173/",
    },
  ],
  related: rel("myo-inositol"),
  lastReviewed: REVIEWED,
};

export const D_CHIRO_INOSITOL: WomensCompoundContent = {
  slug: "d-chiro-inositol",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "D-Chiro-Inositol",
  h1: "D-Chiro-Inositol for Women: When to Use It (and When Not To)",
  summary:
    "D-chiro-inositol (DCI) is the second inositol form used in women's health, distinct from myo-inositol. In insulin-target tissues (liver, muscle), DCI supports glycogen synthesis. In ovarian tissue, high DCI can worsen egg quality — which is why 'DCI-only' products have been abandoned for pregnancy and PCOS. The evidence-based approach is to combine myo-inositol with a small amount of DCI at a 40:1 ratio (2000 mg myo + 50 mg DCI). This mirrors natural plasma balance and delivers metabolic benefit without harming oocyte quality. Standalone DCI at high doses is not recommended for women trying to conceive. Evidence level: strong for the 40:1 combined approach; negative for DCI-only high-dose products.",
  keyFacts: {
    doseRange:
      "50 mg DCI paired with 2000 mg myo-inositol (40:1 ratio). Standalone DCI: not recommended.",
    forms: "Combination powders and capsules (myo + DCI at 40:1)",
    evidence: "Moderate",
    mainRisks:
      "High-dose DCI without myo-inositol harms oocyte quality — don't use standalone at high dose.",
  },
  research: [
    {
      heading: "Tissue-specific roles of DCI vs myo-inositol",
      body: "Myo-inositol and D-chiro-inositol are stereoisomers with distinct tissue distributions. Myo-inositol is enriched in ovarian granulosa cells and central nervous tissue, where it mediates FSH signalling. DCI is enriched in insulin-target tissues (liver, muscle, adipose), where it acts on glycogen synthase. The ovary is a low-DCI environment by design - and disturbing that balance with high exogenous DCI is what drives the negative fertility signal (Carlomagno & Unfer, Trends Endocrinol Metab 2011).",
    },
    {
      heading: "Why DCI-only fertility products were withdrawn",
      body: "Isabella & Raffone (Trends Endocrinol Metab 2012, 'Does ovary need D-chiro-inositol?') collated evidence that high-dose DCI-only supplementation reduced oocyte quality and blastocyst rates. Products that had been marketed at 500-1200 mg DCI daily for PCOS were largely withdrawn from fertility use in Europe following these findings.",
    },
    {
      heading: "The 40:1 ratio",
      body: "Nordio & Proietti (Eur Rev Med Pharmacol Sci 2012) directly compared six myo:DCI ratios in PCOS women and found the 40:1 ratio (2000 mg myo + 50 mg DCI, BID) delivered the best combined metabolic and reproductive outcomes. This ratio mirrors the physiologic plasma balance in healthy premenopausal women.",
    },
    {
      heading: "Metabolic-only DCI use outside fertility",
      body: "Some products still market pure DCI at 500-1000 mg/day for weight, insulin resistance, or metabolic syndrome. The evidence base at these doses is much thinner than for the 40:1 combination and there are no positive fertility outcome data. Women who may want to conceive should not use standalone high-dose DCI.",
    },
    {
      heading: "Insulin-sensitising mechanism",
      body: "DCI upregulates glycogen synthase and improves peripheral glucose disposal. In PCOS, this contributes to the reduction in fasting insulin and free androgen seen with combined myo:DCI therapy. The additive metabolic benefit vs myo-inositol alone is small but consistent across trials of the 40:1 combination.",
    },
    {
      heading: "Regulatory and quality-control caveats",
      body: "Products labelled 'inositol blend' without a stated ratio can vary from 1:1 to 100:1. Choose products that specify the myo:DCI ratio on the label; 40:1 remains the best-evidenced choice for PCOS. Third-party testing (NSF, Informed Sport) is preferred for supplements used peri-conception.",
    },
  ],
  interactions: [
    {
      with: "Fertility medication",
      mechanism: "No PK conflict at 40:1 doses; used together in many PCOS protocols.",
      watchFor: "None.",
    },
    {
      with: "Metformin",
      mechanism: "Additive insulin sensitization.",
      watchFor: "Monitor glucose.",
    },
    {
      with: "Insulin",
      mechanism: "Additive glucose-lowering.",
      watchFor: "Monitor if diabetic on insulin.",
    },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None specific." },
    { with: "Thyroid medication", mechanism: "No interaction.", watchFor: "None." },
  ],
  cautions: [
    "Do not use standalone high-dose DCI if trying to conceive.",
    "Type 1 or insulin-dependent Type 2 diabetes — monitor glucose.",
    "Confirm product ratio — 40:1 (myo:DCI) is the evidence-based combination.",
    "Give it 3 months before judging.",
  ],
  faq: [
    {
      q: "Is D-chiro-inositol the same as myo-inositol?",
      a: "No — they're stereoisomers with different tissue targets. Myo-inositol dominates in ovaries and CNS; DCI dominates in muscle and liver. The two are used together at a 40:1 ratio to cover both tissue systems.",
    },
    {
      q: "Can I take DCI on its own for PCOS?",
      a: "Not recommended, especially if trying to conceive. High-dose DCI-only supplementation has been shown to harm oocyte quality. Always combine with myo-inositol at 40:1.",
    },
    {
      q: "What's the best inositol product for PCOS?",
      a: "A 40:1 myo:DCI combination at 2000 mg myo + 50 mg DCI, taken twice daily (total 4000:100 mg). Products with different ratios have weaker or negative data.",
    },
    {
      q: "Can I take DCI with metformin?",
      a: "Yes — they're often combined for additive insulin sensitization. Monitor glucose if you're already on insulin or sulfonylureas.",
    },
    {
      q: "Is DCI safe in pregnancy?",
      a: "Combined 40:1 myo/DCI is used in gestational diabetes prevention. Stay under obstetric supervision. Standalone high-dose DCI is not recommended in pregnancy.",
    },
    { q: "Where can I check DCI interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Nordio M, Proietti E. Eur Rev Med Pharmacol Sci 2012 - 40:1 myo:DCI ratio in PCOS.",
      url: "https://pubmed.ncbi.nlm.nih.gov/22913173/",
    },
    {
      label:
        "Isabella R, Raffone E. Trends Endocrinol Metab 2012 - Does ovary need D-chiro-inositol?",
      url: "https://pubmed.ncbi.nlm.nih.gov/22197674/",
    },
    {
      label:
        "Carlomagno G, Unfer V. Trends Endocrinol Metab 2011 - Inositol safety and tissue roles.",
      url: "https://pubmed.ncbi.nlm.nih.gov/21620723/",
    },
    {
      label: "Unfer V et al. Endocrine J 2017 - Inositol PCOS meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/27321119/",
    },
    {
      label:
        "Facchinetti F et al. Expert Opin Drug Metab Toxicol 2020 - Inositols in reproductive medicine review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/32149541/",
    },
    {
      label:
        "Genazzani AD et al. Gynecol Endocrinol 2014 - Myo-inositol restores ovulation in PCOS.",
      url: "https://pubmed.ncbi.nlm.nih.gov/24601829/",
    },
    {
      label: "Pundir J et al. Hum Reprod Update 2018 - Inositol treatment PCOS Cochrane update.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29648665/",
    },
  ],
  related: rel("d-chiro-inositol"),
  lastReviewed: REVIEWED,
};

export const COQ10_FERTILITY: WomensCompoundContent = {
  slug: "coq10-fertility",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "CoQ10 (Egg Quality)",
  h1: "CoQ10 for Egg Quality: Evidence, Dosage & IVF Interactions",
  summary:
    "CoQ10 is a mitochondrial cofactor. Oocytes are among the most mitochondria-dense cells in the body, and mitochondrial quality declines with age — which is the mechanistic case for CoQ10 in fertility, particularly in women over 35. Small RCTs in women approaching IVF show modest improvements in oocyte mitochondrial function, fertilization rates, and embryo grade after 60–90 days of 200–600 mg/day (ubiquinone) or 100–300 mg/day (ubiquinol). It's not a substitute for reproductive endocrinology care. The main interaction to know is warfarin (CoQ10 resembles vitamin K structurally). Evidence level: limited-to-moderate for women over 35 approaching IVF.",
  keyFacts: {
    doseRange: "200–600 mg/day ubiquinone or 100–300 mg/day ubiquinol, for 60–90 days pre-IVF",
    forms: "Ubiquinol softgels (preferred over 40), ubiquinone capsules",
    evidence: "Limited",
    mainRisks: "Warfarin interaction (reduces effect). Otherwise excellent safety.",
  },
  research: [
    {
      heading: "Mitochondrial rationale in oocytes",
      body: "Oocytes carry more mitochondria than any other human cell (100,000+ per mature oocyte) and depend on oxidative phosphorylation for meiotic spindle assembly and fertilization competence. CoQ10 is an obligate electron carrier in the mitochondrial respiratory chain; endogenous synthesis declines with age. The clinical hypothesis is that CoQ10 supplementation partly rescues age-related oocyte bioenergetic decline (Ben-Meir et al., Aging Cell 2015).",
    },
    {
      heading: "Ben-Meir 2015 - mechanistic proof in mice",
      body: "Ben-Meir and colleagues (Aging Cell 2015) supplemented reproductively aged mice with CoQ10 and showed restoration of oocyte mitochondrial activity, reduced aneuploidy, and improved ovarian reserve markers compared with age-matched controls. This is the mechanistic study that motivated most subsequent human trials.",
    },
    {
      heading: "Bentov 2014 IVF pilot",
      body: "Bentov et al. (Fertil Steril 2014) tested 600 mg/day CoQ10 for at least 60 days before IVF in women 38-42. The intervention arm showed non-significantly higher clinical pregnancy rates and fewer aneuploid embryos on PGT. The pilot was underpowered but the effect direction supported the older-oocyte hypothesis.",
    },
    {
      heading: "Xu 2018 RCT (RBMOnline)",
      body: "Xu et al. (Reprod Biomed Online 2018) randomised 169 women aged 35+ with poor ovarian response to 600 mg CoQ10 or placebo for 60 days pre-stimulation. The CoQ10 arm had significantly more mature oocytes retrieved, higher fertilization rates, and higher high-quality embryo rates. Live birth was not the primary endpoint but trended favourably.",
    },
    {
      heading: "Ubiquinol vs ubiquinone",
      body: "Endogenous reduction of ubiquinone to the active ubiquinol form declines with age. Head-to-head pharmacokinetic studies (Failla et al., J Funct Foods 2014; Langsjoen 2014) show ubiquinol produces higher serum CoQ10 at lower doses in adults over 40. For women over 40 or with malabsorption, 100-300 mg ubiquinol is roughly bio-equivalent to 400-600 mg ubiquinone.",
    },
    {
      heading: "Timing to ovulation",
      body: "Folliculogenesis from primordial follicle recruitment to ovulation takes approximately 85-90 days. To influence the mitochondrial biology of the cohort recruited for a given IVF cycle, CoQ10 should be started at least 60 days - ideally 90 days - before stimulation. Shorter protocols have failed in some negative trials, which may reflect insufficient exposure rather than lack of effect.",
    },
    {
      heading: "Where CoQ10 does not help",
      body: "CoQ10 does not reverse age-related decline in ovarian reserve (AMH, antral follicle count). Women with severely diminished reserve should not defer time-sensitive treatment on the expectation that CoQ10 will restore oocyte number. Frame it as an adjunct that may improve the quality of whatever oocytes are retrieved, not as a fertility treatment on its own.",
    },
  ],
  interactions: [
    {
      with: "Warfarin",
      mechanism: "Structural similarity to vitamin K reduces anticoagulant effect.",
      watchFor:
        "Monitor INR when starting/stopping. Rarely relevant in fertility patients but important to know.",
    },
    {
      with: "Fertility medication (letrozole, clomid, gonadotropins)",
      mechanism: "No PK conflict.",
      watchFor: "None specific.",
    },
    {
      with: "Statins",
      mechanism: "Statins reduce endogenous CoQ10; supplementation often recommended.",
      watchFor: "Complementary, not conflicting.",
    },
    { with: "Thyroid medication", mechanism: "No interaction.", watchFor: "None." },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None." },
  ],
  cautions: [
    "On warfarin — monitor INR.",
    "Timing: start 60–90 days before egg retrieval; CoQ10 needs time to affect oocyte mitochondrial biology.",
    "Ubiquinol has better absorption after age 40.",
    "Not a substitute for reproductive endocrinology care.",
  ],
  faq: [
    {
      q: "How much CoQ10 for egg quality?",
      a: "Most trials use 200–600 mg/day of ubiquinone or 100–300 mg/day of ubiquinol, taken for 60–90 days before IVF stimulation. Higher doses aren't clearly better.",
    },
    {
      q: "When should I start CoQ10 before IVF?",
      a: "60–90 days pre-retrieval, ideally. Oocyte development takes about 90 days, so earlier is better. Some clinicians recommend starting 3–4 months out.",
    },
    {
      q: "Does CoQ10 improve natural fertility (not IVF)?",
      a: "The strongest data is in IVF contexts because outcomes (fertilization rate, embryo grade) are measurable. Mechanistically, CoQ10 should also help natural fertility in women over 35, but direct evidence is thinner.",
    },
    {
      q: "Ubiquinol or ubiquinone for fertility?",
      a: "Under 35: either works. Over 40: ubiquinol has better absorption data. Cost per mg is higher for ubiquinol but you can use lower doses.",
    },
    {
      q: "Does CoQ10 interact with fertility medications?",
      a: "No — no known interactions with letrozole, clomid, or gonadotropins. It's commonly stacked with fertility protocols.",
    },
    { q: "Where can I check CoQ10 interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label:
        "Ben-Meir A et al. Aging Cell 2015 - CoQ10 restores oocyte mitochondrial function in aged mice.",
      url: "https://pubmed.ncbi.nlm.nih.gov/26111450/",
    },
    {
      label: "Bentov Y et al. Fertil Steril 2014 - CoQ10 in older women undergoing IVF.",
      url: "https://pubmed.ncbi.nlm.nih.gov/24461406/",
    },
    {
      label: "Xu Y et al. Reprod Biomed Online 2018 - CoQ10 pretreatment RCT in poor responders.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30340892/",
    },
    {
      label:
        "Giannubilo SR et al. Antioxidants 2018 - CoQ10 and female fertility narrative review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30049970/",
    },
    {
      label: "Failla ML et al. J Funct Foods 2014 - Ubiquinol vs ubiquinone bioavailability.",
      url: "https://pubmed.ncbi.nlm.nih.gov/24393712/",
    },
    {
      label:
        "Rodriguez-Varela C, Labarta E. Antioxidants 2020 - Mitochondrial dysfunction and oocyte quality review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33266287/",
    },
    {
      label: "NIH Office of Dietary Supplements - CoQ10 professional fact sheet.",
      url: "https://ods.od.nih.gov/factsheets/CoenzymeQ10-HealthProfessional/",
    },
  ],
  related: rel("coq10-fertility"),
  lastReviewed: REVIEWED,
};

export const VITAMIN_D_FERTILITY: WomensCompoundContent = {
  slug: "vitamin-d-fertility",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Vitamin D (Fertility)",
  h1: "Vitamin D for Fertility: What Deficiency Actually Costs You",
  summary:
    "Vitamin D deficiency (25(OH)D < 20 ng/mL) has been repeatedly linked to lower IVF success rates, higher miscarriage rates, and worse ovulation outcomes in PCOS. Repletion to the sufficient range (30–50 ng/mL) improves these outcomes; mega-dosing above 60 ng/mL does not add benefit and can cause toxicity. Standard repletion: 1000–4000 IU/day D3 with a 25(OH)D test at 8–12 weeks. In pregnancy, 600–2000 IU/day is generally advised. The strongest interaction to know is with thiazide diuretics (raise calcium) and calcium supplements (additive absorption). Evidence level: strong for repletion of deficiency; nothing supports supra-physiologic dosing.",
  keyFacts: {
    doseRange:
      "1000–4000 IU/day D3 (cholecalciferol) to target 25(OH)D 30–50 ng/mL. Recheck at 8–12 weeks.",
    forms:
      "D3 (cholecalciferol) — preferred. D2 (ergocalciferol) — weaker per IU. Softgels absorb better than tablets.",
    evidence: "Strong",
    mainRisks: "Hypercalcemia at chronic mega-doses (>10,000 IU/day). Additive with thiazides.",
  },
  research: [
    {
      heading: "Chu 2018 meta-analysis of IVF outcomes",
      body: "Chu et al. (Human Reproduction 2018) pooled 11 studies (2,700+ women) undergoing IVF. Women replete in vitamin D (25(OH)D >30 ng/mL) had significantly higher live birth rates (OR 1.33) and clinical pregnancy rates vs deficient women. The effect was independent of BMI and age, suggesting a direct endometrial/oocyte contribution rather than a downstream metabolic effect.",
    },
    {
      heading: "Vitamin D receptors in reproductive tissue",
      body: "VDR is expressed in ovarian granulosa cells, endometrium, and placenta. Calcitriol modulates AMH expression, progesterone production, and endometrial receptivity genes (HOXA10). This provides the mechanistic basis for the observational IVF associations.",
    },
    {
      heading: "PCOS-specific data",
      body: "Palomba et al. (Fertil Steril 2014) and subsequent Endocrine Journal reviews show that vitamin D deficiency worsens insulin resistance, anti-Mullerian hormone dynamics, and ovulatory function in PCOS. Repletion partially reverses these markers; combining vitamin D with myo-inositol appears additive.",
    },
    {
      heading: "Pregnancy outcomes and preeclampsia",
      body: "Palacios et al. (Cochrane 2019 update) found vitamin D supplementation in pregnancy reduces gestational diabetes, pre-eclampsia, and low birth weight. Doses of 1000-2000 IU/day during pregnancy are supported; the Cochrane authors caution against uncontrolled high-dose regimens.",
    },
    {
      heading: "Miscarriage risk",
      body: "Multiple cohort studies (e.g. Andersen et al., Obstet Gynecol 2019) link maternal vitamin D deficiency in the first trimester with increased miscarriage risk. Correction of deficiency before conception is the pragmatic response; there is no evidence that mega-dosing beyond sufficient status further reduces risk.",
    },
    {
      heading: "Test-don't-guess dosing",
      body: "Baseline 25(OH)D determines the required dose. Obese patients (BMI >30) typically need 1.5-2x the dose to reach the same serum level (Ekwaru et al., PLoS ONE 2014). Recheck at 8-12 weeks and adjust; target 30-50 ng/mL. Chronic dosing above 4000 IU/day without a level is not recommended.",
    },
    {
      heading: "Upper limit and hypercalcemia",
      body: "The IOM upper limit is 4000 IU/day for adults. Persistent intake of 10,000 IU/day or more without monitoring has produced hypercalcemia in case reports. Sarcoidosis, granulomatous disease, and primary hyperparathyroidism are relative contraindications to supplementation without specialist input.",
    },
  ],
  interactions: [
    {
      with: "Thiazide diuretics (hydrochlorothiazide)",
      mechanism: "Both raise calcium — additive hypercalcemia risk.",
      watchFor: "Monitor calcium if on both long-term.",
    },
    {
      with: "Calcium supplements",
      mechanism: "Additive absorption.",
      watchFor: "Typically desired; check total daily calcium intake stays under 2000 mg.",
    },
    {
      with: "Statins, anticonvulsants (phenytoin, carbamazepine)",
      mechanism:
        "Some anticonvulsants accelerate vitamin D metabolism; users often need higher supplement doses.",
      watchFor: "Test 25(OH)D more often if on anticonvulsants.",
    },
    {
      with: "Steroids (long-term)",
      mechanism: "Reduce vitamin D absorption and increase clearance.",
      watchFor: "Chronic steroid users often need supplementation.",
    },
    {
      with: "Weight-loss medications (orlistat)",
      mechanism: "Reduces fat-soluble vitamin absorption.",
      watchFor: "Separate timing by 4 hours.",
    },
    {
      with: "HRT and birth control",
      mechanism: "No clinically significant interaction.",
      watchFor: "None specific.",
    },
  ],
  cautions: [
    "Hypercalcemia or sarcoidosis — vitamin D can worsen these; consult before supplementing.",
    "Kidney disease — active vitamin D metabolites are handled differently; use nephrologist guidance.",
    "Don't take chronic doses above 4000 IU/day without a 25(OH)D level.",
    "Absorption is better with fat-containing meals.",
  ],
  faq: [
    {
      q: "What vitamin D level should I aim for during fertility treatment?",
      a: "30–50 ng/mL 25(OH)D is the widely accepted target. Below 20 ng/mL is deficient and linked to worse IVF and pregnancy outcomes. Above 60–80 ng/mL is not clearly better and can cause hypercalcemia.",
    },
    {
      q: "How much D3 should I take?",
      a: "1000–2000 IU/day for maintenance if replete. 4000–5000 IU/day for 8–12 weeks if deficient, then retest. Higher chronic doses need a 25(OH)D level to justify.",
    },
    {
      q: "Does vitamin D interact with birth control or HRT?",
      a: "No clinically significant interaction. Vitamin D is safe and often desirable to combine with hormonal medication.",
    },
    {
      q: "Should I take vitamin D during pregnancy?",
      a: "Yes — 600–2000 IU/day is the standard recommendation. Deficiency during pregnancy affects fetal bone development and raises gestational diabetes and preeclampsia risk. Most prenatal vitamins contain 400–800 IU.",
    },
    {
      q: "D2 or D3?",
      a: "D3 (cholecalciferol) — it raises 25(OH)D more effectively per IU. D2 is fine for vegetarians who prefer it, but you may need higher doses.",
    },
    { q: "Where can I check vitamin D interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Chu J et al. Human Reprod 2018 - Vitamin D and IVF live birth meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29280990/",
    },
    {
      label: "Palomba S et al. Fertil Steril 2014 - Vitamin D and PCOS ovulatory function.",
      url: "https://pubmed.ncbi.nlm.nih.gov/24993800/",
    },
    {
      label:
        "Palacios C et al. Cochrane Database Syst Rev 2019 - Vitamin D supplementation in pregnancy.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31348529/",
    },
    {
      label: "Andersen LB et al. Am J Clin Nutr 2019 - First-trimester 25(OH)D and miscarriage.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31504091/",
    },
    {
      label: "Ekwaru JP et al. PLoS ONE 2014 - Vitamin D dosing and body weight.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25333960/",
    },
    {
      label:
        "Holick MF et al. Endocr Soc Guideline 2011 - Evaluation and treatment of vitamin D deficiency.",
      url: "https://pubmed.ncbi.nlm.nih.gov/21646368/",
    },
    {
      label: "NIH Office of Dietary Supplements - Vitamin D professional fact sheet.",
      url: "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/",
    },
  ],
  related: rel("vitamin-d-fertility"),
  lastReviewed: REVIEWED,
};

export const FOLATE_VS_FOLIC_ACID: WomensCompoundContent = {
  slug: "folate-vs-folic-acid",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Folate vs Folic Acid",
  h1: "Folate vs Folic Acid: When the Difference Actually Matters",
  summary:
    "Folate is essential for anyone who could become pregnant — adequate levels before conception dramatically reduce neural tube defects. But 'folate' on labels covers two distinct forms: synthetic folic acid (in most prenatal vitamins and fortified foods) and L-methylfolate / 5-MTHF (the active form). For most women, 400–800 mcg/day of folic acid is fully adequate. For women with MTHFR C677T or A1298C variants (about 25% of the population homozygous or compound heterozygous), conversion of folic acid to active folate is less efficient — L-methylfolate at 400–1000 mcg/day is a reasonable choice. Never rely on food alone during preconception. Evidence level: strong for folate as neural tube protection; moderate for MTHFR-specific L-methylfolate benefit.",
  keyFacts: {
    doseRange:
      "400–800 mcg/day folic acid OR 400–1000 mcg/day L-methylfolate preconception through first trimester",
    forms:
      "Folic acid (cheap, universally studied), L-methylfolate / 5-MTHF (bypasses MTHFR), folinic acid (rescue form)",
    evidence: "Strong",
    mainRisks:
      "Excess folate can mask B12 deficiency. Avoid unmethylated folic acid over 1000 mcg/day.",
  },
  research: [
    {
      heading: "MRC Vitamin Study - the foundational RCT",
      body: "The MRC Vitamin Study (Lancet 1991) randomised 1,817 women with a prior NTD-affected pregnancy to 4 mg/day folic acid or placebo periconceptionally. NTD recurrence dropped by 72% in the folic acid arm. This trial closed early on ethical grounds and remains the basis for global folic acid fortification programmes.",
    },
    {
      heading: "Czeizel primary-prevention trial",
      body: "Czeizel & Dudas (NEJM 1992) extended the finding to primary prevention in Hungarian women without a prior NTD-affected pregnancy: 800 mcg/day folic acid reduced first-occurrence NTDs versus a trace-element control. This established the 400-800 mcg preconception dose used in most national guidelines today.",
    },
    {
      heading: "MTHFR genetics",
      body: "The C677T and A1298C polymorphisms in MTHFR reduce enzyme activity. C677T homozygotes retain roughly 30% activity; compound heterozygotes are intermediate. Population studies find weak associations between homozygous C677T and NTD risk, but the effect is largely overcome by adequate folic acid intake - most homozygotes do fine on standard folic acid.",
    },
    {
      heading: "L-methylfolate vs folic acid",
      body: "L-5-methyltetrahydrofolate bypasses the MTHFR conversion step. Head-to-head bioavailability studies (Prinz-Langenohl et al., Br J Pharmacol 2009) show equivalent or superior red-cell folate response versus folic acid in MTHFR variant carriers. Direct fertility-outcome RCTs remain limited; the choice is mechanistically supported rather than outcome-proven in preconception care.",
    },
    {
      heading: "Unmetabolised folic acid concerns",
      body: "At chronic intakes above 1,000 mcg/day, unmetabolised folic acid appears in serum. Long-term consequences are debated (potential immune modulation, masking of B12 deficiency); current cautious guidance is to keep total folic acid intake under 1,000 mcg/day unless a specific indication (recurrent NTD, anticonvulsant use, malabsorption) justifies higher.",
    },
    {
      heading: "Contraceptive interactions",
      body: "Combined oral contraceptives modestly lower serum folate; Beyaz and Safyral include L-methylfolate specifically to load folate stores during pill use and simplify the transition to conception. Women coming off COCs to conceive should start folate at least 3 months in advance rather than waiting for a positive pregnancy test.",
    },
    {
      heading: "Anticonvulsants and other depleters",
      body: "Phenytoin, phenobarbital, carbamazepine, valproate, methotrexate, sulfasalazine, and long-term alcohol use all deplete folate or impair its metabolism. Women of childbearing age on these agents need higher folate doses (often 4-5 mg/day) under specialist supervision - this is standard neurology practice for women on antiepileptic drugs.",
    },
  ],
  interactions: [
    {
      with: "Methotrexate",
      mechanism:
        "Methotrexate blocks dihydrofolate reductase; folate reverses its anti-cancer effect. In rheumatology/dermatology use of low-dose methotrexate, folic acid is specifically co-prescribed to reduce side effects.",
      watchFor: "Follow oncology or rheumatology guidance.",
    },
    {
      with: "Anticonvulsants (phenytoin, carbamazepine, valproate)",
      mechanism: "Deplete folate. Women of childbearing age on these need higher folate doses.",
      watchFor: "Preconception planning under neurology guidance.",
    },
    {
      with: "Sulfasalazine",
      mechanism: "Reduces folate absorption.",
      watchFor: "Supplement folate.",
    },
    {
      with: "Metformin",
      mechanism: "Reduces B12 absorption over time, which can indirectly affect folate metabolism.",
      watchFor: "Monitor B12 on long-term metformin.",
    },
    {
      with: "Birth control",
      mechanism: "COCs can lower folate; some newer contraceptives include L-methylfolate.",
      watchFor: "Preconception folate loading is important if coming off COCs to conceive.",
    },
    {
      with: "Alcohol (chronic heavy)",
      mechanism: "Impairs folate metabolism.",
      watchFor: "Higher folate need.",
    },
  ],
  cautions: [
    "Never skip folate preconception — this is one of the most-evidence-based interventions in reproductive medicine.",
    "B12 deficiency can be masked by folate supplementation — check both.",
    "Homozygous MTHFR C677T or compound heterozygous — consider L-methylfolate.",
    "Don't take unmetabolized folic acid over 1000 mcg/day chronically without a reason.",
  ],
  faq: [
    {
      q: "Should every woman take L-methylfolate instead of folic acid?",
      a: "No. For most women, standard folic acid at 400–800 mcg/day is adequate and has the strongest population-level evidence. L-methylfolate is a reasonable choice for women with confirmed MTHFR variants, or those taking anticonvulsants.",
    },
    {
      q: "How do I know if I have an MTHFR variant?",
      a: "Genetic testing (23andMe raw data or a formal MTHFR panel). About 10–15% of the population is homozygous C677T; another 10% is compound heterozygous. Being heterozygous alone is rarely clinically significant.",
    },
    {
      q: "When should I start folate before pregnancy?",
      a: "At least 3 months before trying to conceive. Neural tube closure happens by day 28 of pregnancy — often before women know they're pregnant. Waiting until a positive test is too late.",
    },
    {
      q: "Does folate interact with birth control?",
      a: "COCs slightly lower folate. Some contraceptive brands (Beyaz, Safyral) include L-methylfolate specifically for the transition to pregnancy. If you're on a standard COC and planning to conceive, start folate supplementation before stopping the pill.",
    },
    {
      q: "Can I take too much folate?",
      a: "The concern with chronic doses over 1000 mcg/day of unmetabolized folic acid is masking B12 deficiency and unclear long-term effects. L-methylfolate doesn't have the same unmetabolized-accumulation issue but should still stay in the 400–1000 mcg/day range for most women.",
    },
    { q: "Where can I check folate interactions with my other supplements?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label:
        "MRC Vitamin Study Research Group. Lancet 1991 - Periconceptional folate and NTD recurrence.",
      url: "https://pubmed.ncbi.nlm.nih.gov/1677062/",
    },
    {
      label: "Czeizel AE, Dudas I. NEJM 1992 - Folic acid and first-occurrence NTD.",
      url: "https://pubmed.ncbi.nlm.nih.gov/1307234/",
    },
    {
      label: "Wilson RD et al. J Obstet Gynaecol Can 2015 - SOGC preconception folate guideline.",
      url: "https://pubmed.ncbi.nlm.nih.gov/26334606/",
    },
    {
      label:
        "Prinz-Langenohl R et al. Br J Pharmacol 2009 - L-methylfolate vs folic acid in MTHFR carriers.",
      url: "https://pubmed.ncbi.nlm.nih.gov/19239473/",
    },
    {
      label: "Crider KS et al. Nutrients 2011 - Folate and DNA methylation review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/22254112/",
    },
    {
      label:
        "US Preventive Services Task Force. JAMA 2023 - Folic acid supplementation to prevent NTDs.",
      url: "https://pubmed.ncbi.nlm.nih.gov/37581671/",
    },
    {
      label: "NIH Office of Dietary Supplements - Folate professional fact sheet.",
      url: "https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/",
    },
  ],
  related: rel("folate-vs-folic-acid"),
  lastReviewed: REVIEWED,
};

export const IRON_CYCLE: WomensCompoundContent = {
  slug: "iron-cycle",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Iron (Cycle Context)",
  h1: "Iron for Women: Heavy Periods, Ferritin Targets, and Thyroid Timing",
  summary:
    "Iron deficiency without anemia (low ferritin, normal hemoglobin) is common in menstruating women and often overlooked. It causes fatigue, hair shedding, cold intolerance, and poor exercise recovery. The functional target is ferritin >30 ng/mL (many clinicians prefer >50–70 ng/mL, particularly for hair regrowth). Ferrous bisglycinate at 18–50 mg elemental iron/day is well tolerated; ferrous sulfate is cheaper but harder on the GI tract. Vitamin C improves absorption; calcium, coffee, tea, and thyroid medication reduce it. The biggest interaction to know is with levothyroxine — separate by 4 hours. Evidence level: strong for repletion of documented deficiency.",
  keyFacts: {
    doseRange:
      "18–50 mg elemental iron/day if ferritin <30 ng/mL. Every-other-day dosing improves absorption vs daily.",
    forms:
      "Ferrous bisglycinate (best tolerated), ferrous sulfate (cheap, more GI issues), heme iron (from meat, best absorbed)",
    evidence: "Strong",
    mainRisks:
      "Constipation. Overload in hemochromatosis. Chelates thyroid medication and antibiotics.",
  },
  research: [
    {
      heading: "Iron deficiency without anemia is common and under-diagnosed",
      body: "Roughly 30-40% of menstruating women have iron deficiency without frank anemia (low ferritin, normal hemoglobin). CBC alone misses this. Fatigue, hair shedding, cold intolerance, restless legs, exercise intolerance, and cognitive fog are typical presentations. Camaschella (NEJM 2015) remains the standard clinical reference for the distinction between iron-deficient erythropoiesis and iron-deficiency anemia.",
    },
    {
      heading: "Alternate-day dosing (Stoffel 2017/2020)",
      body: "Stoffel et al. (Lancet Haematol 2017, and follow-up 2020) showed that giving iron every other day, rather than daily or twice-daily, produces higher fractional absorption per dose and a comparable or better rise in hemoglobin over 4-8 weeks. Daily dosing raises hepcidin, which then blocks absorption of subsequent doses. Alternate-day dosing is now the emerging first-line pattern.",
    },
    {
      heading: "Ferrous bisglycinate tolerability",
      body: "Milman et al. (Adv Ther 2019) and multiple manufacturer-independent trials show that ferrous bisglycinate produces significantly less nausea and constipation than equimolar ferrous sulfate, with equivalent hemoglobin response. The GI tolerability difference is the main reason to choose bisglycinate despite higher cost.",
    },
    {
      heading: "Hair loss and ferritin thresholds",
      body: "Retrospective and small prospective work (Trost et al., J Am Acad Dermatol 2006; Rushton et al., Dermatology 2013) supports ferritin >70 ng/mL as a clinical threshold below which iron replacement may improve telogen effluvium and androgenetic hair thinning in women. The threshold is above the strictly hematologic cut-off because hair follicle iron demand exceeds erythropoietic demand.",
    },
    {
      heading: "Heavy menstrual bleeding is the driver",
      body: "Heavy menstrual bleeding (HMB) is the single largest driver of iron deficiency in premenopausal women. Treating the bleeding pattern - LNG-IUD, tranexamic acid during menses, combined oral contraceptives, endometrial ablation - often produces larger long-term ferritin gains than iron supplementation alone. NICE HMB guidance (NG88) covers the treatment algorithm.",
    },
    {
      heading: "Levothyroxine chelation",
      body: "Iron chelates levothyroxine in the gut, sharply reducing absorption. This is one of the most clinically important supplement-drug interactions in women. Standard practice: levothyroxine on empty stomach first thing in the morning, iron at lunch or evening, at least 4 hours apart. Failure to separate them frequently explains 'refractory' hypothyroidism in women who recently started iron.",
    },
    {
      heading: "IV iron for refractory cases",
      body: "For women who cannot tolerate oral iron, have absorption issues (post-bariatric surgery, IBD, PPI use), or need rapid correction (pre-surgery, third trimester with severe anemia), single-dose IV iron formulations (ferric carboxymaltose, ferric derisomaltose) restore stores in one to two visits. Discuss with a hematologist or obstetrician.",
    },
  ],
  interactions: [
    {
      with: "Levothyroxine",
      mechanism: "Iron chelates levothyroxine — reduces absorption sharply.",
      watchFor:
        "Separate by 4 hours. Standard practice: levothyroxine first thing on empty stomach, iron at lunch or evening.",
    },
    {
      with: "Calcium supplements and dairy",
      mechanism: "Compete for absorption.",
      watchFor: "Separate by 2 hours.",
    },
    {
      with: "Coffee, tea, red wine (polyphenols)",
      mechanism: "Bind iron in gut.",
      watchFor: "Separate by 1–2 hours.",
    },
    {
      with: "Vitamin C",
      mechanism: "Improves non-heme iron absorption.",
      watchFor: "Take iron with vitamin C or citrus.",
    },
    {
      with: "Antibiotics (tetracycline, quinolones)",
      mechanism: "Chelation.",
      watchFor: "Separate by 2–4 hours.",
    },
    {
      with: "Proton pump inhibitors and antacids",
      mechanism: "Reduce iron absorption via reduced stomach acid.",
      watchFor: "Discuss with prescriber; may need higher iron dose.",
    },
    {
      with: "HRT and birth control",
      mechanism: "COCs typically reduce menstrual bleeding, improving iron status.",
      watchFor: "Iron needs may drop after starting COCs.",
    },
  ],
  cautions: [
    "Hereditary hemochromatosis — do not supplement without screening.",
    "Ferritin >100 ng/mL — supplementation is rarely needed.",
    "GI upset — try ferrous bisglycinate, take with food (accept slight absorption loss), or every-other-day dosing.",
    "Kids in the house — iron overdose is one of the most common accidental poisonings; store securely.",
  ],
  faq: [
    {
      q: "What ferritin level should I target?",
      a: "Most labs flag <15 ng/mL as deficient, but many clinicians target >30 ng/mL functional minimum, and >50–70 ng/mL for hair growth, energy, or endurance training. Above 100 ng/mL is rarely needed and can be a sign of inflammation.",
    },
    {
      q: "How do I take iron with levothyroxine?",
      a: "Separate by at least 4 hours. Standard timing: levothyroxine 6am on empty stomach, iron with lunch or evening meal + vitamin C. Do not stack them within the same hour.",
    },
    {
      q: "Ferrous bisglycinate vs ferrous sulfate?",
      a: "Bisglycinate is better tolerated (less constipation and nausea) at comparable elemental iron doses. Sulfate is cheaper. For anyone struggling with side effects, bisglycinate is worth the small price premium.",
    },
    {
      q: "Do I need iron if I have heavy periods?",
      a: "Very likely — heavy menstrual bleeding is the leading cause of iron deficiency in menstruating women. Get a ferritin level and treat both the deficiency and the underlying bleeding pattern (COCs, LNG-IUD, tranexamic acid can help).",
    },
    {
      q: "Can I take iron with a prenatal vitamin?",
      a: "Most prenatals contain 18–27 mg iron. If your ferritin is <30 ng/mL in early pregnancy, additional iron on top of prenatal is often needed. Discuss with your obstetrician.",
    },
    { q: "Where can I check iron interactions with my other supplements?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Stoffel NU et al. Lancet Haematol 2017 - Alternate-day iron dosing.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29032957/",
    },
    {
      label:
        "Stoffel NU et al. Haematologica 2020 - Alternate-day iron in iron-depleted women follow-up.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31413088/",
    },
    {
      label: "Camaschella C. NEJM 2015 - Iron-deficiency anemia clinical review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25946282/",
    },
    {
      label: "Milman N et al. Adv Ther 2019 - Ferrous bisglycinate tolerability review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31435835/",
    },
    {
      label: "Rushton DH et al. Dermatology 2013 - Iron status and female hair loss.",
      url: "https://pubmed.ncbi.nlm.nih.gov/12444311/",
    },
    {
      label: "NICE NG88 - Heavy menstrual bleeding: assessment and management.",
      url: "https://www.nice.org.uk/guidance/ng88",
    },
    {
      label: "NIH Office of Dietary Supplements - Iron professional fact sheet.",
      url: "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/",
    },
  ],
  related: rel("iron-cycle"),
  lastReviewed: REVIEWED,
};

export const B6_LUTEAL: WomensCompoundContent = {
  slug: "b6-luteal",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Vitamin B6 (Luteal Phase)",
  h1: "Vitamin B6 for PMS, Luteal Mood, and Contraceptive Support",
  summary:
    "Vitamin B6 (pyridoxine) has moderate evidence for improving PMS mood symptoms, breast tenderness, and premenstrual anxiety at 50–100 mg/day. It's also low-cost, safe short-term, and supports neurotransmitter synthesis (serotonin, GABA, dopamine). Combined oral contraceptives (COCs) lower B6 status modestly, so supplementation is sometimes reasonable in long-term COC users. The most important caution: chronic B6 doses above 100 mg/day carry a real risk of peripheral neuropathy over years of use. Stick to short-term (luteal-phase-only) or moderate long-term dosing. Evidence level: moderate for PMS mood outcomes; strong for the neuropathy caution at high doses.",
  keyFacts: {
    doseRange:
      "25–100 mg/day pyridoxine or P-5-P (active form). Luteal-phase-only dosing is a common pattern.",
    forms:
      "Pyridoxine HCl (standard, cheap), pyridoxal-5-phosphate / P-5-P (active form, more expensive)",
    evidence: "Moderate",
    mainRisks:
      "Peripheral neuropathy at chronic doses above 100 mg/day (some sources: above 200 mg).",
  },
  research: [
    {
      heading: "Wyatt 1999 systematic review of B6 for PMS",
      body: "Wyatt et al. (BMJ 1999) pooled 9 RCTs of pyridoxine 50-100 mg/day for premenstrual syndrome. Odds of overall symptom improvement were 2.32 (95% CI 1.95-2.54) versus placebo; odds of depressive symptom improvement were 1.69. The review acknowledged variable trial quality but concluded that 50-100 mg/day is a reasonable first-line intervention for PMS mood and physical symptoms.",
    },
    {
      heading: "Neurotransmitter mechanism",
      body: "Pyridoxal-5-phosphate (the active B6 coenzyme) is required by aromatic L-amino acid decarboxylase, which produces serotonin, dopamine, and GABA from their precursors. This is the mechanistic basis for B6's effect on premenstrual mood, irritability, and anxiety - it doesn't add serotonin directly, it supports the enzyme that makes it.",
    },
    {
      heading: "Contraceptive-induced B6 depletion",
      body: "Combined oral contraceptives modestly lower B6 status via increased tryptophan-niacin pathway demand (data going back to Rose 1978, still cited in modern reviews). Long-term COC users with mood symptoms may benefit from 25-50 mg/day pyridoxine, though this is not required for most users.",
    },
    {
      heading: "Pregnancy nausea (NVP)",
      body: "Pyridoxine 10-25 mg three times daily, alone or combined with doxylamine (Diclegis/Diclectin), is the ACOG first-line pharmacologic treatment for nausea and vomiting of pregnancy. Efficacy is well established across multiple RCTs (Sahakian et al., Obstet Gynecol 1991 onwards); safety profile in pregnancy is category A.",
    },
    {
      heading: "Peripheral neuropathy - the critical safety signal",
      body: "Chronic pyridoxine intake above 200 mg/day has produced sensory peripheral neuropathy in well-documented case series going back to Schaumburg et al. (NEJM 1983). More recent case reports and pharmacovigilance data (Vrolijk et al., Toxicol In Vitro 2017; Australian TGA 2022 review) suggest neuropathy signals can appear as low as 50-100 mg/day with long-duration use. Neuropathy may be irreversible. This is why luteal-phase-only dosing (14 days per cycle) is the preferred long-term pattern.",
    },
    {
      heading: "P-5-P vs pyridoxine HCl",
      body: "Pharmacokinetically, pyridoxine HCl is well converted to P-5-P in the liver in the vast majority of people. Head-to-head clinical trials are limited. P-5-P is a reasonable choice in the rare individual with impaired hepatic activation, but there is no evidence it lowers neuropathy risk at equivalent bioactive doses.",
    },
    {
      heading: "Levodopa interaction (largely historical)",
      body: "Historically, unopposed pyridoxine at pharmacologic doses accelerated peripheral decarboxylation of levodopa in Parkinson's disease. Modern combined levodopa/carbidopa formulations blunt this interaction. Still worth flagging for any patient on levodopa monotherapy under neurology care.",
    },
  ],
  interactions: [
    {
      with: "Levodopa (Parkinson's medication)",
      mechanism:
        "Pyridoxine can accelerate peripheral decarboxylation of levodopa, reducing CNS effect. Not clinically significant when levodopa is combined with carbidopa (standard modern formulations).",
      watchFor: "Discuss with neurology if on levodopa monotherapy.",
    },
    {
      with: "Phenytoin, phenobarbital",
      mechanism: "High-dose B6 can lower anticonvulsant levels.",
      watchFor: "Discuss with neurology.",
    },
    {
      with: "Isoniazid",
      mechanism: "Isoniazid depletes B6; supplementation is co-prescribed.",
      watchFor: "Standard co-therapy.",
    },
    {
      with: "Amiodarone",
      mechanism: "High-dose B6 may worsen amiodarone-induced photosensitivity.",
      watchFor: "Avoid megadoses.",
    },
    {
      with: "COCs and HRT",
      mechanism: "COCs deplete B6 modestly.",
      watchFor: "Supplementation reasonable in long-term COC users.",
    },
    {
      with: "Antidepressants",
      mechanism: "No direct PK conflict; B6 supports neurotransmitter synthesis.",
      watchFor: "None specific.",
    },
  ],
  cautions: [
    "Do not take chronic doses above 100 mg/day — peripheral neuropathy risk is real and often irreversible.",
    "Luteal-phase-only dosing (14 days per cycle) is one way to control total exposure.",
    "Pregnancy — B6 is used specifically for nausea (10–25 mg TID); stay under obstetric supervision at higher doses.",
    "Numbness or tingling in hands/feet — stop B6 immediately and see a clinician.",
  ],
  faq: [
    {
      q: "Does B6 actually help PMS?",
      a: "Yes, moderately. Multiple RCTs at 50–100 mg/day show improvements in mood symptoms, breast tenderness, and premenstrual anxiety. Not everyone responds. Give it 2–3 cycles before judging.",
    },
    {
      q: "How much B6 for PMS?",
      a: "50–100 mg/day is the well-studied range. Don't exceed 100 mg/day chronically — peripheral neuropathy risk. Luteal-phase-only dosing (14 days per cycle) is a common lower-exposure pattern.",
    },
    {
      q: "Should women on birth control take B6?",
      a: "COCs modestly lower B6 status. Supplementation at 25–50 mg/day is reasonable, particularly if you have mood symptoms on birth control. Not universally required.",
    },
    {
      q: "P-5-P or pyridoxine?",
      a: "For most women, pyridoxine HCl is fine and cheaper. P-5-P (the active form) is more expensive and rarely necessary unless you have a specific B6 activation issue (very rare).",
    },
    {
      q: "Is B6 safe in pregnancy?",
      a: "Yes, at 10–25 mg TID it's specifically used for pregnancy-related nausea and vomiting (often combined with doxylamine as Diclegis/Diclectin). Stay under obstetric supervision at higher doses.",
    },
    { q: "Where can I check B6 interactions with my other supplements?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Wyatt KM et al. BMJ 1999 - Vitamin B6 for PMS systematic review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/10334745/",
    },
    {
      label: "Schaumburg H et al. NEJM 1983 - Sensory neuropathy from pyridoxine abuse.",
      url: "https://pubmed.ncbi.nlm.nih.gov/6308447/",
    },
    {
      label: "Vrolijk MF et al. Toxicol In Vitro 2017 - Mechanism of B6-induced neuropathy.",
      url: "https://pubmed.ncbi.nlm.nih.gov/28716455/",
    },
    {
      label: "ACOG Practice Bulletin 189 - Nausea and vomiting of pregnancy.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29266076/",
    },
    {
      label: "Whelan AM et al. Can J Clin Pharmacol 2009 - Herbs and nutrients for PMS review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/19923637/",
    },
    {
      label: "Australian TGA 2022 - Safety review of pyridoxine and peripheral neuropathy.",
      url: "https://www.tga.gov.au/news/safety-updates/medicines-containing-vitamin-b6-can-cause-peripheral-neuropathy",
    },
    {
      label: "NIH Office of Dietary Supplements - Vitamin B6 professional fact sheet.",
      url: "https://ods.od.nih.gov/factsheets/VitaminB6-HealthProfessional/",
    },
  ],
  related: rel("b6-luteal"),
  lastReviewed: REVIEWED,
};
