import type { WomensCompoundContent } from "@/components/womens-compound-article";

const HUB = { slug: "longevity" as const, title: "Longevity for Women" };
const REVIEWED = "2026-07-27";

const RELATED = [
  { slug: "nmn-women", name: "NMN" },
  { slug: "nad-precursors", name: "NAD+ Precursors (NMN vs NR)" },
  { slug: "collagen-peptides-women", name: "Collagen Peptides" },
  { slug: "creatine-women", name: "Creatine (women)" },
  { slug: "omega-3-women", name: "Omega-3" },
  { slug: "magnesium-glycinate-women", name: "Magnesium Glycinate" },
  { slug: "coq10-women", name: "CoQ10 (Ubiquinol)" },
  { slug: "spermidine-women", name: "Spermidine" },
  { slug: "resveratrol-women", name: "Resveratrol" },
];
const rel = (ex: string) => RELATED.filter((r) => r.slug !== ex).slice(0, 4);

const CITE_INTERACTION =
  "Use the DoseRoutine interaction checker at doseroutine.com/interaction-checker to add every longevity supplement plus your HRT, birth control, statin, or thyroid medication in one view.";

export const NMN_WOMEN: WomensCompoundContent = {
  slug: "nmn-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "NMN (Nicotinamide Mononucleotide)",
  h1: "NMN for Women: Evidence, Dosage & Interactions",
  summary:
    "Nicotinamide mononucleotide (NMN) is a NAD+ precursor marketed for cellular energy, mitochondrial function, and healthy aging. Human trials at 250–1000 mg/day reliably raise blood NAD+ but have shown only modest, inconsistent effects on strength, insulin sensitivity, and cardiovascular markers. Safety data at 250–500 mg/day is reasonable for up to 12 weeks in healthy adults. NMN does not act like a hormone and has no known interaction with HRT or birth control, but is genuinely under-studied in perimenopausal and postmenopausal women. Evidence level: limited to moderate for surrogate markers; nothing yet for hard longevity endpoints.",
  keyFacts: {
    doseRange: "250–500 mg/day (up to 1000 mg used in trials). Morning, with or without food.",
    forms:
      "Capsules, sublingual tablets, powders. Sublingual has no proven bioavailability advantage in humans.",
    evidence: "Limited",
    mainRisks: "Under-studied long-term. No signal in short trials.",
  },
  research: [
    {
      heading: "Postmenopausal insulin sensitivity (Yoshino 2021)",
      body: "A 12-week randomized, placebo-controlled trial in 25 postmenopausal women with prediabetes (Yoshino et al., Science 2021) reported a ~25% relative increase in muscle insulin sensitivity (measured by hyperinsulinemic-euglycemic clamp) at 250 mg NMN/day. However, downstream markers — HbA1c, fasting glucose, body composition — did not shift meaningfully. The trial is often cited as a positive result, but the absolute effect sizes are modest and the sample is small.",
    },
    {
      heading: "Dose-ranging safety and NAD+ pharmacokinetics (Yi 2023)",
      body: "A 60-day parallel-group study in 80 middle-aged adults (Yi et al., GeroScience 2023) compared 300, 600, and 900 mg NMN daily. Whole-blood NAD+ rose dose-dependently (roughly +40% at 300 mg, +80% at 900 mg vs baseline). Six-minute walk distance improved modestly at 600 and 900 mg. No serious adverse events; a small number of participants reported mild GI symptoms at the highest dose.",
    },
    {
      heading: "Physical performance in older adults (Igarashi 2022)",
      body: "A 12-week Japanese RCT (Igarashi et al., NPJ Aging 2022) of 250 mg NMN in adults aged ≥65 found improvements in gait speed and grip strength when NMN was taken in the afternoon rather than morning — an unexplained timing finding that has not been replicated. It highlights how thin and variable the current NMN human trial base is.",
    },
    {
      heading: "Cardiometabolic markers (Katayoshi 2023)",
      body: "A 12-week trial in Japanese adults with elevated LDL (Katayoshi et al., Scientific Reports 2023) tested 250 mg NMN daily. LDL and diastolic BP fell modestly vs placebo; the effect size was small (a few mg/dL and ~2 mmHg). Whether this translates to fewer cardiovascular events over years is unknown — no NMN trial has been long enough or large enough to answer that.",
    },
    {
      heading: "NAD+ vs downstream outcome disconnect",
      body: "Every NMN trial that measures blood NAD+ shows the biomarker rises. Far fewer trials show a matching downstream benefit at the clinical level. This gap — surrogate marker moves, hard endpoint doesn't — is the central caveat when reading NMN marketing. The mechanism is real; the human outcome data is still limited, especially in women.",
    },
    {
      heading: "Woman-specific research gap",
      body: "Beyond the Yoshino 2021 postmenopausal RCT, there is very little woman-specific NMN data. Most trials are mixed-sex with modest female representation and no sex-stratified analysis. Perimenopausal outcomes (hot flashes, sleep, mood) have not been tested in RCTs.",
    },
  ],
  interactions: [
    {
      with: "HRT (estradiol, progesterone)",
      mechanism: "No known pharmacokinetic interaction.",
      watchFor: "None specific.",
    },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None specific." },
    {
      with: "Thyroid medication (levothyroxine)",
      mechanism: "No interaction; NMN is not affected by absorption timing.",
      watchFor: "Take separately for consistency, not for a known conflict.",
    },
    {
      with: "Metformin",
      mechanism:
        "Both target insulin sensitivity. Additive effects are theoretical; combining is generally considered safe.",
      watchFor: "Monitor glucose if diabetic.",
    },
    {
      with: "Chemotherapy",
      mechanism:
        "NAD+-raising compounds are contraindicated during active cancer treatment due to theoretical effects on cell energy metabolism.",
      watchFor: "Avoid during active cancer therapy without oncology sign-off.",
    },
  ],
  cautions: [
    "Active cancer or history of cancer — discuss with oncology before use.",
    "Pregnancy and breastfeeding — insufficient safety data.",
    "Kidney or liver disease — limited long-term data.",
    "Don't rely on NMN as a substitute for sleep, strength training, or protein intake.",
  ],
  faq: [
    {
      q: "How much NMN should a woman take?",
      a: "Human trials use 250–500 mg/day for women, taken in the morning. Higher doses up to 1000 mg have been tested with reasonable short-term safety but no clearly better outcomes. Start at 250 mg and reassess at 12 weeks.",
    },
    {
      q: "Does NMN interact with HRT or birth control?",
      a: "No known pharmacokinetic interactions. NMN is a NAD+ precursor and doesn't compete with sex hormones for absorption or clearance. It's one of the few longevity supplements safe to combine with HRT without extra monitoring.",
    },
    {
      q: "How long before I feel anything from NMN?",
      a: "Most trials measure biomarkers, not subjective effects. If anything, you might notice modest energy or workout-recovery improvements at 4–8 weeks. If there's no subjective change at 12 weeks, extending indefinitely at higher cost isn't well-justified by current evidence.",
    },
    {
      q: "NMN vs NR — which is better for women?",
      a: "The head-to-head data doesn't cleanly favour either. Both raise NAD+. NR has more long-term safety trials; NMN has more consumer momentum. See the NAD+ Precursors comparison page for cost-per-mg breakdown.",
    },
    {
      q: "Is NMN safe with a statin?",
      a: "Yes — no known pharmacokinetic interaction. If you take a statin, CoQ10 supplementation has stronger justification than NMN. See the CoQ10 page.",
    },
    { q: "Where can I check NMN interactions with my other supplements?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Yoshino M et al. Science 2021 — NMN and insulin sensitivity in postmenopausal women.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33888612/",
    },
    {
      label:
        "Yi L et al. GeroScience 2023 — Efficacy and safety of NMN dose-ranging (300/600/900 mg).",
      url: "https://pubmed.ncbi.nlm.nih.gov/36482258/",
    },
    {
      label:
        "Igarashi M et al. NPJ Aging 2022 — NMN 250 mg on physical performance in older adults.",
      url: "https://pubmed.ncbi.nlm.nih.gov/35927255/",
    },
    {
      label: "Katayoshi T et al. Scientific Reports 2023 — NMN 250 mg on LDL and BP over 12 weeks.",
      url: "https://pubmed.ncbi.nlm.nih.gov/37528130/",
    },
    {
      label: "Fukamizu Y et al. Scientific Reports 2022 — NMN oral bioavailability and safety.",
      url: "https://pubmed.ncbi.nlm.nih.gov/36123383/",
    },
    {
      label: "Poddar SK et al. Nutrients 2019 — NAD+ precursor pharmacokinetics review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31581598/",
    },
  ],
  related: rel("nmn-women"),
  lastReviewed: REVIEWED,
};

