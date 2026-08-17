import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Beaker,
  Calculator,
  ChevronRight,
  Droplets,
  FlaskConical,
  Home,
  Syringe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import {
  PeptideDosageGlossary,
  PEPTIDE_DOSAGE_GLOSSARY_JSONLD,
} from "@/components/peptide-dosage-glossary";
import { RelatedLinks } from "@/components/related-links";
import { AttributionFooter } from "@/components/attribution-footer";
import { LAST_REVIEWED } from "@/lib/aeo-page-faqs";

const CANONICAL = "https://doseroutine.com/calculator";
const TITLE = "Peptide, TRT & Reconstitution Calculators — Free";
const DESC =
  "Free dosing calculators for peptides, TRT and reconstitution. Convert mg to U-100 syringe units, plan vials, then track the routine in DoseRoutine.";

const CALCULATORS = [
  {
    to: "/peptide-dosage-calculator",
    label: "Peptide Dosage Calculator",
    description:
      "Turn any peptide dose into exact syringe units. Works for BPC-157, TB-500, semaglutide, tirzepatide, and more.",
    icon: Calculator,
  },
  {
    to: "/peptide-reconstitution-calculator",
    label: "Peptide Reconstitution Calculator",
    description:
      "Plan how much bacteriostatic water to add and see concentration, units per dose, and doses per vial.",
    icon: Droplets,
  },
  {
    to: "/trt-dosage-calculator",
    label: "TRT Dosage Calculator",
    description:
      "Convert weekly testosterone cypionate or enanthate dose into per-shot volume and syringe units.",
    icon: Syringe,
  },
];

const FAQ_GROUPS = [
  {
    heading: "General",
    items: [
      {
        q: "Are these calculators free?",
        a: "Yes. Every calculator on this page is free to use, with no sign-up required. They are built for research, harm reduction, and accurate dosing.",
      },
      {
        q: "Which calculator should I use first?",
        a: "Start with the Peptide Reconstitution Calculator if you are mixing a new vial. Then use the Peptide Dosage Calculator to plan each injection. For testosterone protocols, use the TRT Dosage Calculator.",
      },
      {
        q: "Do the calculators work on mobile?",
        a: "Yes. All calculators are responsive and work on iPhone, Android, and desktop browsers — no app install required.",
      },
      {
        q: "Are the results medical advice?",
        a: "No. These tools are for educational and research reference only. Always confirm dosing with a licensed clinician before injecting any peptide, hormone, or medication.",
      },
    ],
  },
  {
    heading: "Peptide reconstitution",
    items: [
      {
        q: "How much bacteriostatic water should I add to a 5 mg peptide vial?",
        a: "Most users add 1 mL, 2 mL, or 3 mL of BAC water to a 5 mg vial. 2 mL is the common default: it makes each 10 unit mark on a U-100 insulin syringe equal 0.25 mg (250 mcg) — easy math for BPC-157, TB-500, and GHK-Cu.",
      },
      {
        q: "How do I convert mg to insulin syringe units after reconstitution?",
        a: "Units = (dose in mg ÷ total mg in vial) × total units of BAC water added. On a U-100 syringe, 1 mL = 100 units. The Peptide Reconstitution Calculator does this automatically and shows units per dose and doses per vial.",
      },
      {
        q: "What is the difference between bacteriostatic water and sterile water?",
        a: "Bacteriostatic water contains 0.9% benzyl alcohol, which prevents bacterial growth so you can pull multiple doses from the same vial for up to 28 days refrigerated. Sterile water has no preservative and should be used within one dose.",
      },
      {
        q: "How long does a reconstituted peptide last?",
        a: "Most reconstituted peptides are stable for 14–28 days refrigerated at 2–8°C when mixed with bacteriostatic water. Fragile peptides like BPC-157 and GHK-Cu are best used within 2–4 weeks. Never freeze after reconstitution.",
      },
      {
        q: "Can I mix two peptides in the same syringe?",
        a: "Some pairs (e.g. CJC-1295 + Ipamorelin) are commonly co-injected in one syringe when concentrations and pH are compatible. Never combine copper peptides (GHK-Cu) with other peptides — they oxidize. When unsure, inject separately.",
      },
    ],
  },
  {
    heading: "Peptide dosage",
    items: [
      {
        q: "How many units is 250 mcg of BPC-157 on a U-100 syringe?",
        a: "If you reconstitute a 5 mg BPC-157 vial with 2 mL of BAC water, 250 mcg (0.25 mg) equals 10 units on a U-100 insulin syringe. Change the vial size or water volume in the calculator to see the exact units for your setup.",
      },
      {
        q: "What is the typical dose for semaglutide or tirzepatide?",
        a: "Semaglutide is commonly titrated 0.25 mg → 0.5 mg → 1.0 mg → 1.7 mg → 2.4 mg weekly. Tirzepatide typically titrates 2.5 mg → 5 mg → 7.5 mg → 10 mg → 12.5 mg → 15 mg weekly. Use the Peptide Dosage Calculator to convert each step to syringe units.",
      },
      {
        q: "What size insulin syringe should I use for peptides?",
        a: "A 0.3 mL (30 unit) U-100 insulin syringe with a 29–31 gauge, 5/16 inch needle is standard for subcutaneous peptide injections. Larger 0.5 mL or 1 mL syringes are only needed for higher volume doses like TRT.",
      },
      {
        q: "Should peptides be injected subcutaneously or intramuscularly?",
        a: "Most research peptides (BPC-157, TB-500, GHK-Cu, GLP-1 agonists, growth-hormone secretagogues) are dosed subcutaneously into the abdominal fat. IM is only used when a specific protocol or your clinician calls for it.",
      },
    ],
  },
  {
    heading: "TRT dosing",
    items: [
      {
        q: "How do I convert weekly TRT dose to per-shot units?",
        a: "Divide your weekly mg dose by the number of injections per week, then divide by testosterone concentration (usually 200 mg/mL). Multiply by 100 to get U-100 insulin syringe units. Example: 140 mg/week split twice = 70 mg per shot ÷ 200 mg/mL = 0.35 mL = 35 units.",
      },
      {
        q: "Is testosterone cypionate 200 mg/mL the same as enanthate 250 mg/mL for dosing?",
        a: "No — the concentration is different, so volume per mg differs. Always enter your ester's exact mg/mL into the TRT Dosage Calculator. Cypionate and enanthate have nearly identical half-lives (~7–8 days) but slightly different peaks.",
      },
      {
        q: "How often should I inject TRT?",
        a: "Common protocols split the weekly dose into 2 injections (every 3.5 days), or into daily/EOD subcutaneous shots for smoother blood levels and lower estradiol conversion. The calculator supports any injection frequency.",
      },
      {
        q: "Can I inject testosterone subcutaneously instead of intramuscularly?",
        a: "Yes. Subcutaneous TRT with an insulin syringe (29–31 gauge, 5/16 inch) is well supported by peer-reviewed studies, produces stable levels, and is less painful. Use the same weekly mg dose — only the injection site changes.",
      },
    ],
  },
];

