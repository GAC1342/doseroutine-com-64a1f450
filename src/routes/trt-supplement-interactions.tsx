import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Beaker, ShieldCheck } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";

export const CANONICAL = "https://doseroutine.com/trt-supplement-interactions";
export const TITLE = "TRT & Supplement Stack Checker — What Mixes Safely";
export const DESC =
  "See how testosterone (TRT) lines up with the supplements people stack with it — HCG, anastrozole, DHEA, zinc, vitamin D and GLP-1s.";

const COMPOUNDS = [
  { slug: "testosterone-trt", name: "Testosterone", note: "Injectable / cream / gel TRT base" },
  { slug: "hcg", name: "HCG", note: "Testicular volume and fertility support" },
  { slug: "anastrozole", name: "Anastrozole", note: "Aromatase inhibitor — estrogen control" },
  { slug: "enclomiphene", name: "Enclomiphene", note: "SERM — LH/FSH stimulation" },
  { slug: "clomiphene-citrate", name: "Clomiphene", note: "Post-cycle / restart SERM" },
  { slug: "tamoxifen", name: "Tamoxifen", note: "SERM — gyno prevention" },
  { slug: "finasteride", name: "Finasteride", note: "5-α reductase inhibitor — DHT control" },
  { slug: "dutasteride", name: "Dutasteride", note: "Dual 5-α reductase inhibitor" },
  { slug: "dhea", name: "DHEA", note: "Adrenal androgen precursor" },
  { slug: "pregnenolone", name: "Pregnenolone", note: "Upstream hormone precursor" },
  { slug: "vitamin-d3", name: "Vitamin D3", note: "Testosterone and immune support" },
  { slug: "zinc", name: "Zinc", note: "Aromatase modulation, T support" },
  { slug: "magnesium-glycinate", name: "Magnesium Glycinate", note: "SHBG and sleep support" },
  { slug: "omega-3", name: "Omega-3", note: "Cardiovascular and hematocrit balance" },
  { slug: "boron", name: "Boron", note: "Free T and SHBG modulation" },
  { slug: "ashwagandha", name: "Ashwagandha", note: "Cortisol / stress modulator" },
  { slug: "tongkat-ali", name: "Tongkat Ali", note: "T-supportive adaptogen" },
  { slug: "semaglutide", name: "Semaglutide", note: "GLP-1 often stacked with TRT" },
  { slug: "tirzepatide", name: "Tirzepatide", note: "GLP-1/GIP often stacked with TRT" },
];

export const FAQ = [
  {
    q: "Can I take vitamin D and zinc with TRT?",
    a: "Yes — both are commonly used alongside TRT. Vitamin D3 supports natural testosterone signaling and bone density; zinc modestly slows aromatization. Neither works against exogenous testosterone. Ask your doctor to check 25-OH vitamin D once a year, and avoid going over 40 mg/day of zinc long-term (it can deplete copper).",
  },
  {
    q: "Do I need anastrozole with TRT?",
    a: "Not everyone. Anastrozole is an aromatase inhibitor used when someone shows symptoms of high estradiol on TRT (water retention, gynecomastia, mood changes). Guessing at the amount can crash estrogen and make joints, libido and lipids worse. Any amount should be set against your labs and symptoms by your prescriber — never copied from a protocol template online.",
  },
  {
    q: "Is HCG safe to combine with testosterone?",
    a: "HCG is commonly used alongside TRT to help preserve testicular size and fertility. It can raise estradiol (HCG stimulates intra-testicular aromatization), so labs matter. HCG plus TRT plus anastrozole is a common trio — all three should be set against blood work rather than how you feel on the day.",
  },
  {
    q: "Can I take GLP-1 (semaglutide, tirzepatide) with TRT?",
    a: "There's no direct pharmacological interaction. Many clinics run TRT and GLP-1s together for body composition. Watch for compounded GI side effects, monitor hematocrit (TRT raises it, dehydration from GLP-1 nausea can push it further), and hydrate aggressively.",
  },
  {
    q: "Does finasteride interact with testosterone?",
    a: "Finasteride blocks the 5-α reductase enzyme that converts testosterone to DHT. On TRT, finasteride reduces DHT-driven side effects (hair loss, prostate enlargement) but can also blunt libido, mood, and strength in a meaningful subset of users. Post-finasteride syndrome is a real, if rare, risk — worth a proper conversation with your doctor before starting.",
  },
  {
    q: "Which supplements should I avoid on TRT?",
    a: "Avoid high-dose supplemental iron unless you are actually low (TRT raises hematocrit already). Be cautious with grapefruit juice (CYP3A4 interaction affects some oral hormones). Avoid stacking multiple SERMs (tamoxifen + clomiphene) unless your prescriber has told you to. Never combine off-cycle DHT prohormones with TRT.",
  },
  {
    q: "How often should I get blood work on a TRT stack?",
    a: "Baseline before starting, at 6–8 weeks after any change, then every 6 months once stable. Standard panel: total and free testosterone, estradiol (sensitive assay), CBC (hematocrit), lipids, PSA, comprehensive metabolic panel, and thyroid if symptomatic.",
  },
];

