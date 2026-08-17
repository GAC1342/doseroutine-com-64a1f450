import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, ShieldAlert, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { RelatedLinks } from "@/components/related-links";
import { AttributionFooter } from "@/components/attribution-footer";

const CANONICAL = "https://doseroutine.com/library/compare/semaglutide-vs-tirzepatide";
const TITLE = "Semaglutide vs Tirzepatide: Mechanism, Dosing & Side Effects";
const DESC =
  "Semaglutide vs Tirzepatide compared: GLP-1 vs dual GIP/GLP-1 mechanism, typical research dosages, weight loss data and side effect profiles.";
const OG_IMAGE_ALT =
  "Semaglutide vs Tirzepatide comparison — mechanism, dosing and side effects by DoseRoutine";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the main difference between semaglutide and tirzepatide?",
    a: "Semaglutide is a single GLP-1 receptor agonist. Tirzepatide is a dual agonist that activates both GIP and GLP-1 receptors, which appears to produce greater average weight loss in clinical trials.",
  },
  {
    q: "Which produces more weight loss, semaglutide or tirzepatide?",
    a: "In head-to-head data (SURMOUNT and STEP program comparisons), tirzepatide showed higher average weight reduction — roughly 20–22% at the top dose versus about 15% for semaglutide 2.4 mg over 68–72 weeks. Individual response varies.",
  },
  {
    q: "How are they dosed?",
    a: "Both are weekly subcutaneous injections. Semaglutide titrates 0.25 → 0.5 → 1.0 → 1.7 → 2.4 mg weekly. Tirzepatide titrates 2.5 → 5 → 7.5 → 10 → 12.5 → 15 mg weekly, moving up every 4 weeks as tolerated.",
  },
  {
    q: "Do they share the same side effects?",
    a: "Yes — the most common are nausea, diarrhea, constipation and reduced appetite, mostly during titration. Both carry a boxed warning for thyroid C-cell tumors in rodents and are contraindicated with a personal or family history of medullary thyroid carcinoma or MEN 2.",
  },
  {
    q: "Can you switch from semaglutide to tirzepatide?",
    a: "Switching is common but should be done under a prescriber's guidance. A typical approach is to restart at the lowest tirzepatide dose (2.5 mg) after the last semaglutide dose has cleared, then titrate up.",
  },
];

export const Route = createFileRoute("/library/compare/semaglutide-vs-tirzepatide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:image", content: "https://doseroutine.com/og/compare-sema-tirz.jpg" },
      {
        property: "og:image:secure_url",
        content: "https://doseroutine.com/og/compare-sema-tirz.jpg",
      },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: OG_IMAGE_ALT },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "article:section", content: "Peptides" },
      { property: "article:tag", content: "Semaglutide" },
      { property: "article:tag", content: "Tirzepatide" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: "https://doseroutine.com/og/compare-sema-tirz.jpg" },
      { name: "twitter:image:alt", content: OG_IMAGE_ALT },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/compare/semaglutide-vs-tirzepatide"),
    ],
    scripts: [
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
          image: ["https://doseroutine.com/og/compare-sema-tirz.jpg"],
          mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
          datePublished: "2026-07-27",
          dateModified: "2026-07-27",
          inLanguage: "en",
          author: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine", url: "https://doseroutine.com" },
          publisher: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine",
            url: "https://doseroutine.com",
            logo: { "@type": "ImageObject", url: "https://doseroutine.com/icon-512.png" },
          },
          about: [
            { "@type": "DefinedTerm", name: "Semaglutide" },
            { "@type": "DefinedTerm", name: "Tirzepatide" },
          ],
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
              name: "Comparisons",
              item: "https://doseroutine.com/compare",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Semaglutide vs Tirzepatide",
              item: CANONICAL,
            },
          ],
        }),
      },
    ],
  }),
  component: SemaVsTirzePage,
});

function SemaVsTirzePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Semaglutide vs Tirzepatide
          </h1>
          <p className="text-lg text-muted-foreground">
            A plain-English comparison of the two most-researched GLP-1 based protocols: how they
            work, how they're dosed, what the trial data shows, and how side effects differ.
          </p>
        </header>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="h-4 w-4 text-primary" /> Mechanism at a glance
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold">Semaglutide</h2>
              <p className="text-sm text-muted-foreground">
                Single GLP-1 receptor agonist. Slows gastric emptying, boosts glucose-dependent
                insulin release and reduces appetite via CNS GLP-1 signaling.
              </p>
            </div>
            <div>
              <h2 className="text-base font-semibold">Tirzepatide</h2>
              <p className="text-sm text-muted-foreground">
                Dual GIP + GLP-1 receptor agonist. Adds GIP activity, which in clinical data
                amplifies weight loss and glycemic control beyond GLP-1 alone.
              </p>
            </div>
          </div>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Typical research dosing</h2>
          <p className="text-sm text-muted-foreground">
            Both are subcutaneous weekly injections, titrated slowly to minimize GI side effects.
            Never self-adjust without a prescriber.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Week</th>
                  <th className="py-2 pr-4">Semaglutide</th>
                  <th className="py-2">Tirzepatide</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-2 [&_td]:pr-4">
                <tr className="border-b">
                  <td>1–4</td>
                  <td>0.25 mg</td>
                  <td>2.5 mg</td>
                </tr>
                <tr className="border-b">
                  <td>5–8</td>
                  <td>0.5 mg</td>
                  <td>5 mg</td>
                </tr>
                <tr className="border-b">
                  <td>9–12</td>
                  <td>1.0 mg</td>
                  <td>7.5 mg</td>
                </tr>
                <tr className="border-b">
                  <td>13–16</td>
                  <td>1.7 mg</td>
                  <td>10 mg</td>
                </tr>
                <tr className="border-b">
                  <td>17–20</td>
                  <td>2.4 mg</td>
                  <td>12.5 mg</td>
                </tr>
                <tr>
                  <td>21+</td>
                  <td>2.4 mg (maintenance)</td>
                  <td>15 mg (max)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Weight loss data</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Semaglutide 2.4 mg (STEP 1): ~14.9% mean body weight loss at 68 weeks.</li>
            <li>Tirzepatide 15 mg (SURMOUNT-1): ~20.9% mean body weight loss at 72 weeks.</li>
            <li>
              Head-to-head SURPASS-2 (T2D): tirzepatide 15 mg beat semaglutide 1 mg on A1C and
              weight.
            </li>
          </ul>
        </section>

        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-primary" /> Shared safety notes
          </div>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              Boxed warning: thyroid C-cell tumors in rodents — avoid with personal or family
              history of medullary thyroid carcinoma or MEN 2.
            </li>
            <li>
              Most common side effects: nausea, diarrhea, constipation, reduced appetite (usually
              worst during titration).
            </li>
            <li>
              Rare but serious: pancreatitis, gallbladder disease, kidney injury from dehydration.
            </li>
            <li>Not for use in pregnancy. Discuss any GLP-1 protocol with your prescriber.</li>
          </ul>
        </Card>

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
            <p className="font-semibold">Track your protocol in DoseRoutine</p>
            <p className="text-muted-foreground">
              Log weekly injections, titration steps and side effects so you can share a clean
              report with your prescriber.
            </p>
            <Link
              to="/auth"
              className="mt-2 inline-flex items-center gap-1 text-primary font-medium"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <RelatedLinks
          currentPath="/library/compare/semaglutide-vs-tirzepatide"
          kind="both"
          heading="Related guides"
        />

        <p className="text-xs text-muted-foreground">
          Educational content, not medical advice. Semaglutide and tirzepatide are prescription
          medications; discuss any protocol with a licensed clinician.
        </p>
      </article>
      <AttributionFooter sourceUrl={CANONICAL} />
    </main>
  );
}