const FAQ = FAQ_GROUPS.flatMap((g) => g.items);

export const Route = createFileRoute("/calculator")({
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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/calculator")],
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
              primaryImageOfPage: {
                "@type": "ImageObject",
                url: "https://doseroutine.com/og-image.png",
              },
              breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
              about: { "@id": `${CANONICAL}#hub` },
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
                { "@type": "ListItem", position: 2, name: "Calculators", item: CANONICAL },
              ],
            },
            {
              "@type": "CollectionPage",
              "@id": `${CANONICAL}#hub`,
              name: "Peptide & TRT Dosing Calculators",
              url: CANONICAL,
              description: DESC,
              hasPart: CALCULATORS.map((c) => ({
                "@type": "WebApplication",
                dateModified: LAST_REVIEWED,
                datePublished: "2026-01-15",
                name: c.label,
                url: `https://doseroutine.com${c.to}`,
                description: c.description,
                applicationCategory: "LifestyleApplication",
                applicationSubCategory: "Dosing Calculator",
                operatingSystem: "Any (web browser)",
                browserRequirements: "Requires JavaScript. Modern browser.",
                isAccessibleForFree: true,
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                publisher: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine",
                  url: "https://doseroutine.com",
                },
              })),
              mainEntity: {
                "@type": "ItemList",
                itemListElement: CALCULATORS.map((c, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: c.label,
                  url: `https://doseroutine.com${c.to}`,
                })),
              },
            },
            {
              "@type": "FAQPage",
              "@id": `${CANONICAL}#faq`,
              mainEntity: FAQ.map((f) => ({
                "@type": "Question",
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
  component: CalculatorHub,
});

function CalculatorHub() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background">
      <nav
        aria-label="Breadcrumb"
        className="border-b border-border/40 bg-background px-4 py-3 sm:px-6 lg:px-8"
      >
        <ol className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1">
            <Link to="/" className="flex items-center gap-1 hover:text-foreground">
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Home</span>
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="font-medium text-foreground">
            Calculators
          </li>
        </ol>
      </nav>
      <section className="relative overflow-hidden border-b border-border/40 bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <FlaskConical className="h-4 w-4" />
            <span>Free dosing tools</span>
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Peptide & TRT dosing calculators
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Three accurate, mobile-friendly calculators for peptides, reconstitution, and
            testosterone protocols.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CALCULATORS.map((calc) => {
              const Icon = calc.icon;
              return (
                <Card
                  key={calc.to}
                  className="group flex flex-col transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl">{calc.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <p className="text-muted-foreground">{calc.description}</p>
                    <Button asChild className="mt-auto w-full gap-2" size="lg">
                      <Link to={calc.to} aria-label={`Open the ${calc.label}`}>
                        Open calculator
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            Frequently asked questions
          </h2>
          <div className="space-y-10">
            {FAQ_GROUPS.map((group) => (
              <div key={group.heading}>
                <h3 className="mb-4 text-lg font-semibold text-foreground">{group.heading}</h3>
                <div className="space-y-4">
                  {group.items.map((f) => (
                    <Card key={f.q}>
                      <CardContent className="pt-6">
                        <h4 className="mb-2 font-semibold text-foreground">{f.q}</h4>
                        <p className="text-muted-foreground">{f.a}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="glossary"
        className="border-t border-border/40 px-4 py-12 sm:px-6 lg:px-8 scroll-mt-24"
      >
        <div className="mx-auto max-w-5xl">
          <PeptideDosageGlossary />
        </div>
      </section>

      <section className="border-t border-border/40 bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-foreground">
            Want to track doses automatically?
          </h2>
          <p className="mt-3 text-muted-foreground">
            DoseRoutine turns your calculations into a daily routine with reminders, refill alerts,
            and progress tracking.
          </p>
          <Button asChild className="mt-6 gap-2" size="lg">
            <Link to="/">
              Get DoseRoutine
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
      <RelatedLinks currentPath="/calculator" kind="calculators" />
      <p className="text-xs text-muted-foreground">
        Reviewed by the DoseRoutine editorial team. Last reviewed{" "}
        <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>.
      </p>
      <AttributionFooter sourceUrl={CANONICAL} />
    </main>
  );
}
