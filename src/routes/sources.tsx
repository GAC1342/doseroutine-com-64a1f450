import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";
import { hreflangLinks } from "@/lib/hreflang";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { SOURCES_FAQ } from "@/lib/aeo-faqs-info";

const pageUrl = "https://doseroutine.com/sources";
const pageTitle = "Sources & Methodology — DoseRoutine";
const pageDescription =
  "Where DoseRoutine's compound and interaction data comes from, which publishers we cite, how each rule is reviewed, and how often the library is refreshed.";
const LAST_REVIEWED = "2026-08-01";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "article" },
      { property: "og:url", content: pageUrl },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
    ],
    links: [{ rel: "canonical", href: pageUrl }, ...hreflangLinks("/sources")],
    scripts: [
      aeoFaqScript(pageUrl, SOURCES_FAQ),
      breadcrumbScript(pageUrl, [{ name: "Sources & Methodology", path: "/sources" }]),
      articleScript({
        url: pageUrl,
        headline: "How DoseRoutine sources and reviews its data",
        description: pageDescription,
        datePublished: "2026-08-01",
        dateModified: LAST_REVIEWED,
        section: "Methodology",
      }),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${pageUrl}#webpage`,
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          inLanguage: "en",
          isPartOf: { "@id": "https://doseroutine.com/#website" },
          about: { "@id": "https://doseroutine.com/#organization" },
          publisher: { "@id": "https://doseroutine.com/#organization" },
          dateModified: LAST_REVIEWED,
        }),
      },
    ],
  }),
  component: SourcesPage,
});

const PUBLISHERS: { name: string; url: string; what: string }[] = [
  {
    name: "PubMed / NIH National Library of Medicine",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    what: "Peer-reviewed trials and reviews. Cited by PMID and linked to the original record.",
  },
  {
    name: "DailyMed (NIH)",
    url: "https://dailymed.nlm.nih.gov/dailymed/",
    what: "FDA-submitted prescribing information and product labeling for approved drugs.",
  },
  {
    name: "PubChem",
    url: "https://pubchem.ncbi.nlm.nih.gov/",
    what: "Chemical identity, structure and basic pharmacology for each compound entry.",
  },
  {
    name: "NIH Office of Dietary Supplements",
    url: "https://ods.od.nih.gov/",
    what: "Fact sheets for vitamins, minerals and dietary supplements.",
  },
  {
    name: "MedlinePlus",
    url: "https://medlineplus.gov/",
    what: "Plain-language drug and supplement monographs used for consumer-facing wording.",
  },
  {
    name: "Cochrane Library",
    url: "https://www.cochranelibrary.com/",
    what: "Systematic reviews, used where a single trial would overstate the evidence.",
  },
];

function SourcesPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Sources &amp; methodology
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last reviewed: August 1, 2026 · Maintained by the DoseRoutine editorial team
        </p>

        <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-foreground/90">
          <strong>In one line:</strong> every compound page and every interaction rule is built from
          published literature, regulatory labeling and public reference databases — each with a
          direct link to the document, not just the publisher's homepage.
        </div>

        <Section id="what-we-cover" title="What the data set contains">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>476 compounds</strong> — supplements, vitamins and minerals, peptides,
              hormones including TRT, GLP-1 medications and common daily prescriptions.
            </li>
            <li>
              <strong>308 interaction rules</strong> — a mix of named compound pairs and
              category-level rules that catch combinations without a specific pair entry.
            </li>
            <li>
              <strong>1,957 indexed PubMed records</strong> attached to individual compounds and
              shown in the “Key studies” section of each library page.
            </li>
          </ul>
        </Section>

        <Section id="publishers" title="Which publishers we cite">
          <ul className="space-y-3">
            {PUBLISHERS.map((p) => (
              <li key={p.url}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="nofollow noopener"
                  className="font-medium underline underline-offset-4"
                >
                  {p.name}
                </a>
                <span className="block text-sm text-muted-foreground">{p.what}</span>
              </li>
            ))}
          </ul>
          <p>
            We do not cite forums, vendor marketing pages, or unattributed blog posts. Where a
            claim's underlying source is unclear, the page shows no citation rather than a
            placeholder.
          </p>
        </Section>

        <Section id="how-rules-are-built" title="How an interaction rule is built">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong>Mechanism first.</strong> A rule exists only when there is a plausible
              mechanism — shared metabolic pathway (for example CYP3A4), additive physiological
              effect, or absorption competition.
            </li>
            <li>
              <strong>Evidence check.</strong> The mechanism is matched against literature and label
              warnings. Anecdote alone never creates a rule.
            </li>
            <li>
              <strong>Severity assignment.</strong> Avoid, caution, note, or synergy — assigned from
              the strength of the evidence and the seriousness of the outcome, not from how common
              the combination is.
            </li>
            <li>
              <strong>Plain-English write-up.</strong> Each rule states the mechanism and a
              practical recommendation (separate by hours, monitor, ask a clinician).
            </li>
            <li>
              <strong>Attach references.</strong> Supporting documents are stored with the rule and
              rendered on the page and inside the interaction detail panel.
            </li>
          </ol>
        </Section>

        <Section id="review-cadence" title="How often it is reviewed">
          <p>
            Compound and interaction entries are reviewed on a rolling cycle, and immediately when a
            reader reports a problem or when a label or systematic review changes. Pages that have
            been through an editorial review show a visible “Last reviewed” date near the top and
            publish the same date in their structured data.
          </p>
          <p>
            Pages without that line have not yet completed a dated review pass — we leave the line
            off rather than showing a date we cannot stand behind.
          </p>
        </Section>

        <Section id="limits" title="What this is not">
          <p>
            DoseRoutine is educational reference content and a routine tracker. It is not medical
            advice, not a diagnosis, and not a substitute for your pharmacist or physician. Absence
            of an interaction rule is not proof that a combination is safe.
          </p>
        </Section>

        <Section id="corrections" title="Reporting an error">
          <p>
            If something here is wrong, tell us and we will fix it. Our correction process, AI
            disclosure and review standards are documented in the{" "}
            <Link to="/editorial-policy" className="underline underline-offset-4">
              editorial &amp; review policy
            </Link>
            .
          </p>
        </Section>

        <AeoFaq pairs={SOURCES_FAQ} />
      </main>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
