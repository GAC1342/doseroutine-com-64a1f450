import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, ShieldCheck, Syringe } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";

const CANONICAL = "https://doseroutine.com/peptide-interaction-checker";
const TITLE = "Peptide Stack Checker — BPC-157, TB-500 & GLP-1 Combinations";
const DESC =
  "See which peptide combinations are commonly stacked and which are best kept apart — BPC-157, TB-500, GLP-1s and growth-hormone peptides.";

const PEPTIDES = [
  { slug: "bpc-157", name: "BPC-157", note: "Tissue repair, tendon and gut healing" },
  { slug: "tb-500", name: "TB-500", note: "Systemic recovery and vascular repair" },
  { slug: "semaglutide", name: "Semaglutide", note: "GLP-1 for weight and glucose" },
  { slug: "tirzepatide", name: "Tirzepatide", note: "GLP-1/GIP dual agonist" },
  { slug: "retatrutide", name: "Retatrutide", note: "Triple agonist (GLP-1/GIP/glucagon)" },
  { slug: "ipamorelin", name: "Ipamorelin", note: "GHRP — selective GH release" },
  { slug: "cjc-1295", name: "CJC-1295", note: "GHRH analog (with/without DAC)" },
  { slug: "sermorelin", name: "Sermorelin", note: "GHRH for pulsatile GH" },
  { slug: "tesamorelin", name: "Tesamorelin", note: "Visceral fat GHRH analog" },
  { slug: "mots-c", name: "MOTS-c", note: "Mitochondrial peptide" },
  { slug: "epithalon", name: "Epithalon", note: "Telomerase / longevity peptide" },
  { slug: "pt-141", name: "PT-141", note: "Melanocortin — libido" },
  { slug: "melanotan-ii", name: "Melanotan II", note: "Melanocortin — tanning/libido" },
  { slug: "ghk-cu", name: "GHK-Cu", note: "Copper peptide — skin and repair" },
  { slug: "aod-9604", name: "AOD-9604", note: "Fat-loss GH fragment" },
];

const FAQ = [
  {
    q: "Can I stack BPC-157 with TB-500?",
    a: "BPC-157 and TB-500 are commonly used together in research settings for tissue repair — BPC-157 acts more locally while TB-500 acts systemically. No hard pharmacokinetic conflict is documented, but both are research peptides not FDA-approved for human use. Cycle length, amount and injection site rotation still matter. Confirm with your doctor before combining anything.",
  },
  {
    q: "Does BPC-157 interact with testosterone or TRT?",
    a: "There's no documented interaction between BPC-157 and exogenous testosterone. BPC-157 does not appear to alter HPTA function. That said, BPC-157 is not FDA-approved, and combining research peptides with hormone therapy makes your routine harder to keep track of — blood work with your prescriber is the safest path.",
  },
  {
    q: "Can I take GLP-1s (semaglutide, tirzepatide) with peptides like BPC-157?",
    a: "There is no known direct interaction between GLP-1 receptor agonists and BPC-157. However, GLP-1s already slow gastric emptying and can cause nausea; adding gut-active peptides can compound stomach side effects. Space injections apart, hydrate well, and report any severe abdominal pain to your doctor immediately.",
  },
  {
    q: "Is it safe to combine growth-hormone peptides (CJC-1295, ipamorelin) with TRT?",
    a: "GHRH/GHRP peptides and TRT are commonly stacked, but the combination raises insulin resistance, water retention, and estrogen-conversion risks. It needs baseline and follow-up labs (fasting glucose, HbA1c, IGF-1, estradiol, hematocrit). This is not a combination to self-manage — keep your prescriber in the loop.",
  },
  {
    q: "Which peptides should never be combined?",
    a: "Avoid stacking two GLP-1 agonists (e.g. semaglutide + tirzepatide) — receptor competition and severe stomach risk. Avoid combining melanocortin peptides (PT-141 + Melanotan II) — cardiovascular and pigmentation load. Never combine peptides with medications you have been prescribed without checking with your doctor first.",
  },

  {
    q: "Does DoseRoutine's peptide checker cover research compounds?",
    a: "Yes. Our library includes 475+ compounds — peptides classified as research-use-only in some jurisdictions are included for interaction cross-checking only. Listing a compound is not an endorsement of its use, legality, or safety in your jurisdiction.",
  },
];

export const Route = createFileRoute("/peptide-interaction-checker")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
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
      ...hreflangLinks("/peptide-interaction-checker"),
    ],
    scripts: [
      breadcrumbScript(CANONICAL, [
        { name: "Interaction Checker", path: "/interaction-checker" },
        { name: "Peptide Interaction Checker", path: "/peptide-interaction-checker" },
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
          name: "DoseRoutine Peptide Stack Checker",
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
  component: PeptideInteractionCheckerPage,
});

function PeptideInteractionCheckerPage() {
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
            <Syringe className="h-3 w-3" /> Peptides
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Peptide Stack Checker
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Free pairwise checks for BPC-157, TB-500, GLP-1s, growth-hormone peptides,
            melanocortins, and 40+ others — against each other and against supplements, hormones and
            medications.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Reviewed by the DoseRoutine team · July 26, 2026 · Sources: NIH, PubMed, FDA labels,
            PubChem.
          </p>
        </header>

        <aside className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-xs leading-relaxed text-foreground/90">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <strong>DoseRoutine is a tracking and organisation tool.</strong> This page is general
            information for organising a routine — it is not advice and listing something is not a
            recommendation to use it. Many peptides are research-use-only in various jurisdictions
            and are not FDA-approved for human use. Talk to your doctor before starting, stopping,
            or combining any peptide.
          </div>
        </aside>

        <section className="mb-8 rounded-2xl bg-primary p-6 text-primary-foreground">
          <h2 className="font-display text-xl font-semibold">Run a live pairwise check</h2>
          <p className="mt-2 text-sm opacity-90">
            Pick any two compounds — DoseRoutine shows how the pair is generally regarded, why, and
            where the information came from. Free, no sign-up.
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
            Peptides most-checked on DoseRoutine
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Tap any peptide to open its full library page — how it works, half-life, typical
            amounts, mixing notes, when to avoid it, and every known pairwise overlap.
          </p>

          <ul className="grid gap-2 sm:grid-cols-2">
            {PEPTIDES.map((p) => (
              <li key={p.slug} className="rounded-xl bg-card p-4 transition hover:bg-card/80">
                <Link to="/library/$slug" params={{ slug: p.slug }} className="block">
                  <div className="font-semibold">{p.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{p.note}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl font-semibold">
            Common peptide interaction questions
          </h2>
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
              <h2 className="font-display text-lg font-semibold">Track your peptide stack</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add these peptides to DoseRoutine and we'll cross-check every pairwise interaction,
                schedule injections with site rotation, track vial inventory, and generate a
                shareable PDF summary.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/auth"
                  className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Sign up free →
                </Link>
                <Link
                  to="/trt-supplement-interactions"
                  className="inline-flex items-center rounded-xl bg-background px-4 py-2 text-sm font-semibold text-foreground hover:opacity-90"
                >
                  TRT interactions →
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