export const NAD_PRECURSORS: WomensCompoundContent = {
  slug: "nad-precursors",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "NAD+ Precursors (NMN vs NR)",
  h1: "NMN vs NR for Women: What the Human Data Actually Shows",
  summary:
    "NAD+ declines with age, and two supplement precursors — nicotinamide mononucleotide (NMN) and nicotinamide riboside (NR) — both raise circulating NAD+ in humans at 250–500 mg/day. Neither has proven a hard longevity endpoint in women. NR has more long-term safety trials (Chromadex-funded) and clearer regulatory status. NMN has broader consumer marketing and slightly more data in postmenopausal insulin sensitivity. For most women, the practical differences are cost per raised NAD+ unit, capsule count, and whether the product is third-party tested. Evidence level: moderate for raising NAD+; limited for downstream clinical outcomes in women.",
  keyFacts: {
    doseRange: "NMN 250–500 mg/day OR NR 300 mg/day (Niagen dose used in most trials)",
    forms: "Capsules primarily. Sublingual formats have not shown pharmacokinetic advantage.",
    evidence: "Moderate",
    mainRisks:
      "Under-studied in cancer patients. Combine with structured strength and sleep — not a substitute.",
  },
  research: [
    {
      heading: "Both raise NAD+ — magnitude and time course",
      body: "Whole-blood NAD+ rises dose-dependently with either precursor. Trammell et al. (Nature Communications 2016) reported single-dose NR (100–1000 mg) raised NAD+ 2- to 3-fold in a dose-dependent way that plateaued around 8 hours. Repeated NMN dosing in Yi et al. (GeroScience 2023) showed similar time-integrated NAD+ elevations. In direct comparison, 300 mg NR and 250 mg NMN produce comparable steady-state NAD+ increases.",
    },
    {
      heading: "Longer-term NR safety in older adults (Martens 2018, Conze 2019)",
      body: "Martens et al. (Nature Communications 2018) ran 1000 mg NR daily for 6 weeks in adults aged 55–79; NAD+ nearly doubled with no serious adverse events, and systolic BP fell modestly in the subgroup with elevated baseline BP. Conze et al. (Scientific Reports 2019) ran 8 weeks at 100/300/1000 mg NR in healthy adults, confirming dose-dependent NAD+ elevation without safety signals. These form the strongest safety data for any NAD+ precursor to date.",
    },
    {
      heading: "Muscle and functional outcomes (Elhassan 2019, Dolopikou 2020)",
      body: "Elhassan et al. (Cell Reports 2019) gave 1000 mg NR/day for 21 days in aged men — NAD+ rose in muscle biopsies, but insulin sensitivity, mitochondrial bioenergetics, and gene expression did not change meaningfully. Dolopikou et al. (Eur J Nutr 2020) found NR improved measures of muscle fatigue resistance in older adults. As with NMN, the biomarker moves; downstream function often doesn't.",
    },
    {
      heading: "Postmenopausal NR data (Remie 2020)",
      body: "A crossover trial (Remie et al., Am J Clin Nutr 2020) in insulin-resistant middle-aged adults (including postmenopausal women) tested 1000 mg NR/day for 6 weeks. NAD+ increased but insulin sensitivity, resting energy expenditure, and mitochondrial function measures were unchanged — a well-executed negative trial that tempers enthusiasm.",
    },
    {
      heading: "Regulatory and quality differences",
      body: "NR (Niagen, produced by ChromaDex) has GRAS status and is the subject of most published RCTs. NMN's US regulatory status is disputed — the FDA has stated NMN is no longer a lawful dietary supplement ingredient (though enforcement is limited); this affects US retailer availability and third-party testing. In the EU, both remain novel-food-restricted. Buy from brands with public certificates of analysis regardless of which precursor you choose.",
    },
    {
      heading: "Cost per raised-NAD+ unit",
      body: "At retail prices in 2026, NR (Niagen 300 mg) typically costs $0.50–$1.00 per capsule; NMN 250 mg $0.30–$0.60. Given comparable NAD+ elevation per dose, NMN is often the lower cost per NAD+ unit, but NR's supply chain quality and safety database are more mature. This is a legitimate trade-off, not a clean win for either.",
    },
  ],
  interactions: [
    {
      with: "HRT (estradiol, progesterone)",
      mechanism: "No known pharmacokinetic interaction.",
      watchFor: "None specific.",
    },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None specific." },
    {
      with: "Metformin",
      mechanism: "Both improve insulin signalling — theoretical additive effects.",
      watchFor: "Monitor glucose if diabetic; combining is generally safe.",
    },
    {
      with: "Chemotherapy / active cancer therapy",
      mechanism: "NAD+-raising compounds should be avoided during active cancer treatment.",
      watchFor: "Get oncology sign-off.",
    },
    { with: "Thyroid medication", mechanism: "No interaction.", watchFor: "None specific." },
  ],
  cautions: [
    "Active cancer or recent cancer history — discuss with oncology.",
    "Pregnancy and breastfeeding — insufficient data.",
    "Do not use as a replacement for sleep, strength training, or protein intake.",
    "Be skeptical of any brand promising lifespan extension — no human evidence supports that claim yet.",
  ],
  faq: [
    {
      q: "NMN or NR — which raises NAD+ more?",
      a: "Both raise NAD+ meaningfully at their standard doses. Head-to-head studies suggest similar magnitudes. Choose based on cost, capsule count, and third-party testing availability, not on a supposed potency edge.",
    },
    {
      q: "Should women take NAD+ precursors during perimenopause?",
      a: "The mechanistic case is reasonable — NAD+ declines with age, and perimenopause overlaps with the biggest declines. But the woman-specific clinical data is thin. If budget is limited, creatine, omega-3, vitamin D, and magnesium have stronger women-specific evidence and cost less.",
    },
    {
      q: "Do NAD+ precursors interact with HRT?",
      a: "No known pharmacokinetic interaction. NMN and NR don't compete with sex hormone metabolism.",
    },
    {
      q: "How long do you need to take NAD+ precursors?",
      a: "NAD+ levels return toward baseline within a week of stopping. The intended use is continuous. There's no established 'cycling' benefit for NAD+ precursors.",
    },
    {
      q: "Is niacin the same as NAD+ precursor?",
      a: "Niacin (nicotinic acid) is also a NAD+ precursor but has different metabolism and can cause flushing at high doses. Nicotinamide (a related B3 form) at doses over 500 mg/day may inhibit sirtuins, undoing part of the point. NMN and NR are marketed specifically to avoid these issues.",
    },
    { q: "Where can I compare NAD+ precursor interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label:
        "Martens CR et al. Nat Commun 2018 — Chronic NR 1000 mg safety and BP in older adults.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29497047/",
    },
    {
      label: "Trammell SA et al. Nat Commun 2016 — Nicotinamide riboside oral pharmacokinetics.",
      url: "https://pubmed.ncbi.nlm.nih.gov/27721479/",
    },
    {
      label: "Conze D et al. Sci Rep 2019 — NR dose-ranging (100/300/1000 mg) safety.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31431637/",
    },
    {
      label: "Elhassan YS et al. Cell Rep 2019 — NR in aged muscle biopsies.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31597105/",
    },
    {
      label: "Remie CME et al. Am J Clin Nutr 2020 — NR 1000 mg in insulin-resistant adults.",
      url: "https://pubmed.ncbi.nlm.nih.gov/32320006/",
    },
    {
      label: "Dolopikou CF et al. Eur J Nutr 2020 — NR and muscle function in older adults.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31069526/",
    },
    {
      label: "Yoshino M et al. Science 2021 — NMN 250 mg and insulin sensitivity.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33888612/",
    },
  ],
  related: rel("nad-precursors"),
  lastReviewed: REVIEWED,
};

