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

export const CANONICAL = "https://doseroutine.com/vs/round-health";
const TITLE = "Round Health Alternative for Peptides and TRT";
const DESC =
  "DoseRoutine is a Round Health alternative with clean reminders plus peptide re… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/vs/round-health")({
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
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/vs/round-health")],
    scripts: [
      breadcrumbScript("https://doseroutine.com/vs/round-health", [
        { name: "Compare", path: "/compare" },
        { name: "vs. Round Health", path: "/vs/round-health" },
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
  component: RoundHealthAlternative,
});

export const FAQ = [
  {
    q: "Is DoseRoutine a Round Health alternative for iPhone?",
    a: "Yes. DoseRoutine keeps the same clean, distraction-free daily-dose UI Round Health users love and adds the tools serious stack users need: peptide reconstitution calculator, injection site rotation, HRT/TRT cycles, vial inventory, blood work tracking, and a 475+ compound library.",
  },
  {
    q: "Why switch from Round Health to DoseRoutine?",
    a: "Round Health is beautiful for pills and vitamins, but it stops there. If you run peptides, hormones, TRT, or a serious longevity stack, you'll hit its ceiling fast. DoseRoutine is Round Health's calm design + the depth your protocol needs.",
  },
  {
    q: "Does DoseRoutine work on Android and iPhone?",
    a: "Yes. DoseRoutine is available on both iOS and Android and syncs your protocol across devices. Round Health is iOS-only.",
  },
  {
    q: "Does DoseRoutine have windows and flexible timing like Round Health?",
    a: "Yes. Every dose supports flexible timing windows, multi-time-per-day schedules, weekly / cyclical protocols, and calendar (.ics) export so your phone alarms fire even when the app isn't open.",
  },
  {
    q: "How much does DoseRoutine cost vs Round Health Premium?",
    a: "DoseRoutine Pro is $9.99/month or $59.99/year (50% off). Comparable to Round Health Premium, with far more capability for peptides, hormones and interaction safety.",
  },
];

const COMPARISON = [
  { feature: "Clean daily-dose UI", us: true, them: true },
  { feature: "iOS + Android", us: true, them: "iOS only" },
  { feature: "Flexible dose windows & multi-time-per-day", us: true, them: true },
  { feature: "Peptide reconstitution calculator", us: true, them: false },
  { feature: "Peptide dosage calculator (U-100 / U-40)", us: true, them: false },
  { feature: "Injection site rotation tracker", us: true, them: false },
  { feature: "Vial inventory + refill predictions", us: true, them: false },
  { feature: "HRT / TRT cycle tracking", us: true, them: false },
  { feature: "Blood work tracker", us: true, them: false },
  { feature: "475+ compound research library", us: true, them: false },
  { feature: "Interaction checker across your whole routine", us: true, them: false },
  { feature: "AI-assisted stack planning", us: true, them: false },
  { feature: "Shareable PDF summaries", us: true, them: false },
  { feature: "Calendar (.ics) alarms for every dose", us: true, them: false },
  { feature: "Protocol sharing", us: true, them: false },
  { feature: "Free tier", us: "Yes", them: "7 days" },
  { feature: "Pro pricing", us: "$9.99/mo · $59.99/yr", them: "~$9.99/mo · $49.99/yr" },
];

function Check({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="w-5 h-5 text-primary" aria-label="Yes" />;
  if (v === false) return <XCircle className="w-5 h-5 text-muted-foreground" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

function RoundHealthAlternative() {
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
            Round Health alternative
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            The Round Health alternative for peptides, hormones & serious stacks
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Love Round Health's calm daily-dose UI but need peptides, TRT/HRT, injections, and
            interaction safety? DoseRoutine keeps the clean design and adds every tool Round Health
            stops short of — on iOS and Android.
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
            <CardTitle>DoseRoutine vs Round Health</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">DoseRoutine</th>
                    <th className="text-center p-4 font-medium">Round Health</th>
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
              body: "Enter vial mg + BAC water. Get exact mg/mL and syringe units in one screen.",
            },
            {
              icon: Syringe,
              title: "Injection site rotation",
              body: "Track SubQ + IM sites, prevent tissue damage. Round Health doesn't ship this.",
            },
            {
              icon: ShieldAlert,
              title: "Interaction checker",
              body: "Cross-checks peptides, hormones, supplements and the rest of your routine.",
            },
            {
              icon: FileText,
              title: "Shareable PDF summaries",
              body: "One tap generates a full protocol report you can hand your clinician.",
            },
            {
              icon: Bell,
              title: "Real calendar alarms",
              body: "Every dose exports to .ics — a real phone alarm, not just an in-app push.",
            },
            {
              icon: Sparkles,
              title: "AI stack planning",
              body: "Goal-based stack suggestions with citations from the compound library.",
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
          <h2 className="text-2xl font-bold mb-6">When Round Health is still the right choice</h2>
          <p className="text-muted-foreground">
            If you're on iPhone only, take a handful of pills and vitamins, and don't run peptides
            or hormones, Round Health is beautiful and simple. DoseRoutine picks up the moment your
            protocol gets more serious.
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
            <Link to="/vs/cronometer" className="underline">
              Cronometer alternative
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
      <RelatedLinks currentPath="/vs/round-health" kind="comparisons" />
      <ProseContainer>
        <ProseContainer>
          <PageProse id="vs-round-health" />
        </ProseContainer>
      </ProseContainer>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
