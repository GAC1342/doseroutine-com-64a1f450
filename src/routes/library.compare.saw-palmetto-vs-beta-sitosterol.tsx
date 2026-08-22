import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, ShieldAlert, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/compare/saw-palmetto-vs-beta-sitosterol";
const TITLE = "Saw Palmetto vs Beta-Sitosterol for Prostate | DoseRoutine";
const DESC =
  "Saw palmetto vs beta-sitosterol compared: mechanism, evidence for BPH urinary symptoms, typical doses, side effects and how they stack together.";

export const FAQS = [
  {
    q: "Which works faster for urinary symptoms?",
    a: "Beta-sitosterol usually shows benefit in 4–6 weeks. Saw palmetto typically needs 8–12 weeks before urinary flow and nocturia improve.",
  },
  {
    q: "Can I take them together?",
    a: "Yes — most quality prostate formulas combine both, plus pygeum and stinging nettle root. The mechanisms don't overlap much.",
  },
  {
    q: "Which has stronger evidence?",
    a: "Beta-sitosterol has more consistently positive Cochrane data for urinary symptom improvement. Saw palmetto's results depend heavily on the extract used (Permixon-brand shows benefit; the generic STEP-trial extract did not).",
  },
  {
    q: "Will either shrink my prostate?",
    a: "No. Both improve symptoms without measurable prostate shrinkage — that's what finasteride does.",
  },
  {
    q: "Do they affect PSA readings?",
    a: "Saw palmetto can slightly lower PSA. Tell your doctor what you take before any PSA test.",
  },
];

export const Route = createFileRoute("/library/compare/saw-palmetto-vs-beta-sitosterol")({
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
      { property: "og:image", content: "https://doseroutine.com/og/compare-saw-beta.jpg" },
      {
        property: "og:image:secure_url",
        content: "https://doseroutine.com/og/compare-saw-beta.jpg",
      },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "DoseRoutine — Saw Palmetto vs Beta-Sitosterol comparison",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: "https://doseroutine.com/og/compare-saw-beta.jpg" },
      { name: "twitter:image:alt", content: "DoseRoutine — Saw Palmetto vs Beta-Sitosterol" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/compare/saw-palmetto-vs-beta-sitosterol"),
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
          image: ["https://doseroutine.com/og/compare-saw-beta.jpg"],
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
              name: "Prostate Health",
              item: "https://doseroutine.com/library/prostate-health",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Saw Palmetto vs Beta-Sitosterol",
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
            Saw Palmetto vs Beta-Sitosterol
          </h1>
          <p className="text-lg text-muted-foreground">
            The two most-used non-drug options for BPH-related urinary symptoms compared side by
            side — mechanism, evidence, dose, and how to stack them.
          </p>
        </header>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="h-4 w-4 text-primary" /> Mechanism at a glance
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold">Saw Palmetto</h2>
              <p className="text-sm text-muted-foreground">
                Standardized berry extract that inhibits prostate 5-alpha reductase and modulates
                local androgen signaling.
              </p>
            </div>
            <div>
              <h2 className="text-base font-semibold">Beta-Sitosterol</h2>
              <p className="text-sm text-muted-foreground">
                Plant sterol that reduces prostate inflammation and modulates 5-alpha reductase.
                Also lowers LDL cholesterol.
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
                  <th className="py-2 pr-4">Saw Palmetto</th>
                  <th className="py-2">Beta-Sitosterol</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-2 [&_td]:pr-4">
                <tr className="border-b">
                  <td>Typical dose</td>
                  <td>320 mg/day</td>
                  <td>60–130 mg/day (prostate)</td>
                </tr>
                <tr className="border-b">
                  <td>Time to effect</td>
                  <td>8–12 weeks</td>
                  <td>4–6 weeks</td>
                </tr>
                <tr className="border-b">
                  <td>Cochrane verdict</td>
                  <td>Mixed (extract-dependent)</td>
                  <td>Positive</td>
                </tr>
                <tr className="border-b">
                  <td>Extra benefit</td>
                  <td>Possible mild hair-loss support</td>
                  <td>Lowers LDL at 2 g/day</td>
                </tr>
                <tr>
                  <td>Best for</td>
                  <td>Overall urinary symptom score</td>
                  <td>Peak flow + LDL combo</td>
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
            <li>Both are very well tolerated; mild GI upset is the most common complaint.</li>
            <li>Saw palmetto can affect PSA — tell your doctor before testing.</li>
            <li>
              Rule out prostatitis and prostate cancer before treating "BPH" symptoms with anything.
            </li>
          </ul>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Should you stack them?</h2>
          <p className="text-sm text-muted-foreground">
            Yes — most high-quality European BPH formulas combine saw palmetto + beta-sitosterol +
            pygeum + stinging nettle root. The mechanisms are complementary and stacking is a
            reasonable first step before prescription options.
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
            <p className="font-semibold">Track your prostate stack in DoseRoutine</p>
            <p className="text-muted-foreground">
              Log both compounds, set PSA-test reminders, share results with your doctor.
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
            <Link to="/library/prostate-health" className="text-primary hover:underline">
              Prostate Health hub
            </Link>{" "}
            ·{" "}
            <Link to="/library/guides/bph-natural-support" className="text-primary hover:underline">
              BPH natural support guide
            </Link>{" "}
            ·{" "}
            <Link to="/library/mens-health" className="text-primary hover:underline">
              Men's Health
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Educational, not medical advice. Talk to a licensed clinician before starting any prostate
          protocol.
        </p>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/compare/saw-palmetto-vs-beta-sitosterol" />
      </article>
    </main>
  );
}