export const COLLAGEN_PEPTIDES_WOMEN: WomensCompoundContent = {
  slug: "collagen-peptides-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Collagen Peptides",
  h1: "Collagen Peptides for Women: Evidence, Dosage & Interactions",
  summary:
    "Hydrolyzed collagen peptides (bovine or marine) provide bioavailable glycine, proline, and hydroxyproline plus short peptides that appear to stimulate fibroblast collagen synthesis. In women, 8–15 weeks of 10–15 g/day has repeatedly improved skin elasticity, hydration, and wrinkle depth in RCTs. Knee-joint pain in physically active women also improves modestly. Nail growth is a consistent secondary finding. Effects are real but modest — collagen won't reverse decades of sun damage. Interactions are minimal because peptides are digested to amino acids before absorption. Evidence level: moderate for skin and joint outcomes.",
  keyFacts: {
    doseRange:
      "10–15 g/day hydrolyzed collagen peptides (any complete protein counts, but peptides have short-peptide signalling data)",
    forms: "Powders (unflavored, easiest to dose), capsules (impractical at 10 g), ready-to-drink",
    evidence: "Moderate",
    mainRisks:
      "Marine collagen — allergy in shellfish-sensitive individuals. Bovine collagen — none clinically meaningful.",
  },
  research: [
    {
      heading: "Skin outcomes meta-analysis (Choi 2019, de Miranda 2021)",
      body: "Choi et al. (J Drugs Dermatol 2019) pooled 11 RCTs (n=805) of oral collagen peptides at 2.5–10 g/day for 8–24 weeks and found consistent improvements in skin elasticity, hydration, and wrinkle depth vs placebo. A more recent 19-study systematic review (de Miranda et al., Int J Dermatol 2021) reached the same conclusion with a larger evidence base, though effect sizes remain small-to-moderate and most trials are industry-funded.",
    },
    {
      heading: "Bone density in postmenopausal women (Zdzieblik 2018)",
      body: "A 12-month RCT of 5 g/day of specific collagen peptides (Fortibone) in 131 postmenopausal women (Zdzieblik et al., Nutrients 2018) showed significant increases in femoral neck and lumbar spine bone mineral density vs placebo, with corresponding shifts in the P1NP/CTX bone-turnover ratio. This is a single-product finding, not yet fully replicated, but the mechanism (glycine/proline supply and peptide signalling to osteoblasts) is plausible.",
    },
    {
      heading: "Joint pain in active women (Clark 2008, Zdzieblik 2017)",
      body: "Clark et al. (Curr Med Res Opin 2008) tested 10 g/day of collagen hydrolysate for 24 weeks in athletes with activity-related knee pain; the collagen group had significant improvements in pain during walking and at rest. Zdzieblik et al. (Applied Physiology, Nutrition, and Metabolism 2017) replicated the finding in physically active adults with functional knee complaints.",
    },
    {
      heading: "Nail growth (Hexsel 2017)",
      body: "An open-label trial (Hexsel et al., J Cosmet Dermatol 2017) of 2.5 g/day of a specific collagen peptide (Verisol) for 24 weeks showed a 12% increase in nail growth rate and a 42% reduction in broken-nail frequency. Not blinded, so susceptible to expectation effects, but consistent with anecdotal reports and the underlying amino acid supply argument.",
    },
    {
      heading: "Vitamin C cofactor",
      body: "Prolyl and lysyl hydroxylases require vitamin C to cross-link collagen fibrils. Marketing widely recommends co-dosing vitamin C with collagen. Direct RCT evidence for the co-dosing benefit is small; the mechanism is real but likely only limiting if your baseline vitamin C intake is very low. 100–500 mg vitamin C is cheap insurance if you don't eat citrus, peppers, or kiwi regularly.",
    },
    {
      heading: "Peptides vs generic protein",
      body: "Some of collagen's benefits are amino-acid supply (glycine, proline) that any complete protein provides. What distinguishes hydrolyzed collagen is the presence of specific short peptides (hydroxyproline-glycine, proline-hydroxyproline) that survive digestion and appear in blood, where they may signal fibroblasts and chondrocytes. This is the mechanistic case for peptides over whey for skin/joint outcomes.",
    },
  ],
  interactions: [
    {
      with: "HRT",
      mechanism:
        "No known interaction. Estradiol independently supports skin collagen; effects may be additive but not conflicting.",
      watchFor: "None specific.",
    },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None specific." },
    {
      with: "Blood thinners (warfarin, apixaban)",
      mechanism: "No clinically meaningful interaction at food doses.",
      watchFor: "None specific.",
    },
    {
      with: "Iron supplements",
      mechanism: "Collagen provides some amino acids that support iron absorption; not a conflict.",
      watchFor: "None.",
    },
  ],
  cautions: [
    "Shellfish or fish allergy — avoid marine collagen; use bovine or eggshell membrane instead.",
    "Kidney disease with protein restriction — count collagen toward daily protein limit.",
    "Vegans/vegetarians — collagen is animal-derived; there is no true 'vegan collagen'.",
    "Products labelled 'collagen boosters' with no actual collagen (just vitamin C + amino acid) have weaker evidence.",
  ],
  faq: [
    {
      q: "How long until collagen works?",
      a: "Skin elasticity and hydration improvements show up at 8–12 weeks in RCTs. Nail growth is often noted earlier. Joint pain reduction takes 12–24 weeks. If you've taken 10 g/day consistently for 3 months with zero visible or subjective change, it's not going to.",
    },
    {
      q: "Is marine or bovine collagen better?",
      a: "Both have comparable evidence for skin outcomes. Marine (type I) may absorb marginally faster; bovine (type I + III) is cheaper. Choose based on allergies and price.",
    },
    {
      q: "Do I need vitamin C with collagen?",
      a: "Vitamin C is required for endogenous collagen cross-linking. If your baseline diet has adequate vitamin C (citrus, peppers, kiwi), extra isn't needed. If not, co-dosing 100–500 mg vitamin C is cheap and reasonable.",
    },
    {
      q: "Does collagen interact with HRT or birth control?",
      a: "No — collagen is digested to amino acids and small peptides before absorption. It doesn't affect hormonal medication clearance.",
    },
    {
      q: "Can pregnant or breastfeeding women take collagen?",
      a: "Collagen is a protein source and generally regarded as safe during pregnancy. Choose third-party tested products to avoid heavy-metal contamination.",
    },
    {
      q: "Where can I check collagen interactions with my other supplements?",
      a: CITE_INTERACTION,
    },
  ],
  sources: [
    {
      label: "Choi FD et al. J Drugs Dermatol 2019 — Oral collagen for skin health meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30681787/",
    },
    {
      label:
        "de Miranda RB et al. Int J Dermatol 2021 — Systematic review of oral collagen and skin.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33742704/",
    },
    {
      label:
        "Zdzieblik D et al. Nutrients 2018 — Collagen and BMD in postmenopausal women (12 months).",
      url: "https://pubmed.ncbi.nlm.nih.gov/29337906/",
    },
    {
      label:
        "Clark KL et al. Curr Med Res Opin 2008 — Collagen hydrolysate for joint pain in athletes.",
      url: "https://pubmed.ncbi.nlm.nih.gov/18416885/",
    },
    {
      label:
        "Zdzieblik D et al. Appl Physiol Nutr Metab 2017 — Collagen in adults with knee complaints.",
      url: "https://pubmed.ncbi.nlm.nih.gov/28177710/",
    },
    {
      label: "Hexsel D et al. J Cosmet Dermatol 2017 — Collagen peptides and nail growth.",
      url: "https://pubmed.ncbi.nlm.nih.gov/28786550/",
    },
  ],
  related: rel("collagen-peptides-women"),
  lastReviewed: REVIEWED,
};

export const SPERMIDINE_WOMEN: WomensCompoundContent = {
  slug: "spermidine-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Spermidine",
  h1: "Spermidine for Women: Autophagy, Longevity Claims & Interactions",
  summary:
    "Spermidine is a polyamine found in wheat germ, aged cheese, soy, and mushrooms. Mechanistically it activates autophagy — the cellular recycling process implicated in longevity. Small human trials at 1–2 mg/day (typical wheat-germ-extract dose) show modest cognitive benefit in older adults and reduced cardiovascular biomarkers, but the hard-endpoint evidence is not yet there. Spermidine is well-tolerated with no serious safety signals at supplement doses. It has minimal known interactions with HRT, birth control, or common prescriptions. Evidence level: limited but promising for cognition and cardiovascular markers.",
  keyFacts: {
    doseRange: "1–6 mg/day from wheat germ extract or purified spermidine",
    forms: "Wheat germ extract capsules (most trials), pure spermidine powder",
    evidence: "Limited",
    mainRisks: "Wheat allergy or gluten intolerance (many products are wheat-germ-derived)",
  },
  research: [
    {
      heading: "Memory pilot in subjective cognitive decline (Wirth 2018, 2019)",
      body: "The initial spermidine-and-memory pilot (Wirth et al., Cortex 2018) tested 3 months of a wheat-germ extract (1.2 mg/day spermidine) in 30 older adults with subjective cognitive decline. Memory scores trended upward in the spermidine arm. A larger follow-up (Wirth et al., Cortex 2019, n=100) showed similar directional but non-significant findings — a mixed signal often over-summarized in supplement marketing as 'proven'.",
    },
    {
      heading: "SmartAge trial (Schwarz 2022)",
      body: "SmartAge (Schwarz et al., GeroScience 2022) enrolled 100 older adults with subjective cognitive decline and tested 12 months of a wheat-germ extract vs placebo. The primary memory outcome did not reach significance in the intention-to-treat analysis, though secondary MRI hippocampal-integrity measures showed some preservation in the spermidine arm. This is the largest and longest RCT to date; the honest read is 'possible small benefit, not proven.'",
    },
    {
      heading: "Dietary spermidine and mortality (Kiechl 2018)",
      body: "The Bruneck cohort study (Kiechl et al., Am J Clin Nutr 2018) followed 829 adults for 20 years and found higher dietary spermidine intake associated with lower all-cause mortality — comparable in magnitude to Mediterranean-diet adherence effects. Observational, so confounded by overall diet quality; not causal evidence, but the signal is consistent across independent European cohorts.",
    },
    {
      heading: "Cardiovascular biomarkers (Eisenberg 2016, 2020)",
      body: "Eisenberg et al. (Nature Medicine 2016) showed dietary spermidine supplementation extended lifespan in mice through cardioprotective autophagy. Follow-up human work (Eisenberg et al., Cardiovasc Res 2020) found dietary spermidine intake inversely associated with blood pressure and cardiovascular events in the same Bruneck cohort. No RCT has yet tested spermidine specifically for hard cardiovascular endpoints in humans.",
    },
    {
      heading: "Mechanism — autophagy, senescence, T-cell function",
      body: "Spermidine's proposed mechanisms are autophagy induction (via inhibition of EP300 acetyltransferase), enhanced mitophagy, and immune-cell rejuvenation. Puleston et al. (Cell Metabolism 2019) showed spermidine restored autophagy in aged T cells, improving vaccine response in mice. Human immune data is limited but consistent.",
    },
    {
      heading: "Women-specific data gap",
      body: "There are no woman-specific spermidine RCTs. Trials have been mixed-sex with modest female representation. Perimenopausal cognitive symptoms, hot flashes, and bone density have not been tested. The dietary-cohort mortality data is consistent across sexes but doesn't isolate sex-specific effects.",
    },
  ],
  interactions: [
    { with: "HRT", mechanism: "No known interaction.", watchFor: "None specific." },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None specific." },
    {
      with: "Blood pressure medication",
      mechanism:
        "Spermidine may modestly lower BP in animal models; effect in humans at supplement doses is small.",
      watchFor: "Monitor if on multiple antihypertensives.",
    },
    {
      with: "Chemotherapy",
      mechanism: "Autophagy induction has complex effects on cancer cells.",
      watchFor: "Avoid during active cancer treatment without oncology input.",
    },
  ],
  cautions: [
    "Wheat or gluten allergy — check the source; most supplement spermidine is wheat-germ-derived.",
    "Active cancer — discuss with oncology.",
    "Pregnancy and breastfeeding — insufficient data.",
    "Don't expect subjective effects; effects are on biomarkers and long-term outcomes.",
  ],
  faq: [
    {
      q: "How much spermidine should a woman take?",
      a: "Most human trials use 1–3 mg/day from wheat germ extract. Some products deliver up to 6 mg. There's no evidence higher doses provide extra benefit.",
    },
    {
      q: "Can I get enough spermidine from food?",
      a: "Wheat germ, aged cheeses, soy, mushrooms, and legumes are the highest sources. A typical Mediterranean-style diet can approach 10 mg/day. If you eat these foods regularly, supplementation may be redundant.",
    },
    {
      q: "Does spermidine interact with HRT?",
      a: "No known interaction. Spermidine is a naturally occurring polyamine and doesn't affect estradiol metabolism.",
    },
    {
      q: "How long until spermidine works?",
      a: "Cognitive benefits in trials show up at 3 months. Autophagy activation is presumed continuous with dosing. There is no clean subjective marker of autophagy.",
    },
    {
      q: "Is spermidine safe long-term?",
      a: "Trials have run up to 12 months without safety signals. Multi-year human safety data doesn't yet exist.",
    },
    { q: "Where can I check spermidine interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Wirth M et al. Cortex 2018 — Spermidine and memory pilot in older adults.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29777923/",
    },
    {
      label: "Schwarz C et al. GeroScience 2022 — SmartAge 12-month spermidine RCT.",
      url: "https://pubmed.ncbi.nlm.nih.gov/35089490/",
    },
    {
      label:
        "Kiechl S et al. Am J Clin Nutr 2018 — Dietary spermidine and mortality (Bruneck cohort).",
      url: "https://pubmed.ncbi.nlm.nih.gov/29659696/",
    },
    {
      label: "Eisenberg T et al. Nat Med 2016 — Spermidine cardioprotective autophagy in mice.",
      url: "https://pubmed.ncbi.nlm.nih.gov/27841876/",
    },
    {
      label: "Eisenberg T et al. Cardiovasc Res 2020 — Dietary spermidine and human CVD.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31504261/",
    },
    {
      label: "Madeo F et al. Science 2018 — Spermidine mechanisms review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29371440/",
    },
  ],
  related: rel("spermidine-women"),
  lastReviewed: REVIEWED,
};

