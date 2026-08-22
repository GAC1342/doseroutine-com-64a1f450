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

export const CANONICAL = "https://doseroutine.com/vs/medisafe";
const TITLE = "Medisafe Alternative for Peptides and TRT";
const DESC =
  "DoseRoutine is a Medisafe alternative with peptide reconstitution, interaction… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/vs/medisafe")({
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
      {
        property: "og:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/1f47c142-ab40-4a29-9e4f-f00a2de92669/og-vs-medisafe.jpg",
      },
      {
        property: "og:image:alt",
        content:
          "DoseRoutine vs Medisafe comparison card — peptide and hormone tracking side by side",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      {
        name: "twitter:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/1f47c142-ab40-4a29-9e4f-f00a2de92669/og-vs-medisafe.jpg",
      },
      {
        name: "twitter:image:alt",
        content:
          "DoseRoutine vs Medisafe comparison card — peptide and hormone tracking side by side",
      },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/vs/medisafe")],
    scripts: [
      breadcrumbScript("https://doseroutine.com/vs/medisafe", [
        { name: "Compare", path: "/compare" },
        { name: "vs. Medisafe", path: "/vs/medisafe" },
      ]),
      articleScript({
        url: CANONICAL,
        headline: TITLE,
        description: DESC,
        datePublished: "2026-06-01",
        dateModified: "2026-07-20",
        image:
          "https://doseroutine.com/__l5e/assets-v1/1f47c142-ab40-4a29-9e4f-f00a2de92669/og-vs-medisafe.jpg",
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
  component: MedisafeAlternative,
});

export const FAQ = [
  {
    q: "Is DoseRoutine a Medisafe alternative for peptides and hormones?",
    a: "Yes. Medisafe is a great pill reminder, but it wasn't designed for peptides, TRT/HRT, or complex longevity stacks. DoseRoutine adds a peptide reconstitution calculator, injection site rotation, vial inventory, blood work tracking, and a compound library of 475+ substances — the tools stack builders actually need.",
  },
  {
    q: "Can I import my Medisafe medication list?",
    a: "You can rebuild your list in minutes. Add each medication or peptide from our 475+ compound library — dosages, timing, and interaction data auto-fill. Then export a shareable PDF summary anytime.",
  },
  {
    q: "Does DoseRoutine have reminders and alarms like Medisafe?",
    a: "Yes. DoseRoutine sends push reminders plus a calendar (.ics) export so every dose becomes a real phone alarm — including weekly, cyclical, and multi-time-per-day schedules Medisafe struggles with.",
  },
  {
    q: "How much does DoseRoutine cost vs Medisafe Premium?",
    a: "DoseRoutine Pro is $9.99/month or $59.99/year. That's less than Medisafe Premium and includes the peptide calculator, interaction checker, AI stack planning, and doctor PDFs.",
  },
  {
    q: "Can I log everything else I take alongside my supplements?",
    a: "DoseRoutine is an educational tracking tool, not a substitute for medical advice. It flags interactions across supplements, peptides, hormones and anything else you log — but always confirm changes with a licensed clinician.",
  },
];

const COMPARISON = [
  { feature: "Medication reminders", us: true, them: true },
  { feature: "Supplement tracking", us: true, them: "Limited" },
  { feature: "Peptide reconstitution calculator", us: true, them: false },
  { feature: "Peptide dosage calculator (U-100 / U-40)", us: true, them: false },
  { feature: "Injection site rotation tracker", us: true, them: false },
  { feature: "Vial inventory + refill predictions", us: true, them: false },
  { feature: "HRT / TRT cycle tracking", us: true, them: false },
  { feature: "Blood work tracker", us: true, them: false },
  { feature: "475+ compound research library", us: true, them: false },
  { feature: "Interaction checker across your whole routine", us: true, them: "Basic pills only" },
  { feature: "AI-assisted stack planning", us: true, them: false },
  { feature: "Shareable PDF summaries", us: true, them: "Basic" },
  { feature: "Calendar (.ics) alarms for every dose", us: true, them: false },
  { feature: "Protocol sharing", us: true, them: false },
  { feature: "Free tier", us: "Yes", them: "14 days" },
  { feature: "Pro pricing", us: "$9.99/mo · $59.99/yr", them: "$4.99/mo · $39.99/yr" },
];

function Check({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="w-5 h-5 text-primary" aria-label="Yes" />;
  if (v === false) return <XCircle className="w-5 h-5 text-muted-foreground" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

function MedisafeAlternative() {
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
            Medisafe alternative
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            The Medisafe alternative built for peptides, hormones & serious stacks
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Medisafe is a solid pill reminder. But if you run peptide protocols, TRT/HRT, or a
            15-supplement longevity stack, you've outgrown it. DoseRoutine picks up where Medisafe
            stops — with a reconstitution calculator, interaction checks that cover your whole
            routine, and shareable summaries.
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
            <CardTitle>DoseRoutine vs Medisafe</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">DoseRoutine</th>
                    <th className="text-center p-4 font-medium">Medisafe</th>
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
              body: "Enter vial mg + BAC water. Get exact mg/mL and syringe units. Medisafe has none of this.",
            },
            {
              icon: Syringe,
              title: "Injection site rotation",
              body: "Track SubQ + IM sites, prevent tissue damage. Built for peptide + TRT users.",
            },
            {
              icon: ShieldAlert,
              title: "Interaction checker",
              body: "Cross-checks peptides, hormones, supplements and the rest of your routine. Medisafe only covers pills.",
            },
            {
              icon: FileText,
              title: "Shareable PDF summaries",
              body: "One tap generates a full protocol report you can hand your clinician.",
            },
            {
              icon: Bell,
              title: "Real calendar alarms",
              body: "Every dose exports to .ics — becomes a real phone alarm, not just an in-app push.",
            },
            {
              icon: Sparkles,
              title: "AI stack planning",
              body: "Gemini-powered suggestions for goal-based stacks with citations. No competitor has this.",
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
          <h2 className="text-2xl font-bold mb-6">When Medisafe is still the right choice</h2>
          <p className="text-muted-foreground">
            If you only take one or two daily pills and never touch peptides, hormones, or a
            supplement stack, Medisafe is fine and its free tier will cover you. DoseRoutine is
            built for the next tier up — anyone whose routine has outgrown a simple pill reminder.
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
            <Link to="/vs/mytherapy" className="underline">
              MyTherapy alternative
            </Link>{" "}
            ·{" "}
            <Link to="/vs/round-health" className="underline">
              Round Health alternative
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
      <RelatedLinks currentPath="/vs/medisafe" kind="comparisons" />
      <ProseContainer>
        <ProseContainer>
          <PageProse id="vs-medisafe" />
        </ProseContainer>
      </ProseContainer>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
