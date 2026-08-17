import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ConfidenceBadge,
  NoKnownInteractionLine,
  SharedMechanismNote,
} from "@/components/interaction-confidence";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ContentRouteError, ContentRouteNotFound } from "@/components/route-fallbacks";
import { LibraryShell } from "@/components/library-shell";
import { SeverityBadge } from "@/components/severity-badge";
import { AttributionFooter } from "@/components/attribution-footer";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import {
  resolveInteractionSources,
  citationJsonLd,
  documentCitations,
  verificationLinks,
} from "@/lib/authority-sources";
import { sectionCitations } from "@/lib/section-citations";
import { CitationMarkers } from "@/components/citation-markers";
import { AuthoritySourceList } from "@/components/authority-source-list";
import { VerifyAtList } from "@/components/verify-at-list";

import {
  buildPairFaq,
  pairPagesQuery,
  relatedPairs,
  SEVERITY_LABEL,
  SEVERITY_VERDICT,
  timingAdvice,
  verdictSentence,
  type PairPage,
} from "@/lib/interaction-pairs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Clock, FlaskConical, ShieldQuestion } from "lucide-react";

const SITE = "https://doseroutine.com";

export const Route = createFileRoute("/interactions/$pair")({
  loader: async ({ params, context }) => {
    const pages = await context.queryClient.ensureQueryData(pairPagesQuery);
    const page = pages.find((p) => p.slug === params.pair);
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Interaction not found — DoseRoutine" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const page = (loaderData as { page: PairPage }).page;
    const url = `${SITE}/interactions/${params.pair}`;
    const title = clamp(`Can You Take ${page.a.name} and ${page.b.name} Together?`, 60);
    const description = withDoseRoutineDescriptionSuffix(
      `${verdictSentence(page)} ${page.mechanism}`,
      160,
    );
    const socialImage = `${SITE}/og/library-default.jpg`;
    const faq = buildPairFaq(page);

    const publisher = {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "DoseRoutine",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "author", content: "DoseRoutine" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "DoseRoutine" },
        { property: "og:image", content: socialImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: socialImage },
        ...ogLocaleMeta(),
      ],
      links: [{ rel: "canonical", href: url }, ...hreflangLinks(`/interactions/${params.pair}`)],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BreadcrumbList",
                "@id": `${url}#breadcrumb`,
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Interactions",
                    item: `${SITE}/interactions`,
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `${page.a.name} and ${page.b.name}`,
                    item: url,
                  },
                ],
              },
              {
                "@type": "MedicalWebPage",
                speakable: {
                  "@type": "SpeakableSpecification",
                  cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
                },
                "@id": `${url}#page`,
                name: title,
                description,
                url,
                inLanguage: "en",
                lastReviewed: "2026-08-01",
                publisher,
                about: [
                  { "@type": "Substance", name: page.a.name },
                  { "@type": "Substance", name: page.b.name },
                ],
              },
              {
                "@type": "Article",
                "@id": `${url}#article`,
                headline: title,
                description,
                image: socialImage,
                datePublished: "2026-08-01T00:00:00Z",
                dateModified: "2026-08-01T00:00:00Z",
                author: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine", url: SITE },
                publisher,
                mainEntityOfPage: { "@type": "WebPage", "@id": url },
                isPartOf: { "@id": `${url}#page` },
                // Machine-readable evidence trail for this specific pair.
                citation: citationJsonLd(
                  resolveInteractionSources(page.sourceRefs, page.a.name, page.b.name),
                  { pageUrl: url },
                ),
              },
              {
                "@type": "FAQPage",
                "@id": `${url}#faq`,
                mainEntity: faq.map((f) => ({
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
  errorComponent: ContentRouteError,
  notFoundComponent: () => <ContentRouteNotFound label="Interaction" />,
  component: PairRoute,
});

function clamp(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n - 1).replace(/[\s,;:.-]+$/, "")}…`;
}

function PairRoute() {
  const { pair } = Route.useParams();
  const { data: pages } = useSuspenseQuery(pairPagesQuery);
  const page = pages.find((p) => p.slug === pair);
  if (!page) return <ContentRouteNotFound label="Interaction" />;

  const url = `${SITE}/interactions/${pair}`;
  const faq = buildPairFaq(page);
  const related = relatedPairs(page, pages);

  // Same numbering the "Sources and how to verify this" list renders, so an
  // inline "[2]" always resolves to entry 2 of that list.
  const sources = resolveInteractionSources(page.sourceRefs, page.a.name, page.b.name);
  const docs = documentCitations(sources);

  return (
    <LibraryShell>
      <article className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <Link to="/interactions" className="hover:underline">
            Interactions
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">
            {page.a.name} and {page.b.name}
          </span>
        </nav>

        <header>
          <SeverityBadge severity={page.severity} />
          <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
            Can you take {page.a.name} and {page.b.name} together?
          </h1>
          <p className="mt-3 text-base font-medium text-foreground">
            {SEVERITY_VERDICT[page.severity]}.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {verdictSentence(page)}
          </p>
        </header>

        <section className={cn(cardClassName, "mt-6 p-4 sm:p-5")}>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            Why these two interact
            <CitationMarkers
              sources={sectionCitations("mechanism", docs)}
              label="Sources for why these two interact"
            />
          </h2>
          <p className="mt-2 text-sm leading-relaxed">{page.mechanism}</p>
          <div className="mt-3">
            <ConfidenceBadge confidence={page.confidence} />
          </div>
          {page.noKnownInteraction ? (
            <NoKnownInteractionLine source={page.sourceRefs[0]} className="mt-2 text-xs" />
          ) : (
            <SharedMechanismNote sharedWith={page.mechanismSharedWith} />
          )}
        </section>

        <section className={cn(cardClassName, "mt-4 p-4 sm:p-5")}>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldQuestion className="h-4 w-4" aria-hidden="true" />
            What to do about it
            <CitationMarkers
              sources={sectionCitations("interactions", docs)}
              label="Sources for what to do about it"
            />
          </h2>
          <p className="mt-2 text-sm leading-relaxed">{page.recommendation}</p>
        </section>

        <section className={cn(cardClassName, "mt-4 p-4 sm:p-5")}>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Timing
            <CitationMarkers
              sources={sectionCitations("timing", docs)}
              label="Sources for timing"
            />
          </h2>
          <p className="mt-2 text-sm leading-relaxed">{timingAdvice(page)}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">The two items in this pair</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[page.a, page.b].map((c) => (
              <div key={c.slug} className={cn(cardClassName, "p-4")}>
                <h3 className="text-base font-semibold">{c.name}</h3>
                <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>
                    <dt className="inline font-medium text-foreground">Category: </dt>
                    <dd className="inline">{c.category.replace(/_/g, " ")}</dd>
                  </div>
                  {c.typical_timing ? (
                    <div>
                      <dt className="inline font-medium text-foreground">Typical timing: </dt>
                      <dd className="inline">{c.typical_timing}</dd>
                    </div>
                  ) : null}
                  {c.food_rule ? (
                    <div>
                      <dt className="inline font-medium text-foreground">With food: </dt>
                      <dd className="inline">{c.food_rule}</dd>
                    </div>
                  ) : null}
                  {c.half_life_hours ? (
                    <div>
                      <dt className="inline font-medium text-foreground">Half-life: </dt>
                      <dd className="inline">{c.half_life_hours} h</dd>
                    </div>
                  ) : null}
                </dl>
                <Link
                  to="/library/$slug"
                  params={{ slug: c.slug }}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Full {c.name} page <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(cardClassName, "mt-8 p-4 sm:p-5")}>
          <h2 className="text-lg font-semibold">Check your whole routine, not just this pair</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            One pair rarely tells the whole story. DoseRoutine checks every combination in your
            stack at once — supplements, TRT, peptides, GLP-1s and prescriptions — and schedules the
            doses so timing conflicts like this one are handled automatically.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/interaction-checker"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Run the free interaction checker
            </Link>
            <Link
              to="/interactions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold"
            >
              Browse all pairs
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Frequently asked</h2>
          <Accordion type="single" collapsible className="mt-2">
            {faq.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mt-8">
          {docs.length > 0 && (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Sources cited on this page
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Specific documents referenced by the numbered markers above.
              </p>
              <AuthoritySourceList className="mt-3 text-xs" sources={docs} />
            </>
          )}
          <h2
            className={cn(
              "text-sm font-semibold uppercase tracking-wide text-muted-foreground",
              docs.length > 0 && "mt-6",
            )}
          >
            Verify at
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            This assessment is mechanism-based. These publisher search links let you check it
            against the current evidence — they are not citations, so they are not numbered.
          </p>
          <VerifyAtList className="mt-3 text-xs" sources={verificationLinks(sources)} />
        </section>

        {related.length ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Related combinations</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    to="/interactions/$pair"
                    params={{ pair: p.slug }}
                    className={cn(
                      cardClassName,
                      "flex items-center justify-between gap-2 p-3 text-sm hover:border-primary/40",
                    )}
                  >
                    <span>
                      {p.a.name} and {p.b.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {SEVERITY_LABEL[p.severity]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Educational information only, not medical advice. DoseRoutine does not diagnose or treat.
          Talk to your prescriber before starting, stopping or combining anything — especially if
          you take prescription medication or are pregnant or breastfeeding.
        </p>

        <AttributionFooter sourceUrl={url} />
      </article>
    </LibraryShell>
  );
}
