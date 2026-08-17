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

const CANONICAL = "https://doseroutine.com/vs/mytherapy";
const TITLE = "MyTherapy Alternative for Peptides and HRT";
const DESC =
  "DoseRoutine is a MyTherapy alternative with peptide math, a 475+ compound libr… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/vs/mytherapy")({
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
          "https://doseroutine.com/__l5e/assets-v1/38d7762d-952a-4fbd-8ea8-1ea66bcef6eb/og-vs-mytherapy.jpg",
      },
        { property: "og:image:alt", content: "DoseRoutine vs MyTherapy comparison card — peptide and hormone tracking side by side" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      {
        name: "twitter:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/38d7762d-952a-4fbd-8ea8-1ea66bcef6eb/og-vs-mytherapy.jpg",
      },
        { name: "twitter:image:alt", content: "DoseRoutine vs MyTherapy comparison card — peptide and hormone tracking side by side" },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/vs/mytherapy")],
    scripts: [
      breadcrumbScript("https://doseroutine.com/vs/mytherapy", [
        { name: "Compare", path: "/compare" },
        { name: "vs. MyTherapy", path: "/vs/mytherapy" },
      ]),
      articleScript({
        url: CANONICAL,
        headline: TITLE,
        description: DESC,
        datePublished: "2026-06-01",
        dateModified: "2026-07-20",
        image:
          "https://doseroutine.com/__l5e/assets-v1/38d7762d-952a-4fbd-8ea8-1ea66bcef6eb/og-vs-mytherapy.jpg",
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
  component: MyTherapyAlternative,
});

const FAQ = [
  {
    q: "Why switch from MyTherapy to DoseRoutine?",
    a: "MyTherapy is designed as a medication + mood/symptom journal. If your routine includes peptides, hormones, or a supplement stack, you need reconstitution math, vial inventory, and cross-interaction checks — features DoseRoutine ships with and MyTherapy doesn't.",
  },
  {
    q: "Does DoseRoutine track symptoms and side effects like MyTherapy?",
    a: "Yes. DoseRoutine includes a side-effect journal, progress photos, and body metrics (weight, resting HR, sleep). You get MyTherapy's tracking plus the peptide/stack tools it lacks.",
  },
  {
    q: "Can I export data to share with my doctor?",
    a: "One tap generates a shareable PDF summary with your full stack, dosing schedule, adherence heatmap, and any flagged interactions — more comprehensive than MyTherapy's basic report.",
  },
  {
    q: "How does pricing compare to MyTherapy?",
    a: "MyTherapy is free ad-supported. DoseRoutine Pro is $9.99/month or $59.99/year (50% off) with a 7-day free trial, no ads, and unlocks the reconstitution calculator, interaction checker, AI stack planning, and doctor exports.",
  },
  {
    q: "Is DoseRoutine available in multiple languages?",
    a: "Yes — DoseRoutine auto-detects 12 languages including English, Spanish, French, German, Italian, Portuguese, Dutch, Japanese, Chinese, Korean, Russian, and Arabic.",
  },
];

const COMPARISON = [
  { feature: "Medication reminders", us: true, them: true },
  { feature: "Symptom & mood journal", us: true, them: true },
  { feature: "Supplement tracking", us: true, them: "Basic" },
  { feature: "Peptide reconstitution calculator", us: true, them: false },
  { feature: "Peptide dosage calculator (U-100 / U-40)", us: true, them: false },
  { feature: "Injection site rotation tracker", us: true, them: false },
  { feature: "Vial inventory + refill predictions", us: true, them: false },
  { feature: "HRT / TRT cycle tracking", us: true, them: false },
  { feature: "Blood work tracker with trend charts", us: true, them: false },
  { feature: "475+ compound research library", us: true, them: false },
  { feature: "Interaction checker across your whole routine", us: true, them: false },
  { feature: "AI-assisted stack planning", us: true, them: false },
  { feature: "Shareable PDF summaries", us: true, them: "Basic" },
  { feature: "Calendar (.ics) alarms", us: true, them: false },
  { feature: "Ad-free", us: true, them: false },
  { feature: "Free trial", us: "7 days", them: "Free (ads)" },
  { feature: "Pro pricing", us: "$9.99/mo · $59.99/yr", them: "Free / ads" },
];

function Check({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="w-5 h-5 text-primary" aria-label="Yes" />;
  if (v === false) return <XCircle className="w-5 h-5 text-muted-foreground" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

function MyTherapyAlternative() {
  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <section className="container max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center space-y-4 mb-12">
          <span className="inline-block text-xs uppercase tracking-widest text-muted-foreground">
            MyTherapy alternative
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            The MyTherapy alternative for peptides, HRT and complex stacks
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            MyTherapy is a great free pill + symptom journal. But it wasn't designed for
            reconstituting peptide vials, tracking TRT cycles, or catching interactions across a
            15-item stack. DoseRoutine is.
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
            <CardTitle>DoseRoutine vs MyTherapy</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">DoseRoutine</th>
                    <th className="text-center p-4 font-medium">MyTherapy</th>
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
              body: "Enter vial mg + BAC water. Get exact mg/mL and syringe units for U-100 or U-40 pins.",
            },
            {
              icon: Syringe,
              title: "Injection site rotation",
              body: "Rotate SubQ + IM sites automatically. Built for peptide, GLP-1 and TRT users.",
            },
            {
              icon: ShieldAlert,
              title: "Full interaction checker",
              body: "Cross-checks peptides, hormones, supplements and the rest of your routine. MyTherapy doesn't.",
            },
            {
              icon: FileText,
              title: "Shareable PDF summaries",
              body: "Full protocol report with adherence, blood work trends, and flagged interactions.",
            },
            {
              icon: Bell,
              title: "Real calendar alarms",
              body: "Every dose exports to .ics for native phone alarms — even weekly and cyclical protocols.",
            },
            {
              icon: Sparkles,
              title: "AI stack planning",
              body: "Goal-based stack suggestions with cited research from our 475+ compound library.",
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
          <h2 className="text-2xl font-bold mb-6">When MyTherapy is still fine</h2>
          <p className="text-muted-foreground">
            If you only track a couple of daily pills plus a mood journal, MyTherapy's free tier
            covers you (with ads). DoseRoutine is built for the tier above — anyone whose routine
            involves peptides, hormones, or a real stack.
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
            7-day free trial. No ads. $9.99/month or $59.99/year (50% off).
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
      <RelatedLinks currentPath="/vs/mytherapy" kind="comparisons" />
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
