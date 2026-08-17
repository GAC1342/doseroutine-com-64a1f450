import { createFileRoute, Link } from "@tanstack/react-router";
import { ResponsiveImage } from "@/components/responsive-image";
import {
  ArrowRight,
  ShieldAlert,
  Info,
  Syringe,
  Activity,
  Flame,
  Utensils,
  CheckCircle2,
  XCircle,
  Thermometer,
  ClipboardList,
} from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { InlineSignupButton } from "@/components/inline-signup-button";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";

const CANONICAL = "https://doseroutine.com/library/retatrutide-dosage";
const OG_IMAGE = "https://doseroutine.com/og/retatrutide-dosage.jpg";
const TITLE = "Retatrutide Dosage & Titration Guide | DoseRoutine";
const DESC = withDoseRoutineDescriptionSuffix(
  "Retatrutide dosing, trial results, titration, side effects and reconstitution maths",
);
const REVIEWED = "2026-08-02";

const FAQS = [
  {
    q: "What is retatrutide?",
    a: "Retatrutide (LY3437943) is an investigational triple agonist that activates the GLP-1, GIP and glucagon receptors. It is being studied by Eli Lilly for obesity and type 2 diabetes. It is not approved by the FDA, EMA, MHRA or TGA, and anything sold online as 'retatrutide' is an unregulated research chemical of unverified identity, purity and sterility.",
  },
  {
    q: "What retatrutide doses were used in trials?",
    a: "The Phase 2 obesity trial (NEJM, 2023) tested weekly subcutaneous doses of 1 mg, 4 mg, 8 mg and 12 mg, reached through a slow escalation over several months rather than started outright. Higher arms began at 2 mg and stepped up every 2–4 weeks. These are trial figures under medical supervision with monitoring — not a protocol to copy.",
  },
  {
    q: "How much weight did people lose in the retatrutide trial?",
    a: "At 48 weeks, mean weight reduction was about 8.7% on 1 mg, 17.1% on 4 mg, 22.8% on 8 mg and 24.2% on 12 mg, versus roughly 2.1% on placebo. Importantly the curves had not flattened at 48 weeks, so the ceiling is unknown. Individual results in the trial varied widely around those means.",
  },
  {
    q: "How is retatrutide titrated?",
    a: "Trial titration was deliberately gradual because gastrointestinal side effects track dose escalation speed more than the final dose. Participants stayed at each step for at least 2–4 weeks before moving up, and steps were held or reduced when nausea, vomiting or dehydration appeared. Skipping steps is the most common cause of people abandoning a GLP-1-class compound.",
  },
  {
    q: "How do you reconstitute retatrutide?",
    a: "Lyophilised vials are reconstituted with bacteriostatic water. Concentration in mg/mL equals the vial strength in mg divided by the millilitres of BAC water added — so a 10 mg vial with 2 mL gives 5 mg/mL, and a 1 mg dose is 0.2 mL, which is 20 units on a U-100 insulin syringe. Add the diluent slowly against the vial wall, swirl rather than shake, and refrigerate once mixed.",
  },
  {
    q: "How long does reconstituted retatrutide last?",
    a: "Peptides reconstituted with bacteriostatic water are generally kept refrigerated at 2–8 °C and used within about 28–30 days, the same beyond-use window that applies to the bacteriostatic water itself. Plain sterile water has no preservative and is a single-use diluent. Discard anything cloudy, discoloured or containing particles, and never freeze a reconstituted vial.",
  },
  {
    q: "How long until you see results?",
    a: "In trial data appetite suppression usually appears within the first one to two injections, while measurable weight change lags behind it. Most participants were still losing weight at 48 weeks, so this is a multi-month arc rather than a fast cut. Judging the compound after three or four weeks at a starting dose tells you almost nothing.",
  },
  {
    q: "Retatrutide vs tirzepatide — what's actually different?",
    a: "Tirzepatide is a dual GLP-1/GIP agonist; retatrutide adds glucagon-receptor agonism, which raises energy expenditure on top of appetite suppression. In separate Phase 2 trials retatrutide's highest arm produced roughly 24% mean weight loss at 48 weeks versus about 21% for tirzepatide at 72 weeks. The trials were never run head to head, so the comparison is indirect. Tirzepatide is approved and prescribable; retatrutide is not.",
  },
  {
    q: "Retatrutide vs semaglutide?",
    a: "Semaglutide is a single GLP-1 agonist and the most established of the three, with approved obesity and diabetes indications plus cardiovascular outcome data. Retatrutide's trial weight-loss figures are higher, but it has no long-term safety record, no outcome data and no approval. More receptors also means more mechanisms that can misbehave.",
  },
  {
    q: "What are the side effects?",
    a: "Predominantly gastrointestinal: nausea, vomiting, diarrhoea and constipation, worst during escalation. Dose-dependent increases in heart rate were seen in trials, as were transient rises in fasting glucose at the highest doses via the glucagon arm. Muscle loss alongside fat loss is a real concern with this magnitude of weight reduction, which is why protein intake and resistance training matter.",
  },
  {
    q: "Does retatrutide cause muscle loss?",
    a: "Any rapid, large weight loss costs lean mass — across GLP-1-class trials roughly a quarter to 40% of total weight lost has been fat-free mass, some of which is water and glycogen rather than contractile muscle. The levers that reduce it are unchanged: adequate protein (broadly 1.6 g per kg of target body weight per day), resistance training two to four times a week, and not escalating faster than you can eat.",
  },
  {
    q: "What happens if you stop?",
    a: "Appetite returns. In the tirzepatide withdrawal trial (SURMOUNT-4) participants switched to placebo regained about 14% of body weight over the following year while those who continued lost more. No retatrutide withdrawal data exists yet, but there is no reason to expect a different pattern. Weight-regulating compounds work while they are being used.",
  },
  {
    q: "What if you miss a weekly dose?",
    a: "Trial protocols for weekly GLP-1-class agents generally allow a missed dose to be taken if the next scheduled dose is more than about 72 hours away, otherwise skip it and resume the normal schedule. Never double up to catch up — stacking doses concentrates exactly the gastrointestinal effects that escalation is designed to avoid. After several missed weeks, tolerance fades and restarting at a lower step is typical.",
  },
  {
    q: "Who should not use it?",
    a: "Anyone with a personal or family history of medullary thyroid carcinoma or MEN2, prior pancreatitis, severe gastroparesis, active gallbladder disease, or who is pregnant, breastfeeding or planning pregnancy. GLP-1-class compounds also slow gastric emptying, which changes absorption of oral medications including oral contraceptives.",
  },
  {
    q: "What monitoring makes sense?",
    a: "Baseline and periodic fasting glucose and HbA1c, lipids, liver and kidney function, and resting heart rate. Weight and waist alone hide muscle loss — body composition or at least grip strength and lifting numbers give a better picture. Anyone using an unapproved compound should be doing this with a physician who knows about it.",
  },
  {
    q: "Is retatrutide legal to buy?",
    a: "It is not approved for human use anywhere. Vendors sell it labelled 'for research use only', which is a legal shield, not a quality guarantee. Third-party testing has repeatedly found research peptides that are underdosed, misidentified or contaminated. It is also prohibited in tested sport.",
  },
];

