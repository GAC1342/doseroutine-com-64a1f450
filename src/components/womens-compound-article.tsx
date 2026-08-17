import { Link } from "@tanstack/react-router";
import { ArrowRight, HelpCircle, Info, ShieldAlert, BookOpen, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { breadcrumbSchema } from "@/lib/breadcrumb-schema";


export type WomensCompoundContent = {
  slug: string; // e.g. "black-cohosh"
  hubSlug: "menopause-hormones" | "longevity" | "sexual-health" | "fertility-cycle";
  hubTitle: string;
  compoundName: string;
  h1: string;
  summary: string; // 100-word answer-first paragraph
  keyFacts: {
    doseRange: string;
    forms: string;
    evidence: "Strong" | "Moderate" | "Limited" | "Insufficient";
    mainRisks: string;
  };
  research: { heading?: string; body: string }[]; // 3-5 short paras with inline citations
  interactions: {
    with: string; // "HRT", "Birth control", etc.
    mechanism: string;
    watchFor: string;
    /** Optional deep-link key for /menopause-supplement-interaction-checker?with=... (e.g. "hrt", "birth-control", "levothyroxine", "ssri", "warfarin") */
    pairKey?: string;
  }[];
  cautions: string[];
  faq: { q: string; a: string }[];
  sources: { label: string; url: string }[];
  related: { slug: string; name: string }[]; // 3-5 related womens-health compounds
  lastReviewed: string; // e.g. "2026-07-27"
  ctaCompoundLabel?: string; // for CTA copy default = compoundName
};

const ORG = {
  "@type": "Organization",
  "@id": "https://doseroutine.com/#organization",
  name: "DoseRoutine",
  url: "https://doseroutine.com",
  logo: {
    "@type": "ImageObject",
    url: "https://doseroutine.com/icon-512.png",
  },
};

export function womensCompoundCanonical(slug: string) {
  return `https://doseroutine.com/library/womens-health/${slug}`;
}

export function slugifyPairKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Qualifiers that add nothing to a title (the "for Women" is already in it).
const REDUNDANT_QUALIFIER = /^(for\s+)?wom[ae]n$/i;

export function womensCompoundTitle(name: string) {
  // Two articles can share a base compound and differ only by their
  // parenthetical (e.g. "Maca (Menopause)" vs "Maca (libido context)"), so the
  // qualifier has to survive into the title — dropping it produced duplicate
  // <title> tags across distinct URLs.
  const qualifierMatch = name.match(/\(([^)]*)\)/);
  const base = name
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+for\s+women\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const rawQualifier = (qualifierMatch?.[1] ?? "")
    .replace(/\bcontext\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const qualifier =
    rawQualifier && !REDUNDANT_QUALIFIER.test(rawQualifier)
      ? rawQualifier.replace(/\b[a-z]/g, (ch) => ch.toUpperCase())
      : "";

  const withQualifier = `${base} for Women: ${qualifier} Guide | DoseRoutine`;
  const plain = `${base} for Women: Guide | DoseRoutine`;
  // Titles over ~60 characters get truncated in search results, so a long
  // parenthetical (e.g. "NMN (Nicotinamide Mononucleotide)") falls back to the
  // plain form rather than shipping a clipped title.
  if (qualifier && withQualifier.length <= 60) return withQualifier;
  return plain;
}

export function womensCompoundMetaDescription(name: string, _hubTitle?: string) {
  // Keep under ~160 chars so search engines show the full snippet instead of truncating.
  const text = `${name} for women: evidence, studied dose range, and interactions with HRT, birth control and thyroid meds. Track it with DoseRoutine.`;
  return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}...`;
}

/**
 * The small slice of an article needed to build <head>. Routes pass this instead
 * of the whole content object so the (very large) article bodies stay out of the
 * critical route bundle and load with the page's own chunk instead.
 */
export type WomensCompoundMeta = Pick<
  WomensCompoundContent,
  "slug" | "hubSlug" | "hubTitle" | "compoundName" | "h1" | "lastReviewed"
>;

function articleLD(c: WomensCompoundMeta, sources?: { label: string; url: string }[]) {
  const url = womensCompoundCanonical(c.slug);
  const title = womensCompoundTitle(c.compoundName);
  const desc = womensCompoundMetaDescription(c.compoundName, c.hubTitle);
  return {
    "@context": "https://schema.org",
    "@type": ["Article", "DietarySupplement"],
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
    },
    "@id": url + "#medicalpage",
    url,
    name: title,
    headline: c.h1,
    description: desc,
    // Article-typed node: Google's Rich Results Test grades it against
    // Article's recommended fields, so image + mainEntityOfPage belong here.
    image: ["https://doseroutine.com/og/hub-mens-health.jpg"],
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "en",
    audience: { "@type": "PeopleAudience", audienceType: "Adult women", suggestedGender: "Female" },
    lastReviewed: c.lastReviewed,
    datePublished: c.lastReviewed,
    dateModified: c.lastReviewed,
    reviewedBy: {
      "@type": "Organization",
      name: "DoseRoutine Editorial",
      url: "https://doseroutine.com",
    },
    publisher: ORG,
    author: ORG,
    copyrightHolder: ORG,
    isBasedOn: url,
    activeIngredient: c.compoundName,
    ...(sources
      ? { citation: sources.map((s) => ({ "@type": "CreativeWork", name: s.label, url: s.url })) }
      : {}),
  };
}

function faqLD(c: WomensCompoundMeta, faq: { q: string; a: string }[]) {
  const url = womensCompoundCanonical(c.slug);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": url + "#faq",
    inLanguage: "en",
    isBasedOn: url,
    publisher: ORG,
    author: ORG,
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
        author: ORG,
        publisher: ORG,
        url,
        inLanguage: "en",
      },
    })),
  };
}

export function womensCompoundHead(c: WomensCompoundMeta) {
  const url = womensCompoundCanonical(c.slug);
  const title = womensCompoundTitle(c.compoundName);
  const desc = womensCompoundMetaDescription(c.compoundName, c.hubTitle);
  const ogImage = "https://doseroutine.com/og/hub-mens-health.jpg"; // fallback until womens OG generated

  // Sitewide trail shape: Home › Library › Women's Health › Hub › Compound.
  const breadcrumbLD = breadcrumbSchema(url, [
    { name: "Library", path: "/library" },
    { name: "Women's Health", path: "/library/womens-health" },
    { name: c.hubTitle, path: `/library/womens-health/${c.hubSlug}` },
    { name: c.compoundName, path: url },
  ]);


  return {
    meta: [
      { title },
      { name: "description", content: desc },
      { name: "author", content: "DoseRoutine" },
      { name: "publisher", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: ogImage },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${c.compoundName} for women — DoseRoutine` },
      { property: "article:publisher", content: "https://doseroutine.com" },
      { property: "article:section", content: c.hubTitle },
      { property: "article:modified_time", content: c.lastReviewed },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
      { name: "twitter:image", content: ogImage },
      { name: "twitter:image:alt", content: `${c.compoundName} for women — DoseRoutine` },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json" as const, children: JSON.stringify(breadcrumbLD) }],
  };
}

