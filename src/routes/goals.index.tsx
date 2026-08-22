import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentRouteError } from "@/components/route-fallbacks";
import { GOALS } from "@/lib/goals";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { mergeLdScripts } from "@/lib/head-budget";
import { AeoFaq } from "@/components/aeo-faq";
import { AttributionFooter } from "@/components/attribution-footer";
import { aeoFaqScript } from "@/lib/aeo";

export const PATH = "/goals";
export const GOALS_URL = `https://doseroutine.com${PATH}`;
export const TITLE = "Health Goals — Compounds & Peptides | DoseRoutine";
export const DESC = withDoseRoutineDescriptionSuffix(
  "Browse compounds, peptides and supplements grouped by the goal people take them for — weight loss, muscle, recovery, sleep, longevity, hormones and more.",
);

export const FAQ = [
  {
    q: "How are DoseRoutine goal pages organized?",
    a: "Each goal page lists the compounds, peptides and supplements that have been studied for that outcome, with links to the benefits, side effects and timing sections of every compound profile.",
  },
  {
    q: "Do these pages recommend what to take?",
    a: "No. Goal pages are an educational index of what has been researched for a given outcome. They are not medical advice, and you should speak with a licensed clinician before starting, stopping or combining anything.",
  },
  {
    q: "Can I track a goal inside DoseRoutine?",
    a: "Yes. Once you build a stack you can log doses, set reminders, check interactions between everything you take, and track labs and body metrics against the goal you picked.",
  },
];

export const Route = createFileRoute("/goals/")({
  component: GoalsIndex,
  errorComponent: ContentRouteError,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "author", content: "DoseRoutine" },
      { name: "publisher", content: "DoseRoutine" },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: GOALS_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: GOALS_URL }, ...hreflangLinks(PATH)],
    scripts: mergeLdScripts([
      aeoFaqScript(GOALS_URL, FAQ),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": ["CollectionPage", "WebPage"],
          "@id": GOALS_URL,
          url: GOALS_URL,
          name: TITLE,
          description: DESC,
          inLanguage: "en",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-intro", "h1"],
          },
          hasPart: GOALS.map((g) => ({
            "@type": "WebPage",
            name: g.title,
            url: `https://doseroutine.com/goals/${g.slug}`,
            description: g.blurb,
          })),
        }),
      },
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
            { "@type": "ListItem", position: 2, name: "Goals", item: GOALS_URL },
          ],
        }),
      },
    ]),
  }),
});

function GoalsIndex() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-display text-lg font-semibold text-foreground">
            DoseRoutine
          </Link>
          <Link to="/library" className="text-sm text-muted-foreground hover:text-foreground">
            Compound library
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 pb-16 pt-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>{" "}
          / <span className="text-foreground">Goals</span>
        </nav>

        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Health goals
        </h1>
        <p className="dr-speakable-intro mt-3 text-base text-muted-foreground">
          Every compound, peptide and supplement in the DoseRoutine library, grouped by the outcome
          people take it for. Pick a goal to see what has been studied for it, what the evidence
          looks like, and how each one is typically dosed and timed.
        </p>

        <aside className="mt-6 rounded-xl border border-border bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Educational reference — not medical advice.</strong>{" "}
          Consult a licensed clinician before starting, stopping, or combining any compound.
        </aside>

        <h2 className="mb-3 mt-10 font-display text-xl font-semibold">
          Browse all {GOALS.length} goals
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {GOALS.map((g) => (
            <li key={g.slug} className="rounded-xl bg-card p-4">
              <Link
                to="/goals/$goal"
                params={{ goal: g.slug }}
                className="font-semibold text-foreground hover:opacity-90"
              >
                {g.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{g.blurb}</p>
            </li>
          ))}
        </ul>

        <section className="mt-10 rounded-2xl border border-border bg-card/60 p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Keep going</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <Link to="/library" className="text-primary hover:underline">
                Browse the full compound library
              </Link>
            </li>
            <li>
              <Link to="/interaction-checker" className="text-primary hover:underline">
                Check interactions between everything you take
              </Link>
            </li>
            <li>
              <Link to="/peptide-calculator" className="text-primary hover:underline">
                Work out a peptide dose with the peptide calculator
              </Link>
            </li>
          </ul>
        </section>

        <AeoFaq heading="Goal pages: common questions" pairs={FAQ} />

        <AttributionFooter sourceUrl={GOALS_URL} />
      </main>
    </div>
  );
}
