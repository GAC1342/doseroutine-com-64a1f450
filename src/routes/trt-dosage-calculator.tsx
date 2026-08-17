import { faqAnchorId } from "@/lib/faq-snippet";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import {
  PeptideDosageGlossary,
  PEPTIDE_DOSAGE_GLOSSARY_JSONLD,
} from "@/components/peptide-dosage-glossary";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { SaveResultCta } from "@/components/save-result-cta";
import { TrustSafety } from "@/components/trust-safety";
import { AttributionFooter } from "@/components/attribution-footer";
import { CalculatorScopeNote } from "@/components/calculator-scope-note";
import { LAST_REVIEWED } from "@/lib/aeo-page-faqs";

const CANONICAL = "https://doseroutine.com/trt-dosage-calculator";
const TITLE = "TRT Dosage Calculator — Weekly mg to Syringe Units";
const DESC =
  "Free TRT calculator: turn weekly testosterone cypionate or enanthate mg into per-shot mL and U-100 syringe units for 100, 200 and 250 mg/mL vials.";

const FAQ = [
  {
    q: "How do I calculate my TRT dose in syringe units?",
    a: "Testosterone cypionate and enanthate are typically 200 mg/mL. Divide weekly mg by 200 to get mL per week, then divide by injections per week for mL per shot. Multiply mL × 100 for U-100 insulin syringe units. Example: 140 mg/week ÷ 200 = 0.7 mL/week. Split twice weekly = 0.35 mL = 35 units per shot.",
  },
  {
    q: "What is a typical TRT dosage?",
    a: "Clinical TRT is usually 100–200 mg/week of testosterone cypionate or enanthate, adjusted based on total and free testosterone, hematocrit, and estradiol labs. Never adjust dose without bloodwork and clinician guidance.",
  },
  {
    q: "How often should I inject testosterone?",
    a: "Half-life drives frequency. Cypionate (~8 days) and enanthate (~7 days) can be dosed once, twice, or three times weekly. More frequent smaller doses smooth blood levels and often reduce estradiol conversion. Propionate (~2 days) requires EOD or daily. Enter injections per week in the calculator to get per-shot volume.",
  },
  {
    q: "Can this calculator handle testosterone propionate or Sustanon?",
    a: "Yes. Enter your ester's concentration (mg/mL) — propionate is typically 100 mg/mL; Sustanon 250 is 250 mg/mL. The calculator returns exact mL and syringe units per shot.",
  },
  {
    q: "What syringe do most TRT users use?",
    a: "Subcutaneous TRT commonly uses a U-100 insulin syringe with 29–31 gauge, 8 mm needle. Intramuscular TRT typically uses a 23–25 gauge, 1 inch needle with a 1 or 3 mL syringe. The calculator shows units for both U-100 and U-40 syringes.",
  },
];

export const Route = createFileRoute("/trt-dosage-calculator")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      {
        property: "og:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/00598d94-f4d3-4d4e-8e9d-20b3a6b62664/og-trt.jpg",
      },
      { property: "og:image:alt", content: "DoseRoutine TRT Dosage Calculator card — testosterone cypionate mg per week, ester maths and syringe units" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      {
        name: "twitter:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/00598d94-f4d3-4d4e-8e9d-20b3a6b62664/og-trt.jpg",
      },
      { name: "twitter:image:alt", content: "DoseRoutine TRT Dosage Calculator card — testosterone cypionate mg per week, ester maths and syringe units" },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/trt-dosage-calculator")],
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
                  name: "TRT Dosage Calculator",
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
                acceptedAnswer: { "@type": "Answer", text: f.a },
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
  component: TrtCalculatorPage,
});