function estimateReadingTime(c: WomensCompoundContent): number {
  const text =
    c.summary +
    " " +
    c.research.map((r) => (r.heading ?? "") + " " + r.body).join(" ") +
    " " +
    c.interactions.map((i) => i.mechanism + " " + i.watchFor).join(" ") +
    " " +
    c.faq.map((f) => f.q + " " + f.a).join(" ");
  const words = text.trim().split(/\s+/).length;
  return Math.max(3, Math.round(words / 220));
}

/**
 * Article + FAQPage JSON-LD rendered in the page body (not head()) so article
 * bodies stay out of the critical route bundle. Exported so the JSON-LD
 * contract tests can validate exactly what the component emits.
 */
export function womensCompoundBodyLD(c: WomensCompoundContent) {
  return [articleLD(c, c.sources), faqLD(c, c.faq)];
}

export function WomensCompoundArticle({ c }: { c: WomensCompoundContent }) {
  const url = womensCompoundCanonical(c.slug);
  const readMin = estimateReadingTime(c);
  const toc = [
    { id: "summary", label: "Summary" },
    { id: "key-facts", label: "Key facts" },
    { id: "research", label: "What the research shows" },
    { id: "interactions", label: "Interactions" },
    { id: "cautions", label: "Who should be cautious" },
    { id: "faq", label: "FAQ" },
    { id: "sources", label: "Sources" },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      {/* Rich structured data lives here rather than in head() so the (large)
          article body stays out of the critical route bundle. Crawlers read
          JSON-LD anywhere in the document. */}
      {womensCompoundBodyLD(c).map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}

      <PublicBackHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10">
        <article className="min-w-0 space-y-8">
          <header className="space-y-3">
            <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/library" className="hover:underline">
                Library
              </Link>
              <span> / </span>
              <Link to="/library/womens-health" className="hover:underline">
                Women's Health
              </Link>
              <span> / </span>
              <a href={`/library/womens-health/${c.hubSlug}`} className="hover:underline">
                {c.hubTitle}
              </a>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{c.h1}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> {readMin} min read
              </span>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-4 w-4" /> Reviewed {c.lastReviewed}
              </span>
            </div>
          </header>

          <details className="lg:hidden rounded-lg border bg-card p-3 text-sm">
            <summary className="font-semibold cursor-pointer">On this page</summary>
            <ul className="mt-2 space-y-1">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="text-primary hover:underline">
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>

          <section id="summary" className="space-y-2">
            <h2 className="text-2xl font-bold">Summary</h2>
            <p className="dr-speakable-answer text-base leading-relaxed">{c.summary}</p>
          </section>

          <section id="key-facts" className="space-y-3">
            <h2 className="text-2xl font-bold">Key facts</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <th scope="row" className="bg-muted/50 px-4 py-2 text-left font-semibold w-1/3">
                      Studied dose range
                    </th>
                    <td className="px-4 py-2">{c.keyFacts.doseRange}</td>
                  </tr>
                  <tr className="border-b">
                    <th scope="row" className="bg-muted/50 px-4 py-2 text-left font-semibold">
                      Common forms
                    </th>
                    <td className="px-4 py-2">{c.keyFacts.forms}</td>
                  </tr>
                  <tr className="border-b">
                    <th scope="row" className="bg-muted/50 px-4 py-2 text-left font-semibold">
                      Evidence level
                    </th>
                    <td className="px-4 py-2">{c.keyFacts.evidence}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="bg-muted/50 px-4 py-2 text-left font-semibold">
                      Main interaction risks
                    </th>
                    <td className="px-4 py-2">{c.keyFacts.mainRisks}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="research" className="space-y-3">
            <h2 className="text-2xl font-bold">What the research shows</h2>
            {c.research.map((r, i) => (
              <div key={i} className="space-y-1">
                {r.heading ? <h3 className="text-base font-semibold">{r.heading}</h3> : null}
                <p className="text-base leading-relaxed">{r.body}</p>
              </div>
            ))}
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Turn this evidence into a personal safety check for {c.compoundName}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The interaction checker cross-references {c.compoundName} against HRT, birth
                    control, thyroid medication, SSRIs, and every other item in your stack — using
                    the same clinical sources cited above.
                  </p>
                  <Link
                    to="/menopause-supplement-interaction-checker"
                    search={{ compound: c.slug } as never}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    Check {c.compoundName} on the interaction checker{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section id="interactions" className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Interactions</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Interaction risk is what makes women's-health supplements uniquely tricky — HRT, birth
              control, thyroid medication and SSRIs all share metabolic pathways with common
              botanicals. Each item below lists the mechanism and what to actually watch for.
            </p>
            <ul className="space-y-3">
              {c.interactions.map((it, i) => {
                const withKey = it.pairKey ?? slugifyPairKey(it.with);
                const href = `/menopause-supplement-interaction-checker?compound=${encodeURIComponent(c.slug)}&with=${encodeURIComponent(withKey)}#selected-pair`;
                return (
                  <li key={i} className="rounded-lg border bg-card p-4">
                    <div className="font-semibold">{it.with}</div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">Mechanism:</span> {it.mechanism}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Watch for:</span> {it.watchFor}
                    </div>
                    <a
                      href={href}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Check {c.compoundName} + {it.with} on the interaction checker{" "}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>

          <section id="cautions" className="space-y-2">
            <h2 className="text-2xl font-bold">Who should be cautious</h2>
            <ul className="list-disc pl-5 space-y-1 text-base leading-relaxed">
              {c.cautions.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </section>

          <section id="faq" className="space-y-3" aria-labelledby="faq-heading">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 id="faq-heading" className="text-2xl font-bold">
                FAQ
              </h2>
            </div>
            <div className="space-y-3">
              {c.faq.map((f, i) => (
                <Card key={i} className="p-4">
                  <h3 className="text-base font-semibold">{f.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed">{f.a}</p>
                </Card>
              ))}
            </div>
          </section>

          <Card className="border-2 border-cta/40 p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-cta" />
              <div className="text-sm">
                <p className="font-semibold text-base">
                  Taking {c.ctaCompoundLabel ?? c.compoundName} alongside HRT, birth control, or
                  other supplements?
                </p>
                <p className="text-muted-foreground mt-1">
                  Get access to all DoseRoutine tools — check your full routine for interactions,
                  log doses and get reminders.
                </p>
                <Link
                  to="/auth"
                  className="mt-3 inline-flex items-center gap-1 rounded-md bg-cta px-3 py-2 font-semibold text-cta-foreground transition-colors hover:bg-cta-hover"
                >
                  Sign up free <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Card>

          <section id="sources" className="space-y-2">
            <h2 className="text-2xl font-bold">Sources</h2>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              {c.sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.url}
                    className="text-primary hover:underline"
                    rel="noopener nofollow"
                    target="_blank"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground pt-2">
              Source: <strong>DoseRoutine Library</strong> —{" "}
              <a href={url} className="underline">
                doseroutine.com/library/womens-health/{c.slug}
              </a>
            </p>
          </section>

          {c.related.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-bold">Related compounds</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {c.related.map((r) => (
                  <a key={r.slug} href={`/library/womens-health/${r.slug}`} className="block">
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="font-semibold">{r.name}</div>
                      <div className="mt-1 text-sm text-primary inline-flex items-center gap-1">
                        Read <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </Card>
                  </a>
                ))}
              </div>
            </section>
          )}

          <footer className="border-t pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Medically reviewed {c.lastReviewed}. Educational reference only — not medical advice.
              Talk to your doctor before changing your routine, especially if you take HRT, birth
              control, thyroid medication, or a prescription.
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} <strong>DoseRoutine</strong> — original content published
              at{" "}
              <a href={url} className="underline">
                {url}
              </a>
              .
            </p>
          </footer>
          <AttributionFooter sourceUrl={url} />
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border bg-card p-4 text-sm">
            <div className="font-semibold mb-2">On this page</div>
            <ul className="space-y-1">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="text-primary hover:underline">
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
