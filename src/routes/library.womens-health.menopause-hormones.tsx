import { createFileRoute } from "@tanstack/react-router";
import { WomensHubPage, womensHubHead, type WomensHubContent } from "@/components/womens-hub-page";

const CONTENT: WomensHubContent = {
  slug: "menopause-hormones",
  title: "Menopause & Hormone Balance",
  h1: "Menopause & Hormone Balance",
  intro:
    "Perimenopause and menopause bring hot flashes, sleep disruption, mood shifts, vaginal dryness, joint aches, and bone-density loss — and the supplement conversation is genuinely complicated because many of these compounds act on the same estrogen and progesterone pathways as HRT. This hub covers the compounds women most often ask about: black cohosh, soy isoflavones, vitex, evening primrose, DHEA, red clover, and menopause-context maca — plus interaction-only reference pages for prescribed estradiol and progesterone. Every page states evidence honestly (strong, moderate, limited, or insufficient), lists the studied dose range, and details specific interactions with HRT, birth control, thyroid medication, SSRIs, and blood thinners. If you're on HRT, review any new supplement with your gynecologist before adding it.",
  cards: [
    {
      href: "/library/womens-health/black-cohosh",
      name: "Black Cohosh",
      blurb: "Studied for hot flashes and night sweats. Not phytoestrogenic. Liver caution.",
    },
    {
      href: "/library/womens-health/soy-isoflavones",
      name: "Soy Isoflavones (Phytoestrogens)",
      blurb:
        "Weak SERM-like activity. Modest hot-flash relief. Interacts with tamoxifen and thyroid meds.",
    },
    {
      href: "/library/womens-health/vitex",
      name: "Vitex (Chasteberry)",
      blurb:
        "Prolactin-lowering. Best evidence for PMS and cyclic breast pain, not menopause itself.",
    },
    {
      href: "/library/womens-health/evening-primrose-oil",
      name: "Evening Primrose Oil",
      blurb: "GLA source. Weak evidence for hot flashes; better data for cyclic mastalgia.",
    },
    {
      href: "/library/womens-health/dhea-women",
      name: "DHEA (women)",
      blurb: "Adrenal precursor to estrogen and testosterone. Prescription in many countries.",
    },
    {
      href: "/library/womens-health/red-clover",
      name: "Red Clover",
      blurb: "Isoflavones similar to soy. Blood-thinner interaction and hormone-sensitive caution.",
    },
    {
      href: "/library/womens-health/maca-menopause",
      name: "Maca (menopause context)",
      blurb: "Non-hormonal. Small studies suggest mood, sleep and hot-flash benefit.",
    },
    {
      href: "/library/womens-health/estradiol-hrt",
      name: "Estradiol / HRT (interactions)",
      blurb: "Prescription reference. Interaction risks with supplements, herbs and other drugs.",
    },
    {
      href: "/library/womens-health/progesterone-women",
      name: "Progesterone (interactions)",
      blurb:
        "Micronized progesterone context. Interactions with sedatives, SSRIs and enzyme inducers.",
    },
  ],
  crossLinks: [
    {
      href: "/library/womens-health/longevity",
      label: "Longevity for Women",
      blurb: "NMN, collagen, creatine, omega-3, magnesium glycinate.",
    },
    {
      href: "/library/womens-health/sexual-health",
      label: "Sexual Health & Libido",
      blurb: "Low-dose testosterone, maca, L-arginine, ashwagandha.",
    },
    {
      href: "/library/womens-health/fertility-cycle",
      label: "Fertility & Cycle Support",
      blurb: "Myo-inositol, CoQ10, folate, vitamin D, B6.",
    },
    {
      href: "/menopause-supplement-interaction-checker",
      label: "Menopause Interaction Checker",
      blurb: "Check any menopause supplement against HRT or your prescriptions.",
    },
  ],
  faq: [
    {
      q: "What is the best supplement for hot flashes?",
      a: "The best-evidenced non-prescription options for hot flashes are black cohosh (20–40 mg standardized extract twice daily) and soy isoflavones (~54 mg/day of genistein-equivalent). Both produce modest reductions in hot flash frequency in meta-analyses (Cochrane 2012; Menopause 2015), typically 20–30% versus placebo — real, but nothing like the 75%+ reduction that estradiol delivers. Choose one, not both. See each compound page for specific interactions.",
    },
    {
      q: "Can I take menopause supplements with HRT?",
      a: "Usually you shouldn't add another estrogenic compound (black cohosh, soy, red clover) on top of prescribed estradiol — it complicates dose titration and doesn't stack the benefit. Non-hormonal options like magnesium glycinate for sleep, omega-3, and vitamin D are compatible. Every compound page in this hub lists the specific HRT interaction.",
    },
    {
      q: "What are the safest supplements during perimenopause?",
      a: "The lowest-risk baseline for perimenopause is magnesium glycinate (300–400 mg at night for sleep and cramps), vitamin D3 (2000–4000 IU with fat), omega-3 (1–2 g EPA+DHA), and B6 (25–50 mg for luteal-phase mood). Add symptom-specific compounds only after a conversation with your gynecologist, especially if you use hormonal birth control.",
    },
    {
      q: "How long do menopause supplements take to work?",
      a: "For hot-flash-targeted botanicals (black cohosh, soy isoflavones, red clover), plan on 8–12 weeks before deciding whether it's working. Sleep-focused compounds (magnesium glycinate, glycine) work within days. Bone-and-muscle-focused compounds (creatine, vitamin D, collagen) show clinical benefit over 3–6 months.",
    },
    {
      q: "Which menopause supplements affect thyroid medication?",
      a: "Soy isoflavones can reduce levothyroxine absorption if taken within 4 hours. Iron and calcium have the same timing issue. Ashwagandha can push TSH down and mimic thyroid over-replacement. Always dose thyroid medication first-thing on an empty stomach and separate other supplements by 4 hours.",
    },
    {
      q: "Are phytoestrogens safe if I've had breast cancer?",
      a: "This is a case-by-case oncology conversation. For estrogen-receptor-positive breast cancer survivors on tamoxifen or an aromatase inhibitor, adding high-dose isoflavones or red clover is generally discouraged because of receptor-binding activity. Dietary soy is treated differently than concentrated extracts. Do not decide this from a supplement blog.",
    },
    {
      q: "Where do I check menopause supplement interactions?",
      a: "Use the DoseRoutine menopause interaction checker at doseroutine.com/menopause-supplement-interaction-checker for HRT-specific combinations, or the full checker at /interaction-checker to add prescriptions, peptides, and everything else you take.",
    },
  ],
};

export const Route = createFileRoute("/library/womens-health/menopause-hormones")({
  head: () => womensHubHead(CONTENT),
  component: () => <WomensHubPage c={CONTENT} />,
});
