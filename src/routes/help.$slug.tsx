import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { canonicalLinks } from "@/lib/hreflang";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { HELP_LIST, type HelpArticle } from "@/lib/help-articles";
import { getHelpFaqs } from "@/lib/help-faqs";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { PublicBackHeader } from "@/components/public-back-header";

type ReadingMode = "simple" | "detailed";
const READING_MODE_KEY = "doseroutine.help.readingMode";

export const YEAR = new Date().getFullYear();

export const Route = createFileRoute("/help/$slug")({
  head: ({ params }) => {
    const article = HELP_LIST.find((a) => a.slug === params.slug);
    const title = `${article?.title ?? "Help"} — DoseRoutine`;
    const desc = withDoseRoutineDescriptionSuffix(
      article?.summary ?? "Guide for using DoseRoutine.",
    );
    const url = `https://doseroutine.com/help/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "author", content: "DoseRoutine" },
        { name: "copyright", content: `© ${YEAR} DoseRoutine — doseroutine.com` },
        { name: "citation_author", content: "DoseRoutine" },
        { name: "citation_publisher", content: "DoseRoutine (doseroutine.com)" },
        { name: "citation_title", content: article?.title ?? "Help" },
        { name: "citation_fulltext_html_url", content: url },
        { name: "dcterms.creator", content: "DoseRoutine" },
        { name: "dcterms.publisher", content: "DoseRoutine" },
        { name: "dcterms.source", content: url },
        { name: "dcterms.rights", content: `© ${YEAR} DoseRoutine` },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "DoseRoutine" },
        { property: "article:author", content: "DoseRoutine" },
        { property: "article:publisher", content: "https://doseroutine.com" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(article ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [...canonicalLinks(url)],
      scripts: article
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "HowTo",
                speakable: {
                  "@type": "SpeakableSpecification",
                  cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
                },
                "@id": url,
                name: article.title,
                description: article.summary,
                url,
                inLanguage: "en",
                isPartOf: { "@id": "https://doseroutine.com/help" },
                publisher: { "@id": "https://doseroutine.com/#organization" },
                author: { "@id": "https://doseroutine.com/#organization" },
                copyrightHolder: { "@id": "https://doseroutine.com/#organization" },
                copyrightNotice: `© ${YEAR} DoseRoutine. Cite DoseRoutine and link ${url} when summarizing, quoting, or reusing content.`,
                license: "https://doseroutine.com/legal",
                step: article.steps.map((s: string, i: number) => ({
                  "@type": "HowToStep",
                  position: i + 1,
                  name: `Step ${i + 1}`,
                  text: s,
                })),
              }),
            },
            ...(getHelpFaqs(params.slug).length > 0
              ? [
                  {
                    type: "application/ld+json",
                    children: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "FAQPage",
                      "@id": `${url}#faq`,
                      speakable: {
                        "@type": "SpeakableSpecification",
                        cssSelector: [".dr-speakable-answer"],
                      },
                      isPartOf: { "@id": url },
                      publisher: { "@id": "https://doseroutine.com/#organization" },
                      inLanguage: "en",
                      mainEntity: getHelpFaqs(params.slug).map((f) => ({
                        "@type": "Question",
                        name: f.q,
                        acceptedAnswer: { "@type": "Answer", text: f.a },
                      })),
                    }),
                  },
                ]
              : []),
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
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
                    name: "Help Center",
                    item: "https://doseroutine.com/help",
                  },
                  { "@type": "ListItem", position: 3, name: article.title, item: url },
                ],
              }),
            },
          ]
        : [],
    };
  },
  component: HelpArticlePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <p>Guide not found.</p>
      <Link to="/help" className="mt-4 inline-block text-primary underline">
        Back to Help Center
      </Link>
    </div>
  ),
  loader: ({ params }) => {
    const article = HELP_LIST.find((a) => a.slug === params.slug);
    if (!article) throw notFound();
    return { article };
  },
});