const REFS = [
  {
    cite: "Jastreboff AM, Kaplan LM, Frías JP, et al. Triple-Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial. N Engl J Med. 2023;389(6):514–526.",
    url: "https://pubmed.ncbi.nlm.nih.gov/37366315/",
  },
  {
    cite: "Rosenstock J, Frias J, Jastreboff AM, et al. Retatrutide in people with type 2 diabetes: a randomised, double-blind, placebo- and active-controlled, phase 2 trial. Lancet. 2023;402(10401):529–544.",
    url: "https://pubmed.ncbi.nlm.nih.gov/37385280/",
  },
  {
    cite: "Coskun T, Urva S, Roell WC, et al. LY3437943, a novel triple glucagon, GIP, and GLP-1 receptor agonist for glycemic control and weight loss: preclinical and Phase 1 results. Cell Metab. 2022;34(9):1234–1247.",
    url: "https://pubmed.ncbi.nlm.nih.gov/35985340/",
  },
  {
    cite: "Jastreboff AM, Aronne LJ, Ahmad NN, et al. Tirzepatide Once Weekly for the Treatment of Obesity (SURMOUNT-1). N Engl J Med. 2022;387(3):205–216.",
    url: "https://pubmed.ncbi.nlm.nih.gov/35658024/",
  },
  {
    cite: "Aronne LJ, Sattar N, Horn DB, et al. Continued Treatment With Tirzepatide for Maintenance of Weight Reduction (SURMOUNT-4). JAMA. 2024;331(1):38–48.",
    url: "https://pubmed.ncbi.nlm.nih.gov/38078870/",
  },
  {
    cite: "Wilding JPH, Batterham RL, Calanna S, et al. Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1). N Engl J Med. 2021;384(11):989–1002.",
    url: "https://pubmed.ncbi.nlm.nih.gov/33567185/",
  },
  {
    cite: "U.S. Food and Drug Administration. Medications Containing Semaglutide Marketed for Type 2 Diabetes or Weight Loss — compounded and unapproved product warnings.",
    url: "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/medications-containing-semaglutide-marketed-type-2-diabetes-or-weight-loss",
  },
];