export const RESVERATROL_WOMEN: WomensCompoundContent = {
  slug: "resveratrol-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Resveratrol",
  h1: "Resveratrol for Women: Sirtuin Hype vs Human Evidence",
  summary:
    "Resveratrol is a polyphenol found in grape skins and Japanese knotweed, marketed as a sirtuin activator and longevity supplement. Human evidence is far less impressive than the mouse and yeast data that made it famous. In women, 75–150 mg/day for 12–24 weeks has shown modest improvements in insulin sensitivity, endothelial function, and (in postmenopausal women specifically) small cognitive and bone-density signals. High doses (>500 mg/day) have caused GI side effects and elevated liver enzymes in some trials. It has weak phytoestrogen activity, which matters if you have hormone-sensitive cancer history. Evidence level: limited to moderate for vascular markers; overstated for lifespan.",
  keyFacts: {
    doseRange:
      "75–150 mg/day (postmenopausal trials); up to 500 mg with meal for insulin sensitivity",
    forms:
      "Trans-resveratrol capsules. Micronized forms (e.g. Resveratrol-MC) have better bioavailability data.",
    evidence: "Limited",
    mainRisks:
      "Weak phytoestrogen; high doses can elevate liver enzymes; interacts with CYP3A4-metabolised drugs.",
  },
  research: [
    {
      heading: "RESHAW postmenopausal trial (Evans 2017–2021)",
      body: "The RESHAW crossover trial (Evans et al., Nutrients 2017; Clin Nutr 2020; J Nutr 2021) enrolled 129 postmenopausal women aged 45–85 and tested 75 mg trans-resveratrol twice daily for 24 months in a 12-month crossover design. It reported improved cerebrovascular responsiveness to cognitive tasks (~17% increase), better verbal memory, improved mood, and modest bone-density preservation at the lumbar spine. This is the longest and largest women-only resveratrol RCT to date, and the most credible women-specific evidence base.",
    },
    {
      heading: "Insulin sensitivity (Timmers 2011, Poulsen 2013)",
      body: "Timmers et al. (Cell Metab 2011) tested 150 mg/day for 30 days in obese men — HOMA-IR improved and skeletal muscle mitochondrial function increased. Poulsen et al. (Diabetes 2013) then tested 1500 mg/day for 4 weeks and found no benefit — a negative RCT that tempered enthusiasm. The insulin-sensitivity signal appears real at modest doses (150–500 mg) but not consistently reproducible at higher ones.",
    },
    {
      heading: "Endothelial function and BP (Fogacci 2019)",
      body: "A meta-analysis (Fogacci et al., Crit Rev Food Sci Nutr 2019) of 17 RCTs found resveratrol modestly lowered systolic BP (about 4 mmHg) at ≥300 mg/day and improved flow-mediated dilation. Effect size is comparable to a modest lifestyle intervention.",
    },
    {
      heading: "Cognition and cerebral blood flow (Kennedy 2010, Wong 2016)",
      body: "Kennedy et al. (Am J Clin Nutr 2010) showed acute single doses of 250–500 mg increased cerebral blood flow measured by near-infrared spectroscopy. Wong et al. (Nutrients 2016) confirmed chronic 14-week dosing at 75 mg twice daily improved cerebrovascular responsiveness in postmenopausal women, mirroring the RESHAW findings.",
    },
    {
      heading: "Estrogenic activity — clinical relevance",
      body: "Resveratrol is a mixed estrogen-receptor agonist/antagonist in vitro. At supplement doses (75–500 mg), it has not produced measurable estrogenic effects on the endometrium or breast tissue in RCTs. In hormone-receptor-positive breast cancer, however, the mechanism is enough that oncologists typically recommend avoiding it — a precautionary rather than an evidence-based prohibition, but a reasonable one.",
    },
    {
      heading: "High-dose safety (Brown 2010, Almeida 2009)",
      body: "Doses of 1000–5000 mg/day have produced diarrhea, nausea, and reversible elevations in liver enzymes (Brown et al., Cancer Res 2010; Almeida et al., Mol Nutr Food Res 2009). This is the main safety-driven reason to stay at ≤500 mg/day unless a clinical protocol specifies otherwise.",
    },
    {
      heading: "CYP3A4 inhibition — drug interaction concern",
      body: "Resveratrol inhibits CYP3A4 in vitro and, at high oral doses, appears to affect the pharmacokinetics of several substrate drugs. Chow et al. (Cancer Prev Res 2010) documented CYP3A4 and CYP2D6 inhibition at 1000 mg/day. At typical supplement doses (75–150 mg), clinically meaningful interactions are uncommon but not zero — particularly relevant for narrow-therapeutic-index drugs like tacrolimus, warfarin, and some anticonvulsants.",
    },
  ],
  interactions: [
    {
      with: "HRT",
      mechanism: "Weak additive estrogenic activity; effect at supplement doses is uncertain.",
      watchFor: "Discuss with gynecologist; not routinely combined.",
    },
    {
      with: "Tamoxifen / aromatase inhibitors",
      mechanism: "Potential phytoestrogenic interference.",
      watchFor: "Avoid without oncology sign-off.",
    },
    {
      with: "Blood thinners (warfarin, apixaban)",
      mechanism: "Mild antiplatelet activity in vitro; clinical relevance small at typical doses.",
      watchFor: "Monitor if on warfarin; avoid megadoses.",
    },
    {
      with: "CYP3A4-metabolised drugs (many statins, some benzodiazepines, tacrolimus, sildenafil)",
      mechanism: "Resveratrol inhibits CYP3A4 in vitro at high doses.",
      watchFor: "Discuss with pharmacist if on narrow-therapeutic-index drugs.",
    },
    {
      with: "Birth control",
      mechanism: "Weak CYP3A4 inhibition — theoretical, unlikely at typical doses.",
      watchFor: "No clinical warnings issued.",
    },
  ],
  cautions: [
    "Breast, uterine, or ovarian cancer history — discuss with oncology before use.",
    "Pregnancy and breastfeeding — insufficient data; avoid.",
    "Active liver disease or elevated baseline transaminases.",
    "Scheduled surgery — stop 2 weeks before due to weak antiplatelet activity.",
  ],
  faq: [
    {
      q: "How much resveratrol should a woman take?",
      a: "The strongest woman-specific evidence uses 75 mg twice daily. Higher doses (>500 mg) don't clearly improve outcomes and increase side-effect risk.",
    },
    {
      q: "Does resveratrol replace HRT for postmenopause symptoms?",
      a: "No. Resveratrol's cognitive and bone effects in postmenopausal trials are modest and far smaller than HRT for vasomotor symptoms. It's not a substitute for HRT when HRT is otherwise indicated.",
    },
    {
      q: "Can I get enough resveratrol from red wine?",
      a: "No — wine contains milligrams-per-liter amounts, and alcohol offsets any potential benefit. Supplement doses are 50–500× higher.",
    },
    {
      q: "Does resveratrol interact with birth control?",
      a: "At typical supplement doses, no clinically documented interaction. Very high doses could theoretically affect CYP3A4-cleared contraceptives; there's no case report evidence.",
    },
    {
      q: "Is resveratrol safe long-term?",
      a: "The RESHAW postmenopausal trial ran 24 months at 150 mg/day without safety signals. High doses (1–5 g/day) have caused GI and liver enzyme issues.",
    },
    { q: "Where can I check resveratrol interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Evans HM et al. Nutrients 2017 — RESHAW resveratrol postmenopausal 14-week phase.",
      url: "https://pubmed.ncbi.nlm.nih.gov/28125046/",
    },
    {
      label: "Thaung Zaw JJ et al. Clin Nutr 2020 — RESHAW long-term cerebrovascular outcomes.",
      url: "https://pubmed.ncbi.nlm.nih.gov/32279974/",
    },
    {
      label: "Timmers S et al. Cell Metabolism 2011 — Resveratrol metabolic effects in obese men.",
      url: "https://pubmed.ncbi.nlm.nih.gov/22055504/",
    },
    {
      label: "Poulsen MM et al. Diabetes 2013 — High-dose resveratrol negative trial.",
      url: "https://pubmed.ncbi.nlm.nih.gov/23193181/",
    },
    {
      label: "Fogacci F et al. Crit Rev Food Sci Nutr 2019 — Resveratrol and BP meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29129149/",
    },
    {
      label: "Chow HH et al. Cancer Prev Res 2010 — Resveratrol CYP3A4 inhibition.",
      url: "https://pubmed.ncbi.nlm.nih.gov/20841225/",
    },
    {
      label: "NIH Office of Dietary Supplements — Resveratrol fact sheet.",
      url: "https://ods.od.nih.gov/factsheets/Resveratrol-HealthProfessional/",
    },
  ],
  related: rel("resveratrol-women"),
  lastReviewed: REVIEWED,
};

