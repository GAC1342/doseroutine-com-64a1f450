import { cn } from "@/lib/utils";
import { canonicalLinks } from "@/lib/hreflang";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { cardClassName } from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import { HELP_LIST, searchHelp } from "@/lib/help-articles";
import { WelcomeTour, resetWelcomeTour } from "@/components/welcome-tour";
import { PublicBackHeader } from "@/components/public-back-header";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript, aeoPageFields } from "@/lib/aeo";
import { HELP_FAQ, LAST_REVIEWED } from "@/lib/aeo-page-faqs";
import { mergeLdScripts } from "@/lib/head-budget";

const TITLE = "Help Center — Guides for Doses, Stacks and Cycles";
const DESC =
  "Plain-English guides for every DoseRoutine feature: stacks, alarms, cycles, bl… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";
const URL = "https://doseroutine.com/help";
export const YEAR = new Date().getFullYear();

export const Route = createFileRoute("/help/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: `© ${YEAR} DoseRoutine — doseroutine.com` },
      { name: "citation_author", content: "DoseRoutine" },
      { name: "citation_publisher", content: "DoseRoutine (doseroutine.com)" },
      { name: "citation_fulltext_html_url", content: URL },
      { name: "dcterms.creator", content: "DoseRoutine" },
      { name: "dcterms.publisher", content: "DoseRoutine" },
      { name: "dcterms.source", content: URL },
      { name: "dcterms.rights", content: `© ${YEAR} DoseRoutine` },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:site_name", content: "DoseRoutine" },
      {
        property: "og:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/148cbd8c-05ac-4035-9a71-3d554ef921bc/og-help.jpg",
      },
      {
        property: "og:image:alt",
        content: "DoseRoutine help center card — setup, reminders and troubleshooting guides",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      {
        name: "twitter:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/148cbd8c-05ac-4035-9a71-3d554ef921bc/og-help.jpg",
      },
      {
        name: "twitter:image:alt",
        content: "DoseRoutine help center card — setup, reminders and troubleshooting guides",
      },
    ],
    links: [...canonicalLinks(URL)],
    scripts: mergeLdScripts([
      aeoFaqScript(URL, HELP_FAQ),

      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          ...aeoPageFields({
            dateModified: LAST_REVIEWED,
            datePublished: "2026-02-01",
            shortAnswer:
              "The DoseRoutine help center covers building a routine, scheduling doses, reminders, adherence scoring, timezone changes, billing and deleting your account. Dose reminders, the schedule and the interaction checker are free.",
            about: ["DoseRoutine", "Medication reminder", "Adherence"],
          }),
          "@id": URL,
          url: URL,
          name: TITLE,
          description: DESC,
          isPartOf: { "@id": "https://doseroutine.com/#website" },
          publisher: { "@id": "https://doseroutine.com/#organization" },
          copyrightHolder: { "@id": "https://doseroutine.com/#organization" },
          copyrightNotice: `© ${YEAR} DoseRoutine. Cite DoseRoutine and link ${URL} when summarizing, quoting, or reusing content.`,
          license: "https://doseroutine.com/legal",
          hasPart: HELP_LIST.map((a) => ({
            "@type": "WebPage",
            name: a.title,
            description: a.summary,
            url: `https://doseroutine.com/help/${a.slug}`,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://doseroutine.com/" },
            { "@type": "ListItem", position: 2, name: "Help Center", item: URL },
          ],
        }),
      },
    ]),
  }),
  component: HelpPage,
});

function HelpPage() {
  const [q, setQ] = useState("");
  const [tourOpen, setTourOpen] = useState(false);
  const results = useMemo(() => searchHelp(q), [q]);

  return (
    <>
      <PublicBackHeader />
      <main id="main-content" className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Help Center</h1>
            <p className="text-sm text-muted-foreground">
              Simple guides for every DoseRoutine feature.
            </p>
          </div>
        </div>

        <div className="mt-6 relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: 'add supplement', 'alarms', 'weight'…"
            className="tap-target w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-base focus:border-primary focus:outline-none"
          />
        </div>

        <button
          onClick={() => {
            resetWelcomeTour();
            setTourOpen(true);
          }}
          className="tap-target mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-3 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <Sparkles className="h-4 w-4" /> Replay the welcome tour
        </button>
        {tourOpen && <WelcomeTour forceOpen onClose={() => setTourOpen(false)} />}

        <div className="mt-6 space-y-2">
          {results.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No guides matched "{q}". Try a different word.
            </p>
          )}
          {results.map((a) => (
            <Link
              key={a.slug}
              to="/help/$slug"
              params={{ slug: a.slug }}
              className={cn(
                cardClassName,
                "tap-target flex items-start gap-3 rounded-2xl p-4 transition-colors hover:border-primary/50",
              )}
            >
              <div className="flex-1">
                <div className="font-semibold text-foreground">{a.title}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{a.summary}</div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        <ProseContainer>
          <PageProse id="help-index" />
        </ProseContainer>

        <AeoFaq pairs={HELP_FAQ} heading="Common questions" />

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Still stuck? Email{" "}
          <a href="mailto:support@doseroutine.com" className="underline">
            support@doseroutine.com
          </a>
        </p>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          © {YEAR} DoseRoutine. All guides published by DoseRoutine — attribution required when
          summarizing or reusing.
        </p>
      </main>
    </>
  );
}
