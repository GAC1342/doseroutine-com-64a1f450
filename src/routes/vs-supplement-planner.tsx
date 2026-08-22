import { createFileRoute, Link } from "@tanstack/react-router";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { ArrowRight, Check, X, Layers } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { VS_SUPPLEMENT_PLANNER_FAQ } from "@/lib/aeo-faqs-hubs";

export const Route = createFileRoute("/vs-supplement-planner")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: "DoseRoutine vs. Supplement Planner apps — DoseRoutine" },
      {
        name: "description",
        content:
          "Comparing supplement-only trackers with DoseRoutine: peptides, HRT/TRT, GLP-1s… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.",
      },
      {
        property: "og:title",
        content: "DoseRoutine vs. Supplement Planner apps",
      },
      {
        property: "og:description",
        content:
          "Most supplement-tracker apps stop at vitamins. See how DoseRoutine covers pept… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://doseroutine.com/vs-supplement-planner" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "DoseRoutine vs. Supplement Planner apps" },
      {
        name: "twitter:description",
        content:
          "Most supplement-tracker apps stop at vitamins. See how DoseRoutine covers pept… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.",
      },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: "https://doseroutine.com/vs-supplement-planner" },
      ...hreflangLinks("/vs-supplement-planner"),
    ],
    scripts: [
      aeoFaqScript("https://doseroutine.com/vs-supplement-planner", VS_SUPPLEMENT_PLANNER_FAQ),
      breadcrumbScript("https://doseroutine.com/vs-supplement-planner", [
        { name: "Compare", path: "/compare" },
        { name: "vs. Supplement Planner", path: "/vs-supplement-planner" },
      ]),
      articleScript({
        url: "https://doseroutine.com/vs-supplement-planner",
        headline: "DoseRoutine vs. Supplement Planner apps",
        description:
          "Most supplement-tracker apps stop at vitamins. See how DoseRoutine covers peptides, hormones, GLP-1s and your whole routine.",
        datePublished: "2026-06-01",
        dateModified: "2026-07-20",
        section: "Comparisons",
      }),
    ],
  }),
  component: ComparePage,
});

type Row = { feature: string; doseroutine: boolean | string; other: boolean | string };

const ROWS: Row[] = [
  { feature: "Vitamins & supplements", doseroutine: true, other: true },
  { feature: "AI-generated daily plan", doseroutine: true, other: true },
  { feature: "Interaction checker", doseroutine: "475+ compounds", other: "supplements only" },
  { feature: "Meal-aware reminders", doseroutine: true, other: true },
  { feature: "Streak & progress tracking", doseroutine: true, other: true },
  { feature: "Peptides (BPC-157, TB-500, ipamorelin, etc.)", doseroutine: true, other: false },
  { feature: "Hormones — TRT / HRT / thyroid", doseroutine: true, other: false },
  { feature: "GLP-1s (semaglutide, tirzepatide)", doseroutine: true, other: false },
  { feature: "Longevity meds (rapamycin, NAD+, metformin)", doseroutine: true, other: false },
  { feature: "Whole-routine cross-checks", doseroutine: true, other: false },
  { feature: "Cycling / loading protocols", doseroutine: true, other: false },
  { feature: "Micro-dose units (mcg, IU, mg/kg)", doseroutine: true, other: "capsules only" },
  { feature: "Ask-AI chat with your own stack as context", doseroutine: true, other: true },
  { feature: "12 languages", doseroutine: true, other: false },
  { feature: "Trial", doseroutine: "7 days of Pro", other: "varies" },
  { feature: "Paid tier", doseroutine: "$9.99/mo or $59.99/yr", other: "$4.99/mo" },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true)
    return (
      <div className="flex items-center gap-1.5 text-sm text-foreground">
        <Check className="h-4 w-4 text-primary" />
        <span>Yes</span>
      </div>
    );
  if (v === false)
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <X className="h-4 w-4" />
        <span>No</span>
      </div>
    );
  return <span className="text-sm text-foreground">{v}</span>;
}

function ComparePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">DoseRoutine</span>
        </Link>
        <Link
          to="/auth"
          className="tap-target inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Sign up free <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Comparison</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          DoseRoutine vs. supplement-only planner apps
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Most "supplement planner" apps do one thing: track vitamins and pills. That's fine if fish
          oil and magnesium are your whole routine. If you also take peptides, hormones (HRT/TRT),
          GLP-1s or anything else in your routine, a supplement-only app will miss most of your
          protocol — including the parts that need the most caution.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="p-3 text-left font-semibold">Feature</th>
                <th className="p-3 text-left font-semibold text-primary">DoseRoutine</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">
                  Supplement-only apps
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.feature} className={i % 2 === 0 ? "bg-background" : "bg-card/40"}>
                  <td className="p-3 align-top text-foreground">{r.feature}</td>
                  <td className="p-3 align-top">
                    <Cell v={r.doseroutine} />
                  </td>
                  <td className="p-3 align-top">
                    <Cell v={r.other} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-display text-xl font-semibold">Who should pick which?</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-foreground">
                Pick a supplement-only app if…
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• You only take vitamins and OTC supplements</li>
                <li>• You never take injectables or anything beyond vitamins</li>
                <li>• You don't need cycle/loading tracking</li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Pick DoseRoutine if…</div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• You take peptides, TRT/HRT, GLP-1s or a mixed routine</li>
                <li>• You want interaction checks across the whole protocol</li>
                <li>• You want an AI that reasons about your real stack</li>
              </ul>
            </div>
          </div>
          <Link
            to="/auth"
            className="tap-target mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <ProseContainer>
        <ProseContainer>
          <PageProse id="vs-supplement-planner" />
        </ProseContainer>
      </ProseContainer>

      <section className="mx-auto max-w-3xl px-6">
        <AeoFaq pairs={VS_SUPPLEMENT_PLANNER_FAQ} />
      </section>

      <RelatedLinks currentPath="/vs-supplement-planner" kind="comparisons" />
      <AttributionFooter sourceUrl="https://doseroutine.com/vs-supplement-planner" />
    </main>
  );
}
