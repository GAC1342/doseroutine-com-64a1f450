import type { WomensCompoundContent } from "@/components/womens-compound-article";

const HUB = {
  slug: "menopause-hormones" as const,
  title: "Menopause & Hormone Balance",
};

const REVIEWED = "2026-07-27";

const RELATED_MENO = [
  { slug: "black-cohosh", name: "Black Cohosh" },
  { slug: "soy-isoflavones", name: "Soy Isoflavones" },
  { slug: "vitex", name: "Vitex (Chasteberry)" },
  { slug: "red-clover", name: "Red Clover" },
  { slug: "dhea-women", name: "DHEA (women)" },
];

function related(exclude: string) {
  return RELATED_MENO.filter((r) => r.slug !== exclude).slice(0, 4);
}

export const BLACK_COHOSH: WomensCompoundContent = {
  slug: "black-cohosh",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Black Cohosh",
  h1: "Black Cohosh for Women: Evidence, Dosage & Interactions",
  summary:
    "Black cohosh (Actaea racemosa, formerly Cimicifuga racemosa) is a North American plant extract most commonly used for hot flashes and night sweats in perimenopause and menopause. It does not act as a phytoestrogen — its mechanism is thought to involve serotonin receptors and central thermoregulation. Meta-analyses (Cochrane 2012; Drugs 2021) show a modest but real reduction in vasomotor symptom frequency versus placebo, smaller than HRT. Rare but documented cases of hepatotoxicity keep it off the recommendation list for anyone with liver disease. Evidence level: moderate for hot flashes, insufficient for bone density or vaginal atrophy.",
  keyFacts: {
    doseRange:
      "20–40 mg standardized extract (Remifemin-type, 2.5% triterpene glycosides), taken twice daily",
    forms:
      "Standardized extract capsules, liquid tincture (avoid alcohol-based tinctures if on disulfiram)",
    evidence: "Moderate",
    mainRisks: "Liver enzyme elevations (rare), interaction with tamoxifen and hepatotoxic drugs",
  },
  research: [
    {
      body: "The Cochrane Review (Leach & Moore, 2012) analysed 16 RCTs (n=2027) and concluded that black cohosh produced a small but statistically significant reduction in hot flash frequency versus placebo, though heterogeneity was high and the effect was inconsistent across preparations.",
    },
    {
      body: "A 2021 systematic review in Drugs (Beer et al.) confirmed modest vasomotor benefit and noted that isopropanolic and ethanolic extracts (Remifemin, CR BNO 1055) had more consistent data than aqueous extracts. Effects typically emerge over 4–12 weeks.",
    },
    {
      body: "Liver safety remains the main watch-item. The US Pharmacopeia added a caution statement in 2007 after case reports of hepatitis and elevated transaminases, though controlled trials have not consistently shown liver enzyme changes and causality is contested.",
    },
    {
      body: "Black cohosh does not raise estradiol levels or endometrial thickness in most studies (Menopause 2013), which supports the non-phytoestrogenic mechanism and makes it a reasonable option for women who cannot take HRT for endometrial or breast-cancer-history reasons — subject to oncology sign-off.",
    },
    {
      body: "Evidence for anything beyond hot flashes — mood, sleep, joint pain, bone density — is limited and inconsistent.",
    },
  ],
  interactions: [
    {
      with: "HRT (estradiol, conjugated estrogens)",
      mechanism: "Redundant symptom coverage; theoretical additive CNS effects.",
      watchFor: "Not typically combined. Discuss with your gynecologist if considering both.",
    },
    {
      with: "Tamoxifen and aromatase inhibitors",
      mechanism:
        "Weak concern about phytoestrogenic-like activity, though most data suggests no receptor binding.",
      watchFor: "Discuss with oncology before use in breast-cancer survivors.",
    },
    {
      with: "Hepatotoxic drugs (methotrexate, acetaminophen at high doses, isoniazid, statins in rare cases)",
      mechanism: "Potential additive liver stress based on case reports.",
      watchFor: "Baseline ALT/AST. Stop if RUQ pain, jaundice, or unexplained fatigue.",
    },
    {
      with: "Cisplatin",
      mechanism: "Animal data suggest black cohosh may reduce cisplatin cytotoxicity.",
      watchFor: "Avoid during platinum-based chemotherapy.",
    },
    {
      with: "CYP2D6 substrates (some SSRIs, tamoxifen active metabolites)",
      mechanism: "Weak in vitro inhibition; clinical relevance uncertain.",
      watchFor: "Discuss with prescriber if on tamoxifen or fluoxetine.",
    },
    {
      with: "St. John's wort",
      mechanism: "Both can affect liver enzymes.",
      watchFor: "Avoid combination without clinician oversight.",
    },
  ],
  cautions: [
    "Pregnancy and breastfeeding — insufficient safety data; avoid.",
    "Active liver disease, elevated baseline transaminases, or heavy alcohol use.",
    "Hormone-sensitive cancers (breast, uterine, ovarian) — discuss with oncology first.",
    "Scheduled surgery — stop 2 weeks before due to unclear bleeding-and-anesthesia interactions.",
    "Do not use for more than 6 months without a clinician re-evaluating liver enzymes.",
  ],
  faq: [
    {
      q: "Can I take black cohosh with HRT?",
      a: "Usually not recommended. HRT already covers hot flashes with much stronger efficacy, and adding black cohosh doesn't stack benefit — it just makes it harder to titrate your estradiol dose. If HRT isn't controlling vasomotor symptoms fully, the answer is a HRT-dose conversation with your gynecologist, not adding an herb on top.",
    },
    {
      q: "Can I take black cohosh with birth control?",
      a: "There's no strong pharmacokinetic evidence that black cohosh reduces oral contraceptive efficacy — unlike St. John's wort, it does not meaningfully induce CYP3A4. That said, formal drug-interaction studies are limited. If you're on a combined pill and considering black cohosh for cyclical symptoms, discuss with your prescriber first.",
    },
    {
      q: "How long does black cohosh take to work?",
      a: "Most trials show measurable hot-flash reduction at 4–8 weeks, with maximum effect around 12 weeks. If you've taken a standardized 20–40 mg twice-daily dose consistently for 12 weeks with no benefit, it's not going to start working.",
    },
    {
      q: "Black cohosh vs soy isoflavones — which is better for hot flashes?",
      a: "Both produce modest hot-flash reduction versus placebo. Black cohosh is a better fit if you have an ER+ cancer history and want to avoid any phytoestrogenic activity. Soy isoflavones are a better fit if you tolerate soy and want to avoid the liver-monitoring watch that comes with black cohosh. Neither matches HRT for efficacy.",
    },
    {
      q: "Is black cohosh safe for the liver?",
      a: "Rare case reports of hepatitis have been published, though causality is often contested. Baseline ALT/AST before starting, and repeat at 3 months, is reasonable. Stop immediately for RUQ pain, jaundice, dark urine, or unexplained fatigue. Do not combine with alcohol or other hepatotoxic drugs without a clinician's plan.",
    },
    {
      q: "Can black cohosh cause weight gain?",
      a: "There is no consistent evidence that black cohosh causes weight gain. Perimenopause itself causes weight redistribution — that's not the supplement.",
    },
    {
      q: "Where can I check black cohosh interactions with my other supplements?",
      a: "Add black cohosh to your stack in the DoseRoutine interaction checker at doseroutine.com/interaction-checker to see conflicts with HRT, tamoxifen, SSRIs, statins, and other liver-relevant medications in one view.",
    },
  ],
  sources: [
    {
      label:
        "Leach MJ, Moore V. Cochrane Database Syst Rev 2012 — Black cohosh for menopausal symptoms.",
      url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD007244.pub2/full",
    },
    {
      label:
        "Beer AM et al. Drugs 2021 — Cimicifuga racemosa: A systematic review of pharmacology and clinical efficacy.",
      url: "https://pubmed.ncbi.nlm.nih.gov/33528812/",
    },
    {
      label: "NIH Office of Dietary Supplements — Black Cohosh Fact Sheet.",
      url: "https://ods.od.nih.gov/factsheets/BlackCohosh-HealthProfessional/",
    },
    {
      label: "US Pharmacopeia — Cimicifuga racemosa expert committee report (2007).",
      url: "https://www.uspnf.com/",
    },
    {
      label: "The North American Menopause Society Position Statement 2015.",
      url: "https://menopause.org/publications/professional-publications/position-statements",
    },
  ],
  related: related("black-cohosh"),
  lastReviewed: REVIEWED,
};

