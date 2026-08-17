import { faqAnchorId } from "@/lib/faq-snippet";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Beaker, Calculator, CheckCircle2, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import {
  PeptideDosageGlossary,
  PEPTIDE_DOSAGE_GLOSSARY_JSONLD,
} from "@/components/peptide-dosage-glossary";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { CalculatorScopeNote } from "@/components/calculator-scope-note";
import { LAST_REVIEWED } from "@/lib/aeo-page-faqs";

const CANONICAL = "https://doseroutine.com/peptide-reconstitution-calculator";
const TITLE = "Peptide Reconstitution Calculator — BAC Water to Units";
const DESC =
  "Free reconstitution calculator: enter vial mg and BAC water to get mg/mL concentration plus the exact insulin syringe units per dose. No sign-up needed.";

const FAQ = [
  {
    q: "What is peptide reconstitution?",
    a: "Reconstitution is the process of dissolving a lyophilized (freeze-dried) peptide with bacteriostatic water so it becomes an injectable solution. The math tells you exactly how many syringe units equal your target dose.",
  },
  {
    q: "How much bacteriostatic water should I add to a 5 mg peptide vial?",
    a: "A common starting point is 2 mL of BAC water for a 5 mg vial. That gives a 2.5 mg/mL solution. Adding 1 mL doubles the concentration (5 mg/mL) and halves the syringe units per dose. More water = easier to measure small doses.",
  },
  {
    q: "How do I convert milligrams to insulin syringe units?",
    a: "Concentration (mg/mL) = vial mg ÷ BAC water mL. Volume (mL) = dose mg ÷ concentration. On a U-100 insulin syringe, 1 mL = 100 units, so multiply mL by 100. Example: 0.25 mg from a 2.5 mg/mL solution = 0.1 mL = 10 units on U-100.",
  },
  {
    q: "What syringe should I use for peptides?",
    a: "Most subcutaneous peptides use a U-100 insulin syringe with a 29–31 gauge, 5/16 inch (8 mm) needle. U-40 syringes exist but are less common in peptide use — the calculator supports both.",
  },
  {
    q: "How many doses are in one vial?",
    a: "Divide total mg by your dose. A 10 mg BPC-157 vial dosed at 0.25 mg per injection gives 40 doses. A 5 mg semaglutide vial dosed at 0.25 mg gives 20 weekly doses.",
  },
];

export const Route = createFileRoute("/peptide-reconstitution-calculator")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      {
        property: "og:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/b9325b4d-548c-4104-a32b-26cb10e9f4e8/og-peptide-reconstitution.jpg",
      },
      { property: "og:image:alt", content: "DoseRoutine Peptide Reconstitution Calculator card — reconstitution maths, BAC water volume and syringe units" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      {
        name: "twitter:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/b9325b4d-548c-4104-a32b-26cb10e9f4e8/og-peptide-reconstitution.jpg",
      },
      { name: "twitter:image:alt", content: "DoseRoutine Peptide Reconstitution Calculator card — reconstitution maths, BAC water volume and syringe units" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/peptide-reconstitution-calculator"),
    ],
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
                  name: "Peptide Reconstitution Calculator",
                  item: CANONICAL,
                },
              ],
            },
            {
              "@type": "FAQPage",
              "@id": `${CANONICAL}#faq`,
              url: CANONICAL,
              inLanguage: "en",
              isPartOf: { "@id": "https://doseroutine.com/#website" },
              mainEntity: FAQ.map((f) => ({
                "@type": "Question",
                "@id": `${CANONICAL}#${faqAnchorId(f.q)}`,
                url: `${CANONICAL}#${faqAnchorId(f.q)}`,
                name: f.q,
                inLanguage: "en",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: f.a,
                  inLanguage: "en",
                },
              })),
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
  component: ReconstitutionPage,
});

