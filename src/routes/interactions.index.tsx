import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LibraryShell } from "@/components/library-shell";
import { ContentRouteError } from "@/components/route-fallbacks";
import { AttributionFooter } from "@/components/attribution-footer";
import { severityStyles } from "@/components/severity-badge";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript, aeoPageFields } from "@/lib/aeo";
import { INTERACTIONS_INDEX_FAQ, LAST_REVIEWED } from "@/lib/aeo-page-faqs";
import { pairPagesQuery, SEVERITY_LABEL, type Severity } from "@/lib/interaction-pairs";

const SITE = "https://doseroutine.com";
const URL = `${SITE}/interactions`;
const TITLE = "Supplement & Peptide Interaction Pairs | DoseRoutine";
const DESCRIPTION = withDoseRoutineDescriptionSuffix(
  "Plain-English answers to 300+ 'can you take X with Y?' questions across supplements, hormones, peptides and GLP-1s",
  160,
);

const SEVERITY_ORDER: Severity[] = ["avoid", "caution", "note", "synergy"];

export const Route = createFileRoute("/interactions/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(pairPagesQuery),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "author", content: "DoseRoutine" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: `${SITE}/og/library-default.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: `${SITE}/og/library-default.jpg` },
      ...ogLocaleMeta(),
    ],
    links: [{ rel: "canonical", href: URL }, ...hreflangLinks("/interactions")],
    scripts: [
      aeoFaqScript(URL, INTERACTIONS_INDEX_FAQ),

      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              ...aeoPageFields({
                dateModified: LAST_REVIEWED,
                datePublished: "2026-03-05",
                shortAnswer:
                  "Every named interaction pair in DoseRoutine has its own page answering 'can I take A with B?' with a direct verdict, the mechanism, the spacing that helps, and the source. Combinations without a named page are still covered by category-level rules in the interaction checker.",
                about: ["Drug interaction", "Dietary supplement", "Peptide", "Prescription drug"],
              }),
              "@id": `${URL}#page`,
              name: TITLE,
              description: DESCRIPTION,
              url: URL,
              inLanguage: "en",
              publisher: {
                "@type": "Organization",
                "@id": `${SITE}/#organization`,
                name: "DoseRoutine",
                url: SITE,
              },
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${URL}#breadcrumb`,
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
                { "@type": "ListItem", position: 2, name: "Interactions", item: URL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  errorComponent: ContentRouteError,
  component: InteractionsIndex,
});

function InteractionsIndex() {
  const { data: pages } = useSuspenseQuery(pairPagesQuery);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<Severity | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter((p) => {
      if (severity !== "all" && p.severity !== severity) return false;
      if (!q) return true;
      return (
        p.a.name.toLowerCase().includes(q) ||
        p.b.name.toLowerCase().includes(q) ||
        p.slug.includes(q.replace(/\s+/g, "-"))
      );
    });
  }, [pages, query, severity]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of pages) map[p.severity] = (map[p.severity] ?? 0) + 1;
    return map;
  }, [pages]);

  return (
    <LibraryShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Interactions</span>
        </nav>

        <h1 className="text-2xl font-bold sm:text-3xl">
          Can you take these together? {pages.length} answered pairs
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Every page below answers one question in plain English: what happens when two specific
          things in a routine are taken together, why it happens, and what to do about the timing.
          Pairs are drawn from the same rule set that powers the DoseRoutine{" "}
          <Link to="/interaction-checker" className="text-primary underline underline-offset-2">
            interaction checker
          </Link>
          , which reviews your whole stack at once instead of one pair at a time.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a supplement, peptide or medication…"
            aria-label="Search interaction pairs"
            className="sm:max-w-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...SEVERITY_ORDER] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s as Severity | "all")}
                aria-pressed={severity === s}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  severity === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {s === "all" ? `All (${pages.length})` : `${SEVERITY_LABEL[s]} (${counts[s] ?? 0})`}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
          Showing {filtered.length} of {pages.length} pairs
        </p>

        {/* 300+ cards: plain anchors + a text-only badge keep the full list crawlable
            while cutting hydration work (no per-item router subscription, no per-item icon SVG).
            content-visibility skips layout/paint for off-screen rows. */}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {filtered.map((p) => {
            const s = severityStyles[p.severity];
            return (
              <li
                key={p.slug}
                style={{ contentVisibility: "auto", containIntrinsicSize: "auto 84px" }}
              >
                <a
                  href={`/interactions/${p.slug}`}
                  className={cn(
                    cardClassName,
                    "flex h-full flex-col gap-2 p-3 hover:border-primary/40",
                  )}
                >
                  <span className="text-sm font-semibold">
                    {p.a.name} and {p.b.name}
                  </span>
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${s.bg} ${s.fg}`}
                  >
                    {s.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        {filtered.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No pair matches that search yet. Try one item on its own, or run the{" "}
            <Link to="/interaction-checker" className="text-primary underline underline-offset-2">
              full interaction checker
            </Link>{" "}
            — it covers category-level rules that don't have a dedicated page.
          </p>
        ) : null}

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Educational information only, not medical advice. Talk to your prescriber before starting,
          stopping or combining anything.
        </p>

        <AeoFaq pairs={INTERACTIONS_INDEX_FAQ} heading="About these interaction pages" />

        <AttributionFooter sourceUrl={URL} />
      </div>
    </LibraryShell>
  );
}