export const SOY_ISOFLAVONES: WomensCompoundContent = {
  slug: "soy-isoflavones",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Soy Isoflavones",
  h1: "Soy Isoflavones (Phytoestrogens) for Women: Evidence & Interactions",
  summary:
    "Soy isoflavones — primarily genistein, daidzein, and glycitein — are plant compounds that bind weakly to estrogen receptors, especially ERβ. They are the best-studied phytoestrogens for menopausal hot flashes. Meta-analyses (Menopause 2015; JAMA 2016) show a small-to-moderate reduction in hot flash frequency versus placebo, roughly 20–25%. Effects on bone density are inconsistent. Evidence level: moderate for hot flashes, limited for bone, insufficient for cardiovascular endpoints in menopause. Because of their receptor activity, interactions with tamoxifen and thyroid medication genuinely matter.",
  keyFacts: {
    doseRange:
      "40–80 mg total isoflavones/day (equivalent to ~50–60 g whole soy). Studied genistein doses: 30–60 mg/day.",
    forms:
      "Standardized soy isoflavone extract capsules, red-clover isoflavone extracts, dietary whole-soy foods (tofu, tempeh, edamame, soy milk).",
    evidence: "Moderate",
    mainRisks:
      "Interaction with tamoxifen, reduced absorption of levothyroxine, caution in ER+ breast-cancer history",
  },
  research: [
    {
      body: "A 2015 Menopause meta-analysis (Chen et al.) of 15 RCTs found soy isoflavones reduced hot flash frequency by roughly 20% versus placebo, with the strongest effect at genistein-equivalent doses of ≥54 mg/day for at least 12 weeks.",
    },
    {
      body: "The JAMA Internal Medicine review of plant-based therapies for menopause (Franco et al., 2016) concluded that phytoestrogens were associated with modest reductions in hot flash frequency and vaginal dryness, though effects on night sweats were less consistent.",
    },
    {
      body: "Equol producer status matters: roughly 30–50% of Western women have gut bacteria capable of converting daidzein into equol, a more potent metabolite. Non-producers tend to respond less to isoflavone supplementation (Menopause 2014).",
    },
    {
      body: "Bone-density data is mixed. A 2020 review in Nutrients found small BMD improvements in some trials but no consistent fracture-reduction signal. Do not substitute isoflavones for evidence-based osteoporosis prevention.",
    },
    {
      body: "The breast-cancer question splits by context. Dietary soy across a lifetime is associated with lower breast-cancer risk in Asian populations (Cancer Epidemiology, Biomarkers & Prevention 2011). Concentrated isoflavone extracts in women with active ER+ breast cancer are a different question — most oncologists advise avoidance.",
    },
  ],
  interactions: [
    {
      with: "Tamoxifen",
      mechanism:
        "Isoflavones compete for estrogen receptor binding; in vitro data is conflicting on whether this reduces or complements tamoxifen activity.",
      watchFor:
        "Most oncologists advise against high-dose isoflavone extracts in tamoxifen users. Dietary soy is generally considered safe.",
    },
    {
      with: "Levothyroxine (thyroid medication)",
      mechanism: "Soy reduces levothyroxine absorption if taken within 4 hours.",
      watchFor:
        "Take thyroid medication first-thing on an empty stomach, and separate soy foods or extracts by at least 4 hours.",
    },
    {
      with: "Aromatase inhibitors (anastrozole, letrozole, exemestane)",
      mechanism: "Theoretical ERβ activity; conflicting oncology guidance.",
      watchFor: "Discuss with oncology before using isoflavone extracts on AI therapy.",
    },
    {
      with: "MAOIs",
      mechanism: "Fermented soy foods (tempeh, miso) contain tyramine.",
      watchFor: "Limit fermented soy while on a MAOI.",
    },
    {
      with: "Warfarin",
      mechanism: "Case reports of altered INR with high soy intake.",
      watchFor: "Recheck INR if adding a soy supplement.",
    },
    {
      with: "HRT (estradiol)",
      mechanism:
        "Additive weak estrogenic activity; unlikely to be clinically significant at typical doses.",
      watchFor: "Usually not combined with HRT for hot flashes — pick one.",
    },
  ],
  cautions: [
    "History of estrogen-receptor-positive breast cancer — avoid concentrated extracts unless oncology-cleared; dietary soy usually fine.",
    "On levothyroxine — separate dosing by 4 hours to preserve absorption.",
    "Soy allergy or severe non-allergic soy intolerance.",
    "Uterine fibroids or endometriosis — theoretical concern with sustained high-dose isoflavone extracts; discuss with your gynecologist.",
    "Pregnancy — dietary soy is fine; concentrated supplements are not recommended due to insufficient safety data.",
  ],
  faq: [
    {
      q: "Can I take soy isoflavones with HRT?",
      a: "Usually not recommended for hot-flash management — HRT is far more effective, and stacking a phytoestrogen doesn't add benefit while complicating dose titration. Dietary soy (edamame, tofu, soy milk) is fine to eat alongside HRT.",
    },
    {
      q: "Can I take soy isoflavones with birth control?",
      a: "No clinically meaningful interaction is documented. Soy isoflavones do not reduce ethinyl-estradiol contraceptive efficacy the way St. John's wort does. Timing with the pill is not required.",
    },
    {
      q: "How long do soy isoflavones take to work for hot flashes?",
      a: "Trials that showed benefit typically used 12 or more weeks of consistent dosing at 40–80 mg/day of total isoflavones. Don't expect changes in the first month.",
    },
    {
      q: "Soy isoflavones vs black cohosh — which is better?",
      a: "They're comparable for modest hot-flash reduction. Soy is a better fit if you tolerate soy and don't have an ER+ cancer history. Black cohosh is a better fit if you want to avoid phytoestrogenic activity or already have a soy issue. Neither approaches HRT for efficacy.",
    },
    {
      q: "Are soy isoflavones safe if I've had breast cancer?",
      a: "For ER+ breast cancer survivors — especially those on tamoxifen or an aromatase inhibitor — most oncologists advise avoiding concentrated isoflavone supplements. Dietary soy from whole foods is treated as generally safe. This is a case-by-case oncology decision, not a supplement-blog decision.",
    },
    {
      q: "Do soy isoflavones affect thyroid function?",
      a: "In women with normal iodine intake and normal thyroid function, dietary soy has minimal effect. If you take levothyroxine, soy foods or extracts within 4 hours of your pill reduce absorption — separate them. In borderline hypothyroidism or iodine deficiency, high-dose isoflavone extracts can worsen thyroid function.",
    },
    {
      q: "Where do I check soy isoflavone interactions with my prescriptions?",
      a: "Use the DoseRoutine interaction checker at doseroutine.com/interaction-checker to add soy isoflavones plus tamoxifen, levothyroxine, HRT, or any other medication — you'll see mechanism and timing detail per pair.",
    },
  ],
  sources: [
    {
      label: "Chen MN et al. Menopause 2015 — Soy isoflavones and menopause: meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25188316/",
    },
    {
      label: "Franco OH et al. JAMA Intern Med 2016 — Plant-based therapies for menopause.",
      url: "https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2532189",
    },
    {
      label: "NIH Office of Dietary Supplements — Soy Fact Sheet.",
      url: "https://ods.od.nih.gov/factsheets/Soy-HealthProfessional/",
    },
    {
      label:
        "Setchell KDR, Cassidy A. J Nutr 1999 — Dietary isoflavones: biological effects and relevance to human health.",
      url: "https://pubmed.ncbi.nlm.nih.gov/10082765/",
    },
    {
      label: "Messina M. Nutrients 2016 — Soy and health update.",
      url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5188422/",
    },
  ],
  related: related("soy-isoflavones"),
  lastReviewed: REVIEWED,
};