const TRIAL_DOSES = [
  { step: "Weeks 1–4", dose: "1–2 mg weekly", note: "Starting step; most nausea shows up here" },
  { step: "Weeks 5–8", dose: "2–4 mg weekly", note: "Only if the prior step was tolerated" },
  { step: "Weeks 9–16", dose: "4–8 mg weekly", note: "Escalation held or reversed on GI symptoms" },
  {
    step: "Week 17+",
    dose: "8–12 mg weekly",
    note: "Highest trial arms; largest side-effect burden",
  },
];

// Phase 2 obesity trial (NEJM 2023) mean weight reduction from baseline at 48 weeks.
const RESULTS = [
  { arm: "Placebo", w24: "1.6%", w48: "2.1%", bar: 2.1 },
  { arm: "1 mg", w24: "7.2%", w48: "8.7%", bar: 8.7 },
  { arm: "4 mg", w24: "12.9%", w48: "17.1%", bar: 17.1 },
  { arm: "8 mg", w24: "17.3%", w48: "22.8%", bar: 22.8 },
  { arm: "12 mg", w24: "17.5%", w48: "24.2%", bar: 24.2 },
];

const RECON_ROWS = [
  { vial: "5 mg", bac: "1 mL", conc: "5 mg/mL", unit: "2 mg = 0.4 mL = 40 units" },
  { vial: "10 mg", bac: "2 mL", conc: "5 mg/mL", unit: "4 mg = 0.8 mL = 80 units" },
  { vial: "10 mg", bac: "1 mL", conc: "10 mg/mL", unit: "4 mg = 0.4 mL = 40 units" },
  { vial: "20 mg", bac: "2 mL", conc: "10 mg/mL", unit: "8 mg = 0.8 mL = 80 units" },
];

const RECON_STEPS = [
  {
    name: "Work out the concentration first",
    text: "Divide vial strength in mg by the millilitres of bacteriostatic water you intend to add. A 10 mg vial with 2 mL gives 5 mg/mL. Decide this before the needle goes anywhere near the vial.",
  },
  {
    name: "Clean both stoppers",
    text: "Swab the rubber stopper of the peptide vial and the bacteriostatic water vial with alcohol and let them air dry. Wash hands and work on a clean, uncluttered surface.",
  },
  {
    name: "Draw the diluent",
    text: "Draw the planned volume of bacteriostatic water into a syringe, checking the plunger against the barrel markings at eye level.",
  },
  {
    name: "Add it down the vial wall",
    text: "Insert the needle at an angle and let the water run slowly down the inside wall of the vial. Never squirt it directly onto the powder cake — force damages the peptide.",
  },
  {
    name: "Swirl, never shake",
    text: "Roll or swirl gently until the solution is completely clear. Shaking creates foam and can denature the peptide. Do not use it if it stays cloudy or shows particles.",
  },
  {
    name: "Label and refrigerate",
    text: "Write the concentration and the date on the vial, store it at 2–8 °C, and respect the beyond-use date of the bacteriostatic water (typically about 28 days).",
  },
  {
    name: "Convert the dose to syringe units",
    text: "Volume in mL equals dose in mg divided by concentration in mg/mL; a U-100 insulin syringe has 100 units per mL, so multiply the millilitres by 100 to get units.",
  },
];

const SIDE_EFFECTS = [
  {
    effect: "Nausea",
    when: "Peaks in the 1–2 weeks after each step up",
    manage: "Smaller meals, less fat, slow escalation, hold the step rather than pushing through",
  },
  {
    effect: "Vomiting / diarrhoea",
    when: "Escalation phase, dose-dependent",
    manage:
      "Aggressive hydration and electrolytes; persistent vomiting is a stop-and-call-a-doctor sign",
  },
  {
    effect: "Constipation",
    when: "Anytime, worse with low food volume",
    manage: "Fibre, fluid, movement; low intake is usually the real cause",
  },
  {
    effect: "Raised heart rate",
    when: "Dose-dependent across trial arms",
    manage: "Track resting HR weekly; sustained double-digit rises warrant medical review",
  },
  {
    effect: "Higher fasting glucose",
    when: "Highest doses, via glucagon agonism",
    manage: "Fasting glucose and HbA1c monitoring; a known trade-off of the third receptor",
  },
  {
    effect: "Lean-mass loss",
    when: "Throughout rapid weight loss",
    manage: "Protein target, resistance training, body composition rather than scale weight",
  },
  {
    effect: "Gallbladder symptoms",
    when: "Secondary to fast weight loss",
    manage: "Right-upper-abdominal pain after fatty meals needs assessment, not patience",
  },
];

