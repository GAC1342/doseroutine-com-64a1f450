import { createFileRoute } from "@tanstack/react-router";
import { WomensHubPage, womensHubHead, type WomensHubContent } from "@/components/womens-hub-page";

const CONTENT: WomensHubContent = {
  slug: "womens-health",
  title: "Women's Health Supplements & Interactions",
  h1: "Women's Health Supplements",
  intro:
    "Women's supplement questions are almost never about the compound alone — they're about how it fits with HRT, birth control, thyroid medication, an SSRI, or a fertility protocol. This hub covers the four areas women ask about most: menopause and hormone balance, longevity, sexual health and libido, and fertility and cycle support. Every compound page uses the same template — evidence-based summary, studied dose range, honest evidence rating, deep interaction breakdown with the medications that actually matter, and plain-English FAQs. Nothing here treats, cures, or prevents disease. Nothing here replaces your clinician. Use it to prepare better questions, spot risky combinations before they happen, and check your full routine in the DoseRoutine interaction checker.",
  cards: [
    {
      href: "/library/womens-health/menopause-hormones",
      name: "Menopause & Hormone Balance",
      blurb: "Black cohosh, phytoestrogens, vitex, DHEA, HRT and progesterone context.",
    },
    {
      href: "/library/womens-health/longevity",
      name: "Longevity for Women",
      blurb: "NMN, NR, collagen, spermidine, resveratrol, creatine, omega-3, magnesium glycinate.",
    },
    {
      href: "/library/womens-health/sexual-health",
      name: "Sexual Health & Libido",
      blurb: "Low-dose testosterone context, maca, L-arginine, ashwagandha, vaginal probiotics.",
    },
    {
      href: "/library/womens-health/fertility-cycle",
      name: "Fertility & Cycle Support",
      blurb: "Myo-inositol, D-chiro-inositol, CoQ10, vitamin D, folate vs folic acid, iron, B6.",
    },
  ],
  crossLinks: [
    {
      href: "/interaction-checker",
      label: "Interaction Checker",
      blurb: "Check any pair of supplements, hormones or daily items in seconds.",
    },
    {
      href: "/menopause-supplement-interaction-checker",
      label: "Menopause Interaction Checker",
      blurb: "Focused checker for HRT + supplement combinations.",
    },
    {
      href: "/library/mens-health",
      label: "Men's Health Hub",
      blurb: "Same evidence-based template, for prostate, T, libido and longevity.",
    },
    {
      href: "/library",
      label: "Full Compound Library",
      blurb: "475+ compounds — peptides, hormones, vitamins, supplements, medications.",
    },
  ],
  relatedCompounds: [
    {
      slug: "ashwagandha",
      name: "Ashwagandha",
      blurb: "Cortisol-lowering adaptogen; stress, sleep, and stress-mediated low libido.",
    },
    {
      slug: "magnesium-glycinate",
      name: "Magnesium Glycinate",
      blurb: "Sleep, blood pressure, PMS cramps, and insulin sensitivity.",
    },
    {
      slug: "vitamin-d3-k2",
      name: "Vitamin D3 + K2",
      blurb: "Bone density, cardiovascular, and fertility outcomes when deficient.",
    },
    {
      slug: "coq10",
      name: "CoQ10",
      blurb: "Mitochondrial cofactor; egg quality after 35 and statin-related fatigue.",
    },
    {
      slug: "collagen",
      name: "Collagen Peptides",
      blurb: "Skin elasticity, nail growth, and joint comfort at 10–15 g/day.",
    },
    {
      slug: "creatine",
      name: "Creatine Monohydrate",
      blurb: "Muscle, bone density and cognition — under-studied in women but strong signal.",
    },
    {
      slug: "nmn",
      name: "NMN",
      blurb: "NAD+ precursor — small human trials on energy and metabolic markers.",
    },
  ],
  faq: [
    {
      q: "Can I take supplements with HRT?",
      a: "Some are fine, some aren't. Phytoestrogens (soy isoflavones, red clover), black cohosh, and DHEA all interact with HRT in different ways — either by adding estrogenic activity, competing for the same receptors, or shifting how your liver metabolizes estradiol. St. John's wort meaningfully lowers estradiol blood levels. Vitex (chasteberry) can push against HRT's dopamine and prolactin effects. Every compound page in this hub lists its specific HRT interactions. Bring the list to your gynecologist before adding anything on top of a prescribed HRT regimen.",
    },
    {
      q: "Which supplements interact with birth control?",
      a: "St. John's wort is the biggest offender — it induces CYP3A4 and can drop ethinyl estradiol enough to cause breakthrough bleeding or contraceptive failure. Activated charcoal, taken within a few hours of the pill, reduces absorption. Rifampin-family antibiotics also lower levels. Iron, calcium, and thyroid medication have timing conflicts but don't reduce contraceptive efficacy. Every compound page here flags the specific birth-control interaction if one exists.",
    },
    {
      q: "Are these supplements safe during pregnancy or breastfeeding?",
      a: "Most in this hub are either not recommended or have insufficient safety data during pregnancy — including black cohosh, vitex, DHEA, red clover, ashwagandha, and Fadogia. Folate, iron, choline, DHA, vitamin D, and prenatal-formulated CoQ10 are the exceptions with strong pregnancy-safety data. When you're pregnant or breastfeeding, default to your obstetrician's prenatal recommendation and add nothing else without their sign-off.",
    },
    {
      q: "What's the difference between menopause and perimenopause supplements?",
      a: "Perimenopause (typically age 40–52) is defined by unpredictable estrogen swings — supplements that help are usually adaptogens (ashwagandha), magnesium glycinate for sleep, and B6 for mood in the luteal phase. Menopause (12+ months without a period) is defined by consistently low estrogen — evidence sits with black cohosh, soy isoflavones, and prescription HRT. The hub is organized by symptom area, not by phase, so you can match compounds to what you're actually dealing with.",
    },
    {
      q: "Do I need a menopause supplement if I'm on HRT?",
      a: "Usually no. If HRT is controlling your hot flashes, sleep, and mood, adding a second estrogenic supplement (black cohosh, high-dose soy isoflavones, red clover) doesn't stack benefit and can complicate dose titration. What often does help alongside HRT: vitamin D, magnesium glycinate, omega-3, collagen for skin, and creatine for muscle preservation — none of which meaningfully interact with estradiol or progesterone.",
    },
    {
      q: "How is DoseRoutine different from a general supplement app?",
      a: "DoseRoutine is an interaction checker first. Every compound in the library ties into pairwise reference notes across 475+ supplements, hormones, peptides and everything else you take — including HRT, birth control and common women's-health items. Sign up free, log your actual routine, and see conflicts before you take them.",
    },
    {
      q: "Where can I check my full stack for interactions?",
      a: "Open the DoseRoutine interaction checker at doseroutine.com/interaction-checker, add every compound and prescription you take, and you'll see flagged interactions with mechanism, severity, and what to do. For menopause-specific combinations, the menopause interaction checker gives a focused view.",
    },
  ],
};

export const Route = createFileRoute("/library/womens-health/")({
  head: () => womensHubHead(CONTENT),
  component: () => <WomensHubPage c={CONTENT} />,
});