export const MAGNESIUM_GLYCINATE_WOMEN: WomensCompoundContent = {
  slug: "magnesium-glycinate-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Magnesium Glycinate (for women)",
  h1: "Magnesium Glycinate for Women: Sleep, Cramps, and Longevity",
  summary:
    "Magnesium glycinate is a well-absorbed, non-laxative form of magnesium bound to the amino acid glycine. It has meaningful evidence for improving sleep quality, muscle cramps, PMS symptoms, and blood pressure at 200–400 mg elemental magnesium per day. It's one of the few supplements with real interaction relevance: magnesium reduces absorption of levothyroxine, tetracycline and quinolone antibiotics, and bisphosphonates if taken together. It's safe with HRT and birth control. Evidence level: moderate for sleep, muscle, and BP outcomes; strong for repletion of documented deficiency.",
  keyFacts: {
    doseRange: "200–400 mg elemental magnesium/day (typically 1500–3000 mg magnesium glycinate)",
    forms:
      "Glycinate (best-tolerated), threonate (brain uptake claim), citrate (laxative), oxide (poor absorption)",
    evidence: "Moderate",
    mainRisks: "Absorption timing conflict with levothyroxine, antibiotics, bisphosphonates.",
  },
  research: [
    {
      heading: "Sleep meta-analysis (Rondanelli 2021, Mah 2021)",
      body: "Rondanelli et al. (Nutrients 2021) pooled RCTs of magnesium and sleep and found modest but consistent improvements in sleep-onset latency and self-reported sleep quality at 300–500 mg elemental magnesium/day, most pronounced in older adults with insomnia. Mah & Pitre (BMC Complement Med Ther 2021) reached a similar conclusion — real effect, small-to-moderate size, most robust for sleep-onset latency.",
    },
    {
      heading: "PMS symptom relief (Facchinetti 1991, Walker 1998)",
      body: "Facchinetti et al. (Obstet Gynecol 1991) tested 360 mg magnesium/day for 2 luteal cycles and found significant reductions in the total PMS score, especially the mood and fluid-retention subscales. Walker et al. (J Womens Health 1998) confirmed added benefit from combining magnesium 200 mg with vitamin B6 50 mg — the classic 'Mg+B6' PMS protocol that still holds up.",
    },
    {
      heading: "Blood pressure meta-analysis (Zhang 2016, Rosanoff 2021)",
      body: "Zhang et al. (Hypertension 2016) pooled 34 RCTs (n=2028) and found magnesium supplementation lowered systolic BP by about 2 mmHg and diastolic by about 1.8 mmHg — modest but meaningful at population scale. Rosanoff & Costello (Adv Nutr 2021) confirmed the effect is larger (4–5 mmHg) in adults with documented hypomagnesemia or insulin resistance.",
    },
    {
      heading: "Migraine prevention (Peikert 1996, Chiu 2016)",
      body: "Peikert et al. (Cephalalgia 1996) showed 600 mg magnesium citrate/day reduced migraine frequency by about 40% vs placebo over 12 weeks. Chiu et al. (Pain Physician 2016) meta-analyzed the migraine-magnesium literature and confirmed a small but consistent preventive effect. The American Headache Society lists magnesium as a Level B evidence migraine prophylactic.",
    },
    {
      heading: "Type 2 diabetes risk and insulin sensitivity (Veronese 2016, Simental-Mendia 2016)",
      body: "A meta-analysis of prospective cohorts (Fang et al., BMC Med 2016) found each 100 mg/day increase in dietary magnesium associated with 8–13% lower type 2 diabetes risk. Simental-Mendia et al. (Pharmacol Res 2016) pooled RCTs and found magnesium supplementation improved fasting glucose and HOMA-IR in insulin-resistant adults.",
    },
    {
      heading: "Restless legs and nocturnal cramps",
      body: "Small trials support magnesium for restless legs syndrome and nocturnal leg cramps, though effect sizes vary widely and placebo response is high. The low-risk profile makes it a reasonable first-line trial for both conditions before pharmacotherapy.",
    },
    {
      heading: "Perimenopause and postmenopausal considerations",
      body: "Estrogen loss modestly reduces magnesium retention. Postmenopausal women are particularly prone to subclinical hypomagnesemia contributing to sleep disruption, muscle cramps, and low mood. This is one of the highest-value supplements to add during the transition, with strong safety and minimal interaction complexity.",
    },
  ],
  interactions: [
    {
      with: "Levothyroxine (thyroid medication)",
      mechanism: "Magnesium chelates levothyroxine, reducing absorption.",
      watchFor: "Take levothyroxine on empty stomach; separate magnesium by 4 hours.",
    },
    {
      with: "Tetracycline and quinolone antibiotics (doxycycline, ciprofloxacin)",
      mechanism: "Chelation reduces antibiotic absorption.",
      watchFor: "Separate by 2–4 hours.",
    },
    {
      with: "Bisphosphonates (alendronate, risedronate)",
      mechanism: "Chelation.",
      watchFor: "Separate by 2 hours per bisphosphonate labeling.",
    },
    {
      with: "HRT and birth control",
      mechanism: "No known interaction.",
      watchFor: "None specific.",
    },
    {
      with: "Diuretics (loop and thiazide)",
      mechanism: "Loop diuretics deplete magnesium; potassium-sparing diuretics can raise it.",
      watchFor: "Repletion often needed on loop diuretics; monitor if on spironolactone.",
    },
    {
      with: "Blood pressure medication",
      mechanism: "Additive BP-lowering effect.",
      watchFor: "Monitor BP when starting; effect is modest.",
    },
  ],
  cautions: [
    "Kidney disease (eGFR <30) — magnesium can accumulate; use only under clinician supervision.",
    "On multiple daily medications — build a fixed timing routine (e.g. levothyroxine 6am, magnesium 9pm).",
    "GI symptoms with any magnesium form — switch to glycinate; oxide and citrate are most laxative.",
    "Very high doses (>1000 mg elemental/day) can cause diarrhea, hypotension, and cardiac effects.",
  ],
  faq: [
    {
      q: "Which magnesium form is best for sleep?",
      a: "Magnesium glycinate (best tolerated, calming from glycine) and magnesium threonate (marketed for brain uptake, more expensive) are the two forms typically chosen for sleep. Take 200–400 mg elemental 30–60 min before bed.",
    },
    {
      q: "Can I take magnesium with levothyroxine?",
      a: "Not at the same time. Magnesium reduces levothyroxine absorption by chelation. Standard practice: levothyroxine first thing on empty stomach, magnesium at least 4 hours later (evening dosing works).",
    },
    {
      q: "Does magnesium interact with HRT or birth control?",
      a: "No known clinically significant interaction. Magnesium is one of the safest supplements to combine with hormonal medication.",
    },
    {
      q: "How much magnesium do I actually need?",
      a: "The RDA for women is 310–320 mg/day (higher during pregnancy). Total intake counts food + supplement. Most women get 200–250 mg from food alone; 200 mg supplement typically covers the gap.",
    },
    {
      q: "Can I take magnesium with a diuretic?",
      a: "Loop diuretics (furosemide) deplete magnesium and often require supplementation. Potassium-sparing diuretics (spironolactone) can raise magnesium and typically don't need extra. Ask your prescriber.",
    },
    { q: "Where can I check magnesium interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Rondanelli M et al. Nutrients 2021 — Magnesium and sleep meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33379070/",
    },
    {
      label:
        "Mah J, Pitre T. BMC Complement Med Ther 2021 — Oral magnesium for insomnia meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33865376/",
    },
    {
      label: "Zhang X et al. Hypertension 2016 — Magnesium and BP meta-analysis (34 RCTs).",
      url: "https://pubmed.ncbi.nlm.nih.gov/27402922/",
    },
    {
      label: "Facchinetti F et al. Obstet Gynecol 1991 — Magnesium for PMS.",
      url: "https://pubmed.ncbi.nlm.nih.gov/2067759/",
    },
    {
      label: "Fang X et al. BMC Med 2016 — Dietary magnesium and type 2 diabetes risk.",
      url: "https://pubmed.ncbi.nlm.nih.gov/27927203/",
    },
    {
      label: "Peikert A et al. Cephalalgia 1996 — Magnesium 600 mg for migraine prevention.",
      url: "https://pubmed.ncbi.nlm.nih.gov/8792038/",
    },
    {
      label: "NIH Office of Dietary Supplements — Magnesium Fact Sheet.",
      url: "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/",
    },
  ],
  related: rel("magnesium-glycinate-women"),
  lastReviewed: REVIEWED,
};