function ReconstitutionPage() {
  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <section className="container max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center space-y-4 mb-12">
          <span className="inline-block text-xs uppercase tracking-widest text-muted-foreground">
            Peptide reconstitution guide
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Peptide Reconstitution Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enter vial size and BAC water volume to get exact mg/mL concentration, syringe units per
            dose, and doses remaining. Works with BPC-157, TB-500, semaglutide, tirzepatide,
            ipamorelin, CJC-1295 and any research peptide.
          </p>
          <CalculatorScopeNote className="mt-2" />
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button size="lg" asChild>
              <Link to="/peptide-dosage-calculator">
                Open the calculator <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/install">Get the app</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            {
              icon: Beaker,
              label: "1. Vial size",
              body: "Enter total mg in the vial (e.g. 5 mg or 10 mg BPC-157).",
            },
            {
              icon: Calculator,
              label: "2. BAC water",
              body: "Enter mL of bacteriostatic water you'll add (usually 2 mL).",
            },
            {
              icon: Syringe,
              label: "3. Dose",
              body: "Enter target dose in mg or mcg. Get exact units for U-100 / U-40.",
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-6 space-y-2">
                <s.icon className="w-6 h-6 text-primary" />
                <h2 className="font-semibold">{s.label}</h2>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-12">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-2xl font-bold">The reconstitution formula</h2>
            <p className="text-muted-foreground text-sm">Three equations do all the work:</p>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="font-semibold">Concentration (mg/mL)</span> = vial mg ÷ BAC water
                mL
              </li>
              <li>
                <span className="font-semibold">Volume per dose (mL)</span> = dose mg ÷
                concentration
              </li>
              <li>
                <span className="font-semibold">Syringe units (U-100)</span> = volume mL × 100
              </li>
            </ul>
            <p className="text-sm">
              <span className="font-semibold">Example:</span> 5 mg BPC-157 + 2 mL BAC water = 2.5
              mg/mL. A 0.25 mg dose = 0.1 mL = 10 units on U-100.
            </p>
            <Button asChild>
              <Link to="/peptide-dosage-calculator">
                Skip the math — use the calculator <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Common peptide presets</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              "BPC-157 — 5 mg vial / 2 mL BAC / 0.25 mg dose",
              "TB-500 — 5 mg vial / 2 mL BAC / 2.5 mg dose",
              "Semaglutide — 5 mg vial / 2.5 mL BAC / 0.25 mg dose",
              "Tirzepatide — 10 mg vial / 2 mL BAC / 2.5 mg dose",
              "Ipamorelin — 5 mg vial / 2 mL BAC / 0.2 mg dose",
              "CJC-1295 — 2 mg vial / 2 mL BAC / 0.1 mg dose",
            ].map((p) => (
              <div key={p} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <Card key={f.q} id={faqAnchorId(f.q)} className="scroll-mt-24">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="glossary" className="mb-12 scroll-mt-24">
          <PeptideDosageGlossary />
        </section>

        <div className="text-center space-y-4 py-8 border-t">
          <h2 className="text-2xl font-bold">Track every dose in DoseRoutine</h2>
          <p className="text-muted-foreground">
            Reconstitution + dose logging + interaction checks + injection site rotation, all in one
            app.
          </p>
          <Button size="lg" asChild>
            <Link to="/install">
              Get started free <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground pt-4">
            Related:{" "}
            <Link to="/calculator" className="underline">
              All calculators
            </Link>{" "}
            ·{" "}
            <Link to="/peptide-dosage-calculator" className="underline">
              Peptide dosage calculator
            </Link>{" "}
            ·{" "}
            <Link to="/trt-dosage-calculator" className="underline">
              TRT dosage calculator
            </Link>{" "}
            ·{" "}
            <Link to="/dosage-units-guide" className="underline">
              Dosage units guide
            </Link>{" "}
            ·{" "}
            <Link to="/vs/medisafe" className="underline">
              Medisafe alternative
            </Link>
          </p>
        </div>
      </section>
      <RelatedLinks currentPath="/peptide-reconstitution-calculator" kind="calculators" />
      <p className="text-xs text-muted-foreground">
        Reviewed by the DoseRoutine editorial team. Last reviewed{" "}
        <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>.
      </p>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