export const VITEX: WomensCompoundContent = {
  slug: "vitex",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Vitex (Chasteberry)",
  h1: "Vitex (Chasteberry) for Women: Evidence & Interactions",
  summary:
    "Vitex agnus-castus (chasteberry) is a Mediterranean berry extract with dopaminergic activity that reduces prolactin secretion. Its best evidence is for premenstrual syndrome (PMS), cyclic breast pain (mastalgia), and mild luteal-phase defects — not menopause itself, despite common marketing. Multiple RCTs (BMJ 2001; Complementary Therapies in Medicine 2019) show moderate PMS symptom reduction versus placebo. Evidence level: moderate for PMS and cyclic breast pain, insufficient for menopausal hot flashes. Because of its dopamine-and-prolactin activity, it interacts with several psychiatric and fertility medications.",
  keyFacts: {
    doseRange: "20–40 mg/day of standardized extract (e.g. Ze 440, BNO 1095), once daily",
    forms:
      "Standardized extract capsules, liquid tincture, dried berry (less potent, harder to dose)",
    evidence: "Moderate",
    mainRisks:
      "Interaction with dopamine agonists, antipsychotics, hormonal contraception and fertility medications",
  },
  research: [
    {
      body: "Schellenberg (BMJ 2001) randomised 170 women with PMS to Vitex extract Ze 440 20 mg vs placebo for three cycles; 52% of the Vitex group had ≥50% symptom improvement versus 24% on placebo.",
    },
    {
      body: "A 2019 systematic review (van Die et al., Complementary Therapies in Medicine) of 17 RCTs concluded moderate-quality evidence for PMS and premenstrual dysphoric disorder, with more mixed results for cyclic mastalgia.",
    },
    {
      body: "The mechanism is dopaminergic: Vitex agonises D2 receptors in the anterior pituitary, reducing prolactin. This is why it helps latent hyperprolactinemia-driven luteal-phase defects and cyclic breast pain.",
    },
    {
      body: "Menopause evidence is weak. A handful of small trials evaluated Vitex for menopausal symptoms with inconsistent results (Phytomedicine 2013). It is not a first-line choice for hot flashes.",
    },
    {
      body: "Fertility context: some small studies suggest Vitex may improve mild luteal-phase defects and cycle regularity, but it should not be used alongside prescribed ovulation-induction cycles without a reproductive endocrinologist's oversight.",
    },
  ],
  interactions: [
    {
      with: "Dopamine agonists (bromocriptine, cabergoline, pramipexole)",
      mechanism: "Additive D2 receptor activity.",
      watchFor:
        "Avoid combination without prescriber oversight — additive nausea, hypotension, and prolactin suppression.",
    },
    {
      with: "Antipsychotics (D2 antagonists — haloperidol, risperidone, olanzapine)",
      mechanism: "Vitex may antagonize the intended D2 blockade.",
      watchFor: "Discuss with psychiatry before use.",
    },
    {
      with: "Combined oral contraceptives",
      mechanism:
        "Theoretical opposition of hormonal-suppression effects; clinical significance unclear.",
      watchFor:
        "Vitex is generally avoided during hormonal contraception because the intended cycle effect is muted.",
    },
    {
      with: "IVF and ovulation-induction (letrozole, clomid, gonadotropins)",
      mechanism: "Prolactin and luteal-phase effects can confound protocol interpretation.",
      watchFor:
        "Do not use during active fertility treatment cycles without your reproductive endocrinologist's sign-off.",
    },
    {
      with: "HRT (estradiol, progesterone)",
      mechanism: "Vitex can affect progesterone and prolactin levels.",
      watchFor: "Usually not combined with prescribed HRT.",
    },
    {
      with: "SSRIs",
      mechanism: "Both affect neurotransmitter systems (SSRIs indirectly modulate dopamine).",
      watchFor:
        "No consistent harmful interaction, but discuss with prescriber if adding to an SSRI regimen.",
    },
  ],
  cautions: [
    "Pregnancy — avoid; potential effects on prolactin and progesterone.",
    "Breastfeeding — avoid; Vitex can reduce milk supply via prolactin suppression.",
    "Active fertility treatment (IVF, IUI, ovulation induction) — do not add without RE oversight.",
    "Hormone-sensitive cancers — discuss with oncology.",
    "Pituitary disorders (prolactinoma) — discuss with endocrinology before use.",
  ],
  faq: [
    {
      q: "Can I take vitex with HRT?",
      a: "Usually not recommended. Vitex modulates prolactin and can affect endogenous progesterone signalling in ways that complicate HRT dose interpretation. If you're on HRT and struggling with residual cycle-linked symptoms, that's a HRT-adjustment conversation with your gynecologist, not an add-on herb.",
    },
    {
      q: "Can I take vitex with birth control?",
      a: "Generally avoid combining them. Combined oral contraceptives suppress the hypothalamic-pituitary-ovarian axis Vitex is trying to modulate, so the intended cycle effect is muted. There is no strong evidence Vitex reduces contraceptive efficacy, but the pairing rarely makes sense clinically.",
    },
    {
      q: "How long does vitex take to work for PMS?",
      a: "Trials show measurable symptom improvement by cycle 2 or 3 of consistent daily dosing. If nothing has changed after three full cycles at a standardized 20–40 mg/day, it isn't going to.",
    },
    {
      q: "Vitex vs black cohosh — which should I use?",
      a: "Different problems. Vitex is for cyclic symptoms — PMS, PMDD, cyclic breast pain, mild luteal-phase defects — in women who are still menstruating. Black cohosh is for menopausal hot flashes in women who no longer are. Don't cross-substitute.",
    },
    {
      q: "Is vitex safe to take with SSRIs?",
      a: "No consistent harmful interaction is documented. Vitex modulates dopamine indirectly, SSRIs modulate serotonin — mechanisms differ. Discuss with your prescriber before adding, especially if you're on an antipsychotic or mood stabilizer as well.",
    },
    {
      q: "Can vitex help with menopause hot flashes?",
      a: "The evidence is weak and inconsistent. It's not a first-line choice for vasomotor symptoms; black cohosh, soy isoflavones, or HRT have more support. Vitex is better suited for late perimenopause when cycles are still present but irregular.",
    },
    {
      q: "Where can I check vitex interactions with my other medications?",
      a: "Use the DoseRoutine interaction checker at doseroutine.com/interaction-checker to add vitex alongside your contraceptive, HRT, SSRI, or fertility medication — you'll see mechanism and severity per pair.",
    },
  ],
  sources: [
    {
      label:
        "Schellenberg R. BMJ 2001 — Treatment for the premenstrual syndrome with agnus castus fruit extract.",
      url: "https://www.bmj.com/content/322/7279/134",
    },
    {
      label:
        "van Die MD et al. Complement Ther Med 2019 — Vitex agnus-castus for premenstrual syndrome and premenstrual dysphoric disorder.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30935501/",
    },
    {
      label:
        "Wuttke W et al. Phytomedicine 2003 — Chaste tree (Vitex agnus-castus): pharmacology and clinical indications.",
      url: "https://pubmed.ncbi.nlm.nih.gov/12809367/",
    },
    { label: "NIH ODS — Chasteberry.", url: "https://ods.od.nih.gov/factsheets/Chasteberry/" },
    {
      label: "Examine.com — Vitex agnus-castus evidence summary.",
      url: "https://examine.com/supplements/vitex-agnus-castus/",
    },
  ],
  related: related("vitex"),
  lastReviewed: REVIEWED,
};