export const COQ10_WOMEN: WomensCompoundContent = {
  slug: "coq10-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "CoQ10 (Ubiquinol)",
  h1: "CoQ10 (Ubiquinol) for Women: Statin Support, Heart & Fertility",
  summary:
    "Coenzyme Q10 (CoQ10) is a mitochondrial cofactor and antioxidant. Ubiquinol is its reduced, more bioavailable form. It has three main evidence bases in women: reducing statin-associated muscle symptoms, supporting heart failure, and improving egg quality in women over 35 approaching IVF. Standard doses are 100–200 mg/day ubiquinol (or 200–400 mg ubiquinone). Safety is excellent, and interactions are limited — the biggest one is with warfarin, where CoQ10's structural similarity to vitamin K can reduce anticoagulant effect. Evidence level: moderate for statin symptoms and heart failure; limited-to-moderate for egg quality.",
  keyFacts: {
    doseRange:
      "100–200 mg/day ubiquinol OR 200–400 mg/day ubiquinone; 200–600 mg/day for fertility contexts",
    forms: "Ubiquinol softgels (better absorption after age 40), ubiquinone capsules (cheaper)",
    evidence: "Moderate",
    mainRisks: "Reduces warfarin effect (vitamin-K-like structure). Otherwise well-tolerated.",
  },
  research: [
    {
      heading: "Statin-associated muscle symptoms (Qu 2018, Skarlovnik 2014)",
      body: "Qu et al. (J Am Heart Assoc 2018) meta-analyzed 12 RCTs (n=575) of CoQ10 for statin-associated myalgia and found a small but significant reduction in muscle pain, muscle weakness, muscle cramps, and muscle tiredness at 100–600 mg/day. Skarlovnik et al. (Med Sci Monit 2014) tested 50 mg twice daily for 30 days in statin users with muscle symptoms and found a ~54% reduction in pain severity vs 0% in placebo. Not universally effective, but low-risk and worth an 8–12 week trial for symptomatic statin users.",
    },
    {
      heading: "Heart failure — Q-SYMBIO (Mortensen 2014)",
      body: "Q-SYMBIO (Mortensen et al., JACC Heart Fail 2014) enrolled 420 NYHA class III/IV heart failure patients and randomized to 300 mg ubiquinone/day vs placebo on top of standard care. Over 2 years, the CoQ10 arm had significantly fewer major adverse cardiovascular events (15% vs 26%), fewer cardiovascular deaths, and reduced all-cause mortality. This is the strongest CoQ10 outcome trial to date and underlies the European Society of Cardiology's supportive-of-consideration stance for CoQ10 in heart failure.",
    },
    {
      heading: "Blood pressure (Rosenfeldt 2007, Ho 2016)",
      body: "Rosenfeldt et al. (J Hum Hypertens 2007) pooled 12 clinical trials and found CoQ10 reduced systolic BP by an average of 17 mmHg and diastolic by 10 mmHg in hypertensive patients — larger than most other supplements. Ho et al. (J Hum Hypertens 2016) meta-analyzed later trials and found a more modest effect (systolic ~4 mmHg). The truth is likely between the two: real, dose- and baseline-dependent, and larger in adults with elevated baseline BP.",
    },
    {
      heading: "Egg quality and IVF outcomes (Xu 2018, Bentov 2014)",
      body: "Xu et al. (Reprod Biomed Online 2018) tested 600 mg ubiquinol/day for 8 weeks pre-IVF in women aged 35+ and found improved oocyte mitochondrial function, higher fertilization rate, and better embryo quality. Bentov et al. (Fertil Steril 2014) reported similar findings in a smaller trial. Not a substitute for reproductive endocrinology care, but a common evidence-informed addition to fertility protocols in women over 35.",
    },
    {
      heading: "Migraine prevention (Sandor 2005, Dahri 2019)",
      body: "Sandor et al. (Neurology 2005) tested 100 mg CoQ10 three times daily for 3 months and found a >50% reduction in attack frequency in 48% of the CoQ10 group vs 14% of placebo. Dahri et al. (Nutr Neurosci 2019) confirmed the effect. The American Headache Society lists CoQ10 as Level C for migraine prevention.",
    },
    {
      heading: "Statins and endogenous CoQ10 depletion",
      body: "Statins inhibit HMG-CoA reductase, which is upstream of both cholesterol and endogenous CoQ10 synthesis. Blood CoQ10 falls measurably on statin therapy. Whether that depletion causes statin-associated muscle symptoms in individual patients is debated, but the mechanism is real and the supplementation trial is low-risk.",
    },
    {
      heading: "Ubiquinol vs ubiquinone — the age-40 argument",
      body: "Endogenous conversion of ubiquinone (oxidized) to ubiquinol (reduced) is efficient in younger adults but declines with age and with certain medications. In adults over 40, ubiquinol softgels reach higher plasma CoQ10 levels per milligram than ubiquinone capsules (Failla et al., J Clin Pharm Ther 2014). Under 40, ubiquinone is roughly equivalent and cheaper.",
    },
  ],
  interactions: [
    {
      with: "Warfarin",
      mechanism:
        "CoQ10 structurally resembles vitamin K and can reduce warfarin's anticoagulant effect.",
      watchFor: "Monitor INR closely if starting or stopping.",
    },
    {
      with: "Statins",
      mechanism: "Statins reduce endogenous CoQ10 synthesis; supplementation is often recommended.",
      watchFor: "Benefit rather than conflict.",
    },
    {
      with: "Blood pressure medication",
      mechanism: "Modest additive BP-lowering.",
      watchFor: "Monitor BP.",
    },
    {
      with: "HRT and birth control",
      mechanism: "No known interaction.",
      watchFor: "None specific.",
    },
    {
      with: "Chemotherapy",
      mechanism: "Antioxidants during chemotherapy are debated.",
      watchFor: "Discuss with oncology.",
    },
  ],
  cautions: [
    "On warfarin — monitor INR when starting.",
    "Scheduled surgery — some sources suggest stopping 2 weeks before; discuss with anesthesia.",
    "Pregnancy — safety data is limited but no signal for harm at typical doses; discuss.",
    "Choose ubiquinol after age 40 — endogenous conversion of ubiquinone declines.",
  ],
  faq: [
    {
      q: "Should every woman on a statin take CoQ10?",
      a: "Not universally, but it's a reasonable low-risk trial for anyone with statin-associated muscle symptoms. 100–200 mg/day ubiquinol for 8–12 weeks and reassess.",
    },
    {
      q: "Does CoQ10 improve egg quality?",
      a: "Small trials in women over 35 approaching IVF show modest improvements in oocyte mitochondrial function and fertilization rate at 200–600 mg/day for 60–90 days. It's a common addition to fertility protocols but not a substitute for reproductive endocrinology care.",
    },
    {
      q: "CoQ10 or ubiquinol — which is better for women over 40?",
      a: "Ubiquinol (the reduced form) has better absorption data and doesn't require conversion. It's more expensive per mg but you can use lower doses. Under 40, ubiquinone (cheaper) works comparably.",
    },
    {
      q: "Does CoQ10 interact with warfarin?",
      a: "Yes — the most important interaction to know. CoQ10 resembles vitamin K structurally and can reduce warfarin's effect. Monitor INR when starting or stopping. Not a hard contraindication but requires INR checks.",
    },
    { q: "Is CoQ10 safe with HRT?", a: "Yes — no known interaction." },
    { q: "Where can I check CoQ10 interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Qu H et al. J Am Heart Assoc 2018 — CoQ10 for statin myopathy meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30371340/",
    },
    {
      label: "Mortensen SA et al. JACC Heart Fail 2014 — Q-SYMBIO trial.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25282031/",
    },
    {
      label: "Rosenfeldt FL et al. J Hum Hypertens 2007 — CoQ10 and BP pooled analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/17287847/",
    },
    {
      label: "Xu Y et al. Reprod Biomed Online 2018 — CoQ10 for oocyte quality in women 35+.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30340892/",
    },
    {
      label: "Bentov Y et al. Fertil Steril 2014 — CoQ10 in IVF outcomes.",
      url: "https://pubmed.ncbi.nlm.nih.gov/24864009/",
    },
    {
      label: "Sandor PS et al. Neurology 2005 — CoQ10 for migraine prevention.",
      url: "https://pubmed.ncbi.nlm.nih.gov/15728298/",
    },
    {
      label: "Failla ML et al. J Clin Pharm Ther 2014 — Ubiquinol vs ubiquinone bioavailability.",
      url: "https://pubmed.ncbi.nlm.nih.gov/24460561/",
    },
  ],
  related: rel("coq10-women"),
  lastReviewed: REVIEWED,
};

