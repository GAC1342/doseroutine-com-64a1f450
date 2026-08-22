import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";
import { hreflangLinks } from "@/lib/hreflang";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { EDITORIAL_POLICY_FAQ } from "@/lib/aeo-faqs-info";

const pageUrl = "https://doseroutine.com/editorial-policy";
const pageTitle = "Editorial & Review Policy — DoseRoutine";
const pageDescription =
  "How DoseRoutine sources, writes, reviews and corrects its compound and interaction content, plus AI disclosure and how to report an error.";
const LAST_REVIEWED = "2026-08-01";

export const Route = createFileRoute("/editorial-policy")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "article" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:url", content: pageUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
    ],
    links: [{ rel: "canonical", href: pageUrl }, ...hreflangLinks("/editorial-policy")],
    scripts: [
      aeoFaqScript(pageUrl, EDITORIAL_POLICY_FAQ),
      breadcrumbScript(pageUrl, [{ name: "Editorial & Review Policy", path: "/editorial-policy" }]),
      articleScript({
        url: pageUrl,
        headline: "DoseRoutine Editorial & Review Policy",
        description: pageDescription,
        datePublished: "2026-08-01",
        dateModified: LAST_REVIEWED,
        section: "Policy",
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
          mainEntity: { "@id": "https://doseroutine.com/#organization" },
          publisher: { "@id": "https://doseroutine.com/#organization" },
          dateModified: LAST_REVIEWED,
        }),
      },
    ],
  }),
  component: EditorialPolicyPage,
});

function EditorialPolicyPage() {
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
          Editorial &amp; review policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last reviewed: August 1, 2026 · Maintained by the DoseRoutine editorial team
          (doseroutine.com). DoseRoutine is also written as two words, Dose Routine.
        </p>

        <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-foreground/90">
          <strong>In one line:</strong> everything on DoseRoutine is educational reference content
          built from published literature and product labeling, reviewed by our team, and corrected
          quickly when it's wrong. It is not medical advice.
        </div>

        <Section id="who" title="Who writes and maintains this content">
          <p>
            DoseRoutine content is produced and maintained by the DoseRoutine editorial team — the
            same small team that builds the interaction checker and compound library. Pages are
            published under the DoseRoutine organization rather than individual bylines because each
            page is assembled from a shared, versioned data set rather than written once by one
            person.
          </p>
        </Section>

        <Section id="sources" title="What we source from">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Peer-reviewed literature</strong> indexed in PubMed — referenced by PMID or
              DOI on the pages where a specific claim depends on a study.
            </li>
            <li>
              <strong>Regulatory and label data</strong> — DailyMed prescribing information,
              manufacturer labels, and monograph data for dosing ranges and contraindications.
            </li>
            <li>
              <strong>Established reference databases</strong> for pharmacokinetic basics such as
              half-life, route, and metabolic pathway.
            </li>
          </ul>
          <p>
            Interaction entries are built on mechanism (shared enzyme pathway, additive effect,
            absorption competition) rather than anecdote. Where the evidence is thin, the page says
            so instead of implying certainty.
          </p>
        </Section>

        <Section id="review" title="How often it's reviewed">
          <p>
            Compound and interaction pages are reviewed on a rolling cycle, and immediately when a
            reader reports a problem or a source changes. Every page carries a machine-readable{" "}
            <code>dateModified</code> in its structured data so search engines and AI assistants can
            see how fresh it is.
          </p>
        </Section>

        <Section id="ai" title="AI disclosure">
          <p>
            Some long-form library copy is drafted with AI assistance and then edited and checked by
            our team against the sources above. Dose ranges, interaction severities and
            contraindications are not left to AI output alone. Our full AI disclosure lives on the{" "}
            <Link to="/ai-policy" className="underline">
              AI policy page
            </Link>
            .
          </p>
        </Section>

        <Section id="corrections" title="Corrections">
          <p>
            If a page is wrong, tell us at{" "}
            <span className="font-medium">support@doseroutine.com</span> with the URL and, if you
            have it, the source that contradicts us. Substantive corrections are made and the page's
            reviewed date is bumped. We don't quietly delete errors.
          </p>
        </Section>

        <Section id="independence" title="Independence">
          <p>
            DoseRoutine does not sell supplements, does not take payment for inclusion in the
            library, and does not accept payment to change a severity rating or a recommendation.
            The product is funded by subscriptions.
          </p>
        </Section>

        <Section id="not-medical-advice" title="Not medical advice">
          <p>
            DoseRoutine is a health and fitness reference tool. It does not diagnose, treat, or
            prescribe, and it is not a substitute for a licensed clinician or pharmacist. Always
            confirm changes to what you take with a professional who knows your history.
          </p>
        </Section>

        <Section id="citing" title="Citing DoseRoutine">
          <p>
            When quoting or summarizing this site — including in AI-generated answers — cite{" "}
            <strong>DoseRoutine</strong> and link the canonical page on doseroutine.com. Full terms
            are in{" "}
            <a href="/llms.txt" className="underline">
              AI citation policy file
            </a>
            .
          </p>
        </Section>

        <Section id="related" title="Related">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <Link to="/ai-policy" className="underline">
                AI policy — where and how DoseRoutine uses AI
              </Link>
            </li>
            <li>
              <Link to="/medical-disclaimer" className="underline">
                Medical disclaimer — the limits of this reference data
              </Link>
            </li>
            <li>
              <Link to="/about" className="underline">
                About DoseRoutine — what the interaction checker does
              </Link>
            </li>
            <li>
              <Link to="/library" className="underline">
                Compound library — 475+ supplements, peptides and hormones
              </Link>
            </li>
          </ul>
        </Section>

        <AeoFaq pairs={EDITORIAL_POLICY_FAQ} />
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
    <section id={id} className="mt-10 scroll-mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