export const Route = createFileRoute("/trt-supplement-interactions")({
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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/trt-supplement-interactions"),
    ],
    scripts: [
      breadcrumbScript(CANONICAL, [
        { name: "Interaction Checker", path: "/interaction-checker" },
        { name: "TRT & Supplement Interactions", path: "/trt-supplement-interactions" },
      ]),
      articleScript({
        url: CANONICAL,
        headline: TITLE,
        description: DESC,
        datePublished: "2026-07-26",
        dateModified: "2026-07-26",
        section: "Interaction Reference",
      }),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
          name: "DoseRoutine TRT Stack Checker",
          applicationCategory: "LifestyleApplication",

          operatingSystem: "Web",
          url: CANONICAL,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: DESC,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: TrtSupplementInteractionsPage,
});

function TrtSupplementInteractionsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8">
        <nav className="mb-4 text-xs text-muted-foreground">
          <Link to="/interaction-checker" className="hover:text-foreground">
            ← Interaction Checker
          </Link>
        </nav>

        <header className="mb-6">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Beaker className="h-3 w-3" /> Hormones / TRT
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            TRT &amp; Supplement Stack Checker
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            See how testosterone lines up with the supplements, ancillaries, and medications people
            actually stack with it — HCG, anastrozole, enclomiphene, DHEA, vitamin D, zinc,
            magnesium, finasteride, GLP-1s and more.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Reviewed by the DoseRoutine team · July 26, 2026 · Sources: NIH, Endocrine Society, FDA
            labels, peer-reviewed literature.
          </p>
        </header>

        <aside className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-xs leading-relaxed text-foreground/90">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <strong>DoseRoutine is a tracking and organisation tool.</strong> This page is general
            information to help you organise a routine — it is not advice and not a recommendation
            to use anything listed. TRT is prescriber-managed: talk to your doctor before you start,
            stop, or change anything.
          </div>
        </aside>

        <section className="mb-8 rounded-2xl bg-primary p-6 text-primary-foreground">
          <h2 className="font-display text-xl font-semibold">Check a specific TRT pair</h2>
          <p className="mt-2 text-sm opacity-90">
            Pick testosterone and any ancillary, supplement, or medication — DoseRoutine shows how
            the pair is generally regarded, why, and where the information came from. Free, no
            sign-up.
          </p>
          <Link
            to="/interaction-checker"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-background px-5 py-3 text-sm font-semibold text-foreground hover:opacity-90"
          >
            Open the Interaction Checker <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl font-semibold">
            Compounds most-stacked with TRT
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Tap any compound for its full library page — how it works, typical amounts, half-life,
            when to avoid it, and every documented overlap.
          </p>

          <ul className="grid gap-2 sm:grid-cols-2">
            {COMPOUNDS.map((c) => (
              <li key={c.slug} className="rounded-xl bg-card p-4 transition hover:bg-card/80">
                <Link to="/library/$slug" params={{ slug: c.slug }} className="block">
                  <div className="font-semibold">{c.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{c.note}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl font-semibold">Common TRT stack questions</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-card/60 p-4">
                <summary className="cursor-pointer list-none font-semibold text-foreground">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Track your TRT stack</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your routine to DoseRoutine and we'll cross-check every pair, schedule
                injections with site rotation, track vial inventory, and generate a shareable PDF
                summary for your next visit.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/auth"
                  className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Sign up free →
                </Link>
                <Link
                  to="/peptide-interaction-checker"
                  className="inline-flex items-center rounded-xl bg-background px-4 py-2 text-sm font-semibold text-foreground hover:opacity-90"
                >
                  Peptide interactions →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <DisclaimerFooter variant="safety" />
      </div>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
