import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, ShieldAlert, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/compare/tongkat-ali-vs-fadogia-agrestis";
const TITLE = "Tongkat Ali vs Fadogia Agrestis for T | DoseRoutine";
const DESC =
  "Tongkat ali vs fadogia agrestis compared: mechanism, human evidence for testosterone, libido and performance, typical dose, cycling advice and stacking.";

export const FAQS = [
  {
    q: "Which has better human evidence?",
    a: "Tongkat ali. It has multiple RCTs showing free-testosterone increases in stressed or aging men. Fadogia agrestis has almost no human data — its popularity comes mostly from Andrew Huberman's podcast and rat studies.",
  },
  {
    q: "Should I cycle them?",
    a: "Tongkat ali is safe daily for months. Fadogia is typically cycled (8 weeks on, 2–4 weeks off) because long-term human safety data is missing.",
  },
  {
    q: "Can I take both together?",
    a: "Many people do. Just start each one alone for 2–3 weeks first so you can tell what's causing any side effect.",
  },
  {
    q: "Do either raise total testosterone dramatically?",
    a: "No. Effects on total T in healthy men are small. Tongkat ali's main measured effect is on free T (via lower SHBG). Fadogia's human T data is essentially absent.",
  },
  {
    q: "Which is better for libido?",
    a: "Tongkat ali has better human libido data. Both are popular for that use, but tongkat ali's evidence base is much stronger.",
  },
];

export const Route = createFileRoute("/library/compare/tongkat-ali-vs-fadogia-agrestis")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "author", content: "DoseRoutine" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: "https://doseroutine.com/og/compare-tongkat-fadogia.jpg" },
      {
        property: "og:image:secure_url",
        content: "https://doseroutine.com/og/compare-tongkat-fadogia.jpg",
      },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "DoseRoutine — Tongkat Ali vs Fadogia Agrestis comparison",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: "https://doseroutine.com/og/compare-tongkat-fadogia.jpg" },
      { name: "twitter:image:alt", content: "DoseRoutine — Tongkat Ali vs Fadogia Agrestis" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/compare/tongkat-ali-vs-fadogia-agrestis"),
    ],
    scripts: mergeLdScripts([
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
          headline: TITLE,
          description: DESC,
          url: CANONICAL,
          image: ["https://doseroutine.com/og/compare-tongkat-fadogia.jpg"],
          inLanguage: "en",
          author: {
            "@type": "Organization",
            "@id": "https://doseroutine.com/#organization",
            name: "DoseRoutine",
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://doseroutine.com/#organization",
            name: "DoseRoutine",
            logo: { "@type": "ImageObject", url: "https://doseroutine.com/icon-512.png" },
          },
          datePublished: "2026-07-27",
          dateModified: "2026-07-27",
          mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Library",
              item: "https://doseroutine.com/library",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Testosterone Support",
              item: "https://doseroutine.com/library/testosterone-support",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Tongkat Ali vs Fadogia Agrestis",
              item: CANONICAL,
            },
          ],
        }),
      },
    ]),
  }),
  component: Page,
});

function Page() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tongkat Ali vs Fadogia Agrestis
          </h1>
          <p className="text-lg text-muted-foreground">
            The two most-discussed natural testosterone-support botanicals of the last few years,
            compared honestly on human evidence, dosing, cycling and safety.
          </p>
        </header>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="h-4 w-4 text-primary" /> Mechanism at a glance
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold">Tongkat Ali</h2>
              <p className="text-sm text-muted-foreground">
                Adaptogen with quassinoids (eurycomanone). Lowers SHBG, reduces cortisol under
                stress, appears to modestly raise free testosterone.
              </p>
            </div>
            <div>
              <h2 className="text-base font-semibold">Fadogia Agrestis</h2>
              <p className="text-sm text-muted-foreground">
                West African shrub. Rat studies suggest LH-mimetic effects on Leydig cells; human
                evidence is minimal.
              </p>
            </div>
          </div>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Head-to-head</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4"></th>
                  <th className="py-2 pr-4">Tongkat Ali</th>
                  <th className="py-2">Fadogia Agrestis</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-2 [&_td]:pr-4">
                <tr className="border-b">
                  <td>Typical dose</td>
                  <td>200–400 mg/day (standardized to ≥2% eurycomanone)</td>
                  <td>600 mg/day</td>
                </tr>
                <tr className="border-b">
                  <td>Cycling</td>
                  <td>Safe daily for months</td>
                  <td>8 weeks on, 2–4 weeks off</td>
                </tr>
                <tr className="border-b">
                  <td>Human RCTs</td>
                  <td>Multiple, moderate quality</td>
                  <td>Essentially none</td>
                </tr>
                <tr className="border-b">
                  <td>Best-documented effect</td>
                  <td>Lower cortisol, higher free T under stress</td>
                  <td>Rat testosterone rise (no human data)</td>
                </tr>
                <tr className="border-b">
                  <td>Libido evidence</td>
                  <td>Positive small RCTs</td>
                  <td>Anecdotal only</td>
                </tr>
                <tr>
                  <td>Long-term safety</td>
                  <td>Good up to 12 months</td>
                  <td>Unknown; potential testicular toxicity in high-dose rat studies</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-primary" /> Safety notes
          </div>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              Fadogia agrestis has caused testicular damage in high-dose rat studies. Cycle it — do
              not run it continuously.
            </li>
            <li>
              Tongkat ali may increase iron absorption; monitor ferritin if you supplement iron.
            </li>
            <li>Neither should be used to self-treat suspected low T. Get labs first.</li>
          </ul>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Which should you pick?</h2>
          <p className="text-sm text-muted-foreground">
            If you can only pick one, tongkat ali is the more defensible choice — better evidence,
            better safety record. Fadogia is a reasonable add-on for a defined cycle if you want to
            experiment, but treat it as speculative until human trials catch up.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">FAQ</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="p-5 flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Track your T-support cycle in DoseRoutine</p>
            <p className="text-muted-foreground">
              Set on/off cycles for fadogia, log tongkat daily, and share lab-ready reports.
            </p>
            <Link
              to="/auth"
              className="mt-2 inline-flex items-center gap-1 text-primary font-medium"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <div className="text-sm space-y-2">
          <div>
            See also:{" "}
            <Link to="/library/testosterone-support" className="text-primary hover:underline">
              Testosterone Support hub
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/compare/ashwagandha-vs-tongkat-ali"
              className="text-primary hover:underline"
            >
              Ashwagandha vs Tongkat Ali
            </Link>{" "}
            ·{" "}
            <Link to="/library/mens-health" className="text-primary hover:underline">
              Men's Health
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Educational, not medical advice.</p>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/compare/tongkat-ali-vs-fadogia-agrestis" />
      </article>
    </main>
  );
}
