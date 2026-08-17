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

const CANONICAL = "https://doseroutine.com/vs/pill-reminder";
const TITLE = "Pill Reminder Alternative for Peptides and TRT";
const DESC =
  "DoseRoutine upgrades pill reminders with real calendar alarms, peptide reconst… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/vs/pill-reminder")({
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
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/vs/pill-reminder")],
    scripts: [
      breadcrumbScript("https://doseroutine.com/vs/pill-reminder", [
        { name: "Compare", path: "/compare" },
        { name: "vs. Pill Reminder", path: "/vs/pill-reminder" },
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
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: PillReminderAlternative,
});

const FAQ = [
  {
    q: "What's the best pill reminder app in 2026?",
    a: "For a simple daily pill or two, apps like Medisafe, MyTherapy, Round Health and Pill Reminder are fine. But if you also track supplements, peptides, hormones, TRT/HRT, or a longevity stack, DoseRoutine is the upgrade — it handles reminders plus reconstitution, injections, interactions, and shareable summaries in one app.",
  },
  {
    q: "Why do most pill reminder apps fail for supplement stacks?",
    a: "They were built for one or two daily pills. Timing windows, cyclical dosing, weekly injections, peptide reconstitution, and cross-checking supplements against the rest of your routine aren't part of their model. DoseRoutine was designed for that layer from day one.",
  },
  {
    q: "Does DoseRoutine send real phone alarms, not just push notifications?",
    a: "Yes. Every dose exports to your phone calendar as an .ics event, so the alarm fires like any other calendar alert — even if the app is closed or notifications are muted.",
  },
  {
    q: "Can DoseRoutine handle everything else I take?",
    a: "Yes. Anything else you take lives alongside supplements, peptides and hormones in one schedule, and the interaction checker cross-references all four categories.",
  },
  {
    q: "How much does DoseRoutine cost compared to free pill reminders?",
    a: "There's a free tier for basic reminders. DoseRoutine Pro is $9.99/month or $59.99/year (50% off) with a 7-day free trial and unlocks the peptide calculator, interaction checker, AI stack planning, vial inventory, and shareable PDF summaries.",
  },
];

const COMPARISON = [
  { feature: "Medication reminders", us: true, them: true },
  { feature: "Supplement tracking", us: true, them: "Limited" },
  { feature: "Peptide reconstitution calculator", us: true, them: false },
  { feature: "Peptide dosage calculator (U-100 / U-40)", us: true, them: false },
  { feature: "Injection site rotation tracker", us: true, them: false },
  { feature: "Vial inventory + refill predictions", us: true, them: "Refill dates only" },
  { feature: "HRT / TRT cycle tracking", us: true, them: false },
  { feature: "Blood work tracker", us: true, them: false },
  { feature: "475+ compound research library", us: true, them: false },
  {
    feature: "Interaction checker across your whole routine",
    us: true,
    them: "Basic pills only (some apps)",
  },
  { feature: "AI-assisted stack planning", us: true, them: false },
  { feature: "Shareable PDF summaries", us: true, them: "Basic (some apps)" },
  { feature: "Calendar (.ics) alarms for every dose", us: true, them: false },
  { feature: "Weekly / cyclical protocols", us: true, them: "Limited" },
  { feature: "Free trial", us: "7 days", them: "Varies" },
  { feature: "Pro pricing", us: "$9.99/mo · $59.99/yr", them: "Free – $9.99/mo" },
];

function Check({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="w-5 h-5 text-primary" aria-label="Yes" />;
  if (v === false) return <XCircle className="w-5 h-5 text-muted-foreground" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

function PillReminderAlternative() {
  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <section className="container max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center space-y-4 mb-12">
          <span className="inline-block text-xs uppercase tracking-widest text-muted-foreground">
            Pill reminder app — upgrade
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            The pill reminder app upgrade for supplements, peptides & hormones
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Basic pill reminders are great — until you add a supplement stack, peptides, TRT/HRT, or
            cyclical protocols. DoseRoutine is the pill-reminder-app upgrade: real calendar alarms,
            reconstitution math, interaction checks across every category, and shareable PDF
            summaries.
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
            <CardTitle>DoseRoutine vs typical pill reminder apps</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">DoseRoutine</th>
                    <th className="text-center p-4 font-medium">Typical pill reminder</th>
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
              body: "Enter vial mg + BAC water. Get exact mg/mL and syringe units — no more napkin math.",
            },
            {
              icon: Syringe,
              title: "Injection site rotation",
              body: "Track SubQ + IM sites, prevent tissue damage. Built for peptide + TRT users.",
            },
            {
              icon: ShieldAlert,
              title: "Interaction checker",
              body: "Cross-checks peptides, hormones, supplements and everything else in one place.",
            },
            {
              icon: FileText,
              title: "Shareable PDF summaries",
              body: "One tap generates a full protocol report you can hand your clinician.",
            },
            {
              icon: Bell,
              title: "Real calendar alarms",
              body: "Every dose exports to .ics — a real phone alarm even if notifications are muted.",
            },
            {
              icon: Sparkles,
              title: "AI stack planning",
              body: "Goal-based stack suggestions with citations from the 475+ compound library.",
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
          <h2 className="text-2xl font-bold mb-6">When a basic pill reminder is still enough</h2>
          <p className="text-muted-foreground">
            If your routine is one or two daily pills and nothing else, a free pill reminder is
            fine. DoseRoutine is for anyone whose routine has grown past that — supplement stacks,
            peptides, hormones, TRT, cyclical protocols, or a mix of all four.
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
          <h2 className="text-2xl font-bold">Ready to upgrade?</h2>
          <p className="text-muted-foreground">
            7-day free trial. Cancel anytime. $9.99/month or $59.99/year (50% off).
          </p>
          <Button size="lg" asChild>
            <Link to="/install">
              Download DoseRoutine <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground pt-4">
            Compare:{" "}
            <Link to="/vs/medisafe" className="underline">
              Medisafe
            </Link>{" "}
            ·{" "}
            <Link to="/vs/mytherapy" className="underline">
              MyTherapy
            </Link>{" "}
            ·{" "}
            <Link to="/vs/round-health" className="underline">
              Round Health
            </Link>{" "}
            ·{" "}
            <Link to="/vs/cronometer" className="underline">
              Cronometer
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
      <RelatedLinks currentPath="/vs/pill-reminder" kind="comparisons" />
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
