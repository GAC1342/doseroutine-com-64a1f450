import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import {
  PeptideDosageGlossary,
  PEPTIDE_DOSAGE_GLOSSARY_JSONLD,
} from "@/components/peptide-dosage-glossary";

function faqSlug(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}
function faqAnchorId(q: string): string {
  return `faq-${faqSlug(q)}`;
}
import {
  ArrowRight,
  Beaker,
  Calculator,
  CheckCircle2,
  Clock,
  Download,
  Droplets,
  FlaskConical,
  HelpCircle,
  Info,
  Pill,
  ShieldCheck,
  Syringe,
} from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { SaveResultCta } from "@/components/save-result-cta";
import { TrustSafety } from "@/components/trust-safety";
import { FounderNotes } from "@/components/founder-notes";
import { AttributionFooter } from "@/components/attribution-footer";
import { CalculatorScopeNote } from "@/components/calculator-scope-note";
import { LAST_REVIEWED } from "@/lib/aeo-page-faqs";

const CANONICAL = "https://doseroutine.com/peptide-dosage-calculator";
const TITLE = "Peptide Dosage Calculator — mg to Syringe Units Fast";
const DESC =
  "Free peptide dosage calculator: enter your mg dose and vial strength to get exact U-100 or U-40 syringe units for BPC-157, TB-500, semaglutide and more.";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is peptide reconstitution?",
    a: "Peptide reconstitution means mixing freeze-dried peptide powder with bacteriostatic water so it becomes a liquid you can draw into a syringe. The amount of water you add changes the concentration, which is why dose calculations matter.",
  },
  {
    q: "How much bacteriostatic water should I add to a 5mg peptide vial?",
    a: "A common starting point is 2 mL of BAC water per 5 mg of peptide. This gives 2.5 mg/mL, or 2500 mcg/mL. Add 1 mL for a stronger 5 mg/mL mix, or 3 mL for a gentler 1.67 mg/mL mix. Use the calculator above to try any volume and see the exact units to draw.",
  },
  {
    q: "How much bacteriostatic water for a 10mg peptide vial?",
    a: "2 mL of BAC water in a 10 mg vial gives 5 mg/mL (5000 mcg/mL). A 250 mcg dose is 0.05 mL, or 5 units on a U-100 insulin syringe. Many people use 2 mL for BPC-157, TB-500 and Ipamorelin 10 mg vials because the math is clean.",
  },
  {
    q: "How do I convert my peptide dose to insulin syringe units?",
    a: "Find your concentration in mg/mL, divide your target dose by that concentration to get mL, then multiply by 100 for a U-100 insulin syringe (or by 40 for a U-40 syringe). Example: 0.25 mg ÷ 2.5 mg/mL = 0.1 mL = 10 units on U-100.",
  },
  {
    q: "How many doses are in a peptide vial?",
    a: "Divide the total vial milligrams by your dose in milligrams. A 5 mg vial at 0.25 mg per dose gives 20 doses. A 10 mg vial at the same dose gives 40 doses. The calculator above shows this automatically.",
  },
  {
    q: "How do I calculate a semaglutide dose in units?",
    a: "Semaglutide is dosed in milligrams but drawn in units. If a 5 mg vial is reconstituted with 2 mL of BAC water, that is 2.5 mg/mL. A 0.25 mg starting dose = 0.1 mL = 10 units on a U-100 insulin syringe. A 0.5 mg dose = 20 units. A 1 mg dose = 40 units.",
  },
  {
    q: "How do I calculate a tirzepatide dose in units?",
    a: "For a 10 mg tirzepatide vial reconstituted with 2 mL of BAC water (5 mg/mL): a 2.5 mg starting dose = 0.5 mL = 50 units on a U-100 insulin syringe. A 5 mg dose = 100 units (a full 1 mL insulin syringe). Many users split into two smaller draws for higher doses.",
  },
  {
    q: "What is the correct BPC-157 dosage?",
    a: "Common research-cited BPC-157 doses range from 200 to 500 mcg per day. With a 5 mg vial reconstituted in 2 mL of BAC water (2.5 mg/mL), 250 mcg = 0.1 mL = 10 units on a U-100 syringe. Always follow guidance from a licensed clinician.",
  },
  {
    q: "How do I dose TB-500 (thymosin beta-4)?",
    a: "Research protocols commonly cite 2–2.5 mg of TB-500 twice weekly during a loading phase, then a maintenance dose. A 5 mg vial in 2 mL BAC water (2.5 mg/mL) means 2.5 mg = 1 mL = 100 units on a U-100 syringe.",
  },
  {
    q: "How do I calculate an Ipamorelin dose?",
    a: "Typical Ipamorelin protocols use 200–300 mcg per injection, 1–3 times daily. With a 5 mg vial in 2 mL of BAC water (2.5 mg/mL), 300 mcg = 0.12 mL = 12 units on a U-100 insulin syringe.",
  },
  {
    q: "What is the difference between a U-100 and U-40 insulin syringe?",
    a: "A U-100 syringe has 100 units per mL. A U-40 syringe has 40 units per mL. If you use a U-40 syringe with a U-100 concentration you will under-dose by 60%. Always confirm which syringe you have — the calculator above supports both.",
  },
  {
    q: "How long does a reconstituted peptide last in the fridge?",
    a: "Once mixed with bacteriostatic water, most peptides are considered stable for roughly 28 days refrigerated at 2–8°C (36–46°F). Sensitive peptides like GLP-1s and BPC-157 are often used within 30 days. Keep vials upright, protected from light, and never freeze after reconstitution unless the manufacturer specifies it.",
  },
  {
    q: "Can I use sterile water instead of bacteriostatic water?",
    a: "Sterile water has no preservative, so a reconstituted vial should be used within 24 hours. Bacteriostatic water contains 0.9% benzyl alcohol which inhibits bacterial growth and extends usable life to roughly 28 days refrigerated. Bacteriostatic water is the standard choice for multi-dose peptide vials.",
  },
  {
    q: "What does a peptide reconstitution calculator do?",
    a: "A peptide reconstitution calculator converts a target dose in milligrams or micrograms into the exact volume to draw on an insulin syringe, based on how much bacteriostatic water you added to the vial. It also shows the resulting concentration in mg/mL and how many doses the vial contains.",
  },
  {
    q: "Do I need to create an account to use this calculator?",
    a: "No. The reconstitution and dose calculator on this page runs entirely in your browser and requires no signup. Enter the vial strength, BAC water volume and target dose to get the syringe units instantly.",
  },
  {
    q: "How can I track peptide injections over time?",
    a: "To keep a record of each injection, most people use a dose-tracking app that supports vial inventory, injection site rotation and reminder alarms. That way the calculator handles the math and the tracker handles the schedule and history.",
  },
];

