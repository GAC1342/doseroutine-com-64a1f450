import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Syringe,
  Beaker,
  ShieldAlert,
  FileText,
  Bell,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";

export const CANONICAL = "https://doseroutine.com/vs/cronometer";
const TITLE = "Cronometer Alternative for Peptides and Stacks";
const DESC =
  "DoseRoutine is a Cronometer alternative for peptides, hormones and stacks with… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/vs/cronometer")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/vs/cronometer")],
    scripts: [
      breadcrumbScript("https://doseroutine.com/vs/cronometer", [
        { name: "Compare", path: "/compare" },
        { name: "vs. Cronometer", path: "/vs/cronometer" },
      ]),
      articleScript({
        url: CANONICAL,
        headline: TITLE,
        description: DESC,
        datePublished: "2026-06-01",
        dateModified: "2026-07-20",
        section: "Comparisons",
      }),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          // eslint-disable-next-line @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing; do not add new ones.
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: CronometerAlternative,
});

export const FAQ = [
  {
    q: "Is DoseRoutine a Cronometer alternative for supplements?",
    a: "Yes — for the tracking side. Cronometer is a nutrition and micronutrient food logger; DoseRoutine is a routine-and-protocol tracker for supplements, peptides, hormones and everything else you take. DoseRoutine now also tracks food: photograph a meal or scan a barcode and it estimates calories, protein, carbs and fat. If you want doses, workouts and macros in one app, DoseRoutine is the better fit; if you want exhaustive micronutrient data, Cronometer still wins.",
  },
  {
    q: "Does Cronometer track peptides or hormones?",
    a: "No. Cronometer doesn't model peptide reconstitution, injection sites, TRT/HRT cycles, or vial inventory. DoseRoutine was built for exactly that layer.",
  },
  {
    q: "Can I use both Cronometer and DoseRoutine together?",
    a: "Yes. Some people keep detailed micronutrient logging in Cronometer and run their protocol plus everyday calorie and macro tracking in DoseRoutine. Most people find DoseRoutine's photo and barcode meal scanner is enough on its own.",
  },
  {
    q: "Does DoseRoutine send dose reminders like Cronometer's supplement log?",
    a: "Yes. DoseRoutine sends push reminders and exports every dose to your phone calendar as a real .ics alarm — including weekly, cyclical and multi-time-per-day schedules.",
  },
  {
    q: "How much does DoseRoutine cost vs Cronometer Gold?",
    a: "DoseRoutine Pro is $9.99/month or $59.99/year (50% off). Comparable to Cronometer Gold, and it covers dose accuracy, interactions, injection protocols, workouts and AI meal scanning in one subscription.",
  },
];

const COMPARISON = [
  { feature: "Supplement dose scheduling & reminders", us: true, them: "Manual log only" },
  { feature: "Peptide reconstitution calculator", us: true, them: false },
  { feature: "Peptide dosage calculator (U-100 / U-40)", us: true, them: false },
  { feature: "Injection site rotation tracker", us: true, them: false },
  { feature: "Vial inventory + refill predictions", us: true, them: false },
  { feature: "HRT / TRT cycle tracking", us: true, them: false },
  { feature: "Blood work tracker", us: true, them: "Biometrics only" },
  { feature: "475+ compound research library", us: true, them: false },
  { feature: "Interaction checker across your whole routine", us: true, them: false },
  { feature: "AI-assisted stack planning", us: true, them: false },
  { feature: "Shareable PDF summaries", us: true, them: "Nutrition reports" },
  { feature: "Calendar (.ics) alarms for every dose", us: true, them: false },
  { feature: "Calorie, protein & carb tracking", us: true, them: true },
  { feature: "AI photo meal scanner", us: true, them: false },
  { feature: "Barcode food scanner", us: true, them: true },
  { feature: "Full micronutrient database (vitamins, minerals)", us: false, them: true },
  { feature: "Food, workouts and doses on one timeline", us: true, them: false },
  { feature: "Free tier", us: "Yes", them: "Free tier + Gold trial" },
  { feature: "Pro pricing", us: "$9.99/mo · $59.99/yr", them: "~$8.99/mo · $49.99/yr" },
];

