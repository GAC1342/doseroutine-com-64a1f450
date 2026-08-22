import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/compare/ashwagandha-vs-tongkat-ali";
const TITLE = "Ashwagandha vs Tongkat Ali Comparison | DoseRoutine";
const DESC =
  "Ashwagandha vs tongkat ali compared: cortisol lowering, testosterone effect, sleep, dosing and how to stack them for stressed men.";

export const FAQS = [
  {
    q: "Can I take both together?",
    a: "Yes — they're commonly stacked. Ashwagandha handles cortisol/sleep, tongkat ali handles free testosterone and libido. Start each alone first.",
  },
  {
    q: "Which raises testosterone more?",
    a: "In stressed men, both show modest testosterone increases in RCTs. Ashwagandha's effect appears secondary to cortisol reduction; tongkat ali works partly by lowering SHBG.",
  },
  {
    q: "Which is better for sleep?",
    a: "Ashwagandha, clearly. It's actively sedating and works well before bed. Tongkat ali is neutral or slightly stimulating — take it in the morning.",
  },
  {
    q: "Any interactions?",
    a: "Ashwagandha can amplify sedatives and thyroid medication effects. Tongkat ali can boost iron absorption. Neither mixes well with immunosuppressants.",
  },
  {
    q: "How long until they work?",
    a: "4–8 weeks for both. Ashwagandha's sleep effect is often noticeable in the first week.",
  },
];

export const Route = createFileRoute("/library/compare/ashwagandha-vs-tongkat-ali")({
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
      {
        property: "og:image",
        content: "https://doseroutine.com/og/compare-ashwagandha-tongkat.jpg",
      },
      {
        property: "og:image:secure_url",
        content: "https://doseroutine.com/og/compare-ashwagandha-tongkat.jpg",
      },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "DoseRoutine — Ashwagandha vs Tongkat Ali comparison" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      {
        name: "twitter:image",
        content: "https://doseroutine.com/og/compare-ashwagandha-tongkat.jpg",
      },
      { name: "twitter:image:alt", content: "DoseRoutine — Ashwagandha vs Tongkat Ali" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/compare/ashwagandha-vs-tongkat-ali"),
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
          image: ["https://doseroutine.com/og/compare-ashwagandha-tongkat.jpg"],
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
              name: "Ashwagandha vs Tongkat Ali",
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
            Ashwagandha vs Tongkat Ali
          </h1>
          <p className="text-lg text-muted-foreground">
            Two adaptogens frequently marketed for testosterone — but they work through very
            different pathways and are often better together than either alone.
          </p>
        </header>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="h-4 w-4 text-primary" /> Mechanism at a glance
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold">Ashwagandha</h2>
              <p className="text-sm text-muted-foreground">
                Withanolide-rich adaptogen (KSM-66, Sensoril). Lowers cortisol, improves sleep
                quality, mildly raises T in stressed men — the T-bump is secondary to stress
                reduction.
              </p>
            </div>
            <div>
              <h2 className="text-base font-semibold">Tongkat Ali</h2>
              <p className="text-sm text-muted-foreground">
                Eurycomanone-standardized adaptogen. Lowers SHBG, mildly reduces cortisol, appears
                to raise free (bioavailable) testosterone.
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
                  <th className="py-2 pr-4">Ashwagandha</th>
                  <th className="py-2">Tongkat Ali</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-2 [&_td]:pr-4">
                <tr className="border-b">
                  <td>Typical dose</td>
                  <td>300–600 mg/day KSM-66</td>
                  <td>200–400 mg/day (≥2% eurycomanone)</td>
                </tr>
                <tr className="border-b">
                  <td>Best timing</td>
                  <td>Evening (sleep)</td>
                  <td>Morning</td>
                </tr>
                <tr className="border-b">
                  <td>Best for</td>
                  <td>Stress, sleep, cortisol</td>
                  <td>Free T, libido, energy</td>
                </tr>
                <tr className="border-b">
                  <td>Testosterone effect</td>
                  <td>Small; bigger in stressed men</td>
                  <td>Small–moderate on free T</td>
                </tr>
                <tr>
                  <td>Downsides</td>
                  <td>Sedation; thyroid-Rx interaction</td>
                  <td>Iron absorption boost</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Stacking</h2>
          <p className="text-sm text-muted-foreground">
            Ashwagandha at night + tongkat ali in the morning is a common, reasonable stack. Give
            each 2–3 weeks alone first so you can tell them apart if a side effect shows up.
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
            <p className="font-semibold">Track your morning/evening stack in DoseRoutine</p>
            <p className="text-muted-foreground">
              Multi-time reminders keep ashwagandha and tongkat ali on separate schedules.
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
            <Link
              to="/library/compare/tongkat-ali-vs-fadogia-agrestis"
              className="text-primary hover:underline"
            >
              Tongkat Ali vs Fadogia
            </Link>{" "}
            ·{" "}
            <Link to="/library/testosterone-support" className="text-primary hover:underline">
              Testosterone Support
            </Link>{" "}
            ·{" "}
            <Link to="/library/mens-health" className="text-primary hover:underline">
              Men's Health
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Educational, not medical advice.</p>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/compare/ashwagandha-vs-tongkat-ali" />
      </article>
    </main>
  );
}