// Build-time validation: FAQ anchor slugs must stay in sync with the
// FAQPage JSON-LD @id / url values and the rendered DOM `id` attributes.
// This runs at module load (SSR prerender + client hydration). Any mismatch
// throws before the page renders, failing the build instead of silently
// shipping broken deep links or invalid structured data.
(() => {
  const slugPattern = /^faq-[a-z0-9-]+$/;
  const seen = new Map<string, string>();
  for (const { q } of FAQS) {
    if (!q || !q.trim()) {
      throw new Error(`[peptide-dosage-calculator] FAQ has empty question`);
    }
    const anchor = faqAnchorId(q);
    if (!slugPattern.test(anchor)) {
      throw new Error(
        `[peptide-dosage-calculator] FAQ anchor "${anchor}" for "${q}" does not match ${slugPattern}`,
      );
    }
    if (anchor === "faq-" || anchor.length <= 4) {
      throw new Error(
        `[peptide-dosage-calculator] FAQ anchor "${anchor}" for "${q}" is empty after slugification`,
      );
    }
    const prior = seen.get(anchor);
    if (prior) {
      throw new Error(
        `[peptide-dosage-calculator] FAQ anchor collision "${anchor}": "${prior}" vs "${q}". Reword one question so slugs stay unique across FAQPage @id, url, and DOM id.`,
      );
    }
    seen.set(anchor, q);
    const expectedJsonLdId = `${CANONICAL}#${anchor}`;
    if (!expectedJsonLdId.startsWith(CANONICAL + "#faq-")) {
      throw new Error(
        `[peptide-dosage-calculator] JSON-LD @id "${expectedJsonLdId}" drifted from CANONICAL "${CANONICAL}"`,
      );
    }
  }
})();

