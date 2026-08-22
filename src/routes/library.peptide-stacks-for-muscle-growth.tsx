import { cn } from "@/lib/utils";
import { faqAnchorId } from "@/lib/faq-snippet";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Dumbbell, FlaskConical, Info, ShieldAlert } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card, cardClassName } from "@/components/ui/card";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/peptide-stacks-for-muscle-growth";
const TITLE = "Best Peptide Stacks for Muscle Growth: Research Guide";
const DESC =
  "Discover the best peptide stacks for muscle growth: BPC-157, TB-500, CJC-1295 Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";
const OG_IMAGE = "https://doseroutine.com/og/peptide-stacks-for-muscle-growth.jpg";
const OG_IMAGE_ALT =
  "Peptide stacks for muscle growth — research guide by DoseRoutine covering BPC-157, TB-500, CJC-1295, Ipamorelin, IGF-1 LR3 and MK-677";

type Stack = {
  slug: string;
  name: string;
  goal: string;
  components: { name: string; slug?: string; dose: string; freq: string }[];
  cycle: string;
  notes: string;
};

export const STACKS: Stack[] = [
  {
    slug: "recovery-stack",
    name: "Recovery & repair stack",
    goal: "Heal soft tissue between heavy training blocks so you can train harder, more often.",
    components: [
      { name: "BPC-157", slug: "bpc-157", dose: "250–500 mcg", freq: "daily, SC near site" },
      {
        name: "TB-500",
        slug: "tb-500",
        dose: "2–5 mg",
        freq: "2× per week (loading), then 2 mg weekly",
      },
    ],
    cycle: "4–6 weeks on, 4 weeks off.",
    notes:
      "Complementary mechanisms — BPC-157 drives local angiogenesis, TB-500 drives systemic cell migration. Popular for tendinopathy and post-heavy-block recovery.",
  },
  {
    slug: "gh-pulse-stack",
    name: "GH pulse stack (lean gains)",
    goal: "Amplify natural growth-hormone pulses for lean mass and better sleep-driven recovery.",
    components: [
      { name: "CJC-1295 (no DAC)", slug: "cjc-1295", dose: "100 mcg", freq: "1–3× daily, SC" },
      {
        name: "Ipamorelin",
        slug: "ipamorelin",
        dose: "100–200 mcg",
        freq: "matched to CJC dose, SC",
      },
    ],
    cycle: "5 days on / 2 days off, 8–12 weeks.",
    notes:
      "GHRH + GHRP synergy produces a stronger, cleaner GH pulse than either alone. Dose on an empty stomach; last dose 30–60 min pre-bed to piggyback on the sleep pulse.",
  },
  {
    slug: "lean-mass-stack",
    name: "Lean mass stack (advanced)",
    goal: "Directly stimulate IGF-1 signaling for hypertrophy in trained lifters.",
    components: [
      {
        name: "IGF-1 LR3",
        slug: "igf-1-lr3",
        dose: "20–50 mcg",
        freq: "daily, SC (pre- or post-workout)",
      },
      { name: "CJC-1295 + Ipamorelin", dose: "100 mcg + 100 mcg", freq: "pre-bed, SC" },
    ],
    cycle: "4 weeks on, 4 weeks off — IGF-1 LR3 downregulates receptors with chronic use.",
    notes:
      "Powerful but strict on cycling. Monitor blood glucose — IGF-1 analogs can cause hypoglycemia. Not for beginners; not a substitute for progressive overload and protein intake.",
  },
  {
    slug: "appetite-recovery-stack",
    name: "Appetite & recovery stack (oral)",
    goal: "Nightly GH secretagogue for lifters in a lean-bulk who want more appetite, sleep depth and recovery — no injections.",
    components: [
      {
        name: "MK-677 (ibutamoren)",
        slug: "mk-677",
        dose: "10–25 mg",
        freq: "once daily, oral (pre-bed)",
      },
    ],
    cycle: "8–12 weeks on, 4+ weeks off.",
    notes:
      "Not a peptide — an oral ghrelin-receptor agonist. Expect water retention, blunted fasting glucose and increased appetite. Watch fasting insulin if cycling long.",
  },
  {
    slug: "recomp-stack",
    name: "Recomp stack (lean + shred)",
    goal: "Preserve muscle while dropping body fat — for cutting phases or midlife recomposition.",
    components: [
      { name: "Tesamorelin", slug: "tesamorelin", dose: "1–2 mg", freq: "daily, SC (pre-bed)" },
      { name: "Ipamorelin", slug: "ipamorelin", dose: "200 mcg", freq: "daily, SC (pre-bed)" },
    ],
    cycle: "12 weeks on, 4 weeks off.",
    notes:
      "Tesamorelin has the best clinical data of any GHRH analog for visceral fat reduction. Pair with a modest calorie deficit and heavy resistance training to hold muscle.",
  },
];

