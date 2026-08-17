import { createFileRoute } from "@tanstack/react-router";
import { WomensHubPage, womensHubHead, type WomensHubContent } from "@/components/womens-hub-page";

const CONTENT: WomensHubContent = {
  slug: "fertility-cycle",
  title: "Fertility & Cycle Support",
  h1: "Fertility & Cycle Support",
  intro:
    "Fertility and menstrual-cycle supplements sit in one of the most-researched corners of women's health — but also one of the most oversold. Myo-inositol and D-chiro-inositol have real evidence in PCOS. CoQ10 has plausible evidence for egg quality after 35. Vitamin D deficiency is genuinely linked to fertility outcomes. Folate (the active form) is non-negotiable for anyone who could become pregnant, and folate vs folic acid actually matters for a subset of women with MTHFR variants. Iron replacement matters if you bleed heavily. B6 has small RCT evidence for luteal-phase mood. This hub covers each compound honestly, lists the studied dose range, and details interactions with birth control, fertility medications (letrozole, clomid), thyroid medication, and prenatal vitamins. Preconception decisions should be made with a reproductive endocrinologist.",
  cards: [
    {
      href: "/library/womens-health/myo-inositol",
      name: "Myo-Inositol",
      blurb: "Strong evidence in PCOS. Insulin sensitivity, cycle regularity, ovulation.",
    },
    {
      href: "/library/womens-health/d-chiro-inositol",
      name: "D-Chiro-Inositol",
      blurb: "Usually paired with myo-inositol at a 40:1 ratio. Different tissue targets.",
    },
    {
      href: "/library/womens-health/coq10-fertility",
      name: "CoQ10 (egg quality)",
      blurb: "Mitochondrial cofactor. Suggested benefit for oocyte quality after 35.",
    },
    {
      href: "/library/womens-health/vitamin-d-fertility",
      name: "Vitamin D (fertility)",
      blurb: "Deficiency links to lower IVF success. Repletion helps; mega-dosing does not.",
    },
    {
      href: "/library/womens-health/folate-vs-folic-acid",
      name: "Folate vs Folic Acid",
      blurb: "L-methylfolate vs synthetic folic acid — when the distinction matters.",
    },
    {
      href: "/library/womens-health/iron-cycle",
      name: "Iron (cycle context)",
      blurb: "Heavy menstrual bleeding, ferritin targets, timing with thyroid meds.",
    },
    {
      href: "/library/womens-health/b6-luteal",
      name: "Vitamin B6 (luteal phase)",
      blurb: "25–100 mg/day for PMS mood and breast tenderness.",
    },
  ],
  crossLinks: [
    {
      href: "/library/womens-health/menopause-hormones",
      label: "Menopause & Hormone Balance",
      blurb: "Black cohosh, phytoestrogens, HRT context.",
    },
    {
      href: "/library/womens-health/longevity",
      label: "Longevity for Women",
      blurb: "NMN, collagen, creatine, omega-3.",
    },
    {
      href: "/library/womens-health/sexual-health",
      label: "Sexual Health & Libido",
      blurb: "Low-dose testosterone, maca, L-arginine, ashwagandha.",
    },
    {
      href: "/interaction-checker",
      label: "Interaction Checker",
      blurb: "Check every fertility supplement against the rest of your routine.",
    },
  ],
  faq: [
    {
      q: "What is the best supplement for PCOS?",
      a: "The strongest evidence in PCOS is for myo-inositol 2 g twice daily, often combined with D-chiro-inositol at a 40:1 ratio (2000 mg + 50 mg). Multiple RCTs and meta-analyses (Endocrine Journal 2016; Gynecological Endocrinology 2019) show improvements in insulin sensitivity, ovulation rate, and menstrual regularity comparable to metformin for a subset of patients. Vitamin D repletion helps if deficient. Berberine has emerging insulin-sensitizing data but interacts with more medications.",
    },
    {
      q: "Do fertility supplements interact with letrozole or clomid?",
      a: "Most don't clinically interact. Inositols, CoQ10, folate, and vitamin D are commonly used alongside ovulation-induction cycles. Avoid high-dose vitex during active fertility treatment — its prolactin-and-progesterone effects can complicate luteal-phase interpretation. Discuss any herbal supplement with your reproductive endocrinologist before an IVF cycle.",
    },
    {
      q: "Is folic acid the same as folate?",
      a: "No. Folic acid is a synthetic form that requires MTHFR enzyme activity to convert to L-methylfolate (the active form). Women with MTHFR C677T homozygous variants convert less efficiently and may benefit from L-methylfolate directly. For most women, standard prenatal folic acid at 400–800 mcg is adequate. The folate vs folic acid page walks through when the distinction actually matters.",
    },
    {
      q: "How much CoQ10 for egg quality?",
      a: "Trials use 200–600 mg/day of CoQ10 (or 100–300 mg ubiquinol), typically for 60–90 days before IVF stimulation. Evidence (Aging Cell 2015; Reproductive BioMedicine Online 2018) suggests improved oocyte mitochondrial function in women over 35, with modest fertilization-rate benefits. Not a substitute for reproductive endocrinology care.",
    },
    {
      q: "When should I take iron for heavy periods?",
      a: "If ferritin is under 30 ng/mL with heavy menstrual bleeding, ferrous bisglycinate 18–50 mg/day is well-tolerated. Take away from thyroid medication (by 4 hours), calcium, and coffee. Recheck ferritin at 8–12 weeks. Ferritin over 50 ng/mL with normal CBC doesn't need supplementation.",
    },
    {
      q: "Can I take B6 for PMS while on birth control?",
      a: "Yes, at moderate doses (25–100 mg/day). Combined oral contraceptives can lower B6 status, so supplementation is often reasonable. Avoid chronic doses above 100 mg/day due to peripheral neuropathy risk with long-term high intake.",
    },
    {
      q: "Where can I check fertility supplement interactions?",
      a: "Use the DoseRoutine interaction checker at doseroutine.com/interaction-checker to add every fertility supplement plus your prescriptions, prenatal vitamin, and thyroid medication — you'll see conflicts and timing issues in one view.",
    },
  ],
};

export const Route = createFileRoute("/library/womens-health/fertility-cycle")({
  head: () => womensHubHead(CONTENT),
  component: () => <WomensHubPage c={CONTENT} />,
});