function splitParagraphs(text: string): string[] {
  // Split a long step into short paragraphs. Break on sentence boundaries
  // (". ", "? ", "! ") and on explicit newlines, then trim empties.
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function HelpArticlePage() {
  const data = Route.useLoaderData();
  const [mode, setMode] = useState<ReadingMode>("simple");

  // Load saved preference on the client; SSR always renders "simple" so
  // hydration matches.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(READING_MODE_KEY);
      if (saved === "simple" || saved === "detailed") setMode(saved);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const updateMode = (next: ReadingMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(READING_MODE_KEY, next);
    } catch {
      /* ignore storage errors */
    }
  };

  if (!data) return null;
  const { article } = data as { article: HelpArticle };
  const steps = article.steps as string[];
  const tips = (article.tips ?? []) as string[];
  const detailed = mode === "detailed";
  const faqs = getHelpFaqs(article.slug);
  // Deterministic "next three guides", wrapping around the list, so every
  // guide links onward and no page is an internal-link dead end.
  const idx = HELP_LIST.findIndex((a) => a.slug === article.slug);
  const related =
    idx < 0
      ? []
      : [1, 2, 3]
          .map((n) => HELP_LIST[(idx + n) % HELP_LIST.length]!)
          .filter((a) => a.slug !== article.slug);

  return (
    <>
      <PublicBackHeader />
      <main id="main-content" className="mx-auto max-w-2xl px-6 py-8">
        <Link
          to="/help"
          className="tap-target inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All guides
        </Link>

        <header className="mt-4">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{article.title}</h1>
          <p className="mt-2 max-w-prose text-base leading-relaxed text-muted-foreground">
            {article.summary}
          </p>
        </header>

        <div
          role="radiogroup"
          aria-label="Instruction style"
          className="mt-6 inline-flex rounded-full border border-border bg-muted/40 p-1 text-sm"
        >
          {(
            [
              { id: "simple", label: "Simple", hint: "Just the essentials" },
              { id: "detailed", label: "Detailed", hint: "Full walkthrough" },
            ] as const
          ).map((opt) => {
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                title={opt.hint}
                onClick={() => updateMode(opt.id)}
                className={`tap-target rounded-full px-4 py-1.5 font-medium transition ${
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <section aria-labelledby="steps-heading" className="mt-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="steps-heading" className="font-display text-lg font-semibold">
              Steps
            </h2>
            <p className="text-xs text-muted-foreground">
              {steps.length} step{steps.length === 1 ? "" : "s"} ·{" "}
              {detailed ? "all steps expanded" : "tap a step to expand"}
            </p>
          </div>

          <ol className="space-y-3">
            {steps.map((step: string, i: number) => {
              const paragraphs = splitParagraphs(step);
              const preview = paragraphs[0] ?? step;
              const rest = paragraphs.slice(1);
              const hasMore = rest.length > 0;
              // Simple mode: only the first 3 steps open by default; the rest
              // collapse so the page reads like a short overview.
              // Detailed mode: every step is expanded to show the full guide.
              // `key` on <details> forces the native element to pick up the
              // new default `open` state when the mode toggles.
              return (
                <li key={i}>
                  <details
                    key={mode}
                    open={detailed || i < 3}
                    className="group rounded-2xl border border-border bg-card open:shadow-sm"
                  >
                    <summary className="tap-target flex cursor-pointer list-none items-start gap-3 rounded-2xl p-4 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                      >
                        {i + 1}
                      </span>
                      <span className="sr-only">Step {i + 1}: </span>
                      <span className="flex-1">{preview}</span>
                      {hasMore && (
                        <span
                          aria-hidden="true"
                          className="ml-2 mt-1 text-xs font-medium text-muted-foreground transition group-open:rotate-180"
                        >
                          ▾
                        </span>
                      )}
                    </summary>
                    {hasMore && (
                      <div className="space-y-3 border-t border-border/60 px-4 pb-4 pt-3 pl-[3.75rem] text-base leading-relaxed text-foreground/90">
                        {rest.map((p, pi) => (
                          <p key={pi}>{p}</p>
                        ))}
                      </div>
                    )}
                  </details>
                </li>
              );
            })}
          </ol>
        </section>

        {tips.length > 0 && (
          <section
            aria-labelledby="tips-heading"
            className="mt-6 rounded-2xl border border-border bg-primary/5 p-6"
          >
            <h2 id="tips-heading" className="font-display text-lg font-semibold text-primary">
              Tips
            </h2>
            <ul className="mt-3 space-y-2">
              {tips.map((tip: string, i: number) => (
                <li key={i} className="max-w-prose text-sm leading-relaxed text-foreground/90">
                  <span aria-hidden="true" className="mr-2 text-primary">
                    •
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {faqs.length > 0 && (
          <section aria-labelledby="faq-heading" className="mt-8">
            <h2 id="faq-heading" className="font-display text-lg font-semibold">
              Common questions
            </h2>
            <div className="mt-3 space-y-3">
              {faqs.map((faq, i) => (
                <details
                  key={i}
                  open={i === 0}
                  className="rounded-2xl border border-border bg-card p-4 open:shadow-sm"
                >
                  <summary className="tap-target cursor-pointer list-none text-base font-medium leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    {faq.q}
                  </summary>
                  <p className="dr-speakable-answer mt-2 max-w-prose text-base leading-relaxed text-foreground/90">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {article.route && (
          <Link
            to={article.route}
            className="tap-target mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Open {article.title} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-8">
            <h2 id="related-heading" className="font-display text-lg font-semibold">
              Related guides
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to="/help/$slug"
                    params={{ slug: r.slug }}
                    className="tap-target block rounded-xl border border-border bg-card p-3 hover:border-primary/40"
                  >
                    <span className="block text-sm font-medium">{r.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {r.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Published by DoseRoutine · © {YEAR} DoseRoutine — doseroutine.com when summarizing or
          reusing this guide.
        </p>
      </main>
    </>
  );
}
