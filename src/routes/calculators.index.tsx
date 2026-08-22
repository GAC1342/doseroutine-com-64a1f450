import { FEATURE_VISUAL_BY_ID, featureSocialMeta } from "@/lib/feature-visuals";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calculator,
  ChevronRight,
  Droplets,
  FlaskConical,
  Home,
  Layers,
  Ruler,
  Syringe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { AttributionFooter } from "@/components/attribution-footer";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript, aeoPageFields } from "@/lib/aeo";
import { CALCULATORS_FAQ, LAST_REVIEWED } from "@/lib/aeo-page-faqs";
import { CALCULATOR_PAGES } from "@/lib/compound-calculators";
import { CalculatorScopeNote } from "@/components/calculator-scope-note";

export const CANONICAL = "https://doseroutine.com/calculators";
const TITLE = "All Dose Calculators — Peptide, TRT & Reconstitution";
const DESC =
  "Every DoseRoutine calculator in one place: peptide dosage, reconstitution, TRT dosing, unit conversions and stack planning. Free, no sign-up needed.";

// Every calculator-shaped URL in the sitemap. Keep in sync with sitemap.xml.ts.
export const CALCULATORS: {
  to: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    to: "/calculator",
    label: "Peptide & TRT calculator hub",
    description: "Original calculator index with FAQ and dosing glossary.",
    icon: Calculator,
  },
  {
    to: "/peptide-calculator",
    label: "Peptide calculator",
    description: "Vial strength plus BAC water to concentration, syringe units and doses per vial.",
    icon: Calculator,
  },
  {
    to: "/peptide-dosage-calculator",
    label: "Peptide dosage guide",
    description: "How mg and mcg doses become insulin-syringe units, with worked vial examples.",
    icon: Calculator,
  },
  {
    to: "/peptide-reconstitution-calculator",
    label: "Peptide reconstitution calculator",
    description: "Plan BAC water, concentration, units per dose and doses per vial.",
    icon: Droplets,
  },
  {
    to: "/reconstitution-calculator",
    label: "Reconstitution calculator",
    description: "Lightweight standalone reconstitution tool.",
    icon: FlaskConical,
  },
  {
    to: "/trt-dosage-calculator",
    label: "TRT dosage calculator",
    description: "Weekly testosterone → per-shot volume and syringe units.",
    icon: Syringe,
  },
  {
    to: "/vs-supplement-planner",
    label: "vs. Supplement Planner",
    description: "How DoseRoutine compares to supplement-only planners for peptides and TRT.",
    icon: Layers,
  },
  {
    to: "/dosage-units-guide",
    label: "Dosage units guide",
    description: "Reference for mg, mcg, IU, U-100 syringe units and mL conversions.",
    icon: Ruler,
  },
];

export const Route = createFileRoute("/calculators/")({
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
      ...featureSocialMeta(FEATURE_VISUAL_BY_ID["reconstitution"]!),
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/calculators")],
    scripts: [
      aeoFaqScript(CANONICAL, CALCULATORS_FAQ),

      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
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
              ...aeoPageFields({
                dateModified: LAST_REVIEWED,
                datePublished: "2026-02-10",
                shortAnswer:
                  "DoseRoutine's calculators are free unit converters. Enter your vial size, the bacteriostatic water you added, and the amount you were given, and they return the reading in syringe units and milliliters. They never recommend an amount.",
                about: [
                  "Peptide reconstitution",
                  "Insulin syringe",
                  "Testosterone cypionate",
                  "Unit conversion",
                ],
              }),
              url: CANONICAL,
              name: TITLE,
              description: DESC,
              mainEntity: {
                "@type": "ItemList",
                itemListElement: [
                  ...CALCULATORS.map((c, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    name: c.label,
                    url: `https://doseroutine.com${c.to}`,
                  })),
                  ...CALCULATOR_PAGES.map((p, i) => ({
                    "@type": "ListItem",
                    position: CALCULATORS.length + i + 1,
                    name: p.h1,
                    url: `https://doseroutine.com/calculators/${p.slug}`,
                  })),
                ],
              },
            },
          ],
        }),
      },
    ],
  }),
  component: CalculatorsIndex,
});

function CalculatorsIndex() {
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

      <section className="border-b border-border/40 bg-muted/30 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            All DoseRoutine calculators
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every free calculator on DoseRoutine, listed on one page so search engines and readers
            can find them fast.
          </p>
          <CalculatorScopeNote className="mt-8" />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="all-calculators-heading">
        <div className="mx-auto max-w-5xl">
          <h2 id="all-calculators-heading" className="mb-6 text-2xl font-bold tracking-tight">
            Choose a calculator
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CALCULATORS.map((c) => {
              const Icon = c.icon;
              return (
                <li key={c.to}>
                  <Card className="group flex h-full flex-col transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-semibold leading-none tracking-tight">
                        {c.label}
                      </h3>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4">
                      <p className="text-muted-foreground">{c.description}</p>
                      <Button asChild className="mt-auto w-full gap-2" size="lg">
                        <Link to={c.to} aria-label={`Open the ${c.label}`}>
                          Open
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section
        className="border-t border-border/40 bg-muted/20 px-4 py-12 sm:px-6 lg:px-8"
        aria-labelledby="by-compound-heading"
      >
        <div className="mx-auto max-w-5xl">
          <h2 id="by-compound-heading" className="text-2xl font-bold tracking-tight">
            Calculators by compound
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Same reconstitution math, pre-filled with the vial sizes and dose ranges people actually
            use for each compound.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CALCULATOR_PAGES.map((p) => (
              <li key={p.slug}>
                <Link
                  to="/calculators/$slug"
                  params={{ slug: p.slug }}
                  className="flex h-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
                >
                  <span>
                    <span className="block font-semibold text-foreground">{p.name}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{p.h1}</span>
                  </span>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4">
        <AeoFaq pairs={CALCULATORS_FAQ} heading="Calculator FAQ" />
      </section>

      <ProseContainer>
        <ProseContainer>
          <PageProse id="calculators-index" />
        </ProseContainer>
      </ProseContainer>
      <AttributionFooter sourceUrl={CANONICAL} />
    </main>
  );
}
