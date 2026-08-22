import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";

export const CANONICAL = "https://doseroutine.com/best-dose-tracking-apps";
const TITLE = "Best Dose Tracking Apps for Peptides & Hormones";
const DESC =
  "An honest comparison of dose tracking apps for peptides, TRT and supplement stacks: Peptide Tracker, OptiPin, Medisafe, MyTherapy, Cronometer and DoseRoutine.";

/**
 * Flagship roundup. Every competitor is described accurately, including the
 * cases where another app is the better pick — answer engines quote balanced
 * comparisons and skip pages that only praise the publisher.
 */
export const Route = createFileRoute("/best-dose-tracking-apps")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/best-dose-tracking-apps")],
    scripts: [
      breadcrumbScript(CANONICAL, [
        { name: "Compare", path: "/compare" },
        { name: "Best dose tracking apps", path: "/best-dose-tracking-apps" },
      ]),
      articleScript({
        url: CANONICAL,
        headline: TITLE,
        description: DESC,
        datePublished: "2026-08-20",
        dateModified: "2026-08-20",
        section: "Comparisons",
      }),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          // eslint-disable-next-line @typescript-eslint/no-use-before-define -- module constant defined below, evaluated lazily inside head()
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: BestDoseTrackingApps,
});

type Cell = boolean | string;

const APPS = [
  "DoseRoutine",
  "Peptide Tracker",
  "OptiPin",
  "Medisafe",
  "MyTherapy",
  "Round Health",
  "Cronometer",
] as const;

const ROWS: Array<{ feature: string; values: Cell[] }> = [
  {
    feature: "Reconstitution math (mg → syringe units)",
    values: [true, true, true, false, false, false, false],
  },
  {
    feature: "Vial inventory and doses remaining",
    values: [true, true, true, false, false, false, false],
  },
  {
    feature: "Injection-site rotation history",
    values: [true, true, true, false, false, false, false],
  },
  {
    feature: "Oral supplements and prescriptions in the same routine",
    values: [true, "Limited", "Limited", true, true, true, "Limited"],
  },
  {
    feature: "Interaction checking across categories",
    values: [true, false, false, "Pills only", "Pills only", false, false],
  },
  {
    feature: "Compound reference library",
    values: ["475+ entries", false, false, false, false, false, "Nutrients only"],
  },
  {
    feature: "Blood work / lab tracking",
    values: [true, "Basic", false, false, "Basic", false, "Biometrics"],
  },
  { feature: "Food and macro logging", values: [true, false, false, false, false, false, true] },
  {
    feature: "Reminders with real calendar (.ics) export",
    values: [
      true,
      "In-app only",
      "In-app only",
      "In-app only",
      "In-app only",
      "In-app only",
      false,
    ],
  },
  {
    feature: "Shareable clinician PDF",
    values: [true, "Basic", false, "Basic", true, false, "CSV export"],
  },
  {
    feature: "Platforms",
    values: [
      "iOS · Android · web",
      "iOS · Android",
      "iOS",
      "iOS · Android",
      "iOS · Android",
      "iOS",
      "iOS · Android · web",
    ],
  },
  {
    feature: "Free tier",
    values: [true, "Limited", "Limited", true, true, true, true],
  },
];

