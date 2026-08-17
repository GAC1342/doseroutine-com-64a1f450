import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Home, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { AttributionFooter } from "@/components/attribution-footer";

const CANONICAL = "https://doseroutine.com/vs";
const TITLE = "DoseRoutine vs. Other Apps — All Comparisons";
const DESC =
  "Every side-by-side comparison of DoseRoutine against other medication, supplement, peptide and TRT trackers, on one page.";

// Every /vs/* URL in the sitemap, plus the general compound comparison hubs.
const COMPARISONS: {
  to: string;
  label: string;
  description: string;
}[] = [
  {
    to: "/vs/medisafe",
    label: "vs. Medisafe",
    description: "How DoseRoutine handles peptides, TRT and stacks that Medisafe skips.",
  },
  {
    to: "/vs/mytherapy",
    label: "vs. MyTherapy",
    description: "Multi-time daily doses, injection sites and lab tracking compared.",
  },
  {
    to: "/vs/cronometer",
    label: "vs. Cronometer",
    description: "A Cronometer alternative for peptides, hormones and stacks.",
  },
  {
    to: "/vs/round-health",
    label: "vs. Round Health",
    description: "Where Round Health fits and where DoseRoutine takes over.",
  },
  {
    to: "/vs/pill-reminder",
    label: "vs. Pill Reminder",
    description: "Reminders vs. a full peptide + TRT routine tracker.",
  },
  {
    to: "/vs-supplement-planner",
    label: "vs. Supplement planners",
    description: "Why supplement-only planners fall short for peptides and hormones.",
  },
  {
    to: "/compare",
    label: "Compare any two compounds",
    description: "Side-by-side compound comparison tool for peptides, hormones and supplements.",
  },
  {
    to: "/library/compare/bpc-157-vs-tb-500",
    label: "BPC-157 vs. TB-500",
    description: "In-depth compound comparison example.",
  },
];

export const Route = createFileRoute("/vs/")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/vs")],
    scripts: [
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
                { "@type": "ListItem", position: 2, name: "Comparisons", item: CANONICAL },
              ],
            },
            {
              "@type": "CollectionPage",
              speakable: {
                "@type": "SpeakableSpecification",
                cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
              },
              url: CANONICAL,
              name: TITLE,
              description: DESC,
              mainEntity: {
                "@type": "ItemList",
                itemListElement: COMPARISONS.map((c, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: c.label,
                  url: `https://doseroutine.com${c.to}`,
                })),
              },
            },
          ],
        }),
      },
    ],
  }),
  component: VsIndex,
});

function VsIndex() {
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
            Comparisons
          </li>
        </ol>
      </nav>

      <section className="border-b border-border/40 bg-muted/30 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Scale className="h-4 w-4" />
            <span>Side-by-side comparisons</span>
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            DoseRoutine vs. other apps
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every comparison in one place — pick a tracker to see how DoseRoutine stacks up.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {COMPARISONS.map((c) => (
              <li key={c.to}>
                <Card className="group flex h-full flex-col transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">{c.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <p className="text-muted-foreground">{c.description}</p>
                    <Button asChild variant="outline" className="mt-auto w-full gap-2">
                      <Link to={c.to} aria-label={`Read the ${c.label} comparison`}>
                        Read
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <AttributionFooter sourceUrl={CANONICAL} />
    </main>
  );
}