const MONITORING = [
  "Resting heart rate, weekly, same conditions each time",
  "Fasting glucose and HbA1c at baseline and every 3 months",
  "Lipid panel, liver and kidney function at baseline and periodically",
  "Body composition or at minimum grip strength and key lifts, monthly",
  "Blood pressure, hydration and bowel habit during escalation",
  "Protein intake and training frequency — the two variables you fully control",
];

const AVOID = [
  "Personal or family history of medullary thyroid carcinoma or MEN2",
  "Previous pancreatitis",
  "Severe gastroparesis or significant gastrointestinal disease",
  "Active gallbladder disease",
  "Pregnancy, breastfeeding or planning pregnancy",
  "Type 1 diabetes, or insulin/sulfonylurea use without prescriber supervision",
  "Tested athletes — GLP-1-class agents are prohibited in sport",
];

const TOC = [
  { id: "what-it-is", label: "What retatrutide is" },
  { id: "results", label: "What the trials showed" },
  { id: "dosage", label: "Trial dosage & titration" },
  { id: "timeline", label: "Month-by-month timeline" },
  { id: "reconstitution", label: "Reconstitution maths" },
  { id: "comparison", label: "vs tirzepatide & semaglutide" },
  { id: "side-effects", label: "Side effects & management" },
  { id: "muscle", label: "Protecting muscle" },
  { id: "monitoring", label: "Monitoring checklist" },
  { id: "avoid", label: "Who should avoid it" },
  { id: "stopping", label: "Stopping & regain" },
  { id: "sourcing", label: "Sourcing, purity & law" },
  { id: "storage", label: "Storage & handling" },
  { id: "faq", label: "FAQ" },
  { id: "references", label: "References" },
];

const TIMELINE = [
  {
    phase: "Weeks 1–4",
    body: "Starting step. Appetite suppression is usually noticeable within the first one or two injections; nausea is at its most likely here. Weight change is small and largely water. Establish the protein target and training schedule now, not later.",
  },
  {
    phase: "Weeks 5–12",
    body: "First escalations. Each step up restarts the gastrointestinal adjustment for roughly a week. Fat loss becomes clearly visible on a weekly average, and food volume drops enough that protein and fibre need deliberate planning.",
  },
  {
    phase: "Weeks 13–24",
    body: "Higher steps. Trial participants were around 13–17% below baseline by week 24. Strength and energy dips here almost always trace back to under-eating protein or not training rather than the compound itself.",
  },
  {
    phase: "Weeks 25–48",
    body: "The curve had still not plateaued at 48 weeks in trials, with the top arms reaching about 24%. This is also where gallbladder issues, loose skin and lean-mass questions become the practical concerns rather than nausea.",
  },
];

