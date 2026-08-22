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

export const CANONICAL = "https://doseroutine.com/vs/peptide-tracker";
const TITLE = "Peptide Tracker Alternative for Full Routines";
const DESC =
  "Peptide Tracker vs DoseRoutine: reconstitution math, vials and injection sites compared, plus the supplements, hormones and labs a peptide-only app misses.";

export const Route = createFileRoute("/vs/peptide-tracker")({
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
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/vs/peptide-tracker")],
    scripts: [
      breadcrumbScript(CANONICAL, [
        { name: "Compare", path: "/compare" },
        { name: "vs. Peptide Tracker", path: "/vs/peptide-tracker" },
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
  component: PeptideTrackerAlternative,
});

const COMPARISON: Array<{ feature: string; us: boolean | string; them: boolean | string }> = [
  { feature: "Reconstitution calculator", us: true, them: true },
  { feature: "Vial inventory + doses remaining", us: true, them: true },
  { feature: "Injection-site rotation", us: true, them: true },
  { feature: "Oral supplements in the same routine", us: true, them: "Limited" },
  { feature: "Prescriptions and hormones (TRT/HRT)", us: true, them: "Limited" },
  { feature: "Interaction checking across categories", us: true, them: false },
  { feature: "Compound reference library", us: "475+ entries", them: false },
  { feature: "Blood work tracking", us: true, them: "Basic" },
  { feature: "Food and macro logging", us: true, them: false },
  { feature: "Calendar (.ics) alarms", us: true, them: false },
  { feature: "Clinician PDF summary", us: true, them: "Basic" },
  { feature: "Web app as well as mobile", us: true, them: false },
];

export const FAQ = [
  {
    q: "Is DoseRoutine a Peptide Tracker alternative?",
    a: "Yes, for people whose routine is more than peptides. Both apps handle reconstitution math, vial inventory and injection-site rotation. DoseRoutine adds oral supplements, prescriptions, hormones, blood work, food logging and interaction checking across all of them.",
  },
  {
    q: "When is Peptide Tracker the better choice?",
    a: "If peptides are your entire routine and you want the smallest possible app, Peptide Tracker's narrower scope means fewer screens to move through. Nothing in DoseRoutine's extra tooling helps if you never take anything orally.",
  },
  {
    q: "Can I move my peptide protocols across?",
    a: "You rebuild them, which takes a few minutes: pick each compound from the 475+ entry library and the dosing units, typical schedule and interaction data are already attached. Your vial concentrations carry over as a reconstitution entry per vial.",
  },
  {
    q: "Does DoseRoutine do the same syringe-unit math?",
    a: "Yes. Enter vial strength and bacteriostatic water volume and you get mg/mL plus exact U-100 or U-40 syringe units per dose, with the remaining doses in the vial tracked as you log.",
  },
  {
    q: "Which one checks interactions?",
    a: "Only DoseRoutine. It flags interactions between peptides, hormones, supplements and prescriptions, and shows the mechanism and source behind each flag rather than a bare warning icon.",
  },
];

function Check({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="w-5 h-5 text-primary" aria-label="Yes" />;
  if (v === false) return <XCircle className="w-5 h-5 text-muted-foreground" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

function PeptideTrackerAlternative() {
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
            Peptide Tracker alternative
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            DoseRoutine vs Peptide Tracker
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Peptide Tracker does the injectable basics well. The question is whether peptides are
            the whole routine — because supplements, TRT, prescriptions, labs and interactions all
            live outside it.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button size="lg" asChild>
              <Link to="/install">
                Try DoseRoutine free <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/best-dose-tracking-apps">See all trackers compared</Link>
            </Button>
          </div>
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle>DoseRoutine vs Peptide Tracker</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">DoseRoutine</th>
                    <th className="text-center p-4 font-medium">Peptide Tracker</th>
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

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">When Peptide Tracker is still the right pick</h2>
          <p className="text-muted-foreground">
            If your routine is one or two peptides and nothing else, a peptide-only app is less to
            learn and less to maintain. DoseRoutine earns its place when the same week also includes
            supplements, a hormone protocol, prescriptions or lab work you want plotted against the
            doses.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Compounds people track here</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { slug: "bpc-157", name: "BPC-157" },
              { slug: "tb-500", name: "TB-500" },
              { slug: "semaglutide", name: "Semaglutide" },
              { slug: "tirzepatide", name: "Tirzepatide" },
              { slug: "ipamorelin", name: "Ipamorelin" },
              { slug: "cjc-1295", name: "CJC-1295" },
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
          <h2 className="text-2xl font-bold">Track the whole protocol</h2>
          <Button size="lg" asChild>
            <Link to="/install">
              Get DoseRoutine <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
      <RelatedLinks currentPath="/vs/peptide-tracker" kind="comparisons" />
      <ProseContainer>
        <PageProse id="vs-peptide-tracker" />
      </ProseContainer>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