export const FAQ_PAIRS: { q: string; a: string }[] = [
  {
    q: "What is the best peptide stack for muscle growth?",
    a: "For most lifters, a CJC-1295 (no DAC) + Ipamorelin stack dosed 1–3× daily produces the strongest natural GH pulse without shutting down the axis. Advanced users add IGF-1 LR3 for direct hypertrophy signaling. Beginners should stick to a single GHRH + GHRP pair and cycle 8–12 weeks on, 4 weeks off.",
  },
  {
    q: "Do peptides really build muscle?",
    a: "GH-releasing peptides (CJC-1295, Ipamorelin, tesamorelin) raise endogenous growth hormone and IGF-1, which supports recovery, lean mass and fat loss. IGF-1 LR3 is anabolic directly. None of these replace progressive overload, protein intake and sleep — they amplify a well-run training block.",
  },
  {
    q: "Are peptide stacks safe?",
    a: "Most research peptides are not FDA-approved for muscle-building use and are WADA-banned for competitive athletes. Common side effects include water retention, elevated fasting glucose, injection-site reactions and, with IGF-1 analogs, hypoglycemia. Work with a qualified clinician and get baseline bloodwork (IGF-1, fasting glucose, HbA1c) before starting any stack.",
  },
  {
    q: "How long should I cycle a peptide stack?",
    a: "GHRH + GHRP stacks (CJC-1295 + Ipamorelin, tesamorelin + Ipamorelin) are typically run 8–12 weeks on, 4 weeks off. IGF-1 LR3 is cycled tighter — 4 weeks on, 4 weeks off — because receptors downregulate. Recovery peptides like BPC-157 + TB-500 are run 4–6 weeks around an injury or heavy training block.",
  },
  {
    q: "Can I stack BPC-157 with GH peptides?",
    a: "Yes — BPC-157 (and TB-500) target soft-tissue repair and are commonly layered on top of a CJC-1295 + Ipamorelin GH stack during heavy training blocks. Mechanisms do not overlap, so there is no known interaction; still monitor injection-site tolerance and rotate sites.",
  },
];