export const EVENING_PRIMROSE: WomensCompoundContent = {
  slug: "evening-primrose-oil",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Evening Primrose Oil",
  h1: "Evening Primrose Oil for Women: Evidence & Interactions",
  summary:
    "Evening primrose oil (EPO) is a source of gamma-linolenic acid (GLA), an omega-6 fatty acid. It is heavily marketed for menopausal hot flashes, cyclic breast pain, and PMS, but the evidence is uneven. A 2013 Cochrane review found no benefit for atopic eczema. For cyclic mastalgia (breast pain), older trials suggested modest benefit but more recent double-blind data has not confirmed it. For hot flashes, one small RCT showed a modest effect. Evidence level: limited for cyclic mastalgia and PMS, insufficient for hot flashes. Main clinical concern is bleeding risk with anticoagulants at higher doses.",
  keyFacts: {
    doseRange: "1000–3000 mg/day of EPO (providing 80–240 mg GLA), often split into 2–3 doses",
    forms: "Softgel capsules (most common), liquid oil",
    evidence: "Limited",
    mainRisks:
      "Additive bleeding risk with warfarin, aspirin, NSAIDs; theoretical seizure threshold effect",
  },
  research: [
    {
      body: "Farzaneh et al. (Arch Gynecol Obstet 2013) randomized 56 menopausal women to EPO 500 mg twice daily vs placebo; the EPO group showed modest hot-flash severity reduction but no significant frequency difference.",
    },
    {
      body: "The 2013 Cochrane Review (Bamford et al.) of oral evening primrose oil and borage oil for eczema found no benefit — a category where EPO was long marketed.",
    },
    {
      body: "For cyclic mastalgia, older data (Pashby et al., 1981) suggested modest benefit, but the Blommers et al. randomised trial (Am J Obstet Gynecol 2002) at 3000 mg/day for 6 months showed no significant improvement over placebo.",
    },
    {
      body: "PMS evidence is weak. A 2010 systematic review found insufficient high-quality data to recommend EPO for premenstrual syndrome.",
    },
    {
      body: "GLA metabolism produces dihomo-gamma-linolenic acid (DGLA) and prostaglandin E1, which has anti-inflammatory activity — this is the mechanistic rationale even where clinical trials have not confirmed benefit.",
    },
  ],
  interactions: [
    {
      with: "Warfarin, apixaban, rivaroxaban, dabigatran",
      mechanism: "GLA-derived prostaglandins may modestly affect platelet aggregation.",
      watchFor:
        "Increased bruising or bleeding. Recheck INR if warfarin. Higher doses (>2 g/day) carry more risk.",
    },
    {
      with: "Aspirin and NSAIDs",
      mechanism: "Additive antiplatelet effect.",
      watchFor: "GI bleeding or bruising, especially at chronic high doses of both.",
    },
    {
      with: "Phenothiazines and other seizure-threshold-lowering drugs",
      mechanism: "Case reports of seizures at high EPO doses in patients on antipsychotics.",
      watchFor: "Avoid EPO if you have a seizure disorder or take phenothiazines.",
    },
    {
      with: "HRT (estradiol)",
      mechanism: "No pharmacokinetic interaction documented.",
      watchFor: "Compatible in most cases.",
    },
    {
      with: "Anesthesia and surgery",
      mechanism: "Bleeding risk at high doses.",
      watchFor: "Stop 2 weeks before elective surgery.",
    },
    {
      with: "Ceftriaxone and some antibiotics",
      mechanism: "Case reports of altered coagulation.",
      watchFor: "Monitor if concurrent.",
    },
  ],
  cautions: [
    "Seizure disorder or on antipsychotic medication — case reports of seizures at high doses.",
    "Anticoagulant or antiplatelet therapy at doses above 2 g/day.",
    "Scheduled surgery within 2 weeks.",
    "Pregnancy — insufficient safety data for supplemental doses; discuss with obstetrician.",
    "Hormone-sensitive conditions — no strong data either way, but review with your clinician.",
  ],
  faq: [
    {
      q: "Can I take evening primrose oil with HRT?",
      a: "Yes, generally. There is no meaningful pharmacokinetic interaction between EPO and estradiol or progesterone. Whether it adds clinical benefit on top of HRT is a different question — the evidence for EPO as a symptom modifier is weak either way.",
    },
    {
      q: "Can I take evening primrose oil with birth control?",
      a: "Yes. No clinically meaningful interaction between EPO and combined oral contraceptives is documented. Timing with the pill is not required.",
    },
    {
      q: "How long does evening primrose oil take to work?",
      a: "Trials that used EPO for cyclic breast pain or hot flashes ran for 8 to 24 weeks. If you've taken 1000–3000 mg/day for 12 weeks with no perceived benefit, longer dosing is unlikely to help.",
    },
    {
      q: "Evening primrose oil vs omega-3 fish oil?",
      a: "Different fatty acids and different evidence bases. Omega-3 (EPA/DHA) has much stronger evidence for cardiovascular, cognitive, and perimenopausal mood outcomes. EPO's GLA has weaker human-outcome data. If you're picking one, omega-3 is usually the higher-value choice.",
    },
    {
      q: "Does evening primrose oil help hot flashes?",
      a: "The evidence is mixed and weak. One small RCT suggested modest severity reduction; larger trials have not consistently confirmed it. Black cohosh, soy isoflavones, or HRT have stronger data if hot flashes are the target.",
    },
    {
      q: "Is evening primrose oil safe long-term?",
      a: "There is no clear safety signal against long-term use at 1000–2000 mg/day in healthy adults. At higher doses, watch for bleeding and (in susceptible people) seizure-threshold concerns.",
    },
    {
      q: "Where can I check evening primrose oil interactions?",
      a: "Add it to the DoseRoutine interaction checker at doseroutine.com/interaction-checker along with any anticoagulant, antiplatelet, or antipsychotic to see specific pairwise flags.",
    },
  ],
  sources: [
    {
      label:
        "Bamford JTM et al. Cochrane 2013 — Oral evening primrose oil and borage oil for eczema.",
      url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004416.pub2/full",
    },
    {
      label:
        "Farzaneh F et al. Arch Gynecol Obstet 2013 — Effect of oral evening primrose oil on menopausal hot flashes.",
      url: "https://pubmed.ncbi.nlm.nih.gov/23625331/",
    },
    {
      label:
        "Blommers J et al. Am J Obstet Gynecol 2002 — Evening primrose oil and fish oil for severe chronic mastalgia.",
      url: "https://pubmed.ncbi.nlm.nih.gov/12237634/",
    },
    {
      label: "NIH ODS — Evening Primrose Oil overview.",
      url: "https://www.nccih.nih.gov/health/evening-primrose-oil",
    },
    {
      label: "Examine.com — Evening primrose oil evidence summary.",
      url: "https://examine.com/supplements/evening-primrose-oil/",
    },
  ],
  related: related("evening-primrose-oil"),
  lastReviewed: REVIEWED,
};

export const DHEA_WOMEN: WomensCompoundContent = {
  slug: "dhea-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "DHEA",
  h1: "DHEA for Women: Evidence, Uses & Interactions",
  summary:
    "Dehydroepiandrosterone (DHEA) is an adrenal steroid hormone that serves as a precursor to both estrogen and testosterone. It is sold as a supplement in the US but is a prescription-only hormone in the UK, Canada, and most of Europe. Trials in women support use for adrenal insufficiency (physiologic replacement), possibly for post-menopausal vaginal atrophy (as intravaginal prasterone), and for a subset of women undergoing IVF with poor ovarian reserve. Evidence level: moderate for adrenal insufficiency and vaginal prasterone, limited for systemic anti-aging use, insufficient for libido in premenopausal women.",
  keyFacts: {
    doseRange:
      "10–50 mg/day oral for postmenopausal use; 6.5 mg intravaginal (prasterone) for vaginal atrophy. Physician-supervised only.",
    forms: "Oral capsules (US OTC), intravaginal inserts (prasterone, prescription), sublingual",
    evidence: "Moderate",
    mainRisks:
      "Androgenic side effects, interaction with HRT and hormone-sensitive cancers, prescription-only in many countries",
  },
  research: [
    {
      body: "Panjari & Davis (Climacteric 2011) systematically reviewed oral DHEA for menopausal symptoms and concluded there was no consistent benefit for hot flashes, mood, or well-being at doses ≤50 mg/day, though small subgroups reported subjective sexual-function improvements.",
    },
    {
      body: "Intravaginal prasterone (Intrarosa, 6.5 mg) was approved by the FDA in 2016 for postmenopausal dyspareunia. RCTs (Menopause 2016) showed statistically significant improvements in vaginal cell maturation and pain during intercourse versus placebo.",
    },
    {
      body: "For adrenal insufficiency (Addison's disease and hypopituitarism), DHEA replacement at 25–50 mg/day improves subjective well-being and sexual function in women (Journal of Clinical Endocrinology & Metabolism 2000; Endocrine Reviews 2005). This is a physician-supervised replacement therapy, not general supplementation.",
    },
    {
      body: "IVF context: some evidence (Reproductive BioMedicine Online 2015) suggests DHEA 75 mg/day for 12+ weeks before stimulation may improve outcomes in women with diminished ovarian reserve, though results are inconsistent.",
    },
    {
      body: "Androgenic side effects (acne, hair thinning at the crown, facial hair, voice changes) become relevant at doses above 25 mg/day and are the main reason to avoid casual OTC use.",
    },
  ],
  interactions: [
    {
      with: "HRT (estradiol, progesterone)",
      mechanism:
        "DHEA converts peripherally to both estrogen and testosterone; additive hormonal effect.",
      watchFor: "Not typically combined without endocrinology oversight.",
    },
    {
      with: "Aromatase inhibitors (anastrozole, letrozole)",
      mechanism: "DHEA is a substrate for peripheral aromatization to estrone.",
      watchFor: "Avoid in women on AIs for breast cancer.",
    },
    {
      with: "Tamoxifen",
      mechanism: "Peripheral estrogen production from DHEA may partly offset SERM effect.",
      watchFor: "Avoid without oncology sign-off.",
    },
    {
      with: "Testosterone therapy",
      mechanism: "Additive androgenic effect.",
      watchFor: "Avoid or use only with careful lab monitoring.",
    },
    {
      with: "Insulin and diabetes medications",
      mechanism: "DHEA can modestly affect insulin sensitivity in either direction.",
      watchFor: "Monitor glucose if diabetic.",
    },
    {
      with: "Anticonvulsants and CYP inducers (carbamazepine, phenytoin)",
      mechanism: "Altered DHEA metabolism.",
      watchFor: "Discuss with prescriber.",
    },
  ],
  cautions: [
    "History of breast, uterine, ovarian, or hormone-sensitive cancer.",
    "Polycystic ovary syndrome (PCOS) — often already have elevated DHEA-S; supplementation worsens it.",
    "Uncontrolled acne, hirsutism, or male-pattern hair loss.",
    "Pregnancy and breastfeeding — avoid.",
    "Not for premenopausal women without a specific endocrine indication and physician oversight.",
  ],
  faq: [
    {
      q: "Can I take DHEA with HRT?",
      a: "Only under endocrinology supervision. DHEA converts peripherally to both estrogen and testosterone, so adding it to prescribed HRT stacks hormone exposure in ways that are hard to titrate without labs. If your HRT isn't working, the answer is an HRT-adjustment conversation, not adding DHEA.",
    },
    {
      q: "Can I take DHEA with birth control?",
      a: "This is not a routine combination and requires clinician oversight. Combined oral contraceptives suppress endogenous adrenal androgens; adding DHEA can produce unpredictable androgenic effects. Do not self-combine.",
    },
    {
      q: "How long does DHEA take to work?",
      a: "For vaginal prasterone, cellular effects show up in 12 weeks. For oral DHEA in adrenal insufficiency, subjective well-being changes take 8–16 weeks. For IVF ovarian-reserve protocols, DHEA is typically loaded for 12 weeks before stimulation.",
    },
    {
      q: "DHEA vs low-dose testosterone for libido?",
      a: "For postmenopausal HSDD, low-dose transdermal testosterone (physician-prescribed) has stronger, more targeted evidence than DHEA. DHEA produces both estrogenic and androgenic effects peripherally, which is harder to control. Prescription decisions belong with your clinician.",
    },
    {
      q: "Is DHEA safe long-term?",
      a: "The long-term safety of general OTC use is not well characterised. Short-to-medium term use at 10–25 mg/day in postmenopausal women is generally tolerated. Higher doses and longer durations raise androgenic and theoretical cancer-risk concerns.",
    },
    {
      q: "Why is DHEA prescription-only in some countries?",
      a: "The UK, Canada, most of the EU, and Australia classify DHEA as a prescription hormone because of its systemic hormonal effects, contamination concerns with OTC preparations, and misuse potential. In the US it's sold as a dietary supplement.",
    },
    {
      q: "Where can I check DHEA interactions?",
      a: "Add DHEA to the DoseRoutine interaction checker at doseroutine.com/interaction-checker alongside your HRT, birth control, tamoxifen, or aromatase inhibitor to see pairwise flags.",
    },
  ],
  sources: [
    {
      label: "Panjari M, Davis SR. Climacteric 2011 — DHEA for postmenopausal women.",
      url: "https://pubmed.ncbi.nlm.nih.gov/21605003/",
    },
    {
      label:
        "Labrie F et al. Menopause 2016 — Intravaginal prasterone (DHEA) trial for postmenopausal dyspareunia.",
      url: "https://pubmed.ncbi.nlm.nih.gov/26731686/",
    },
    {
      label:
        "Arlt W et al. J Clin Endocrinol Metab 2000 — DHEA replacement in adrenal insufficiency.",
      url: "https://pubmed.ncbi.nlm.nih.gov/11095442/",
    },
    {
      label: "Endocrine Society Clinical Practice Guideline — Androgen therapy in women (2014).",
      url: "https://academic.oup.com/jcem/article/99/10/3489/2836434",
    },
    {
      label: "NIH ODS — DHEA fact sheet.",
      url: "https://ods.od.nih.gov/factsheets/DHEA-HealthProfessional/",
    },
  ],
  related: related("dhea-women"),
  lastReviewed: REVIEWED,
};

