import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalLinks } from "@/lib/hreflang";
import { ArrowRight, HelpCircle, Info, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

import {
  CANONICAL,
  TITLE,
  DESC,
  FAQS,
  MEDICAL_LD,
  BREADCRUMB_LD,
  FAQ_LD,
  OG_IMAGE,
  PAIR_LABELS,
  COMPOUND_LABELS,
  humanize,
} from "@/lib/menopause-checker-content";

export { CANONICAL, TITLE, DESC } from "@/lib/menopause-checker-content";

type SearchParams = { compound?: string; with?: string };

export const Route = createFileRoute("/menopause-supplement-interaction-checker")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    compound: typeof search.compound === "string" ? search.compound : undefined,
    with: typeof search.with === "string" ? search.with : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "author", content: "DoseRoutine" },
      { name: "publisher", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Menopause Supplement Interaction Checker — DoseRoutine",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
      {
        name: "twitter:image:alt",
        content: "DoseRoutine menopause supplement interaction checker card",
      },
    ],
    links: [...canonicalLinks(CANONICAL)],
    scripts: mergeLdScripts([
      { type: "application/ld+json", children: JSON.stringify(MEDICAL_LD) },
      { type: "application/ld+json", children: JSON.stringify(BREADCRUMB_LD) },
      { type: "application/ld+json", children: JSON.stringify(FAQ_LD) },
    ]),
  }),
  component: MenopauseInteractionCheckerLanding,
});

function MenopauseInteractionCheckerLanding() {
  const { compound, with: withKey } = Route.useSearch();
  const compoundLabel = compound ? (COMPOUND_LABELS[compound] ?? humanize(compound)) : undefined;
  const withLabel = withKey ? (PAIR_LABELS[withKey] ?? humanize(withKey)) : undefined;
  const hasPair = Boolean(compoundLabel && withLabel);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      {/* Original: https://doseroutine.com/menopause-supplement-interaction-checker — © DoseRoutine */}
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Menopause Supplement Interaction Checker
          </h1>
          <p className="text-lg text-muted-foreground">
            Check menopause supplements — black cohosh, soy isoflavones, vitex, DHEA, red clover,
            evening primrose — against HRT, birth control, thyroid medication, SSRIs, and everything
            else you take. Free for 7 days.
          </p>
          <div className="pt-2">
            <Link
              to="/interaction-checker"
              className="inline-flex items-center gap-1 rounded-md px-4 py-2 text-white font-semibold"
              style={{ backgroundColor: "hsl(var(--accent, 12 78% 60%))" }}
            >
              Open the interaction checker <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* The id lives on an always-rendered wrapper so `#selected-pair`
            deep links from compound pages resolve even when the URL carries no
            pair (crawlers request the bare path and would otherwise log a dead
            fragment). */}
        <div id="selected-pair" className="scroll-mt-24">
          {hasPair && (
            <Card
              className="p-5 border-2"
              style={{ borderColor: "hsl(var(--accent, 12 78% 60%))" }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected pair
              </div>
              <h2 className="mt-1 text-xl font-bold">
                {compoundLabel} + {withLabel}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You came from a compound page — open the full checker to see this pair alongside
                every other supplement and prescription in your routine, with mechanism and severity
                for each flagged combination.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/interaction-checker"
                  className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-white text-sm font-semibold"
                  style={{ backgroundColor: "hsl(var(--accent, 12 78% 60%))" }}
                >
                  Check {compoundLabel} + {withLabel} <ArrowRight className="h-4 w-4" />
                </Link>
                {compound && (
                  <a
                    href={`/library/womens-health/${compound}#interactions`}
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-semibold"
                  >
                    Back to {compoundLabel} interactions
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">What this checks</h2>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm">
            <li>
              <strong>HRT interactions</strong> — estradiol, progesterone, testosterone.
            </li>
            <li>
              <strong>Birth control interactions</strong> — combined pills, mini-pill, IUD, ring.
            </li>
            <li>
              <strong>Thyroid medication timing</strong> — levothyroxine absorption conflicts.
            </li>
            <li>
              <strong>SSRI and mood-medication</strong> — serotonin and sedation risk.
            </li>
            <li>
              <strong>Blood thinner interactions</strong> — warfarin, apixaban, aspirin.
            </li>
            <li>
              <strong>Blood pressure medication</strong> — additive hypotension.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Menopause hubs and compound pages</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <a href="/library/womens-health/menopause-hormones" className="block">
              <Card className="h-full p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold">Menopause & Hormone Balance</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every compound, every HRT interaction.
                </p>
              </Card>
            </a>
            <a href="/library/womens-health/longevity" className="block">
              <Card className="h-full p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold">Longevity for Women</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bone, muscle, sleep and heart support.
                </p>
              </Card>
            </a>
            <a href="/library/womens-health/sexual-health" className="block">
              <Card className="h-full p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold">Sexual Health & Libido</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Testosterone context, maca, ashwagandha.
                </p>
              </Card>
            </a>
            <a href="/library/womens-health/fertility-cycle" className="block">
              <Card className="h-full p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold">Fertility & Cycle Support</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Inositol, CoQ10, folate, vitamin D.
                </p>
              </Card>
            </a>
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="mic-faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 id="mic-faq" className="text-2xl font-bold">
              FAQ
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <Card key={i} className="p-4">
                <h3 className="text-base font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed">{f.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="p-5 border-2" style={{ borderColor: "hsl(var(--accent, 12 78% 60%))" }}>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5" style={{ color: "hsl(var(--accent, 12 78% 60%))" }} />
            <div className="text-sm">
              <p className="font-semibold text-base">Open the DoseRoutine interaction checker</p>
              <p className="text-muted-foreground mt-1">
                Add every supplement, HRT dose, and prescription — see the full pairwise safety
                picture in one view. Free for 7 days.
              </p>
              <Link
                to="/interaction-checker"
                className="mt-3 inline-flex items-center gap-1 rounded-md px-3 py-2 text-white font-semibold"
                style={{ backgroundColor: "hsl(var(--accent, 12 78% 60%))" }}
              >
                Open interaction checker <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Card>

        <footer className="border-t pt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Educational, not medical advice. Menopause decisions belong with your gynecologist or
            menopause specialist.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} <strong>DoseRoutine</strong> — original content at{" "}
            <a href={CANONICAL} className="underline">
              {CANONICAL}
            </a>
            .
          </p>
        </footer>
        <AttributionFooter sourceUrl={CANONICAL} />
      </article>
    </main>
  );
}