function TrtCalculatorPage() {
  const [weeklyMg, setWeeklyMg] = useState(140);
  const [concentration, setConcentration] = useState(200);
  const [injectionsPerWeek, setInjectionsPerWeek] = useState(2);

  const result = useMemo(() => {
    const w = Number(weeklyMg) || 0;
    const c = Number(concentration) || 1;
    const f = Math.max(1, Number(injectionsPerWeek) || 1);
    const mlPerWeek = w / c;
    const mlPerShot = mlPerWeek / f;
    const mgPerShot = w / f;
    return {
      mlPerWeek: mlPerWeek.toFixed(3),
      mlPerShot: mlPerShot.toFixed(3),
      mgPerShot: mgPerShot.toFixed(1),
      unitsU100: (mlPerShot * 100).toFixed(1),
      unitsU40: (mlPerShot * 40).toFixed(1),
    };
  }, [weeklyMg, concentration, injectionsPerWeek]);

  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader hideSignup />
      <section className="container max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center space-y-4 mb-12">
          <span className="inline-block text-xs uppercase tracking-widest text-muted-foreground">
            TRT dosage calculator
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">TRT Dosage Calculator</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Convert a weekly testosterone amount you already have into exact mL and syringe units
            per shot. Works with cypionate, enanthate, propionate, Sustanon and any ester at any
            concentration.
          </p>
          <CalculatorScopeNote className="mt-6" />
        </div>

        <Card className="mb-8">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Convert your amount</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weekly">Weekly dose (mg)</Label>
                <Input
                  id="weekly"
                  type="number"
                  min={0}
                  value={weeklyMg}
                  onChange={(e) => setWeeklyMg(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conc">Concentration (mg/mL)</Label>
                <Input
                  id="conc"
                  type="number"
                  min={1}
                  value={concentration}
                  onChange={(e) => setConcentration(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freq">Injections per week</Label>
                <Input
                  id="freq"
                  type="number"
                  min={1}
                  max={14}
                  value={injectionsPerWeek}
                  onChange={(e) => setInjectionsPerWeek(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Per shot</p>
                <p className="text-2xl font-bold">
                  {result.mgPerShot} mg · {result.mlPerShot} mL
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Syringe units
                </p>
                <p className="text-2xl font-bold">
                  {result.unitsU100}{" "}
                  <span className="text-sm font-normal text-muted-foreground">U-100</span> ·{" "}
                  {result.unitsU40}{" "}
                  <span className="text-sm font-normal text-muted-foreground">U-40</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Weekly volume: {result.mlPerWeek} mL. Educational tool — always confirm dose with your
              prescribing clinician and current bloodwork.
            </p>
          </CardContent>
        </Card>

        <SaveResultCta
          tool="trt_dosage_calculator"
          hasResult={Boolean(result)}
          title="Save this protocol"
          body="Keep your weekly amount, ester concentration and injection days in DoseRoutine — with site rotation, reminders and bloodwork tracking around them."
          action="Save this protocol"
        />

        <TrustSafety variant="safety-only" id="trt-safety" className="mt-6 mb-8" />

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            {
              title: "Cypionate 200 mg/mL",
              body: "Most common ester in the US. 140 mg/week ÷ 2 shots = 0.35 mL = 35 units U-100.",
            },
            {
              title: "Enanthate 250 mg/mL",
              body: "Common outside US. 150 mg/week ÷ 2 shots = 0.30 mL = 30 units U-100.",
            },
            {
              title: "Propionate 100 mg/mL",
              body: "Short ester. 100 mg/week ÷ 4 shots (EOD) = 0.25 mL = 25 units U-100.",
            },
          ].map((p) => (
            <Card key={p.title}>
              <CardContent className="p-6 space-y-2">
                <Syringe className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-12">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-2xl font-bold">Track your TRT protocol in DoseRoutine</h2>
            <p className="text-muted-foreground text-sm">
              This calculator gives you the number. DoseRoutine turns it into a full protocol:
              injection schedule, site rotation, vial inventory, blood work tracker, and shareable
              PDF summarys.
            </p>
            <ul className="space-y-2 text-sm">
              {[
                "Automatic SubQ / IM injection site rotation",
                "Vial inventory + refill prediction based on your weekly volume",
                "Total-T, free-T, E2, hematocrit trend charts",
                "Interaction checks with AI, anastrozole, HCG, peptides",
                "One-tap shareable PDF summary for lab review appointments",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/install">
                  Get started free <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link to="/peptide-dosage-calculator">Peptide calculator</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

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

        <div className="text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Related:{" "}
            <Link to="/calculator" className="underline">
              All calculators
            </Link>{" "}
            ·{" "}
            <Link to="/peptide-dosage-calculator" className="underline">
              Peptide dosage calculator
            </Link>{" "}
            ·{" "}
            <Link to="/peptide-reconstitution-calculator" className="underline">
              Peptide reconstitution guide
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
      <RelatedLinks currentPath="/trt-dosage-calculator" kind="calculators" />
      <p className="text-xs text-muted-foreground">
        Reviewed by the DoseRoutine editorial team. Last reviewed{" "}
        <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>.
      </p>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