export const RED_CLOVER: WomensCompoundContent = {
  slug: "red-clover",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Red Clover",
  h1: "Red Clover for Women: Evidence & Interactions",
  summary:
    "Red clover (Trifolium pratense) is a legume whose isoflavones — biochanin A, formononetin, genistein, and daidzein — bind weakly to estrogen receptors, especially ERβ. It is marketed similarly to soy isoflavones for menopausal hot flashes and bone health. A 2016 systematic review (Cochrane) found no significant reduction in hot flash frequency at typical doses, though a 2021 meta-analysis (Phytotherapy Research) found modest benefit at 80+ mg isoflavones/day for 12+ weeks. Evidence level: limited to moderate for hot flashes, insufficient for bone density in most trials. Main clinical concerns: bleeding risk in combination with anticoagulants, and hormone-sensitive cancer caution.",
  keyFacts: {
    doseRange: "40–80 mg total isoflavones/day, standardized extract",
    forms: "Standardized extract capsules, tea (much less potent, hard to dose)",
    evidence: "Limited",
    mainRisks:
      "Additive bleeding risk with anticoagulants, tamoxifen and hormone-sensitive cancer caution",
  },
  research: [
    {
      body: "Lethaby et al. (Cochrane 2013) reviewed phytoestrogens including red clover for menopausal symptoms and concluded there was no clear evidence of benefit for hot flashes, though heterogeneity was high.",
    },
    {
      body: "A 2021 meta-analysis (Ghazanfarpour et al., Phytotherapy Research) found small but statistically significant hot-flash reduction at ≥80 mg isoflavones/day for at least 12 weeks.",
    },
    {
      body: "Bone-density data is inconsistent. Two-year trials at 40–86 mg/day (Menopause 2004; Nutrition Journal 2007) showed conflicting effects on BMD; the compound is not a substitute for evidence-based osteoporosis therapy.",
    },
    {
      body: "Cardiovascular markers: some short-term trials suggested improvements in arterial compliance and lipid profile at higher doses, but the effect is small and not consistently replicated.",
    },
    {
      body: "Red clover contains coumarin derivatives (small amounts of coumestrol), which is the mechanistic basis for the theoretical anticoagulant interaction — clinically documented case reports are rare but exist.",
    },
  ],
  interactions: [
    {
      with: "Warfarin, apixaban, rivaroxaban, other anticoagulants",
      mechanism: "Coumarin-derivative content and possible antiplatelet effect.",
      watchFor:
        "Recheck INR after starting or stopping. Avoid at high doses if on anticoagulation.",
    },
    {
      with: "Aspirin and NSAIDs",
      mechanism: "Additive antiplatelet effect.",
      watchFor: "Bruising, GI bleeding at chronic combined use.",
    },
    {
      with: "Tamoxifen and aromatase inhibitors",
      mechanism:
        "Isoflavone activity may partly oppose SERM/AI action; conflicting oncology guidance.",
      watchFor: "Avoid concentrated red clover extracts on anti-estrogen therapy.",
    },
    {
      with: "HRT (estradiol)",
      mechanism: "Additive weak estrogenic activity.",
      watchFor: "Usually not combined for symptom control.",
    },
    {
      with: "Combined oral contraceptives",
      mechanism: "No clinically meaningful pharmacokinetic interaction documented.",
      watchFor: "Generally compatible; discuss if concerned.",
    },
    {
      with: "CYP3A4 substrates",
      mechanism: "Weak in vitro CYP3A4 inhibition.",
      watchFor:
        "Clinical relevance unclear; discuss with pharmacist if on narrow-therapeutic-index drugs.",
    },
  ],
  cautions: [
    "History of estrogen-receptor-positive breast, uterine, or ovarian cancer — avoid concentrated extracts.",
    "On warfarin or another anticoagulant — bleeding risk.",
    "Pregnancy and breastfeeding — avoid.",
    "Scheduled surgery within 2 weeks.",
    "Endometriosis or uterine fibroids — theoretical worsening; discuss with your gynecologist.",
  ],
  faq: [
    {
      q: "Can I take red clover with HRT?",
      a: "Usually not recommended for hot-flash management. HRT is more effective, and stacking a phytoestrogen complicates dose titration and increases uncertainty about endometrial exposure. If HRT isn't working, adjust HRT — don't add red clover.",
    },
    {
      q: "Can I take red clover with birth control?",
      a: "No clinically important pharmacokinetic interaction is documented. Red clover isoflavones do not reduce contraceptive efficacy the way St. John's wort does. Timing with the pill isn't required.",
    },
    {
      q: "Red clover vs soy isoflavones — is one better?",
      a: "They contain overlapping isoflavones. Soy isoflavones have more supporting RCT data. Red clover contains higher biochanin A and formononetin ratios, which some argue produce a different metabolite mix — the clinical difference in trials is small. Pick one, not both.",
    },
    {
      q: "How long does red clover take to work for hot flashes?",
      a: "Trials that showed modest benefit ran 12–16 weeks at 80+ mg isoflavones/day. Don't expect changes in the first month.",
    },
    {
      q: "Is red clover safe if I've had breast cancer?",
      a: "For ER+ breast-cancer survivors, especially on tamoxifen or an aromatase inhibitor, concentrated red clover extracts are generally discouraged. This is a case-by-case oncology decision.",
    },
    {
      q: "Does red clover thin blood?",
      a: "It contains coumarin-derivative compounds and has been associated with additive bleeding when combined with warfarin or high-dose aspirin. Stop it two weeks before elective surgery. Discuss with your prescriber if on anticoagulation.",
    },
    {
      q: "Where can I check red clover interactions?",
      a: "Add red clover to the DoseRoutine interaction checker at doseroutine.com/interaction-checker alongside your anticoagulant, tamoxifen, HRT, or other medication for pairwise flags.",
    },
  ],
  sources: [
    {
      label: "Lethaby A et al. Cochrane 2013 — Phytoestrogens for menopausal vasomotor symptoms.",
      url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001395.pub4/full",
    },
    {
      label:
        "Ghazanfarpour M et al. Phytother Res 2021 — Red clover for menopausal hot flashes: meta-analysis.",
      url: "https://pubmed.ncbi.nlm.nih.gov/32945048/",
    },
    {
      label: "Atkinson C et al. Am J Clin Nutr 2004 — Red clover isoflavones and bone.",
      url: "https://pubmed.ncbi.nlm.nih.gov/14985229/",
    },
    { label: "NIH NCCIH — Red Clover.", url: "https://www.nccih.nih.gov/health/red-clover" },
    {
      label: "Examine.com — Red clover evidence summary.",
      url: "https://examine.com/supplements/red-clover/",
    },
  ],
  related: related("red-clover"),
  lastReviewed: REVIEWED,
};

