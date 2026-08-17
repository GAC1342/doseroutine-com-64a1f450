import { createFileRoute } from "@tanstack/react-router";
import { WomensHubPage, womensHubHead, type WomensHubContent } from "@/components/womens-hub-page";

const CONTENT: WomensHubContent = {
  slug: "sexual-health",
  title: "Sexual Health & Libido for Women",
  h1: "Sexual Health & Libido",
  intro:
    "Female sexual health is genuinely under-studied compared to men's, but a small evidence base does exist for a handful of compounds — and a much larger literature exists on what to avoid combining. This hub covers what women ask about most: low-dose testosterone (an off-label prescription in most countries, covered here for interaction context only), maca in a libido-specific context, L-arginine for blood flow, ashwagandha for stress-mediated low desire, tribulus terrestris (where the evidence sits), and vaginal probiotics for the urogenital microbiome. Every page separates what's proven from what's promoted, lists studied dose ranges, and details specific interactions with HRT, birth control, SSRIs (a common cause of low libido), and thyroid medication. Prescription decisions belong with your clinician.",
  cards: [
    {
      href: "/library/womens-health/testosterone-women",
      name: "Low-dose testosterone (interactions)",
      blurb:
        "Off-label prescription reference. No dosing advice. Interactions with HRT, blood thinners and more.",
    },
    {
      href: "/library/womens-health/maca-libido",
      name: "Maca (libido context)",
      blurb:
        "Non-hormonal. Small trials suggest desire benefit, especially in SSRI-induced low libido.",
    },
    {
      href: "/library/womens-health/l-arginine-women",
      name: "L-Arginine",
      blurb: "NO precursor. Vascular effect. Interacts with BP meds and nitrates.",
    },
    {
      href: "/library/womens-health/tribulus-women",
      name: "Tribulus Terrestris (women)",
      blurb:
        "Modest evidence in postmenopausal women for desire. Nothing meaningful in younger women.",
    },
    {
      href: "/library/womens-health/vaginal-probiotics",
      name: "Vaginal Probiotics",
      blurb: "L. crispatus and L. rhamnosus for urogenital microbiome balance.",
    },
    {
      href: "/library/womens-health/ashwagandha-women",
      name: "Ashwagandha (women)",
      blurb: "Stress-mediated low libido. Thyroid and immunosuppressant cautions.",
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
      href: "/library/womens-health/fertility-cycle",
      label: "Fertility & Cycle Support",
      blurb: "Myo-inositol, CoQ10, folate, vitamin D.",
    },
    {
      href: "/interaction-checker",
      label: "Interaction Checker",
      blurb: "Check any libido supplement against SSRIs, HRT or birth control.",
    },
  ],
  faq: [
    {
      q: "Do libido supplements actually work for women?",
      a: "The honest answer is: sometimes, modestly, and it depends heavily on why libido is low. For stress-mediated low desire, ashwagandha (KSM-66, 300–600 mg/day) has small but positive RCTs. For SSRI-induced low libido, maca (~3 g/day) has two small trials showing benefit. For postmenopausal desire, low-dose testosterone (prescription) has the strongest evidence — nothing over the counter matches it. Most 'female libido stacks' sold online exaggerate what a supplement can do.",
    },
    {
      q: "Can I take libido supplements with an SSRI?",
      a: "Maca is the compound with the best data specifically for SSRI-induced low libido — trials suggest partial improvement without SSRI destabilization. Avoid combining L-arginine with sildenafil or nitrates. Avoid St. John's wort with any SSRI (serotonin syndrome risk). Every compound page lists SSRI interaction specifically.",
    },
    {
      q: "Is low-dose testosterone safe for women?",
      a: "Low-dose transdermal testosterone is an off-label prescription in most countries, with a reasonable safety profile for postmenopausal hypoactive sexual desire disorder when dosed to a physiologic female range. It requires clinician supervision, baseline and follow-up labs, and is not something to source outside a prescription. The testosterone page covers interactions, not dosing.",
    },
    {
      q: "Do vaginal probiotics prevent UTIs and BV?",
      a: "Specific strains — L. crispatus (CTV-05) and L. rhamnosus GR-1 — have moderate RCT evidence for reducing bacterial vaginosis recurrence and recurrent UTI incidence. Generic 'women's probiotic' blends without strain identification don't have this data. The vaginal probiotics page names which strains matter.",
    },
    {
      q: "How long do libido supplements take to work?",
      a: "Ashwagandha and maca take 4–8 weeks to show subjective effects in trials. L-arginine's vascular effect is acute (60–90 min pre-activity). Vaginal probiotics show microbiome shifts in 4–12 weeks. If nothing has changed at 12 weeks on a fair dose, the compound isn't the answer.",
    },
    {
      q: "Do libido supplements affect birth control?",
      a: "The main risk isn't the libido supplement itself but combinations. St. John's wort (sometimes bundled into 'mood + libido' formulas) reduces contraceptive efficacy. L-arginine and maca don't clinically affect hormonal birth control. Ashwagandha may modestly modulate thyroid — timing matters if you take levothyroxine, not birth control.",
    },
    {
      q: "Where can I check women's libido supplement interactions?",
      a: "Use the DoseRoutine interaction checker at doseroutine.com/interaction-checker to combine any supplement with your HRT, birth control, SSRI, or prescription — you'll see mechanism and severity in one view.",
    },
  ],
};

export const Route = createFileRoute("/library/womens-health/sexual-health")({
  head: () => womensHubHead(CONTENT),
  component: () => <WomensHubPage c={CONTENT} />,
});