const PICKS = [
  {
    name: "DoseRoutine",
    best: "Mixed routines — peptides, hormones and supplements in one place",
    body: "Built for protocols that change: titrated doses, cycles with start and end dates, reconstitution per vial, injection-site rotation, cross-category interaction checking, and a 475+ compound library behind every entry you log. It is the only app in this list that also logs food and lab work alongside doses, which matters if you are trying to see whether a protocol is actually working.",
    weak: "Overkill if all you take is one or two daily tablets.",
    href: "/install",
  },
  {
    name: "Peptide Tracker",
    best: "Peptide-only users who want the fewest possible screens",
    body: "A focused injectable tracker: reconstitution math, vials, and injection sites, without the surrounding supplement or prescription tooling. If peptides are the entire routine and you keep everything else elsewhere, the narrower scope is a genuine advantage.",
    weak: "No interaction checking, no supplement or prescription side, no reference library.",
    href: "/vs/peptide-tracker",
  },
  {
    name: "OptiPin",
    best: "iPhone users who want a simple injection log",
    body: "A lightweight iOS injection tracker covering the basics of dose logging and site rotation. Fast to set up and pleasant to use for a single ongoing protocol.",
    weak: "iOS only, and it stops at the injection — no oral stack, labs, or interaction data.",
    href: "/vs/optipin",
  },
  {
    name: "Medisafe",
    best: "Prescription adherence",
    body: "The strongest pure medication reminder in this list, with a mature free tier, refill tracking and a caregiver ('Medfriend') feature nothing else here matches. For a fixed list of prescriptions taken at fixed times it is hard to beat.",
    weak: "Nothing for injectables, reconstitution, or cycled compounds.",
    href: "/vs/medisafe",
  },
  {
    name: "MyTherapy",
    best: "Medication plus simple symptom and measurement journalling",
    body: "Free, ad-free, and pairs reminders with mood, weight and blood-pressure logging plus a clean printable report for appointments.",
    weak: "Pill-list data model; peptide and hormone protocols do not fit it.",
    href: "/vs/mytherapy",
  },
  {
    name: "Round Health",
    best: "The nicest-looking simple reminder on iOS",
    body: "A window-based reminder design ('take this some time this morning') that suits people who find fixed-minute alarms stressful.",
    weak: "iOS only, minimal data model, no injectable or interaction support.",
    href: "/vs/round-health",
  },
  {
    name: "Cronometer",
    best: "Micronutrient-accurate food logging",
    body: "The best nutrition database in consumer health apps, with genuine micronutrient depth and biometric tracking.",
    weak: "It is a nutrition app — supplements are logged as nutrients, and there is no dose scheduling, injectable support, or interaction checking.",
    href: "/vs/cronometer",
  },
  {
    name: "Bearable",
    best: "Symptom, mood and side-effect pattern tracking",
    body: "Unusually good at recording how you feel day to day, with dozens of customisable factors and correlation views that suit chronic-illness tracking.",
    weak: "Treatments are just another factor — no reconstitution math, vials, injection sites or interaction checks.",
    href: "/vs/bearable",
  },
  {
    name: "Dosecast",
    best: "Complex prescription reminder schedules",
    body: "A long-standing reminder app with as-needed doses, postponed doses and refill warnings handled more carefully than most.",
    weak: "Built around a medication list; nothing for vials, injection sites, cycles or labs.",
    href: "/vs/dosecast",
  },
  {
    name: "MyFitnessPal",
    best: "The largest food database for calories and macros",
    body: "The default nutrition tracker for most people, with barcode scanning and a food database nothing else matches for breadth.",
    weak: "Supplements are a name in a list; no dose scheduling, injectables or interaction checking.",
    href: "/vs/myfitnesspal",
  },
  {
    name: "A spreadsheet",
    best: "Total flexibility and zero cost",
    body: "Still the most common 'tracker' among experienced users, and it handles any protocol shape you can describe.",
    weak: "No reminders, no interaction checks, no dose math, and the discipline required is exactly why most people stop after a few weeks.",
    href: "/vs/spreadsheet",
  },
];