export const Route = createFileRoute("/library/peptide-stacks-for-muscle-growth")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:secure_url", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "640" },
      { property: "og:image:alt", content: OG_IMAGE_ALT },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "article:publisher", content: "https://doseroutine.com" },
      { property: "article:section", content: "Peptides" },
      { property: "article:tag", content: "Muscle growth" },
      { property: "article:tag", content: "Peptide stacks" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@doseroutine" },
      { name: "twitter:creator", content: "@doseroutine" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: OG_IMAGE_ALT },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/peptide-stacks-for-muscle-growth"),
    ],
    scripts: mergeLdScripts([
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
          headline: TITLE,
          description: DESC,
          url: CANONICAL,
          mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
          image: [OG_IMAGE],
          datePublished: "2026-07-25",
          dateModified: "2026-07-25",
          inLanguage: "en",
          author: {
            "@type": "Organization",
            "@id": "https://doseroutine.com/#organization",
            name: "DoseRoutine",
            url: "https://doseroutine.com",
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://doseroutine.com/#organization",
            name: "DoseRoutine",
            url: "https://doseroutine.com",
            logo: { "@type": "ImageObject", url: "https://doseroutine.com/icon-512.png" },
          },
          about: STACKS.flatMap((s) => s.components.map((c) => c.name)).map((n) => ({
            "@type": "DefinedTerm",
            name: n,
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
            {
              "@type": "ListItem",
              position: 2,
              name: "Library",
              item: "https://doseroutine.com/library",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Peptide stacks for muscle growth",
              item: CANONICAL,
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${CANONICAL}#faq`,
          url: CANONICAL,
          inLanguage: "en",
          mainEntity: FAQ_PAIRS.map((f) => ({
            "@type": "Question",
            "@id": `${CANONICAL}#${faqAnchorId(f.q)}`,
            url: `${CANONICAL}#${faqAnchorId(f.q)}`,
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ]),
  }),
  component: MuscleGrowthStacksPage,
});

function MuscleGrowthStacksPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"
          >
            <FlaskConical className="h-5 w-5 text-primary" />
            DoseRoutine
          </Link>
          <Link to="/library" className="text-sm text-muted-foreground hover:text-foreground">
            Library <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-5 pb-16 pt-8">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <Link to="/library" className="hover:text-foreground">
            Library
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Peptide stacks for muscle growth</span>
        </nav>

        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Peptide stacks for muscle growth
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          A research-informed breakdown of the peptide stacks lifters actually run — for recovery,
          GH pulses, lean gains, cutting and midlife recomposition. Every stack lists the
          components, typical doses, injection frequency and cycle length so you can compare
          protocols in one place.
        </p>

        <section
          className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground"
          aria-labelledby="disclaimer"
        >
          <h2 id="disclaimer" className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Educational only
          </h2>
          <p className="text-muted-foreground">
            None of the compounds below are FDA-approved for muscle-building use, and all are
            WADA-banned for competitive athletes. This page summarizes public research and community
            protocols — it is not medical advice. Get baseline bloodwork and work with a licensed
            clinician before starting any stack.
          </p>
        </section>

        <nav
          className="mt-8 rounded-2xl border border-border bg-card p-4"
          aria-labelledby="toc-heading"
        >
          <h2 id="toc-heading" className="text-sm font-semibold text-foreground">
            On this page
          </h2>
          <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <li>
              <a href="#how-to-read" className="text-primary underline-offset-2 hover:underline">
                1. How to pick a stack
              </a>
            </li>
            {STACKS.map((stack, i) => (
              <li key={stack.slug}>
                <a
                  href={`#${stack.slug}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {i + 2}. {stack.name}
                </a>
              </li>
            ))}
            <li>
              <a href="#safety" className="text-primary underline-offset-2 hover:underline">
                {STACKS.length + 2}. Safety, bloodwork &amp; cycling
              </a>
            </li>
            <li>
              <a href="#faq" className="text-primary underline-offset-2 hover:underline">
                {STACKS.length + 3}. FAQ
              </a>
            </li>
          </ol>
        </nav>

        <section className="mt-8" aria-labelledby="how-to-read">
          <h2 id="how-to-read" className="font-display text-2xl font-semibold text-foreground">
            How to pick a stack
          </h2>
          <div className="mt-3 space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Recovering from injury or a heavy block?</strong>{" "}
              Start with the Recovery stack (BPC-157 + TB-500). It targets soft-tissue repair
              without touching the GH axis.
            </p>
            <p>
              <strong className="text-foreground">Building lean mass?</strong> A CJC-1295 +
              Ipamorelin GH pulse stack is the default. Add IGF-1 LR3 only once you have training
              age, clean bloodwork and a clinician in the loop.
            </p>
            <p>
              <strong className="text-foreground">Cutting or midlife recomp?</strong> Tesamorelin
              has the strongest clinical data for visceral fat loss; pair it with Ipamorelin and a
              modest deficit.
            </p>
            <p>
              <strong className="text-foreground">No-needle option?</strong> MK-677 is oral and
              raises GH/IGF-1, at the cost of water retention and elevated fasting glucose.
            </p>
          </div>
        </section>

        <section className="mt-10 space-y-6" aria-labelledby="stacks">
          <h2 id="stacks" className="font-display text-2xl font-semibold text-foreground">
            The stacks
          </h2>
          {STACKS.map((stack) => (
            <article
              key={stack.slug}
              id={stack.slug}
              className={cn(cardClassName, "rounded-2xl p-5")}
              aria-labelledby={`${stack.slug}-title`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Dumbbell className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h3
                    id={`${stack.slug}-title`}
                    className="font-display text-xl font-semibold text-foreground"
                  >
                    {stack.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{stack.goal}</p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2">
                        Compound
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Typical dose
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Frequency
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stack.components.map((c) => (
                      <tr key={c.name} className="border-t border-border align-top">
                        <th scope="row" className="px-3 py-2 font-medium text-foreground">
                          {c.slug ? (
                            <Link
                              to="/library/$slug"
                              params={{ slug: c.slug }}
                              className="hover:text-primary hover:underline"
                            >
                              {c.name}
                            </Link>
                          ) : (
                            c.name
                          )}
                        </th>
                        <td className="px-3 py-2 text-muted-foreground">{c.dose}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.freq}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cycle
                  </dt>
                  <dd className="mt-1 text-foreground">{stack.cycle}</dd>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </dt>
                  <dd className="mt-1 text-muted-foreground">{stack.notes}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>

        <section
          className={cn(cardClassName, "mt-10 rounded-2xl p-5 text-sm text-muted-foreground")}
          aria-labelledby="safety"
        >
          <h2
            id="safety"
            className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Info className="h-4 w-4 text-primary" /> Safety and bloodwork
          </h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              Baseline labs before any GH/IGF stack: IGF-1, fasting glucose, HbA1c, prolactin,
              lipids.
            </li>
            <li>
              Re-check IGF-1 and fasting glucose at 4–6 weeks; back off dose if IGF-1 climbs above
              age-adjusted upper reference.
            </li>
            <li>Rotate injection sites — abdomen, flank, thigh — to avoid site fibrosis.</li>
            <li>
              Never combine research peptides with exogenous insulin without clinician supervision.
            </li>
            <li>
              Log each dose, sleep and body-weight trend in DoseRoutine so you can tell whether the
              stack is actually working.
            </li>
          </ul>
          <p className="mt-3">
            Educational only — not medical advice. See our{" "}
            <Link to="/medical-disclaimer" className="text-primary underline">
              medical disclaimer
            </Link>
            .
          </p>
        </section>

        <section className="mt-8" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-2xl font-semibold text-foreground">
            Frequently asked
          </h2>
          <dl className="mt-3 space-y-4 text-sm">
            {FAQ_PAIRS.map((f) => (
              <Card key={f.q} id={faqAnchorId(f.q)} className="scroll-mt-24 border-border p-4">
                <dt className="font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </Card>
            ))}
          </dl>
        </section>

        <section className={cn(cardClassName, "mt-10 rounded-2xl p-5")} aria-labelledby="related">
          <h2 id="related" className="font-display text-base font-semibold text-foreground">
            Keep exploring
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dive into the compound profiles, compare peptides side-by-side, or plan doses with our
            tools.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/library/compare/bpc-157-vs-tb-500"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              BPC-157 vs TB-500 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/library/guides/hexarelin-protocol"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/60"
            >
              Hexarelin protocol guide <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/library/$slug"
              params={{ slug: "cjc-1295" }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/60"
            >
              CJC-1295 profile <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/library/$slug"
              params={{ slug: "ipamorelin" }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/60"
            >
              Ipamorelin profile <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/peptide-dosage-calculator"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/60"
            >
              Peptide dosage calculator <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/interaction-checker"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/60"
            >
              Check interactions <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
        <AttributionFooter sourceUrl={CANONICAL} />
      </main>
    </div>
  );
}