export const MACA_MENOPAUSE: WomensCompoundContent = {
  slug: "maca-menopause",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Maca (Menopause)",
  ctaCompoundLabel: "maca",
  h1: "Maca for Menopause: Evidence & Interactions",
  summary:
    "Maca (Lepidium meyenii) is a Peruvian cruciferous root used for centuries as a food and traditional medicine. Unlike black cohosh, soy, or red clover, maca is non-hormonal — it does not raise estradiol or affect FSH/LH. Small RCTs (Menopause 2008; International Journal of Biomedical Science 2006) in perimenopausal and postmenopausal women suggest modest improvements in mood, sleep quality, and hot flash frequency at 2–3 g/day of gelatinized maca root powder. Evidence level: limited but reasonably consistent for menopausal well-being; separate page covers maca for libido. Main clinical concerns are thyroid interaction (mild goitrogens) and lack of long-term safety data.",
  keyFacts: {
    doseRange: "1.5–3 g/day of gelatinized maca root powder or standardized extract",
    forms: "Gelatinized (heat-treated) powder, raw powder, standardized capsules, tinctures",
    evidence: "Limited",
    mainRisks:
      "Thyroid function (goitrogens, especially raw form), theoretical interaction with hormone-sensitive conditions",
  },
  research: [
    {
      body: "Brooks et al. (Menopause 2008) randomized 14 postmenopausal women to gelatinized maca 3.5 g/day vs placebo in a crossover design; the maca arm showed reduced psychological menopausal symptoms and lower diastolic BP without measurable estradiol or FSH changes.",
    },
    {
      body: "Meissner et al. (Int J Biomed Sci 2006) evaluated Maca-GO 2 g/day in perimenopausal women and reported improvements in the Kupperman Menopausal Index and Greene Climacteric Scale over 8 weeks.",
    },
    {
      body: "The mechanism appears non-hormonal — trials consistently fail to show changes in estradiol, progesterone, FSH, or LH. Proposed action involves neuroendocrine modulation and adaptogenic effects, but the pathway is not fully characterised.",
    },
    {
      body: "A 2011 systematic review (Shin et al., BMC Complementary and Alternative Medicine) of maca for menopausal symptoms found four RCTs with limited but consistent positive effects, tempered by small sample sizes.",
    },
    {
      body: "Long-term safety data (beyond 12 weeks) is limited. Traditional Andean use of maca as a food supports general tolerability, but supplementation trials rarely extend beyond three months.",
    },
  ],
  interactions: [
    {
      with: "Levothyroxine and thyroid medication",
      mechanism:
        "Raw maca contains goitrogens (glucosinolates) that can interfere with iodine uptake; gelatinized/heat-treated maca has less.",
      watchFor: "Prefer gelatinized maca. Monitor TSH if on thyroid medication.",
    },
    {
      with: "HRT (estradiol, progesterone)",
      mechanism: "Maca is non-hormonal; no significant pharmacokinetic interaction documented.",
      watchFor: "Generally compatible; discuss with prescriber.",
    },
    {
      with: "Combined oral contraceptives",
      mechanism: "No clinically meaningful pharmacokinetic interaction.",
      watchFor: "Generally compatible.",
    },
    {
      with: "SSRIs",
      mechanism:
        "Small studies suggest maca may help SSRI-induced sexual dysfunction; no harmful interaction documented.",
      watchFor: "See separate maca for libido page for detail.",
    },
    {
      with: "Tamoxifen and aromatase inhibitors",
      mechanism: "Non-hormonal, but data in cancer survivors is limited.",
      watchFor: "Discuss with oncology before use.",
    },
    {
      with: "Antihypertensive medication",
      mechanism: "One trial showed modest diastolic BP reduction.",
      watchFor: "Monitor BP; adjust prescription if needed.",
    },
  ],
  cautions: [
    "Pregnancy and breastfeeding — insufficient safety data for supplemental doses; avoid.",
    "Thyroid disease — prefer gelatinized form; monitor TSH.",
    "Hormone-sensitive cancer history — non-hormonal in mechanism but limited cancer-survivor data; oncology sign-off.",
    "Very high doses (>10 g/day) — no clear safety data.",
    "Pre-existing hypertension medication — monitor BP during first weeks.",
  ],
  faq: [
    {
      q: "Can I take maca with HRT?",
      a: "Generally yes. Maca is non-hormonal — trials consistently show no change in estradiol, FSH, or LH — so it doesn't complicate HRT titration the way phytoestrogens can. Discuss with your gynecologist before adding anything on top of HRT.",
    },
    {
      q: "Can I take maca with birth control?",
      a: "Yes. No clinically meaningful pharmacokinetic interaction between maca and combined oral contraceptives is documented. Timing isn't required.",
    },
    {
      q: "How long does maca take to work for menopause symptoms?",
      a: "Trials that showed subjective benefit typically ran 6–12 weeks at 1.5–3 g/day of gelatinized maca. If nothing has changed at 12 weeks, longer dosing is unlikely to help.",
    },
    {
      q: "Maca vs black cohosh for hot flashes?",
      a: "Black cohosh has more RCT support specifically for vasomotor symptom frequency. Maca has weaker but broader evidence for overall menopausal well-being (mood, sleep, energy) and is a reasonable choice if you want to avoid the liver-monitoring watch of black cohosh.",
    },
    {
      q: "Does maca affect thyroid function?",
      a: "Raw maca contains glucosinolate goitrogens that can affect iodine uptake in susceptible individuals. Gelatinized (heat-treated) maca substantially reduces this. If you're on levothyroxine or have known thyroid disease, prefer gelatinized maca and monitor TSH.",
    },
    {
      q: "Should I take gelatinized or raw maca?",
      a: "Gelatinized. It's easier to digest and has lower goitrogen content. Raw maca is more affordable but harder on the gut and less appropriate if you have thyroid concerns.",
    },
    {
      q: "Where can I check maca interactions?",
      a: "Add maca to the DoseRoutine interaction checker at doseroutine.com/interaction-checker alongside your thyroid medication, HRT, or SSRI for pairwise safety flags.",
    },
  ],
  sources: [
    {
      label:
        "Brooks NA et al. Menopause 2008 — Beneficial effects of Lepidium meyenii (maca) on psychological symptoms in postmenopausal women.",
      url: "https://pubmed.ncbi.nlm.nih.gov/18784609/",
    },
    {
      label:
        "Meissner HO et al. Int J Biomed Sci 2006 — Hormone-balancing effect of pre-gelatinized organic maca (Lepidium peruvianum).",
      url: "https://pubmed.ncbi.nlm.nih.gov/23675005/",
    },
    {
      label:
        "Shin BC et al. BMC Complement Altern Med 2011 — Maca (L. meyenii) for improving sexual function: systematic review.",
      url: "https://pubmed.ncbi.nlm.nih.gov/20691074/",
    },
    { label: "NIH NCCIH — Maca.", url: "https://www.nccih.nih.gov/health/maca" },
    { label: "Examine.com — Maca evidence summary.", url: "https://examine.com/supplements/maca/" },
  ],
  related: [
    { slug: "maca-libido", name: "Maca (libido context)" },
    { slug: "black-cohosh", name: "Black Cohosh" },
    { slug: "soy-isoflavones", name: "Soy Isoflavones" },
    { slug: "ashwagandha-women", name: "Ashwagandha (women)" },
  ],
  lastReviewed: REVIEWED,
};