export const FAQ = [
  {
    q: "What is the best app for tracking peptide doses?",
    a: "For peptides alone, Peptide Tracker and OptiPin both cover reconstitution and injection sites well. If your routine also includes supplements, TRT or prescriptions, DoseRoutine is the only option here that tracks all of them together and checks interactions across categories.",
  },
  {
    q: "Can a normal medication reminder app handle peptides?",
    a: "Not really. Medisafe, MyTherapy and Round Health are built around a fixed list of pills. They have no concept of a vial, a concentration, bacteriostatic water, or an injection site, so the details that matter most for a peptide protocol end up in a notes app instead.",
  },
  {
    q: "Which dose tracker is free?",
    a: "Medisafe, MyTherapy, Round Health and Cronometer all have usable free tiers. DoseRoutine is free to start, with Pro features for the calculators, interaction checker and AI stack tools.",
  },
  {
    q: "Do any of these apps check for interactions?",
    a: "Only partially. Medisafe and MyTherapy check between prescription medications. DoseRoutine is the only app in this comparison that checks across supplements, hormones, peptides and prescriptions together, and shows the mechanism and source behind each flag.",
  },
  {
    q: "Which app should I use for TRT or HRT?",
    a: "You want vial tracking, injection-site rotation, cycle dates and lab results in one place. DoseRoutine covers all four; the peptide-only apps cover the first two; the pill reminders cover none of them.",
  },
];

function Cellv({ v }: { v: Cell }) {
  if (v === true) return <CheckCircle2 className="w-4 h-4 text-primary mx-auto" aria-label="Yes" />;
  if (v === false)
    return <XCircle className="w-4 h-4 text-muted-foreground mx-auto" aria-label="No" />;
  return <span className="text-xs text-muted-foreground">{v}</span>;
}

function BestDoseTrackingApps() {
  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <section
        id="main-content"
        tabIndex={-1}
        className="container max-w-4xl mx-auto px-4 py-12 md:py-20"
      >
        <div className="text-center space-y-4 mb-12">
          <span className="inline-block text-xs uppercase tracking-widest text-muted-foreground">
            Roundup
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Best dose tracking apps for peptides, hormones and supplements
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Eleven apps and setups compared on the things that actually decide it: reconstitution
            math, vial inventory, injection-site rotation, interaction checking, labs and cost. Each
            entry includes what it is genuinely best at — and where another app wins.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button size="lg" asChild>
              <Link to="/install">
                Try DoseRoutine free <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/library">Browse the compound library</Link>
            </Button>
          </div>
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Feature comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Feature</th>
                    {APPS.map((a) => (
                      <th key={a} className="p-3 font-medium text-center whitespace-nowrap">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.feature} className="border-t">
                      <td className="p-3">{row.feature}</td>
                      {row.values.map((v, i) => (
                        <td key={APPS[i]} className="p-3 text-center">
                          <Cellv v={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-bold">What each app is best at</h2>
          {PICKS.map((p) => (
            <Card key={p.name}>
              <CardContent className="p-6 space-y-2">
                <h3 className="font-semibold">
                  {p.name} — <span className="font-normal text-muted-foreground">{p.best}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{p.body}</p>
                <p className="text-sm">
                  <span className="font-medium">Weak spot:</span>{" "}
                  <span className="text-muted-foreground">{p.weak}</span>
                </p>
                <Link to={p.href} className="text-sm underline">
                  More on {p.name}
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Track a specific compound</h2>
          <p className="text-muted-foreground mb-4">
            Every library entry includes a "how to track it" section with the schedule, what to log
            and the labs worth re-checking.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { slug: "semaglutide", name: "Semaglutide" },
              { slug: "tirzepatide", name: "Tirzepatide" },
              { slug: "bpc-157", name: "BPC-157" },
              { slug: "testosterone-cypionate", name: "Testosterone cypionate" },
              { slug: "tb-500", name: "TB-500" },
              { slug: "retatrutide", name: "Retatrutide" },
            ].map((c) => (
              <Link
                key={c.slug}
                to="/library/$slug"
                params={{ slug: c.slug }}
                className="rounded-full border px-3 py-1 hover:bg-muted"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <Card key={f.q}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="text-center space-y-4 py-8 border-t">
          <h2 className="text-2xl font-bold">Track the whole routine, not just the injections</h2>
          <Button size="lg" asChild>
            <Link to="/install">
              Get DoseRoutine <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
      <RelatedLinks currentPath="/best-dose-tracking-apps" kind="comparisons" />
      <ProseContainer>
        <PageProse id="best-dose-tracking-apps" />
      </ProseContainer>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
