import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, FlaskConical, Home, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardClassName } from "@/components/ui/card";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { CalculatorScopeNote } from "@/components/calculator-scope-note";
import { ReconCalculator } from "@/components/recon-calculator";
import { getCalculatorPage, type CalculatorPage } from "@/lib/compound-calculators";
import { pageCardMeta } from "@/lib/social-image-meta";
import { LAST_REVIEWED } from "@/lib/aeo-page-faqs";

const BASE = "https://doseroutine.com";
/** BAC water volumes shown in the per-vial reference table. */
const BAC_VOLUMES = [1, 2, 3, 5];

export const Route = createFileRoute("/calculators/$slug")({
  loader: ({ params }) => {
    const page = getCalculatorPage(params.slug);
    if (!page) throw notFound();
    return { slug: page.slug };
  },
  head: ({ params }) => {
    const page = getCalculatorPage(params.slug);
    if (!page) {
      return {
        meta: [
          { title: "Calculator not found — DoseRoutine" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const url = `${BASE}/calculators/${page.slug}`;
    const path = `/calculators/${page.slug}`;
    return {
      meta: [
        { name: "author", content: "DoseRoutine" },
        { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
        { name: "publisher", content: "DoseRoutine" },
        { title: page.title },
        { name: "description", content: page.description },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        { property: "og:title", content: page.title },
        { property: "og:description", content: page.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: page.title },
        { name: "twitter:description", content: page.description },
        // DoseRoutine-branded card with descriptive alt text.
        ...pageCardMeta(page.slug, page.h1, "calculator"),
        ...ogLocaleMeta("en"),
      ],
      links: [{ rel: "canonical", href: url }, ...hreflangLinks(path)],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Calculators",
                    item: `${BASE}/calculators`,
                  },
                  { "@type": "ListItem", position: 3, name: page.h1, item: url },
                ],
              },
              {
                "@type": "WebApplication",
                dateModified: LAST_REVIEWED,
                datePublished: "2026-01-15",
                speakable: {
                  "@type": "SpeakableSpecification",
                  cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
                },
                name: `DoseRoutine ${page.h1}`,
                applicationCategory: "HealthApplication",
                operatingSystem: "Web",
                url,
                description: page.description,
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                publisher: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine", url: BASE },
              },
              {
                "@type": "HowTo",
                name: `How to calculate a ${page.name} dose`,
                description: `Convert a ${page.name} vial and bacteriostatic water volume into exact insulin-syringe units.`,
                step: [
                  {
                    "@type": "HowToStep",
                    position: 1,
                    name: "Find concentration",
                    text: "Divide the total milligrams in the vial by the millilitres of bacteriostatic water added. That is your mg/mL.",
                  },
                  {
                    "@type": "HowToStep",
                    position: 2,
                    name: "Find volume per dose",
                    text: "Divide your target dose in milligrams by the mg/mL concentration to get the millilitres to inject.",
                  },
                  {
                    "@type": "HowToStep",
                    position: 3,
                    name: "Convert to syringe units",
                    text: "Multiply the millilitres by 100 for a U-100 insulin syringe, or by 40 for a U-40 syringe.",
                  },
                ],
              },
              {
                "@type": "FAQPage",
                mainEntity: page.faqs.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: CalculatorNotFound,
  component: CompoundCalculatorPage,
});

function CalculatorNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-20 text-center">
      <h1 className="font-display text-3xl font-semibold text-foreground">Calculator not found</h1>
      <p className="mt-3 text-muted-foreground">That calculator doesn't exist yet.</p>
      <Link
        to="/calculators"
        className="mt-6 inline-flex items-center gap-1 text-primary underline"
      >
        See every calculator <ArrowRight className="h-3 w-3" />
      </Link>
    </main>
  );
}

function CompoundCalculatorPage() {
  const { slug } = Route.useLoaderData();
  const page = getCalculatorPage(slug);
  if (!page) return <CalculatorNotFound />;

  const canonical = `${BASE}/calculators/${page.slug}`;
  const isIu = page.slug === "hcg-dosage-calculator";

  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"
          >
            <FlaskConical className="h-5 w-5 text-primary" />
            DoseRoutine
          </Link>
          <Link to="/calculators" className="text-sm text-muted-foreground hover:text-foreground">
            All calculators <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        </div>
      </header>

      <nav aria-label="Breadcrumb" className="border-b border-border/40 px-5 py-3">
        <ol className="mx-auto flex max-w-3xl flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1">
            <Link to="/" className="flex items-center gap-1 hover:text-foreground">
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Home</span>
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li>
            <Link to="/calculators" className="hover:text-foreground">
              Calculators
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="font-medium text-foreground">
            {page.name}
          </li>
        </ol>
      </nav>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 pb-16 pt-8">
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          {page.h1}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{page.intro}</p>

        <CalculatorScopeNote className="mt-5" />

        <ReconCalculator
          className="mt-6"
          defaults={page.defaults}
          presets={page.presets}
          vialLabel={isIu ? "Vial size (1 mg = 1,000 IU)" : "Vial size (mg)"}
        />

        <ConcentrationTable page={page} />

        <section className="mt-10" aria-labelledby="dosing-context">
          <h2 id="dosing-context" className="font-display text-2xl font-semibold text-foreground">
            {page.name} dosing at a glance
          </h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Phase
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Dose
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Frequency
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.doseRows.map((r) => (
                  <tr key={r.phase} className="border-t border-border">
                    <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">
                      {r.phase}
                    </th>
                    <td className="px-3 py-2 text-foreground">{r.dose}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.frequency}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Reference ranges reported in the literature and in common practice — not a prescription,
            and not personalised advice.
          </p>
        </section>

        <section className={cn(cardClassName, "mt-10 rounded-2xl p-5")} aria-labelledby="gotchas">
          <h2
            id="gotchas"
            className="flex items-center gap-2 font-display text-xl font-semibold text-foreground"
          >
            <Info className="h-4 w-4 text-primary" aria-hidden="true" /> What trips people up
          </h2>
          <ul className="mt-3 ml-5 list-disc space-y-2 text-sm text-muted-foreground">
            {page.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="how-the-maths-works">
          <h2
            id="how-the-maths-works"
            className="font-display text-2xl font-semibold text-foreground"
          >
            How the maths works
          </h2>
          <ol className="mt-3 ml-5 list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Concentration (mg/mL) = vial mg ÷ bacteriostatic water mL.</li>
            <li>Volume per dose (mL) = dose mg ÷ concentration.</li>
            <li>Syringe units = volume × 100 on a U-100 syringe, or × 40 on a U-40 syringe.</li>
            <li>Doses per vial = vial mg ÷ dose mg. Water volume never changes this number.</li>
          </ol>
        </section>

        <section className="mt-10" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-2xl font-semibold text-foreground">
            {page.name} calculator FAQ
          </h2>
          <div className="mt-4 space-y-4">
            {page.faqs.map((f) => (
              <div key={f.q} className={cn(cardClassName, "rounded-xl p-4")}>
                <h3 className="font-semibold text-foreground">{f.q}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 flex flex-wrap gap-3 text-sm">
          {page.libraryPath && (
            <Link
              to={page.libraryPath}
              className="inline-flex items-center gap-1 rounded-md border border-primary/60 bg-primary/5 px-3 py-2 font-medium text-primary hover:bg-primary/10"
            >
              {page.name} reference page <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          <Link
            to="/interaction-checker"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-medium text-foreground hover:border-primary/60"
          >
            Check interactions <ArrowRight className="h-3 w-3" />
          </Link>
          {page.relatedPaths?.map((r) => (
            <Link
              key={r.path}
              to={r.path}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-medium text-foreground hover:border-primary/60"
            >
              {r.label} <ArrowRight className="h-3 w-3" />
            </Link>
          ))}
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          Educational tool only — not medical advice. Verify every dose with your prescriber and
          follow sterile technique. See our{" "}
          <Link to="/medical-disclaimer" className="text-primary underline">
            medical disclaimer
          </Link>
          .
        </p>

        <RelatedLinks currentPath={`/calculators/${page.slug}`} kind="calculators" />
        <p className="text-xs text-muted-foreground">
          Reviewed by the DoseRoutine editorial team. Last reviewed{" "}
          <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>.
        </p>
        <AttributionFooter sourceUrl={canonical} />
      </main>
    </div>
  );
}

/** Static mg/mL reference so the page has crawlable numbers, not just a JS widget. */
function ConcentrationTable({ page }: { page: CalculatorPage }) {
  return (
    <section className="mt-10" aria-labelledby="concentration-table">
      <h2 id="concentration-table" className="font-display text-2xl font-semibold text-foreground">
        {page.name} concentration reference (mg/mL)
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        What each vial size becomes at common bacteriostatic water volumes.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                Vial
              </th>
              {BAC_VOLUMES.map((v) => (
                <th key={v} scope="col" className="px-3 py-2 font-semibold">
                  + {v} mL
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.vialSizes.map((mg) => (
              <tr key={mg} className="border-t border-border">
                <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">
                  {mg} mg
                </th>
                {BAC_VOLUMES.map((v) => (
                  <td key={v} className="px-3 py-2 text-muted-foreground">
                    {(mg / v).toFixed(2)} mg/mL
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