export const CREATINE_WOMEN: WomensCompoundContent = {
  slug: "creatine-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Creatine Monohydrate (for women)",
  h1: "Creatine for Women: Muscle, Bone, Brain & Perimenopause",
  summary:
    "Creatine monohydrate is one of the most-studied supplements in sport, but only recently has women-specific research caught up. In women — especially perimenopausal and postmenopausal — 3–5 g/day has evidence for maintaining muscle mass, supporting bone density when combined with resistance training, improving working memory (especially under sleep deprivation), and reducing perimenopausal fatigue. Women have naturally lower creatine stores than men, so the relative benefit may be larger. Safety is excellent; the classic 'creatine causes kidney damage' claim is not supported in healthy adults. Water retention is intracellular, not cosmetic bloat. Evidence level: strong for muscle and cognition; moderate for bone density.",
  keyFacts: {
    doseRange: "3–5 g/day monohydrate. No loading needed. Any time of day.",
    forms:
      "Micronized monohydrate powder (cheapest, most-studied). Skip 'HCl', 'ethyl ester' — no advantage.",
    evidence: "Strong",
    mainRisks: "Slight water retention (intracellular). None serious in healthy adults.",
  },
  research: [
    {
      heading: "Position paper on creatine in women (Smith-Ryan 2021)",
      body: "Smith-Ryan et al. (Nutrients 2021) is the field's first dedicated review of creatine in women across the lifespan. Key conclusions: women have 70–80% of male baseline muscle creatine, are more responsive to supplementation, and see meaningful benefits for lean mass, strength, mood, and (in perimenopausal and postmenopausal women paired with resistance training) bone density. This paper is the most-cited women-specific reference in the field.",
    },
    {
      heading: "Strength and lean mass in postmenopausal women (Chilibeck 2015, Candow 2019)",
      body: "Chilibeck et al. (Med Sci Sports Exerc 2015) tested 12 months of 0.1 g/kg/day creatine (about 7 g/day) plus resistance training in 33 postmenopausal women. The creatine group had greater gains in bench press, hip abduction strength, and preserved femoral neck bone mineral density vs placebo. Candow et al. (Nutrients 2019) meta-analyzed similar trials and confirmed a consistent bone-preservation signal when creatine is combined with resistance training — not just muscle.",
    },
    {
      heading: "Cognition, sleep deprivation, and stress (Rae 2003, Gordji-Nejad 2024)",
      body: "Rae et al. (Proc R Soc B 2003) showed 5 g/day for 6 weeks improved working memory and intelligence-test performance. Gordji-Nejad et al. (Sci Rep 2024) recently showed a single high dose (0.35 g/kg, ~25 g) partially reversed cognitive deficits induced by 21 hours of sleep deprivation, correlating with rising brain creatine measured by MRS. The cognitive story is strongest under stress — sleep loss, calorie restriction, mental fatigue.",
    },
    {
      heading: "Perimenopause and menopause context (Candow 2023 review)",
      body: "Candow et al. (Nutrients 2023) specifically reviewed creatine across the menopausal transition and concluded 3–5 g/day appears to support lean mass preservation, bone health, mood, and cognitive function during the estrogen decline. The mechanism combines direct muscle and bone effects with a neuroprotective creatine-phosphate buffering role in brain tissue.",
    },
    {
      heading: "Safety across long trials (Kreider 2017, Antonio 2021)",
      body: "The International Society of Sports Nutrition position stand (Kreider et al., JISSN 2017) reviewed decades of creatine trials and found no evidence of kidney or liver harm in healthy adults at doses up to 30 g/day short-term or 3–5 g/day long-term. Antonio et al. (JISSN 2021) reviewed common myths (bloating, hair loss, dehydration, cramping) and found none supported by controlled trial evidence.",
    },
    {
      heading: "Non-responders and creatine transporter",
      body: "Roughly 20–30% of individuals are low-responders — genetic variation in the SLC6A8 creatine transporter and baseline muscle creatine (higher in habitual red-meat eaters, lower in vegetarians) explain much of the variability. Vegetarian women are often the largest responders. If there's no strength or lean-mass response at 8 weeks, it may not be an effective intervention for you.",
    },
    {
      heading: "Depression and postpartum mood (Kondo 2011, Roitman 2007)",
      body: "Kondo et al. (Am J Psychiatry 2011) tested 5 g/day added to fluoxetine in adolescent girls with SSRI-resistant depression — significant reduction in depression scores vs placebo. Roitman et al. (Bipolar Disord 2007) showed adjunctive creatine improved depressive symptoms in a small mixed-diagnosis sample. Signal is intriguing, especially given brain-energy hypotheses of perimenopausal mood disorders, but the evidence base is small.",
    },
  ],
  interactions: [
    {
      with: "HRT",
      mechanism:
        "No pharmacokinetic interaction. Both support lean mass — possible additive benefit.",
      watchFor: "None specific.",
    },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None specific." },
    {
      with: "Diuretics",
      mechanism:
        "Combining creatine (which draws water into muscle cells) with dehydrating drugs is a theoretical concern in extreme heat.",
      watchFor: "Stay hydrated in heat/exercise.",
    },
    {
      with: "Caffeine",
      mechanism:
        "Old studies suggested caffeine blunts creatine's ergogenic effect; the finding hasn't held up.",
      watchFor: "Not clinically relevant.",
    },
    { with: "Metformin", mechanism: "No known interaction.", watchFor: "None." },
  ],
  cautions: [
    "Kidney disease — get clearance from your nephrologist before starting.",
    "First 1–2 weeks: expect 1–2 lbs water weight; it's intracellular, not fat or bloat.",
    "Don't waste money on non-monohydrate forms — same effect, higher price.",
    "Take with water to reduce GI discomfort in sensitive users.",
  ],
  faq: [
    {
      q: "Do women really need creatine?",
      a: "Women have 70–80% of the creatine stores of men and consume less creatine from food (which comes mostly from red meat). Supplementation is often more impactful in women, especially in perimenopause and menopause when lean-mass loss accelerates. 3–5 g/day is a well-supported intervention.",
    },
    {
      q: "Does creatine make women 'bulky'?",
      a: "No. Creatine doesn't add fat and it doesn't add contractile tissue on its own. It supports strength and hydration inside muscle cells. If anything, it makes muscle-building training more effective — which is a benefit, not a downside.",
    },
    {
      q: "Do I need to load creatine?",
      a: "No. Loading (20 g/day for 5–7 days) saturates muscle faster but 3–5 g/day gets you there in 3–4 weeks with less GI discomfort.",
    },
    {
      q: "Does creatine interact with HRT or birth control?",
      a: "No — creatine is a small metabolite already produced by the body. No hormonal interaction.",
    },
    {
      q: "Can creatine help perimenopause symptoms?",
      a: "Emerging evidence suggests yes for fatigue and lean-mass preservation. It's not a substitute for HRT and it doesn't touch hot flashes, but it's one of the highest-value supplements to add during the transition.",
    },
    { q: "Where can I check creatine interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Smith-Ryan AE et al. Nutrients 2021 — Creatine for women position paper.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33800439/",
    },
    {
      label: "Candow DG et al. Nutrients 2023 — Creatine and the menopause transition.",
      url: "https://pubmed.ncbi.nlm.nih.gov/37299592/",
    },
    {
      label:
        "Chilibeck PD et al. Med Sci Sports Exerc 2015 — 12-month creatine + resistance training in postmenopausal women.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25386713/",
    },
    {
      label:
        "Kreider RB et al. JISSN 2017 — International Society of Sports Nutrition position stand on creatine.",
      url: "https://pubmed.ncbi.nlm.nih.gov/28615996/",
    },
    {
      label: "Antonio J et al. JISSN 2021 — Common questions and misconceptions about creatine.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33557850/",
    },
    {
      label:
        "Gordji-Nejad A et al. Sci Rep 2024 — Single-dose creatine and sleep-deprivation cognition.",
      url: "https://pubmed.ncbi.nlm.nih.gov/38424498/",
    },
    {
      label: "Dolan E et al. Br J Sports Med 2019 — Creatine and bone.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30728161/",
    },
  ],
  related: rel("creatine-women"),
  lastReviewed: REVIEWED,
};