function Check({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="w-5 h-5 text-primary" aria-label="Yes" />;
  if (v === false) return <XCircle className="w-5 h-5 text-muted-foreground" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

function CronometerAlternative() {
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
            Cronometer alternative
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            The Cronometer alternative for supplements, peptides & hormones
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cronometer is excellent for deep micronutrient data. DoseRoutine covers everyday
            nutrition — photograph a meal or scan a barcode for calories, protein and carbs — and
            adds the dose layer Cronometer skips: scheduling, peptide reconstitution, TRT/HRT cycles
            and interaction checks across your whole routine.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button size="lg" asChild>
              <Link to="/install">
                Get started free <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/calculator">Browse all calculators</Link>
            </Button>
          </div>
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle>DoseRoutine vs Cronometer</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">DoseRoutine</th>
                    <th className="text-center p-4 font-medium">Cronometer</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.feature} className="border-t">
                      <td className="p-4">{row.feature}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <Check v={row.us} />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <Check v={row.them} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {[
            {
              icon: Beaker,
              title: "Reconstitution calculator",
              body: "Enter vial mg + BAC water. Get exact mg/mL and syringe units. Cronometer has none of this.",
            },
            {
              icon: Syringe,
              title: "Injection site rotation",
              body: "Track SubQ + IM sites for peptides and TRT to avoid tissue damage.",
            },
            {
              icon: ShieldAlert,
              title: "Interaction checker",
              body: "Cross-checks peptides, hormones, supplements and everything else in one place.",
            },
            {
              icon: FileText,
              title: "Shareable PDF summaries",
              body: "One tap generates a full protocol report — not a nutrition breakdown.",
            },
            {
              icon: Bell,
              title: "Real calendar alarms",
              body: "Every dose exports to .ics — a real phone alarm, not just an in-app log entry.",
            },
            {
              icon: Sparkles,
              title: "AI stack planning",
              body: "Gemini-powered stack suggestions with citations from the compound library.",
            },
          ].map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6 space-y-2">
                <f.icon className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">When Cronometer is still the right choice</h2>
          <p className="text-muted-foreground">
            If you need exhaustive micronutrient data — every vitamin, mineral and amino acid,
            weighed to the gram — Cronometer is still the best in that category. DoseRoutine covers
            calories, protein, carbs and fat through its photo and barcode scanner, plus the
            supplement, peptide and hormone side of your protocol.
          </p>
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
          <h2 className="text-2xl font-bold">Ready to switch?</h2>
          <p className="text-muted-foreground">
            Cancel anytime. $9.99/month or $59.99/year (50% off).
          </p>
          <Button size="lg" asChild>
            <Link to="/install">
              Download DoseRoutine <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground pt-4">
            See also:{" "}
            <Link to="/vs/medisafe" className="underline">
              Medisafe alternative
            </Link>{" "}
            ·{" "}
            <Link to="/vs/mytherapy" className="underline">
              MyTherapy alternative
            </Link>{" "}
            ·{" "}
            <Link to="/vs/round-health" className="underline">
              Round Health alternative
            </Link>{" "}
            ·{" "}
            <Link to="/vs/pill-reminder" className="underline">
              Best pill reminder app
            </Link>{" "}
            ·{" "}
            <Link to="/peptide-dosage-calculator" className="underline">
              Peptide dosage calculator
            </Link>{" "}
            ·{" "}
            <Link to="/calculator" className="underline">
              All calculators
            </Link>
          </p>
        </div>
      </section>
      <RelatedLinks currentPath="/vs/cronometer" kind="comparisons" />
      <ProseContainer>
        <ProseContainer>
          <PageProse id="vs-cronometer" />
        </ProseContainer>
      </ProseContainer>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