export const Route = createFileRoute("/peptide-dosage-calculator")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      {
        title: TITLE,
      },
      {
        name: "description",
        content: DESC,
      },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      {
        property: "og:title",
        content: TITLE,
      },
      {
        property: "og:description",
        content: DESC,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      {
        property: "og:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/54b2292e-1413-4a1a-a698-4830fdf1a008/og-peptide-dosage.jpg",
      },
      { property: "og:image:alt", content: "DoseRoutine Peptide Dosage Calculator card — reconstitution maths, BAC water volume and syringe units" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: TITLE,
      },
      {
        name: "twitter:description",
        content: DESC,
      },
      {
        name: "twitter:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/54b2292e-1413-4a1a-a698-4830fdf1a008/og-peptide-dosage.jpg",
      },
      { name: "twitter:image:alt", content: "DoseRoutine Peptide Dosage Calculator card — reconstitution maths, BAC water volume and syringe units" },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/peptide-dosage-calculator")],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              dateModified: LAST_REVIEWED,
              datePublished: "2026-01-15",
              speakable: {
                "@type": "SpeakableSpecification",
                cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
              },
              "@id": `${CANONICAL}#webpage`,
              url: CANONICAL,
              name: TITLE,
              description: DESC,
              inLanguage: "en",
              isPartOf: { "@id": "https://doseroutine.com/#website" },
              breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
              primaryImageOfPage: undefined,
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${CANONICAL}#breadcrumb`,
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://doseroutine.com/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Calculators",
                  item: "https://doseroutine.com/calculator",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Peptide Dosage Calculator",
                  item: CANONICAL,
                },
              ],
            },
            {
              "@type": "WebApplication",
              dateModified: LAST_REVIEWED,
              datePublished: "2026-01-15",
              "@id": `${CANONICAL}#app`,
              name: "DoseRoutine Peptide Reconstitution & Dosage Calculator",
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web",
              url: CANONICAL,
              isPartOf: { "@id": "https://doseroutine.com/#website" },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
              },
              description:
                "Free peptide reconstitution calculator for BAC water volume, mg/mL concentration, insulin syringe units and doses per vial.",
              featureList: [
                "Peptide reconstitution calculator",
                "Insulin syringe unit conversion",
                "Doses per vial estimator",
                "Common peptide presets",
                "Mobile dose tracking",
              ],
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${CANONICAL}#faq`,
          url: CANONICAL,
          inLanguage: "en",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            "@id": `${CANONICAL}#${faqAnchorId(f.q)}`,
            url: `${CANONICAL}#${faqAnchorId(f.q)}`,
            name: f.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.a,
              inLanguage: "en",
            },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "@id": `${CANONICAL}#howto-reconstitute`,
          name: "How to reconstitute and inject a peptide",
          description:
            "Reconstitute a lyophilized peptide vial with bacteriostatic water, calculate mg/mL concentration, and draw the correct dose on a U-100 or U-40 insulin syringe.",
          inLanguage: "en",
          totalTime: "PT5M",
          supply: [
            { "@type": "HowToSupply", name: "Lyophilized peptide vial" },
            { "@type": "HowToSupply", name: "Bacteriostatic water" },
            { "@type": "HowToSupply", name: "Alcohol swabs" },
          ],
          tool: [
            { "@type": "HowToTool", name: "U-100 or U-40 insulin syringe" },
            { "@type": "HowToTool", name: "DoseRoutine peptide dosage calculator", url: CANONICAL },
          ],
          step: [
            {
              "@type": "HowToStep",
              position: 1,
              name: "Add BAC water",
              url: `${CANONICAL}#step-add-bac-water`,
              text: "Inject bacteriostatic water slowly down the inside of the vial. Do not shake — swirl gently until the powder fully dissolves.",
            },
            {
              "@type": "HowToStep",
              position: 2,
              name: "Find concentration",
              url: `${CANONICAL}#step-find-concentration`,
              text: "Divide peptide milligrams by BAC water milliliters to get mg/mL. Example: 5 mg ÷ 2 mL = 2.5 mg/mL.",
            },
            {
              "@type": "HowToStep",
              position: 3,
              name: "Draw your dose",
              url: `${CANONICAL}#step-draw-dose`,
              text: "Use the calculator to convert your target dose into mL and insulin syringe units (U-100 or U-40), then draw and inject subcutaneously.",
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          ...PEPTIDE_DOSAGE_GLOSSARY_JSONLD,
          "@id": `${CANONICAL}#glossary`,
          url: `${CANONICAL}#glossary`,
        }),
      },
    ],
  }),
  component: PeptideDosageCalculatorPage,
});

