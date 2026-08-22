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

export const CANONICAL = "https://doseroutine.com/vs/optipin";
const TITLE = "OptiPin Alternative for Peptides and TRT";
const DESC =
  "OptiPin vs DoseRoutine: injection logging and site rotation compared, plus the supplements, hormones, labs and interaction checks an iOS-only log misses.";

export const Route = createFileRoute("/vs/optipin")({
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
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/vs/optipin")],
    scripts: [
      breadcrumbScript(CANONICAL, [
        { name: "Compare", path: "/compare" },
        { name: "vs. OptiPin", path: "/vs/optipin" },
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
  component: OptiPinAlternative,
});

const COMPARISON: Array<{ feature: string; us: boolean | string; them: boolean | string }> = [
  { feature: "Injection logging + site rotation", us: true, them: true },
  { feature: "Reconstitution calculator", us: true, them: true },
  { feature: "Vial inventory + doses remaining", us: true, them: true },
  { feature: "Android and web access", us: true, them: false },
  { feature: "Oral supplements in the same routine", us: true, them: "Limited" },
  { feature: "Prescriptions and hormones (TRT/HRT)", us: true, them: "Limited" },
  { feature: "Interaction checking across categories", us: true, them: false },
  { feature: "Compound reference library", us: "475+ entries", them: false },
  { feature: "Blood work tracking", us: true, them: false },
  { feature: "Food and macro logging", us: true, them: false },
  { feature: "Calendar (.ics) alarms", us: true, them: false },
  { feature: "Clinician PDF summary", us: true, them: false },
];

export const FAQ = [
  {
    q: "Is DoseRoutine an OptiPin alternative?",
    a: "Yes. Both track injections, vials and site rotation. DoseRoutine also runs on Android and the web, and covers oral supplements, prescriptions, hormones, blood work and interaction checking in the same routine.",
  },
  {
    q: "Does OptiPin work on Android?",
    a: "OptiPin is an iOS app. If you are on Android, or want to plan a protocol on a laptop and log it on a phone, DoseRoutine's web app plus Android build covers that.",
  },
  {
    q: "When is OptiPin the better choice?",
    a: "If you are on iPhone, inject one compound, and want the simplest possible log with almost no setup, OptiPin's minimalism is the point. DoseRoutine is aimed at multi-compound routines that change over time.",
  },
  {
    q: "Can DoseRoutine handle testosterone as well as peptides?",
    a: "Yes. Esters, injection frequency, site rotation, cycle start and end dates and the related lab markers are all first-class, and the library entry for each ester carries dosing units and interaction data.",
  },
  {
    q: "What does DoseRoutine cost?",
    a: "It is free to start. Pro unlocks the calculators, interaction checker and AI stack tools; the core dose log and reminders stay usable without it.",
  },
];

function Check({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="w-5 h-5 text-primary" aria-label="Yes" />;
  if (v === false) return <XCircle className="w-5 h-5 text-muted-foreground" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

function OptiPinAlternative() {
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
            OptiPin alternative
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">DoseRoutine vs OptiPin</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            OptiPin is a clean iOS injection log. DoseRoutine covers the same ground and then keeps
            going — supplements, hormones, labs, interactions, and access from Android or a browser.
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
            <CardTitle>DoseRoutine vs OptiPin</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">DoseRoutine</th>
                    <th className="text-center p-4 font-medium">OptiPin</th>
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
          <h2 className="text-2xl font-bold mb-4">When OptiPin is still the right pick</h2>
          <p className="text-muted-foreground">
            One iPhone, one compound, minimal setup — that is a real use case, and a small app
            serves it well. Switch when the routine grows a second and third moving part and you
            start keeping the rest in notes or a spreadsheet.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Protocols people track here</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { slug: "testosterone-cypionate", name: "Testosterone cypionate" },
              { slug: "testosterone-enanthate", name: "Testosterone enanthate" },
              { slug: "semaglutide", name: "Semaglutide" },
              { slug: "tirzepatide", name: "Tirzepatide" },
              { slug: "bpc-157", name: "BPC-157" },
              { slug: "hcg", name: "hCG" },
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
          <h2 className="text-2xl font-bold">One place for every dose</h2>
          <Button size="lg" asChild>
            <Link to="/install">
              Get DoseRoutine <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
      <RelatedLinks currentPath="/vs/optipin" kind="comparisons" />
      <ProseContainer>
        <PageProse id="vs-optipin" />
      </ProseContainer>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