export const OMEGA_3_WOMEN: WomensCompoundContent = {
  slug: "omega-3-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Omega-3 (EPA/DHA) for Women",
  h1: "Omega-3 for Women: Heart, Brain, Perimenopause Mood, and Interactions",
  summary:
    "Fish-oil-derived EPA and DHA have strong evidence in women for cardiovascular risk reduction, reducing hypertriglyceridemia, and modest improvements in depression and perimenopausal mood. Pregnancy-specific evidence supports DHA for fetal neurodevelopment. Doses of 1–2 g/day of combined EPA+DHA are standard; higher doses (2–4 g/day) are used for triglycerides. The main interaction concern is with anticoagulants — EPA/DHA have mild antiplatelet effect, so combining with warfarin or apixaban requires awareness (though not usually contraindication at standard doses). Fish sourcing matters: choose IFOS-certified products for low heavy-metal and oxidation levels. Evidence level: strong for cardiovascular and triglyceride outcomes; moderate for mood.",
  keyFacts: {
    doseRange:
      "1–2 g/day EPA+DHA general; 2–4 g/day for high triglycerides; 200–500 mg DHA in pregnancy",
    forms:
      "Triglyceride-form fish oil (best absorption), ethyl esters, krill oil (lower dose, better absorption per mg)",
    evidence: "Strong",
    mainRisks: "Additive antiplatelet effect with warfarin/apixaban/aspirin at high doses.",
  },
  research: [
    {
      heading: "Cardiovascular outcomes — REDUCE-IT and STRENGTH",
      body: "REDUCE-IT (Bhatt et al., NEJM 2019) tested 4 g/day of icosapent ethyl (a prescription pure-EPA formulation) in 8,179 statin-treated adults with elevated triglycerides and high cardiovascular risk. Major adverse cardiovascular events fell by 25% over median 4.9 years — one of the largest cardiovascular event reductions from a supplement-derived intervention. STRENGTH (Nicholls et al., JAMA 2020), using a mixed EPA/DHA carboxylic-acid formulation, was neutral — a reminder that formulation and comparator oil choice matter. Woman-specific subgroups in REDUCE-IT trended in the same direction as the overall population.",
    },
    {
      heading: "Triglyceride reduction (Skulas-Ray 2019)",
      body: "The AHA scientific statement (Skulas-Ray et al., Circulation 2019) concluded 2–4 g/day of EPA+DHA reduces triglycerides by 20–30% in adults with hypertriglyceridemia, with EPA-dominant formulations having a slight edge. Effect is dose-dependent, seen within 4–8 weeks.",
    },
    {
      heading: "Depression and perimenopausal mood (Mocking 2016, Su 2018)",
      body: "Mocking et al. (Transl Psychiatry 2016) meta-analyzed 13 RCTs of omega-3 for major depression and found modest antidepressant effects, particularly when EPA content was >60% of total EPA+DHA and dose ≥1 g/day EPA. Su et al. (Nutrients 2018) confirmed the EPA-dominant pattern and found the strongest signal in trials that adjunct-treated women, including a perimenopausal-specific subgroup analysis.",
    },
    {
      heading: "Pregnancy and fetal neurodevelopment (Middleton 2018, ORIP 2019)",
      body: "The Cochrane review of omega-3 in pregnancy (Middleton et al., 2018) pooled 70 RCTs (n=19,927) and found consistent reductions in early preterm birth (<34 weeks) and low birthweight with DHA supplementation. The ORIP trial (Makrides et al., NEJM 2019) tested 900 mg omega-3/day and confirmed reduced early preterm birth risk. Current guidance for pregnant and lactating women: ≥200 mg DHA/day minimum, with 600 mg/day considered for women at elevated preterm-birth risk.",
    },
    {
      heading: "Postmenopausal cognition — MIDAS and beyond",
      body: "MIDAS (Yurko-Mauro et al., Alzheimers Dement 2010) tested 900 mg DHA/day for 24 weeks in older adults with age-related cognitive decline and found improvements in episodic and working memory. Subsequent trials in older adults with mild cognitive impairment have been mixed — suggesting omega-3 may be more preventive than therapeutic for cognitive decline.",
    },
    {
      heading: "Bone and joint outcomes",
      body: "Smaller RCTs and observational data suggest omega-3 may modestly reduce inflammatory markers and joint pain in rheumatoid arthritis and, less clearly, osteoarthritis. Bone density effects in postmenopausal women are inconsistent — omega-3 is not a primary bone intervention, but a reasonable add-on to a bone plan built on resistance training, protein, vitamin D, and (where indicated) HRT.",
    },
    {
      heading: "Menstrual pain (Rahbar 2012, Zafari 2011)",
      body: "Small RCTs (Rahbar et al., 2012; Zafari et al., 2011) show omega-3 at 1–2 g/day for 2–3 cycles significantly reduces primary dysmenorrhea pain intensity, sometimes rivaling ibuprofen without the GI side effects. A useful low-risk option for women who prefer to avoid regular NSAID use.",
    },
    {
      heading: "Anti-inflammatory mechanism and cardiovascular plausibility",
      body: "EPA and DHA are precursors to resolvins and protectins — specialized pro-resolving mediators that actively terminate inflammation rather than merely block it. This mechanism ties together the cardiovascular, mood, joint, and pregnancy findings and helps explain why the effects are broad and dose-dependent rather than lock-and-key drug-like.",
    },
  ],
  interactions: [
    {
      with: "Warfarin, apixaban, rivaroxaban, aspirin",
      mechanism: "Additive antiplatelet effect at high doses.",
      watchFor:
        "At 1–2 g/day, clinical risk is minimal. At 3–4 g/day, discuss with anticoagulation clinic.",
    },
    {
      with: "HRT",
      mechanism: "No known interaction. Both support lipid profiles.",
      watchFor: "None specific.",
    },
    { with: "Birth control", mechanism: "No known interaction.", watchFor: "None specific." },
    {
      with: "Blood pressure medication",
      mechanism: "Modest additive BP-lowering (2–5 mmHg).",
      watchFor: "Monitor BP.",
    },
    {
      with: "Statins",
      mechanism: "Complementary lipid effect — statins on LDL, omega-3 on triglycerides.",
      watchFor: "None specific.",
    },
    {
      with: "Scheduled surgery",
      mechanism: "Antiplatelet effect.",
      watchFor: "Discuss stopping 7–10 days before major surgery.",
    },
  ],
  cautions: [
    "Fish or shellfish allergy — choose algae-based DHA.",
    "On multiple antiplatelet drugs — discuss dose.",
    "Choose IFOS-certified products to minimize heavy-metal and oxidation exposure.",
    "Fishy burps? Refrigerate softgels or switch to enteric-coated / triglyceride form.",
  ],
  faq: [
    {
      q: "How much omega-3 should a woman take?",
      a: "1–2 g/day combined EPA+DHA covers most cardiovascular and mood benefits. Pregnancy requires ≥200 mg DHA/day. Elevated triglycerides may need 2–4 g/day (usually prescription EPA).",
    },
    {
      q: "Does omega-3 interact with HRT or birth control?",
      a: "No — no known interaction. Omega-3 is one of the highest-value supplements to combine with hormonal therapy for lipid support.",
    },
    {
      q: "Is fish oil safe with warfarin or apixaban?",
      a: "At 1–2 g/day, clinical bleeding risk is minimal. At 3–4 g/day, discuss with your anticoagulation clinic — INR is worth monitoring closely for 6–8 weeks after starting. Not an absolute contraindication.",
    },
    {
      q: "Do women in perimenopause benefit from omega-3?",
      a: "Yes for mood and cardiovascular support; minimal effect on hot flashes. It's a low-cost, high-safety-margin add to any perimenopause plan.",
    },
    {
      q: "Fish oil or algae oil?",
      a: "Both work. Algae oil is a vegan DHA source with lower EPA. For depression/mood, EPA-dominant fish oil has stronger evidence. For pregnancy DHA support, algae is a clean, sustainable option.",
    },
    { q: "Where can I check omega-3 interactions?", a: CITE_INTERACTION },
  ],
  sources: [
    {
      label: "Bhatt DL et al. NEJM 2019 — REDUCE-IT trial (icosapent ethyl 4 g).",
      url: "https://pubmed.ncbi.nlm.nih.gov/30415628/",
    },
    {
      label: "Nicholls SJ et al. JAMA 2020 — STRENGTH trial (EPA+DHA carboxylic acid).",
      url: "https://pubmed.ncbi.nlm.nih.gov/33190147/",
    },
    {
      label:
        "Skulas-Ray AC et al. Circulation 2019 — AHA statement on omega-3 for hypertriglyceridemia.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31422671/",
    },
    {
      label:
        "Mocking RJT et al. Transl Psychiatry 2016 — Omega-3 in major depression meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/26978738/",
    },
    {
      label: "Middleton P et al. Cochrane 2018 — Omega-3 in pregnancy (70 RCTs).",
      url: "https://pubmed.ncbi.nlm.nih.gov/30480773/",
    },
    {
      label: "Makrides M et al. NEJM 2019 — ORIP trial of omega-3 and preterm birth.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31509674/",
    },
    {
      label: "Yurko-Mauro K et al. Alzheimers Dement 2010 — MIDAS trial of DHA and cognition.",
      url: "https://pubmed.ncbi.nlm.nih.gov/20434961/",
    },
  ],
  related: rel("omega-3-women"),
  lastReviewed: REVIEWED,
};
