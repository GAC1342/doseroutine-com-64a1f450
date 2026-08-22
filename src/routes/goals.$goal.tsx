import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ContentRouteError, ContentRouteNotFound } from "@/components/route-fallbacks";
import { useSuspenseQuery } from "@tanstack/react-query";
import { allCompoundsQuery, goalContentQuery } from "@/lib/library-data";
import { GOALS } from "@/lib/goals";
import { LibraryShell } from "@/components/library-shell";
import { AttributionFooter } from "@/components/attribution-footer";
import { trackEvent } from "@/lib/analytics";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { mergeLdScripts } from "@/lib/head-budget";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { GOAL_HUB_FAQS } from "@/lib/aeo-faqs-hubs";

export const Route = createFileRoute("/goals/$goal")({
  loader: async ({ params, context }) => {
    const goal = GOALS.find((g) => g.slug === params.goal);
    if (!goal) throw notFound();
    await Promise.all([
      context.queryClient.ensureQueryData(allCompoundsQuery),
      context.queryClient.ensureQueryData(goalContentQuery(goal.slug)),
    ]);
    return { goal };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Goal not found — DoseRoutine" }, { name: "robots", content: "noindex" }],
      };
    }
    const g = loaderData.goal;
    const title = `${g.title} Compounds | DoseRoutine`;
    const desc = withDoseRoutineDescriptionSuffix(
      `${g.blurb} Browse DoseRoutine's curated list of compounds studied for ${g.title.toLowerCase()}.`,
    );
    const url = `https://doseroutine.com/goals/${params.goal}`;
    const faqPairs = GOAL_HUB_FAQS[g.slug] ?? [];
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "author", content: "DoseRoutine" },
        {
          name: "copyright",
          content: `© ${new Date().getFullYear()} DoseRoutine — doseroutine.com`,
        },
        { property: "og:site_name", content: "DoseRoutine" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...ogLocaleMeta("en"),
      ],
      links: [{ rel: "canonical", href: url }, ...hreflangLinks(`/goals/${params.goal}`)],
      scripts: mergeLdScripts([
        aeoFaqScript(url, faqPairs),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["CollectionPage", "WebPage"],
            speakable: {
              "@type": "SpeakableSpecification",
              cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
            },
            "@id": url,
            name: title,
            description: desc,
            url,
            inLanguage: "en",
            about: {
              "@type": "MedicalCondition",
              name: g.title,
            },
            medicalAudience: [
              { "@type": "MedicalAudience", audienceType: "Patient" },
              { "@type": "MedicalAudience", audienceType: "Consumer" },
            ],
            isPartOf: { "@id": "https://doseroutine.com/#website" },
            publisher: {
              "@type": "Organization",
              "@id": "https://doseroutine.com/#organization",
              name: "DoseRoutine",
              url: "https://doseroutine.com",
              logo: {
                "@type": "ImageObject",
                url: "https://doseroutine.com/icon-512.png",
              },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://doseroutine.com/" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Goals",
                item: "https://doseroutine.com/goals",
              },
              { "@type": "ListItem", position: 3, name: g.title, item: url },
            ],
          }),
        },
      ]),
    };
  },
  component: GoalHub,
  errorComponent: ContentRouteError,
  notFoundComponent: () => <ContentRouteNotFound label="Goal" />,
});

function GoalHub() {
  const { goal } = Route.useLoaderData();
  const { data: compounds } = useSuspenseQuery(allCompoundsQuery);
  const { data: content } = useSuspenseQuery(goalContentQuery(goal.slug));
  const matches = compounds.filter((c) => (c.goal_tags ?? []).includes(goal.slug));

  return (
    <LibraryShell>
      <nav className="mb-4 text-xs text-muted-foreground">
        <Link to="/goals" className="hover:text-foreground">
          ← All health goals
        </Link>
        <span className="px-2">/</span>
        <Link to="/library" className="hover:text-foreground">
          Compound Library
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {content?.title ?? goal.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {content?.intro_md ?? goal.blurb}
        </p>
      </header>

      <aside className="mb-6 rounded-xl border border-border bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Educational reference — not medical advice.</strong>{" "}
        Published by DoseRoutine (doseroutine.com) for informational purposes only. Consult a
        licensed clinician before starting, stopping, or combining any compound. DoseRoutine assumes
        no liability for how this information is used.
      </aside>

      <h2 className="mb-3 font-display text-xl font-semibold">
        Compounds studied for {goal.title.toLowerCase()} ({matches.length})
      </h2>
      {matches.length === 0 ? (
        <p className="text-muted-foreground">No compounds tagged for this goal yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {matches.map((c) => (
            <li key={c.id} id={c.slug} className="scroll-mt-24 rounded-xl bg-card p-4">
              <Link
                to="/library/$slug"
                params={{ slug: c.slug }}
                className="block transition hover:opacity-90"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    {c.aliases && c.aliases.length > 0 && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {c.aliases.slice(0, 2).join(", ")}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {c.category}
                  </span>
                </div>
              </Link>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Link
                  to="/library/$slug"
                  params={{ slug: c.slug }}
                  hash="benefits"
                  aria-label={`${c.name} benefits`}
                  onClick={() =>
                    trackEvent("goal_hub_chip_click", {
                      goal: goal.slug,
                      compound_slug: c.slug,
                      section: "benefits",
                    })
                  }
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
                >
                  Benefits →
                </Link>
                <Link
                  to="/library/$slug"
                  params={{ slug: c.slug }}
                  hash="side-effects"
                  aria-label={`${c.name} side effects`}
                  onClick={() =>
                    trackEvent("goal_hub_chip_click", {
                      goal: goal.slug,
                      compound_slug: c.slug,
                      section: "side-effects",
                    })
                  }
                  className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:opacity-90"
                >
                  Side effects →
                </Link>
                <Link
                  to="/library/$slug"
                  params={{ slug: c.slug }}
                  hash="timing"
                  aria-label={`${c.name} timing`}
                  onClick={() =>
                    trackEvent("goal_hub_chip_click", {
                      goal: goal.slug,
                      compound_slug: c.slug,
                      section: "timing",
                    })
                  }
                  className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:opacity-90"
                >
                  Timing →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 rounded-2xl border border-border bg-card/60 p-6">
        <h2 className="mb-2 font-display text-lg font-semibold">Explore other goals</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Browse the DoseRoutine library by outcome.
        </p>
        <div className="flex flex-wrap gap-2">
          {GOALS.filter((g) => g.slug !== goal.slug).map((g) => (
            <Link
              key={g.slug}
              to="/goals/$goal"
              params={{ goal: g.slug }}
              className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
            >
              {g.title} →
            </Link>
          ))}
          <Link
            to="/library"
            className="rounded-full bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:opacity-90"
          >
            Full compound library →
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-2xl bg-primary p-6 text-primary-foreground">
        <h2 className="font-display text-xl font-semibold">
          Build your {goal.title.toLowerCase()} stack
        </h2>
        <p className="mt-2 text-sm opacity-90">
          Add these compounds to DoseRoutine. We'll schedule them, check every pairwise interaction,
          and keep you on time.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-flex items-center rounded-xl bg-background px-5 py-3 text-sm font-semibold text-foreground hover:opacity-90"
        >
          Sign up free →
        </Link>
      </section>
      <AeoFaq pairs={GOAL_HUB_FAQS[goal.slug] ?? []} heading={`${goal.title} FAQ`} />

      <AttributionFooter sourceUrl={`https://doseroutine.com/goals/${goal.slug}`} />
    </LibraryShell>
  );
}