type DoseUnit = "mcg" | "mg";
type SyringeType = "U-100" | "U-40";

const PRESETS: Array<{
  label: string;
  vialMg: number;
  bacMl: number;
  doseValue: number;
  doseUnit: DoseUnit;
}> = [
  { label: "BPC-157 5 mg", vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
  { label: "TB-500 5 mg", vialMg: 5, bacMl: 2, doseValue: 2, doseUnit: "mg" },
  { label: "Semaglutide 5 mg", vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
  { label: "Tirzepatide 10 mg", vialMg: 10, bacMl: 2, doseValue: 2.5, doseUnit: "mg" },
  { label: "Ipamorelin 5 mg", vialMg: 5, bacMl: 2, doseValue: 200, doseUnit: "mcg" },
  { label: "CJC-1295 2 mg", vialMg: 2, bacMl: 2, doseValue: 100, doseUnit: "mcg" },
];

const FEATURES = [
  {
    icon: Calculator,
    title: "Instant reconstitution math",
    body: "Enter vial milligrams and BAC water volume. See mg/mL, mL per dose and insulin units in one tap.",
  },
  {
    icon: Droplets,
    title: "U-100 & U-40 syringes",
    body: "Switch between common insulin syringe types so your draw matches the needle you actually own.",
  },
  {
    icon: FlaskConical,
    title: "Peptide presets",
    body: "Start faster with BPC-157, TB-500, semaglutide, tirzepatide, ipamorelin and CJC-1295 presets.",
  },
  {
    icon: Clock,
    title: "Track every dose",
    body: "Download DoseRoutine to log each injection, set reminders and never miss a scheduled dose.",
  },
  {
    icon: ShieldCheck,
    title: "Interaction checks",
    body: "See how peptides, supplements and medications interact before you combine them in one stack.",
  },
  {
    icon: Pill,
    title: "Vial inventory",
    body: "Know exactly how many doses remain and when to reorder so you never run out mid-cycle.",
  },
];

function PeptideDosageCalculatorPage() {
  const [vialMg, setVialMg] = useState<number>(5);
  const [bacMl, setBacMl] = useState<number>(2);
  const [doseValue, setDoseValue] = useState<number>(250);
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("mcg");
  const [syringe, setSyringe] = useState<SyringeType>("U-100");

  const result = useMemo(() => {
    if (!vialMg || !bacMl || !doseValue) return null;
    const doseMg = doseUnit === "mcg" ? doseValue / 1000 : doseValue;
    const mgPerMl = vialMg / bacMl;
    const mlPerDose = doseMg / mgPerMl;
    const unitsPerMl = syringe === "U-100" ? 100 : 40;
    const units = mlPerDose * unitsPerMl;
    const dosesPerVial = vialMg / doseMg;
    return {
      mgPerMl,
      mlPerDose,
      units,
      dosesPerVial,
      warn: units > unitsPerMl,
    };
  }, [vialMg, bacMl, doseValue, doseUnit, syringe]);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setVialMg(p.vialMg);
    setBacMl(p.bacMl);
    setDoseValue(p.doseValue);
    setDoseUnit(p.doseUnit);
  };

  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader hideSignup />
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"
          >
            <FlaskConical className="h-5 w-5 text-primary" />
            DoseRoutine
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/library"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Library
            </Link>
            <Link
              to="/interaction-checker"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Interaction checker
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className="bg-gradient-to-b from-card to-background px-5 pb-12 pt-12 sm:pb-16 sm:pt-16">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground sm:text-sm">
              <Beaker className="h-3.5 w-3.5 text-primary" />
              Free peptide calculator
            </div>
            <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
              Peptide reconstitution &amp; dosage calculator
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Convert BAC water volume, mg/mL concentration and insulin syringe units for any
              peptide vial. Then track every entry, set reminders and check interactions inside
              DoseRoutine.
            </p>
            <CalculatorScopeNote className="mt-6" />
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="gap-2 px-7 text-base">
                  <Download className="h-4 w-4" />
                  Download DoseRoutine
                </Button>
              </Link>
              <Link to="/reconstitution-calculator">
                <Button size="lg" variant="outline" className="gap-2 px-7 text-base">
                  Open full calculator <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              7-day free trial. Cancel anytime. No credit card required to start.
            </p>
          </div>
        </section>

        {/* Calculator */}
        <section className="px-5 pb-16 pt-4" aria-labelledby="calculator-heading">
          <div className="mx-auto max-w-4xl">
            <Card className="overflow-hidden border-border shadow-lg">
              <CardHeader className="bg-muted/50">
                <h2
                  id="calculator-heading"
                  className="flex items-center gap-2 font-display text-xl font-semibold leading-none tracking-tight"
                >
                  <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
                  Peptide dose calculator
                </h2>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Presets */}
                <div>
                  <Label className="mb-2 block text-sm font-medium">Common peptide presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="vial-mg">Vial size (mg)</Label>
                    <Input
                      id="vial-mg"
                      type="number"
                      min={0}
                      step={0.1}
                      value={vialMg}
                      onChange={(e) => setVialMg(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bac-ml">BAC water (mL)</Label>
                    <Input
                      id="bac-ml"
                      type="number"
                      min={0}
                      step={0.1}
                      value={bacMl}
                      onChange={(e) => setBacMl(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dose">Target dose</Label>
                    <div className="flex gap-2">
                      <Input
                        id="dose"
                        type="number"
                        min={0}
                        step={doseUnit === "mcg" ? 1 : 0.01}
                        value={doseValue}
                        onChange={(e) => setDoseValue(parseFloat(e.target.value) || 0)}
                        className="flex-1"
                      />
                      <select
                        aria-label="Dose unit"
                        value={doseUnit}
                        onChange={(e) => setDoseUnit(e.target.value as DoseUnit)}
                        className="rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="mcg">mcg</option>
                        <option value="mg">mg</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="syringe">Syringe type</Label>
                    <select
                      id="syringe"
                      value={syringe}
                      onChange={(e) => setSyringe(e.target.value as SyringeType)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="U-100">U-100 (100 units/mL)</option>
                      <option value="U-40">U-40 (40 units/mL)</option>
                    </select>
                  </div>
                </div>

                {result && (
                  <div className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Concentration</p>
                      <p className="font-display text-xl font-semibold text-foreground">
                        {result.mgPerMl.toFixed(3)} mg/mL
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Volume per dose</p>
                      <p className="font-display text-xl font-semibold text-foreground">
                        {result.mlPerDose.toFixed(3)} mL
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Syringe units</p>
                      <p className="font-display text-xl font-semibold text-foreground">
                        {result.units.toFixed(1)} units
                      </p>
                      {result.warn && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                          <Info className="h-3 w-3" /> Exceeds one full syringe
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Doses per vial</p>
                      <p className="font-display text-xl font-semibold text-foreground">
                        {result.dosesPerVial.toFixed(1)}
                      </p>
                    </div>
                  </div>
                )}

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  This calculator is for educational purposes only. Always verify doses with your
                  prescribing clinician and follow sterile reconstitution practices.
                </p>
              </CardContent>
            </Card>

            <SaveResultCta
              tool="peptide_dosage_calculator"
              hasResult={Boolean(result)}
              title="Save this calculation"
              body="Keep this vial and dose setup in your account — DoseRoutine counts doses remaining, reminds you when to inject, and checks interactions across your whole stack."
              action="Save this calculation"
            />

            <TrustSafety variant="safety-only" id="peptide-dosage-safety" className="mt-6" />
          </div>
        </section>

        {/* Feature grid */}
        <section className="border-t border-border bg-card cv-auto px-5 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                Why use DoseRoutine for peptide dosing?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                A calculator gets the math right. DoseRoutine keeps the whole protocol on track.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-border bg-background p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-display font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="cv-auto px-5 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                How peptide reconstitution works
              </h2>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Add BAC water",
                  body: "Inject bacteriostatic water slowly down the inside of the vial. Do not shake — swirl gently until the powder dissolves.",
                },
                {
                  step: "2",
                  title: "Find concentration",
                  body: "Divide the peptide milligrams by the BAC water milliliters. Example: 5 mg ÷ 2 mL = 2.5 mg/mL.",
                },
                {
                  step: "3",
                  title: "Draw your dose",
                  body: "Use the calculator to convert your target dose into mL and insulin syringe units. Log each dose in DoseRoutine.",
                },
              ].map((item) => (
                <Card key={item.step} className="relative border-border p-6">
                  <span className="absolute -top-3 left-6 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {item.step}
                  </span>
                  <h3 className="mt-2 font-display font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Mid-page CTA */}
        <section className="cv-auto px-5 pb-16">
          <div className="mx-auto max-w-4xl rounded-2xl bg-primary px-6 py-10 text-center text-primary-foreground sm:px-12 sm:py-14">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              Stop guessing peptide doses
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">
              Join thousands tracking peptides, supplements and medications in one clean daily
              routine. Start your 7-day free trial today.
            </p>
            <Link to="/auth" className="mt-6 inline-block">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 bg-background text-foreground hover:bg-background/90"
              >
                <Download className="h-4 w-4" />
                Download DoseRoutine
              </Button>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section
          className="border-t border-border bg-card cv-auto px-5 py-16"
          aria-labelledby="faq-heading"
        >
          <div className="mx-auto max-w-3xl">
            <h2
              id="faq-heading"
              className="text-center font-display text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Frequently asked questions
            </h2>
            <div className="mt-8 space-y-4">
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="cv-auto px-5 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
              Ready to track your peptide protocol?
            </h2>
            <p className="mt-3 text-muted-foreground">
              DoseRoutine turns reconstitution math, dose reminders, interaction checks and vial
              inventory into one simple app.
            </p>
            <ul className="mx-auto mt-6 inline-block text-left text-sm text-muted-foreground">
              {[
                "Reconstitution + dosage calculators",
                "Dose reminders with calendar export",
                "Interaction checker for 475+ compounds",
                "Vial inventory and refill alerts",
                "Shareable summaries",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 py-1">
                  <CheckCircle2 className="h-4 w-4 text-synergy" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link to="/auth">
                <Button size="lg" className="gap-2 px-8 text-base">
                  <Download className="h-4 w-4" />
                  Start free 7-day trial
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Available on iOS and Android. Cancel anytime.
            </p>
          </div>
        </section>

        {/* Peptide dosage glossary */}
        <section id="glossary" className="border-t border-border cv-auto px-5 py-12 scroll-mt-24">
          <div className="mx-auto max-w-5xl">
            <PeptideDosageGlossary />
          </div>
        </section>

        {/* Related resources */}
        <section className="border-t border-border cv-auto px-5 py-10">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-4 text-xl font-semibold">Related calculators & guides</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                to="/calculator"
                className="rounded-lg border border-border p-4 hover:border-primary"
              >
                <div className="font-semibold">All Calculators</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse every free dosing calculator in one place.
                </p>
              </Link>
              <Link
                to="/peptide-reconstitution-calculator"
                className="rounded-lg border border-border p-4 hover:border-primary"
              >
                <div className="font-semibold">Peptide Reconstitution Calculator</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  BAC water math, mg/mL and syringe units — step-by-step guide with FAQ.
                </p>
              </Link>
              <Link
                to="/trt-dosage-calculator"
                className="rounded-lg border border-border p-4 hover:border-primary"
              >
                <div className="font-semibold">TRT Dosage Calculator</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Weekly testosterone mg to per-shot mL and U-100 units for cypionate, enanthate &
                  more.
                </p>
              </Link>
              <Link
                to="/dosage-units-guide"
                className="rounded-lg border border-border p-4 hover:border-primary"
              >
                <div className="font-semibold">Dosage Units Guide</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  U-100 vs U-40, sterile vs BAC water, and reconstitution basics in plain English.
                </p>
              </Link>
            </div>
          </div>
        </section>
        <FounderNotes
          notes={[
            {
              title: "Titration schedules fall apart without a reminder",
              body:
                "Every protocol I have tried assumes you remember which week of the ramp you are in. I did not. Tracking the planned step alongside the actual logged dose is how I found out I had spent an extra three weeks at a starting dose because I never actioned the increase.",
            },
            {
              title: "Round to something the syringe can show",
              body:
                "Calculators happily return 137.5 mcg. My syringe cannot. I now round to the nearest half unit and record the rounded number as the real dose, because otherwise my logged history slowly drifts away from what I actually injected.",
            },
            {
              title: "Body weight inputs age faster than you expect",
              body:
                "For weight-based dosing I re-check the input monthly. After a 14 lb change my calculated dose was noticeably off from what I was still injecting out of habit — the number in the calculator had been right on the day I typed it and wrong ever since.",
            },
          ]}
        />
        <RelatedLinks currentPath="/peptide-dosage-calculator" kind="calculators" />
        <p className="text-xs text-muted-foreground">
          Reviewed by the DoseRoutine editorial team. Last reviewed{" "}
          <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>.
        </p>
        <AttributionFooter sourceUrl={CANONICAL} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-5 py-8">
        <div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} DoseRoutine. This page is for educational purposes
            only and does not constitute medical advice.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/legal" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/medical-disclaimer" className="hover:text-foreground">
              Medical Disclaimer
            </Link>
            <Link to="/help" className="hover:text-foreground">
              Help Center
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const id = faqAnchorId(q);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const openIfMatch = () => {
      if (typeof window === "undefined") return;
      if (window.location.hash === `#${id}` && detailsRef.current) {
        detailsRef.current.open = true;
        detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    openIfMatch();
    window.addEventListener("hashchange", openIfMatch);
    return () => window.removeEventListener("hashchange", openIfMatch);
  }, [id]);

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
    if (history.replaceState) {
      history.replaceState(null, "", `#${id}`);
    } else {
      window.location.hash = id;
    }
    if (detailsRef.current) detailsRef.current.open = true;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <details
      ref={detailsRef}
      id={id}
      className="group rounded-xl border border-border bg-background px-5 py-4 scroll-mt-24"
    >
      {/* The copy-link control lives in the answer body, not inside <summary>:
       * a link nested in a summary is a nested interactive control and breaks
       * keyboard/AT expectations (axe: nested-interactive). */}
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground">
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" aria-hidden="true" />
          {q}
        </span>
        <span
          className="ml-auto text-muted-foreground group-open:rotate-180 transition-transform"
          aria-hidden="true"
        >
          ▼
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
      <a
        href={`#${id}`}
        onClick={copyLink}
        aria-label={`Copy link to question: ${q}`}
        title={copied ? "Link copied" : "Copy link to this question"}
        className="mt-3 inline-flex items-center gap-1.5 rounded p-1 text-xs text-muted-foreground underline underline-offset-4 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        {copied ? "Link copied" : "Copy link"}
      </a>

    </details>
  );
}