export const ESTRADIOL_HRT: WomensCompoundContent = {
  slug: "estradiol-hrt",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Estradiol / HRT",
  ctaCompoundLabel: "estradiol HRT",
  h1: "Estradiol & HRT for Women: Interactions Overview (Not Dosing Advice)",
  summary:
    "This page is an interaction and education reference for prescribed estradiol and hormone replacement therapy — not a dosing guide. HRT is the most effective treatment for moderate-to-severe vasomotor symptoms, genitourinary syndrome of menopause, and prevention of postmenopausal osteoporosis. It also has the most drug-and-supplement interaction surface of any menopause-related medication. Prescribing, dose titration, and route (oral, transdermal, vaginal) are decisions between you and your gynecologist or menopause specialist. What this page does cover: which supplements, herbs, and medications meaningfully interact with estradiol, and how to check your full routine before adding anything on top of HRT.",
  keyFacts: {
    doseRange: "Set by your prescriber — this page gives no dosing advice.",
    forms:
      "Oral tablets, transdermal patches, gels, sprays, vaginal creams, vaginal rings, vaginal tablets",
    evidence: "Strong",
    mainRisks:
      "Multiple: CYP3A4 inducers (St. John's wort, rifampin) reduce efficacy; some antibiotics, anticoagulants, and thyroid meds have timing or metabolic interactions",
  },
  research: [
    {
      body: "The 2022 North American Menopause Society (NAMS) Position Statement on Hormone Therapy confirms HRT as the most effective therapy for vasomotor symptoms and prevention of bone loss, with a favourable benefit-risk profile in healthy women within 10 years of menopause onset and under age 60.",
    },
    {
      body: "St. John's wort induces CYP3A4 and reduces estradiol blood levels enough to cause breakthrough bleeding and reduced symptom control (Contraception 2005). Similar induction affects levonorgestrel emergency contraception.",
    },
    {
      body: "Grapefruit juice inhibits intestinal CYP3A4 and can raise oral estradiol exposure — clinically less significant than the herbal inducers, but worth knowing at high, chronic intake.",
    },
    {
      body: "Smoking reduces estradiol levels via hepatic induction and independently increases VTE risk on oral HRT — transdermal HRT largely avoids the first-pass and thrombotic issue (BMJ 2019).",
    },
    {
      body: "Bioidentical vs synthetic terminology: 17β-estradiol delivered by any FDA/EMA-approved route is bioidentical. Compounded 'bioidentical HRT' from custom pharmacies is not FDA-monitored and is not endorsed by NAMS or ACOG.",
    },
  ],
  interactions: [
    {
      with: "St. John's wort",
      mechanism: "Induces CYP3A4, reducing estradiol levels 30–60%.",
      watchFor: "Breakthrough bleeding, return of hot flashes. Avoid combination.",
    },
    {
      with: "Rifampin, rifabutin, phenytoin, carbamazepine, phenobarbital",
      mechanism: "Potent CYP3A4/CYP2C9 inducers that reduce estradiol levels.",
      watchFor: "Symptom breakthrough. Your prescriber may adjust the HRT route or dose.",
    },
    {
      with: "Ritonavir, efavirenz, and some antiretrovirals",
      mechanism: "CYP induction; unpredictable estradiol level changes.",
      watchFor: "Managed by prescriber; do not self-adjust.",
    },
    {
      with: "Levothyroxine (thyroid medication)",
      mechanism:
        "Oral estradiol increases thyroid-binding globulin, raising total T4 requirement in some women.",
      watchFor: "Recheck TSH 6–12 weeks after starting HRT.",
    },
    {
      with: "Warfarin",
      mechanism: "Estradiol can affect coagulation-factor synthesis.",
      watchFor: "Recheck INR after HRT initiation or dose change.",
    },
    {
      with: "Black cohosh, soy isoflavones, red clover, DHEA",
      mechanism: "Redundant symptom coverage; complicates HRT dose titration.",
      watchFor: "Usually pick one — HRT or the herb — not both.",
    },
    {
      with: "Vitex (chasteberry)",
      mechanism: "Modulates prolactin and progesterone signalling.",
      watchFor: "Usually not combined with HRT.",
    },
    {
      with: "Cyclosporine, tacrolimus, corticosteroids",
      mechanism: "Altered metabolism of these narrow-therapeutic-index drugs.",
      watchFor: "Managed by prescriber; monitor levels.",
    },
    {
      with: "Grapefruit juice (high, chronic intake)",
      mechanism: "Intestinal CYP3A4 inhibition; raises oral estradiol exposure.",
      watchFor:
        "Occasional grapefruit is fine; daily large intake is worth mentioning to your prescriber.",
    },
  ],
  cautions: [
    "History of estrogen-sensitive breast cancer, endometrial cancer, or ovarian cancer (case-by-case).",
    "Personal history of DVT, PE, stroke, or MI (transdermal HRT may be considered in select cases).",
    "Undiagnosed abnormal vaginal bleeding — investigate first.",
    "Active liver disease.",
    "Known thrombophilia (Factor V Leiden, protein C/S deficiency) — specialist decision.",
    "Pregnancy — HRT is contraceptive-inadequate and not for use during pregnancy.",
  ],
  faq: [
    {
      q: "Can I take supplements with HRT?",
      a: "Many are fine. Vitamin D, magnesium glycinate, omega-3, creatine, and collagen have no meaningful interaction with estradiol. Others — black cohosh, soy isoflavones, red clover, DHEA, vitex, St. John's wort — either duplicate HRT's mechanism, oppose it, or reduce blood levels. Before you add anything on top of HRT, check your prescriber and use the DoseRoutine interaction checker.",
    },
    {
      q: "Can I take St. John's wort with HRT?",
      a: "No. St. John's wort induces CYP3A4 and reduces estradiol blood levels 30–60%, causing breakthrough bleeding and return of symptoms. This is one of the clearest herbal-drug interactions in the literature.",
    },
    {
      q: "How long does HRT take to work?",
      a: "Vasomotor symptoms often improve within 2–4 weeks. Sleep and mood improvements track similarly. Vaginal symptoms may take 4–12 weeks. Bone-density benefit is measured on the year-plus timescale. Dose optimization is not a one-visit conversation.",
    },
    {
      q: "HRT vs black cohosh — which is stronger?",
      a: "HRT is substantially more effective for hot flashes — typically 75%+ frequency reduction vs about 20–30% for black cohosh. HRT also treats genitourinary symptoms and prevents bone loss; black cohosh does neither. Black cohosh is a reasonable option when HRT is contraindicated.",
    },
    {
      q: "Does HRT interact with birth control?",
      a: "HRT and combined hormonal contraception are usually not co-prescribed. In perimenopause, women who still need contraception typically stay on a low-dose combined pill or a progestin IUD rather than starting HRT. This is a menopause-specialist decision.",
    },
    {
      q: "Does HRT increase breast cancer risk?",
      a: "The evidence is nuanced. Combined estrogen-plus-progestin HRT is associated with a small increased breast-cancer risk after several years of use, more pronounced with synthetic progestins than with micronized progesterone (Lancet 2019). Estrogen-only HRT (for women without a uterus) has a smaller and less clear effect. This is an individualized risk-benefit conversation.",
    },
    {
      q: "Where can I check HRT interactions with my other medications?",
      a: "Add your specific HRT (estradiol patch, oral, gel, plus progesterone if any) to the DoseRoutine interaction checker at doseroutine.com/interaction-checker along with everything else you take — you'll see interaction flags with mechanism and severity per pair.",
    },
  ],
  sources: [
    {
      label: "The 2022 NAMS Hormone Therapy Position Statement.",
      url: "https://menopause.org/publications/professional-publications/position-statements",
    },
    {
      label:
        "Beral V et al. Lancet 2019 — Type and timing of menopausal hormone therapy and breast cancer risk.",
      url: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(19)31709-X/fulltext",
    },
    {
      label:
        "Hall SD et al. Contraception 2005 — St. John's wort and oral contraceptive/estradiol pharmacokinetics.",
      url: "https://pubmed.ncbi.nlm.nih.gov/16257403/",
    },
    {
      label: "Vinogradova Y et al. BMJ 2019 — HRT and VTE risk by route and formulation.",
      url: "https://www.bmj.com/content/364/bmj.k4810",
    },
    {
      label: "ACOG Committee Opinion — Menopause hormone therapy.",
      url: "https://www.acog.org/clinical/clinical-guidance",
    },
  ],
  related: [
    { slug: "progesterone-women", name: "Progesterone (interactions)" },
    { slug: "black-cohosh", name: "Black Cohosh" },
    { slug: "soy-isoflavones", name: "Soy Isoflavones" },
    { slug: "dhea-women", name: "DHEA (women)" },
  ],
  lastReviewed: REVIEWED,
};

