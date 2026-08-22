// Content/data for the menopause interaction checker route.
// Kept out of the route module so route splitting cannot drop these runtime values.

export const CANONICAL = "https://doseroutine.com/menopause-supplement-interaction-checker";
export const TITLE = "Menopause Supplement Interaction Checker | DoseRoutine";
export const DESC =
  "Free menopause supplement interaction checker — check black cohosh, soy isoflavones, vitex, DHEA, red clover and HRT together with DoseRoutine.";

export const ORG = {
  "@type": "Organization",
  "@id": "https://doseroutine.com/#organization",
  name: "DoseRoutine",
  url: "https://doseroutine.com",
  logo: "https://doseroutine.com/icon-512.png",
};

export const FAQS = [
  {
    q: "What is a menopause supplement interaction checker?",
    a: "A tool that flags known conflicts between menopause-related supplements (black cohosh, soy isoflavones, red clover, vitex, DHEA, evening primrose) and the prescriptions women often take at the same time — estradiol HRT, progesterone, birth control, thyroid medication, SSRIs, blood thinners, and blood pressure drugs. DoseRoutine's checker uses named pharmacokinetic and receptor-level mechanisms for every flagged pair, not vague warnings.",
  },
  {
    q: "Which menopause supplements interact with HRT?",
    a: "St. John's wort (reduces estradiol levels via CYP3A4 induction), black cohosh (usually not combined for redundant coverage), DHEA (adds peripheral hormone conversion), vitex (modulates progesterone signaling), and high-dose soy isoflavones or red clover (weak additive ER activity). Non-hormonal options like maca, magnesium, and omega-3 don't meaningfully interact with HRT.",
  },
  {
    q: "Which menopause supplements interact with birth control?",
    a: "St. John's wort is the biggest issue — it induces CYP3A4 and can reduce ethinyl-estradiol enough to cause breakthrough bleeding or contraceptive failure. Most menopause-specific herbs (black cohosh, red clover, soy isoflavones) don't meaningfully reduce contraceptive efficacy but should still be checked pair-by-pair.",
  },
  {
    q: "Which menopause supplements interact with thyroid medication?",
    a: "Soy isoflavones reduce levothyroxine absorption if taken within 4 hours. Ashwagandha can push TSH down. Iron and calcium have the same absorption-timing issue. Always dose levothyroxine on an empty stomach and separate other supplements by 4 hours.",
  },
  {
    q: "Are menopause supplements safe with SSRIs?",
    a: "Most are compatible. St. John's wort with any SSRI is a serotonin-syndrome risk — do not combine. Black cohosh, soy isoflavones, and red clover have no meaningful SSRI interaction. Maca has small trials suggesting benefit for SSRI-induced low libido.",
  },
  {
    q: "How do I use the DoseRoutine menopause interaction checker?",
    a: "Open the interaction checker at doseroutine.com/interaction-checker, add every supplement and prescription you take (including HRT, birth control, thyroid medication), and DoseRoutine will show pairwise flags with mechanism and severity. Free for 7 days.",
  },
];

export const MEDICAL_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
  },
  "@id": CANONICAL + "#medicalpage",
  url: CANONICAL,
  name: TITLE,
  description: DESC,
  inLanguage: "en",
  headline: TITLE,
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  image: ["https://doseroutine.com/og/hub-mens-health.jpg"],
  datePublished: "2026-07-23",
  dateModified: "2026-07-31",
  audience: { "@type": "PeopleAudience", audienceType: "Adult women", suggestedGender: "Female" },
  publisher: ORG,
  author: ORG,
  copyrightHolder: ORG,
  isBasedOn: CANONICAL,
  about: [
    { "@type": "MedicalCondition", name: "Menopause" },
    { "@type": "MedicalCondition", name: "Perimenopause" },
    { "@type": "MedicalTherapy", name: "Hormone Replacement Therapy (HRT)" },
  ],
};

export const BREADCRUMB_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "DoseRoutine", item: "https://doseroutine.com" },
    { "@type": "ListItem", position: 2, name: "Menopause Interaction Checker", item: CANONICAL },
  ],
};

export const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": CANONICAL + "#faq",
  inLanguage: "en",
  isBasedOn: CANONICAL,
  publisher: ORG,
  author: ORG,
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
      author: ORG,
      publisher: ORG,
      url: CANONICAL,
      inLanguage: "en",
    },
  })),
};

export const OG_IMAGE = "https://doseroutine.com/og/hub-mens-health.jpg";

export const PAIR_LABELS: Record<string, string> = {
  hrt: "HRT (estradiol)",
  estradiol: "Estradiol",
  progesterone: "Progesterone",
  "birth-control": "Birth control (oral contraceptives)",
  contraceptives: "Birth control",
  levothyroxine: "Levothyroxine (thyroid medication)",
  "thyroid-medication": "Thyroid medication",
  thyroid: "Thyroid medication",
  ssri: "SSRIs / SNRIs",
  ssris: "SSRIs / SNRIs",
  "blood-thinners": "Blood thinners (warfarin, apixaban)",
  warfarin: "Warfarin",
  aspirin: "Aspirin",
  statins: "Statins",
  "blood-pressure-medication": "Blood pressure medication",
  metformin: "Metformin",
  iron: "Iron",
  calcium: "Calcium",
};

export const COMPOUND_LABELS: Record<string, string> = {
  "black-cohosh": "Black Cohosh",
  "soy-isoflavones": "Soy Isoflavones",
  vitex: "Vitex",
  "evening-primrose-oil": "Evening Primrose Oil",
  "dhea-women": "DHEA",
  "red-clover": "Red Clover",
  "maca-menopause": "Maca",
  "estradiol-hrt": "Estradiol / HRT",
  "progesterone-women": "Progesterone",
  "nmn-women": "NMN",
  "nad-precursors": "NAD+ Precursors",
  "collagen-peptides-women": "Collagen Peptides",
  "spermidine-women": "Spermidine",
  "resveratrol-women": "Resveratrol",
  "magnesium-glycinate-women": "Magnesium Glycinate",
  "coq10-women": "CoQ10",
  "creatine-women": "Creatine",
  "omega-3-women": "Omega-3",
  "testosterone-women": "Low-dose Testosterone",
  "maca-libido": "Maca (libido)",
  "l-arginine-women": "L-Arginine",
  "tribulus-women": "Tribulus",
  "vaginal-probiotics": "Vaginal Probiotics",
  "ashwagandha-women": "Ashwagandha",
  "myo-inositol": "Myo-Inositol",
  "d-chiro-inositol": "D-Chiro-Inositol",
  "coq10-fertility": "CoQ10 (fertility)",
  "vitamin-d-fertility": "Vitamin D",
  "folate-vs-folic-acid": "Folate",
  "iron-cycle": "Iron",
  "b6-luteal": "Vitamin B6",
};

export function humanize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