export const Route = createFileRoute("/library/retatrutide-dosage")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "author", content: "DoseRoutine" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:secure_url", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "Lyophilised peptide vial, U-100 insulin syringe, alcohol swab and bacteriostatic water on a light surface — DoseRoutine",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "Retatrutide dosing kit — vial, U-100 insulin syringe and bacteriostatic water — DoseRoutine" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      // Preload the LCP hero so it starts downloading with the HTML, not after
      // React hydrates. imagesrcset/imagesizes must mirror the <picture> above.
      {
        rel: "preload",
        as: "image",
        href: "/og/retatrutide-dosage-960.webp",
        imageSrcSet:
          "/og/retatrutide-dosage-640.webp 640w, /og/retatrutide-dosage-960.webp 960w, /og/retatrutide-dosage-1200.webp 1200w",
        imageSizes: "(min-width: 768px) 768px, 100vw",
        type: "image/webp",
        fetchPriority: "high",
      },
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/retatrutide-dosage"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
          headline: TITLE,
          description: DESC,
          url: CANONICAL,
          image: [OG_IMAGE],
          inLanguage: "en",
          author: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine" },
          publisher: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine",
            logo: { "@type": "ImageObject", url: "https://doseroutine.com/icon-512.png" },
          },
          datePublished: "2026-07-30",
          dateModified: REVIEWED,
          citation: REFS.map((r) => r.cite),
          mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to reconstitute a lyophilised retatrutide vial",
          description:
            "The reconstitution arithmetic and handling steps used for lyophilised research peptide vials, including converting a milligram dose to insulin-syringe units.",
          totalTime: "PT10M",
          supply: [
            { "@type": "HowToSupply", name: "Lyophilised peptide vial" },
            { "@type": "HowToSupply", name: "Bacteriostatic water" },
            { "@type": "HowToSupply", name: "Alcohol swabs" },
            { "@type": "HowToSupply", name: "U-100 insulin syringe" },
          ],
          step: RECON_STEPS.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.name,
            text: s.text,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Library",
              item: "https://doseroutine.com/library",
            },
            { "@type": "ListItem", position: 2, name: "Retatrutide dosage", item: CANONICAL },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Peptide library · GLP-1 class
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Retatrutide dosage, titration &amp; reconstitution guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Every dose, escalation step and weight-loss figure below comes from the published Phase
            2 trials of retatrutide (LY3437943) — plus the reconstitution arithmetic people actually
            get wrong.
          </p>
          <p className="text-xs text-muted-foreground">
            Reviewed {REVIEWED} · 7 peer-reviewed sources · Educational reference, not medical
            advice
          </p>
          <ResponsiveImage
            src="/og/retatrutide-dosage-960.jpg"
            webpSrcSet="/og/retatrutide-dosage-640.webp 640w, /og/retatrutide-dosage-960.webp 960w, /og/retatrutide-dosage-1200.webp 1200w"
            fallbackSrcSet="/og/retatrutide-dosage-640.jpg 640w, /og/retatrutide-dosage-960.jpg 960w, /og/retatrutide-dosage.jpg 1200w"
            // Article column is capped at 768px; below that the hero is full-bleed.
            sizes="(min-width: 768px) 768px, 100vw"
            alt="Flat-lay photograph of a lyophilised retatrutide vial, a U-100 insulin syringe marked in units, an alcohol swab and a vial of bacteriostatic water arranged on a light gray surface"
            width={1200}
            height={630}
            loading="eager"
            fetchPriority="high"
            className="aspect-[1200/630] rounded-xl border object-cover"
          />
        </header>

        <Card className="space-y-3 p-5">
          <div className="text-sm font-semibold">Key takeaways</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Triple agonist — GLP-1 + GIP + <strong className="text-foreground">glucagon</strong>
                , the third receptor being what separates it from tirzepatide.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Trial doses were 1, 4, 8 and 12 mg weekly, all reached by slow escalation over months.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Mean weight reduction at 48 weeks reached about 24% on 12 mg — and the curve had not
              flattened.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Concentration (mg/mL) = vial mg ÷ mL of BAC water. Units to draw = mL × 100.
            </li>
            <li className="flex gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              Not approved anywhere. Grey-market vials are unverified for identity, dose and
              sterility.
            </li>
          </ul>
        </Card>

        {/* Conversion point right after the summary, where intent peaks. */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cta/40 bg-cta/5 p-4">
          <InlineSignupButton size="md" label="Track retatrutide free" />
          <span className="text-xs text-muted-foreground">
            Dose reminders, titration schedule and interaction checks — no card needed.
          </span>
        </div>

        <nav aria-label="On this page" className="rounded-xl border p-4">
          <div className="mb-2 text-sm font-semibold">On this page</div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {TOC.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="hover:text-primary hover:underline">
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Card className="space-y-2 border-l-4 border-l-warning p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-warning" /> Not an approved medicine
          </div>
          <p className="text-sm text-muted-foreground">
            Retatrutide has no marketing authorisation anywhere. Every figure on this page comes
            from published clinical trials run with medical supervision, screening and monitoring.
            This is educational reference material so you can understand the research — not a
            protocol to self-administer.
          </p>
        </Card>

        <section id="what-it-is" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">What retatrutide is</h2>
          <p className="text-sm text-muted-foreground">
            Retatrutide (LY3437943) is a single peptide that activates three receptors at once:
            GLP-1, GIP and glucagon. GLP-1 and GIP suppress appetite and slow gastric emptying; the
            glucagon arm is the novel part, increasing hepatic energy expenditure and fat oxidation.
            That third lever is why the Phase 2 results outran the dual agonists.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="space-y-1 p-4">
              <Utensils className="h-5 w-5 text-primary" />
              <div className="text-sm font-semibold">GLP-1 receptor</div>
              <p className="text-xs text-muted-foreground">
                Appetite suppression, slower gastric emptying, improved insulin response. The
                mechanism semaglutide relies on alone.
              </p>
            </Card>
            <Card className="space-y-1 p-4">
              <Activity className="h-5 w-5 text-primary" />
              <div className="text-sm font-semibold">GIP receptor</div>
              <p className="text-xs text-muted-foreground">
                Adds insulin sensitivity and appears to soften nausea relative to GLP-1 alone. The
                receptor tirzepatide bolted on.
              </p>
            </Card>
            <Card className="space-y-1 p-4">
              <Flame className="h-5 w-5 text-accent" />
              <div className="text-sm font-semibold">Glucagon receptor</div>
              <p className="text-xs text-muted-foreground">
                Raises energy expenditure and hepatic fat oxidation — extra output, and also the
                source of raised heart rate and fasting glucose.
              </p>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            Half-life supports once-weekly dosing. The trade-off of the third receptor is that
            glucagon agonism can push fasting glucose and heart rate up, which is manageable inside
            a monitored trial and much less so unsupervised.
          </p>
        </section>

        <section id="results" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">What the Phase 2 trials actually showed</h2>
          <p className="text-sm text-muted-foreground">
            338 adults with obesity were randomised to placebo or one of the retatrutide arms for 48
            weeks. Mean weight reduction from baseline, by arm:
          </p>
          <div className="space-y-2">
            {RESULTS.map((r) => (
              <div key={r.arm} className="flex items-center gap-3">
                <div className="w-16 shrink-0 text-sm font-medium">{r.arm}</div>
                <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary/80"
                    style={{ width: `${(r.bar / 24.2) * 100}%` }}
                  />
                </div>
                <div className="w-14 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {r.w48}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Bars show mean weight reduction at 48 weeks. At 24 weeks the same arms sat at{" "}
            {RESULTS.map((r) => `${r.arm} ${r.w24}`).join(", ")}. Source: NEJM 2023.
          </p>
          <p className="text-sm text-muted-foreground">
            Two things matter more than the headline number. First, the weight curve had not
            plateaued at 48 weeks, so the true ceiling is unknown. Second, these are means —
            individual responses spread widely in both directions, and the trial population was
            screened, supervised and supported.
          </p>
        </section>

        <section id="dosage" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Retatrutide dosage in the Phase 2 trials</h2>
          <p className="text-sm text-muted-foreground">
            The obesity trial randomised participants to 1, 4, 8 or 12 mg weekly subcutaneous
            injections, all reached by slow escalation. The escalation pattern below reflects the
            published schedule.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Step</th>
                  <th className="py-2 pr-3 font-semibold">Weekly dose</th>
                  <th className="py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {TRIAL_DOSES.map((d) => (
                  <tr key={d.step} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium text-foreground">{d.step}</td>
                    <td className="py-2 pr-3">{d.dose}</td>
                    <td className="py-2">{d.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            The single most important detail is the pace, not the ceiling. Gastrointestinal
            tolerability tracks how fast you escalate. Trial protocols held or stepped back down
            whenever nausea or vomiting appeared, and there was no benefit to rushing.
          </p>
        </section>

        <section id="timeline" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">What the arc looks like month by month</h2>
          <div className="space-y-3 border-l-2 border-border pl-4">
            {TIMELINE.map((t) => (
              <div key={t.phase} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="text-sm font-semibold">{t.phase}</div>
                <p className="text-sm text-muted-foreground">{t.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="reconstitution" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Reconstitution maths</h2>
          <p className="text-sm text-muted-foreground">
            Lyophilised vials need bacteriostatic water before anything can be measured. The whole
            calculation is one division:{" "}
            <strong>concentration (mg/mL) = vial strength (mg) ÷ BAC water added (mL)</strong>. Then{" "}
            <strong>volume to draw (mL) = dose (mg) ÷ concentration</strong>, and a U-100 insulin
            syringe has 100 units per mL.
          </p>
          <Card className="space-y-3 p-5">
            <div className="text-sm font-semibold">Worked example: 10 mg vial, 2 mL BAC water</div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">Concentration</div>
                <div className="font-semibold">10 ÷ 2 = 5 mg/mL</div>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">Volume for a 4 mg dose</div>
                <div className="font-semibold">4 ÷ 5 = 0.8 mL</div>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">Syringe units</div>
                <div className="font-semibold">0.8 × 100 = 80 units</div>
              </div>
            </div>
            <div aria-hidden="true" className="space-y-1">
              <div className="relative h-6 w-full overflow-hidden rounded-full border bg-background">
                <div className="h-full w-[80%] bg-primary/25" />
                <div className="absolute inset-y-0 left-[80%] w-0.5 bg-primary" />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100 units</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Plunger position for 80 units on a U-100 insulin syringe.
            </p>
          </Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Vial</th>
                  <th className="py-2 pr-3 font-semibold">BAC water</th>
                  <th className="py-2 pr-3 font-semibold">Concentration</th>
                  <th className="py-2 font-semibold">Example draw</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {RECON_ROWS.map((r) => (
                  <tr key={`${r.vial}-${r.bac}`} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium text-foreground">{r.vial}</td>
                    <td className="py-2 pr-3">{r.bac}</td>
                    <td className="py-2 pr-3">{r.conc}</td>
                    <td className="py-2">{r.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="pt-2 text-lg font-semibold">Step by step</h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {RECON_STEPS.map((s) => (
              <li key={s.name}>
                <strong className="text-foreground">{s.name}.</strong> {s.text}
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            Double-check the decimal place every single time. A 10× error on a milligram dose is the
            failure mode that actually hurts people.
          </p>
        </section>

        <Card className="space-y-2 border-l-4 border-l-primary p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Syringe className="h-4 w-4 text-primary" /> Let the calculator do the arithmetic
          </div>
          <p className="text-sm text-muted-foreground">
            Enter vial strength, diluent volume and your target dose and get the exact insulin
            syringe units to draw — no mental maths at the kitchen counter.
          </p>
          <Link
            to="/peptide-dosage-calculator"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            Open the peptide dosage calculator <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <section id="comparison" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Retatrutide vs tirzepatide vs semaglutide</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Compound</th>
                  <th className="py-2 pr-3 font-semibold">Receptors</th>
                  <th className="py-2 pr-3 font-semibold">Trial weight loss</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-3 font-medium text-foreground">Retatrutide</td>
                  <td className="py-2 pr-3">GLP-1 + GIP + glucagon</td>
                  <td className="py-2 pr-3">~24% at 48 weeks (12 mg)</td>
                  <td className="py-2">Investigational</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-3 font-medium text-foreground">Tirzepatide</td>
                  <td className="py-2 pr-3">GLP-1 + GIP</td>
                  <td className="py-2 pr-3">~21% at 72 weeks (15 mg)</td>
                  <td className="py-2">Approved</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-medium text-foreground">Semaglutide</td>
                  <td className="py-2 pr-3">GLP-1</td>
                  <td className="py-2 pr-3">~15% at 68 weeks (2.4 mg)</td>
                  <td className="py-2">Approved</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            These trials were never run head to head, so treat the percentages as indications of
            scale rather than a ranking. The meaningful difference is regulatory: two of the three
            can be prescribed, monitored and sourced from a pharmacy. One cannot.
          </p>
          <p className="text-sm text-muted-foreground">
            Deeper comparison:{" "}
            <Link
              to="/library/compare/semaglutide-vs-tirzepatide"
              className="text-primary hover:underline"
            >
              semaglutide vs tirzepatide
            </Link>
            .
          </p>
        </section>

        <section id="side-effects" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Side effects and how they were managed</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Effect</th>
                  <th className="py-2 pr-3 font-semibold">When it shows up</th>
                  <th className="py-2 font-semibold">Practical handling</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {SIDE_EFFECTS.map((s) => (
                  <tr key={s.effect} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium text-foreground">{s.effect}</td>
                    <td className="py-2 pr-3">{s.when}</td>
                    <td className="py-2">{s.manage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Gastric emptying also slows, which changes absorption of oral medications — including
            oral contraceptives, thyroid medication and anything with a narrow absorption window.
          </p>
        </section>

        <section id="muscle" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Protecting muscle while the weight comes off</h2>
          <p className="text-sm text-muted-foreground">
            Losing 20%+ of body weight without losing meaningful lean mass is not automatic. Across
            GLP-1-class trials a substantial share of total weight lost has been fat-free mass —
            part of it water and glycogen, part of it muscle. Three levers change the ratio:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Protein first.</strong> Roughly 1.6 g per kg of
              target body weight per day, front-loaded into meals, because total food volume is
              falling fast.
            </li>
            <li>
              <strong className="text-foreground">Resistance training 2–4× a week.</strong> The
              stimulus that tells the body which tissue to keep. Cardio does not do this job.
            </li>
            <li>
              <strong className="text-foreground">Escalate no faster than you can eat.</strong> If a
              dose step means you cannot hit protein, that step was too early.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Measure it: scale weight alone will happily hide a bad body-composition trend. Grip
            strength and your working sets are a free proxy.{" "}
            <Link
              to="/library/peptide-stacks-for-muscle-growth"
              className="text-primary hover:underline"
            >
              Muscle-support compounds
            </Link>{" "}
            are a distant third priority behind protein and training.
          </p>
        </section>

        <section id="monitoring" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Monitoring checklist</h2>
          <Card className="space-y-2 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4 text-primary" /> What trials tracked, and why
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {MONITORING.map((m) => (
                <li key={m} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {m}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section id="avoid" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Who should avoid it entirely</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {AVOID.map((a) => (
              <li key={a} className="flex gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                {a}
              </li>
            ))}
          </ul>
        </section>

        <Card className="space-y-2 border-l-4 border-l-primary p-5">
          <div className="text-sm font-semibold">Check the rest of your stack first</div>
          <p className="text-sm text-muted-foreground">
            GLP-1-class compounds interact with insulin and sulfonylureas, oral contraceptives,
            thyroid medication and anything with a narrow absorption window. Run your full routine
            before adding one.
          </p>
          <Link
            to="/interaction-checker"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            Open the interaction checker <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <section id="stopping" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Stopping, and what happens after</h2>
          <p className="text-sm text-muted-foreground">
            No withdrawal data exists for retatrutide yet, but the class pattern is consistent. In
            SURMOUNT-4, participants who had lost weight on tirzepatide and then switched to placebo
            regained roughly 14% of body weight over the next year, while those who continued kept
            losing. Appetite regulation reverts when the signal stops.
          </p>
          <p className="text-sm text-muted-foreground">
            The practical implication is that the habits built during the losing phase — protein
            intake, training, sleep, meal structure — are the part that persists. Treating the
            compound as the whole plan sets up the regain.
          </p>
        </section>

        <section id="sourcing" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Sourcing, purity and the legal picture</h2>
          <p className="text-sm text-muted-foreground">
            Retatrutide has no approved product, so there is no pharmacy version. Everything on the
            market is sold as a research chemical, and "for research use only" is a liability shield
            rather than a quality claim. Independent testing of grey-market peptides has repeatedly
            turned up:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Vials under- or over-dosed relative to the printed strength</li>
            <li>Wrong or partially degraded peptide sequences</li>
            <li>Endotoxin and bacterial contamination from non-sterile filling</li>
            <li>Residual solvents and unidentified process impurities</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            A third-party certificate of analysis matched to the specific batch number, ideally with
            HPLC purity and mass-spec identity, is the minimum evidence — and it still says nothing
            about sterility. It is also prohibited in tested sport, and importing it can breach
            medicines law in many countries.
          </p>
        </section>

        <section id="storage" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Storage and handling</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="space-y-1 p-4">
              <Thermometer className="h-5 w-5 text-primary" />
              <div className="text-sm font-semibold">Before reconstitution</div>
              <p className="text-xs text-muted-foreground">
                Lyophilised powder is the stable form. Keep it cold and dark; avoid repeated
                temperature swings and direct light.
              </p>
            </Card>
            <Card className="space-y-1 p-4">
              <Thermometer className="h-5 w-5 text-accent" />
              <div className="text-sm font-semibold">After reconstitution</div>
              <p className="text-xs text-muted-foreground">
                Refrigerate at 2–8 °C, never freeze, and respect the roughly 28-day beyond-use
                window of the bacteriostatic water. Discard anything cloudy or particulate.
              </p>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            Label every vial with concentration and mix date. Rotate injection sites so the same
            patch of subcutaneous tissue is not used week after week, and never reuse a needle.
          </p>
        </section>

        <section id="faq" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="references" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">References &amp; sources</h2>
          <p className="text-xs text-muted-foreground">
            Peer-reviewed trial publications and regulatory guidance cited on this page. Last
            reviewed {REVIEWED}.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-xs text-muted-foreground">
            {REFS.map((r) => (
              <li key={r.url}>
                {r.cite}{" "}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {r.url}
                </a>
              </li>
            ))}
          </ol>
        </section>

        <Card className="flex items-start gap-3 p-5">
          <Info className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Track GLP-1 cycles properly in DoseRoutine</p>
            <p className="text-muted-foreground">
              Reconstitution maths, titration schedules, vial inventory, injection-site rotation and
              blood-work trends in one place.
            </p>
            <Link
              to="/auth"
              className="mt-2 inline-flex items-center gap-1 font-medium text-primary"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <div className="space-y-2 text-sm">
          <div>
            See also:{" "}
            <Link
              to="/library/compare/semaglutide-vs-tirzepatide"
              className="text-primary hover:underline"
            >
              Semaglutide vs tirzepatide
            </Link>{" "}
            ·{" "}
            <Link to="/reconstitution-calculator" className="text-primary hover:underline">
              Reconstitution calculator
            </Link>{" "}
            ·{" "}
            <Link to="/dosage-units-guide" className="text-primary hover:underline">
              Dosage units guide
            </Link>{" "}
            ·{" "}
            <Link to="/library" className="text-primary hover:underline">
              Compound library
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Educational reference only, not medical advice. Retatrutide is not an approved medicine —
          do not start, stop or combine any protocol without a qualified physician.
        </p>
        <AttributionFooter sourceUrl={CANONICAL} />
      </article>
    </main>
  );
}