export const PROGESTERONE_WOMEN: WomensCompoundContent = {
  slug: "progesterone-women",
  hubSlug: HUB.slug,
  hubTitle: HUB.title,
  compoundName: "Progesterone",
  ctaCompoundLabel: "progesterone",
  h1: "Progesterone for Women: Interactions Overview (Not Dosing Advice)",
  summary:
    "This page is an interaction and education reference for prescribed progesterone — micronized progesterone (Prometrium, Utrogestan) most commonly, and less often synthetic progestins (medroxyprogesterone, norethindrone, drospirenone) used in combined HRT and contraception. Prescribing and dose are set by your clinician. What this page covers: how progesterone interacts with common supplements (magnesium, ashwagandha, kava), sedatives, SSRIs, CYP inducers, and other HRT components. Micronized progesterone is metabolized to allopregnanolone, a GABA-A modulator — which is why sedation and drug-interaction considerations differ meaningfully from synthetic progestins.",
  keyFacts: {
    doseRange: "Set by your prescriber — this page gives no dosing advice.",
    forms:
      "Oral micronized progesterone (capsule), vaginal micronized progesterone, IM/depot progesterone, synthetic progestin tablets, progestin IUD (levonorgestrel), progestin implant, injectable DMPA",
    evidence: "Strong",
    mainRisks:
      "Sedation with concurrent GABA-active drugs and supplements; CYP3A4 inducers reduce blood levels",
  },
  research: [
    {
      body: "Micronized progesterone is metabolized to allopregnanolone, a positive allosteric modulator of GABA-A receptors — the same mechanism as benzodiazepines and alcohol at high concentrations. This explains its sedative effect and why bedtime dosing is standard (Frontiers in Neuroendocrinology 2016).",
    },
    {
      body: "The 2019 Lancet meta-analysis on HRT and breast cancer found that micronized progesterone is associated with a smaller breast-cancer signal than synthetic progestins (medroxyprogesterone, norethindrone), though data quality varies.",
    },
    {
      body: "CYP3A4 metabolism means that potent inducers — St. John's wort, rifampin, phenytoin, carbamazepine — meaningfully lower progesterone blood levels and can compromise endometrial protection in combined HRT.",
    },
    {
      body: "Vaginal progesterone bypasses first-pass metabolism, achieves higher local endometrial concentrations for lower systemic exposure, and largely avoids the oral-progesterone sedation profile — commonly used in fertility protocols.",
    },
    {
      body: "Progestin-only contraception (mini-pill, IUD, implant, DMPA) is a separate pharmacology from micronized progesterone and has its own interaction and safety profile — always specify which one to your prescriber.",
    },
  ],
  interactions: [
    {
      with: "Alcohol, benzodiazepines, opioids, gabapentin, pregabalin",
      mechanism: "Additive GABA-A sedation from allopregnanolone metabolite.",
      watchFor:
        "Excessive sedation, falls in older women. Take oral progesterone at bedtime and be careful about combined use.",
    },
    {
      with: "Kava, valerian, ashwagandha (at high doses)",
      mechanism: "Additive sedative effect.",
      watchFor: "Grogginess, cognitive slowing. Space dosing or reduce.",
    },
    {
      with: "St. John's wort",
      mechanism:
        "CYP3A4 induction lowers progesterone levels; risks contraceptive failure and inadequate endometrial protection.",
      watchFor: "Do not combine.",
    },
    {
      with: "Rifampin, phenytoin, carbamazepine, phenobarbital, some HIV medications",
      mechanism: "CYP3A4/CYP2C9 induction reduces progesterone levels.",
      watchFor: "Prescriber may adjust dose, route, or contraceptive plan.",
    },
    {
      with: "Grapefruit juice (chronic high intake)",
      mechanism: "Intestinal CYP3A4 inhibition; raises oral progesterone exposure.",
      watchFor: "More sedation than expected.",
    },
    {
      with: "Levothyroxine",
      mechanism: "Progestins can modestly affect thyroid-binding globulin.",
      watchFor: "Recheck TSH 6–12 weeks after starting or changing progesterone.",
    },
    {
      with: "Vitex (chasteberry)",
      mechanism: "Both affect progesterone signalling; complicates dose interpretation.",
      watchFor: "Usually not combined with prescribed progesterone.",
    },
    {
      with: "SSRIs and SNRIs",
      mechanism:
        "Both affect mood pathways; case reports of additive sedation with oral progesterone.",
      watchFor: "Monitor for over-sedation, especially in the first weeks.",
    },
  ],
  cautions: [
    "History of active liver disease.",
    "History of severe depression during previous progestin use.",
    "Undiagnosed abnormal vaginal bleeding.",
    "Pregnancy — micronized progesterone is used in some fertility protocols only under specialist supervision; synthetic progestins are typically avoided.",
    "Progestin allergy or severe intolerance history.",
  ],
  faq: [
    {
      q: "Can I take supplements with progesterone?",
      a: "Most are fine — vitamin D, omega-3, magnesium glycinate, collagen. What to be careful with: GABA-active supplements (high-dose ashwagandha, kava, valerian) can add to oral progesterone's sedative effect; St. John's wort meaningfully reduces progesterone levels via CYP3A4 induction; vitex overlaps mechanism. Add progesterone to the DoseRoutine interaction checker to see the full pair list.",
    },
    {
      q: "Can I take progesterone with an SSRI?",
      a: "Usually yes — SSRIs and prescribed progesterone are commonly co-managed. Watch for additive sedation with oral micronized progesterone at bedtime, especially in the first weeks. Vaginal progesterone largely avoids this. This is a prescriber conversation, not a supplement question.",
    },
    {
      q: "How long does progesterone take to work?",
      a: "For sleep-onset and mood effects, women often notice a change within days of starting oral micronized progesterone at bedtime. For endometrial protection in HRT, effects are measured over months. For fertility-cycle luteal support, protocols are defined day-by-day by your reproductive endocrinologist.",
    },
    {
      q: "Micronized progesterone vs synthetic progestin?",
      a: "Micronized progesterone (Prometrium, Utrogestan) is bioidentical to endogenous progesterone. Synthetic progestins (medroxyprogesterone, norethindrone, drospirenone) are structurally different molecules with different receptor affinities and different long-term risk profiles — the 2019 Lancet HRT analysis found smaller breast-cancer signals for micronized progesterone. Which one you take is a prescriber decision.",
    },
    {
      q: "Does progesterone interact with birth control?",
      a: "Progestin-only contraception (mini-pill, IUD, DMPA) and prescribed micronized progesterone are different products with different indications and pharmacology — always specify to your prescriber which one you're on. HRT-prescribed progesterone is usually not combined with hormonal contraception.",
    },
    {
      q: "Why does oral progesterone make me sleepy?",
      a: "Oral micronized progesterone is metabolized to allopregnanolone, which activates GABA-A receptors — the same pathway as benzodiazepines and alcohol. That's why standard practice is bedtime dosing. Vaginal progesterone largely bypasses this because it avoids first-pass hepatic metabolism.",
    },
    {
      q: "Where can I check progesterone interactions?",
      a: "Add your exact progesterone product (micronized oral, vaginal, or specific synthetic progestin) to the DoseRoutine interaction checker at doseroutine.com/interaction-checker along with all your other medications and supplements for pairwise flags.",
    },
  ],
  sources: [
    {
      label: "The 2022 NAMS Hormone Therapy Position Statement.",
      url: "https://menopause.org/publications/professional-publications/position-statements",
    },
    {
      label:
        "Schumacher M et al. Front Neuroendocrinol 2016 — Progesterone, allopregnanolone, and the nervous system.",
      url: "https://pubmed.ncbi.nlm.nih.gov/26875699/",
    },
    {
      label: "Beral V et al. Lancet 2019 — Type of progestogen in HRT and breast cancer risk.",
      url: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(19)31709-X/fulltext",
    },
    {
      label:
        "Cicinelli E et al. Fertil Steril 2000 — Direct transport of vaginal progesterone to the uterus.",
      url: "https://pubmed.ncbi.nlm.nih.gov/10685535/",
    },
    {
      label: "ACOG Practice Bulletin — Management of menopausal symptoms.",
      url: "https://www.acog.org/clinical/clinical-guidance",
    },
  ],
  related: [
    { slug: "estradiol-hrt", name: "Estradiol / HRT (interactions)" },
    { slug: "vitex", name: "Vitex (Chasteberry)" },
    { slug: "black-cohosh", name: "Black Cohosh" },
    { slug: "dhea-women", name: "DHEA (women)" },
  ],
  lastReviewed: REVIEWED,
};
