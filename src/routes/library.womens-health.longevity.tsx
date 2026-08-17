import { createFileRoute } from "@tanstack/react-router";
import { WomensHubPage, womensHubHead, type WomensHubContent } from "@/components/womens-hub-page";

const CONTENT: WomensHubContent = {
  slug: "longevity",
  title: "Longevity for Women",
  h1: "Longevity for Women",
  intro:
    "Longevity supplements read the same for men and women in a lot of marketing — but the actual pressure points are different. For women, the biggest longevity levers after 40 are bone density, muscle mass (which drops with estrogen loss), cardiovascular risk, and cognitive resilience. This hub focuses on compounds with real evidence for those endpoints in women: NAD+ precursors (NMN and NR), collagen peptides for skin and joint support, spermidine and resveratrol for cellular pathways, creatine for muscle and bone, magnesium glycinate for sleep and blood pressure, CoQ10/ubiquinol for mitochondrial and heart support, and omega-3 for cardiac, cognitive, and perimenopause outcomes. Each page states what's proven, what's plausible, and what's marketing — plus specific interactions with HRT, birth control, statins, blood thinners, and thyroid medication.",
  cards: [
    {
      href: "/library/womens-health/nmn-women",
      name: "NMN",
      blurb: "NAD+ precursor. Human trials small; safety data reasonable at 250–500 mg/day.",
    },
    {
      href: "/library/womens-health/nad-precursors",
      name: "NAD+ Precursors (NMN vs NR)",
      blurb: "Comparison of nicotinamide riboside and NMN — what the human data actually shows.",
    },
    {
      href: "/library/womens-health/collagen-peptides-women",
      name: "Collagen Peptides",
      blurb: "10–15 g/day. Studied for skin elasticity, nail growth, and knee-joint pain.",
    },
    {
      href: "/library/womens-health/spermidine-women",
      name: "Spermidine",
      blurb: "Autophagy activator. Small human trials on cognition and cardiovascular markers.",
    },
    {
      href: "/library/womens-health/resveratrol-women",
      name: "Resveratrol",
      blurb: "Sirtuin activator hype vs. moderate human data on vascular markers.",
    },
    {
      href: "/library/womens-health/magnesium-glycinate-women",
      name: "Magnesium Glycinate",
      blurb: "Sleep, BP, insulin sensitivity, muscle cramps, mood.",
    },
    {
      href: "/library/womens-health/coq10-women",
      name: "CoQ10 (Ubiquinol)",
      blurb: "Mitochondrial cofactor. Especially relevant if you take a statin.",
    },
    {
      href: "/library/womens-health/creatine-women",
      name: "Creatine (for women)",
      blurb:
        "3–5 g/day. Under-researched in women but strong signal for muscle, bone, and cognition.",
    },
    {
      href: "/library/womens-health/omega-3-women",
      name: "Omega-3 (women's context)",
      blurb: "Cardiovascular, cognitive, perimenopause mood; blood-thinner interaction.",
    },
  ],
  crossLinks: [
    {
      href: "/library/womens-health/menopause-hormones",
      label: "Menopause & Hormone Balance",
      blurb: "Black cohosh, phytoestrogens, HRT and progesterone reference.",
    },
    {
      href: "/library/womens-health/sexual-health",
      label: "Sexual Health & Libido",
      blurb: "Testosterone context, maca, L-arginine, ashwagandha.",
    },
    {
      href: "/library/womens-health/fertility-cycle",
      label: "Fertility & Cycle Support",
      blurb: "Myo-inositol, CoQ10 (fertility), folate, vitamin D.",
    },
    {
      href: "/interaction-checker",
      label: "Interaction Checker",
      blurb: "Check any longevity supplement against your full routine.",
    },
  ],
  faq: [
    {
      q: "What are the most evidence-based longevity supplements for women over 40?",
      a: "The compounds with the strongest human data for women over 40 are creatine (3–5 g/day, for muscle, bone, and cognition), omega-3 EPA/DHA (1–2 g/day, for cardiovascular and cognitive outcomes), vitamin D3 (2000–4000 IU targeting 40–60 ng/mL 25(OH)D), and magnesium glycinate (300–400 mg for sleep, BP, and insulin sensitivity). NMN, NR, spermidine, and resveratrol have interesting mechanistic data but limited long-term human evidence.",
    },
    {
      q: "Is NMN or NR better for women?",
      a: "The head-to-head human data doesn't cleanly favor either. Both raise NAD+ in blood at 250–500 mg/day. NR has more long-term safety data (Chromadex-sponsored trials), NMN has more consumer momentum. The NAD+ Precursors page compares evidence, cost, and stability side-by-side.",
    },
    {
      q: "Should women take creatine even if they don't lift?",
      a: "Yes — the emerging evidence for women, especially in perimenopause and menopause, isn't just about muscle. It also covers bone-density preservation, mood, and working memory. 3–5 g/day of monohydrate is the dose used in almost every study.",
    },
    {
      q: "Do longevity supplements interact with HRT?",
      a: "Most of the compounds in this hub have minimal interaction with prescribed estradiol or progesterone. Resveratrol has weak estrogenic activity that theoretically stacks with HRT — the clinical relevance at supplement doses is unclear. Every compound page lists specific HRT interaction detail.",
    },
    {
      q: "How long before I see benefit from longevity supplements?",
      a: "Sleep and mood outcomes (magnesium, omega-3) show up in days to weeks. Skin, hair, and joint effects (collagen, omega-3) take 8–12 weeks. Muscle and bone outcomes (creatine, vitamin D) take 3–6 months. NAD+ and sirtuin-pathway compounds don't have a clean subjective marker.",
    },
    {
      q: "Can I take a statin with CoQ10?",
      a: "Yes — and it's often specifically recommended. Statins reduce endogenous CoQ10 synthesis, and supplementation (100–200 mg/day ubiquinol) can reduce statin-associated muscle symptoms in a subset of patients. See the CoQ10 page for the full breakdown.",
    },
    {
      q: "Where can I check longevity supplement interactions?",
      a: "Use the DoseRoutine interaction checker at doseroutine.com/interaction-checker to add every longevity supplement plus your prescriptions and HRT — you'll see the full pairwise safety picture in one view.",
    },
  ],
};

export const Route = createFileRoute("/library/womens-health/longevity")({
  head: () => womensHubHead(CONTENT),
  component: () => <WomensHubPage c={CONTENT} />,
});
