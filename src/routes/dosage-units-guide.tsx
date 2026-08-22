import { faqAnchorId } from "@/lib/faq-snippet";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Beaker, Droplets, Ruler, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";

export const CANONICAL = "https://doseroutine.com/dosage-units-guide";
const TITLE = "Dosage Units Guide — U-100, U-40 and BAC Water";
const DESC =
  "Understand U-100 vs U-40 insulin syringes, sterile vs bacteriostatic water, and how to read syringe units before you measure any dose.";

export const FAQ = [
  {
    q: "What is the difference between a U-100 and U-40 insulin syringe?",
    a: "A U-100 syringe holds 100 units per 1 mL. A U-40 syringe holds 40 units per 1 mL. Using the wrong syringe changes your dose by up to 60%. Nearly all human insulin and peptide protocols in the US use U-100. Check the barrel label before every injection.",
  },
  {
    q: "Can I use sterile water instead of bacteriostatic water?",
    a: "Sterile water contains no preservative, so a reconstituted vial must be used within 24 hours. Bacteriostatic water contains 0.9% benzyl alcohol which inhibits bacterial growth and extends the usable window to roughly 28 days refrigerated. For multi-dose peptide vials, bacteriostatic water is the standard choice.",
  },
  {
    q: "How do I convert milligrams to insulin syringe units?",
    a: "Find your concentration in mg/mL (vial mg divided by BAC water mL added). Divide your dose in mg by that concentration to get mL, then multiply by 100 for a U-100 syringe or by 40 for a U-40 syringe.",
  },
  {
    q: "How long does a reconstituted peptide last?",
    a: "Most reconstituted peptides are considered stable for about 28 days when refrigerated at 2–8°C (36–46°F). Keep vials upright, protected from light, and never freeze after reconstitution unless the manufacturer states it is safe.",
  },
  {
    q: "What size syringe should I buy for peptides?",
    a: 'For most peptide protocols, a 0.5 mL or 1 mL U-100 insulin syringe with a 29–31 gauge, 8 mm (5/16") needle works well for subcutaneous injection. A 0.3 mL U-100 syringe gives finer control for very small doses under 30 units.',
  },
];

export const Route = createFileRoute("/dosage-units-guide")({
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
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/dosage-units-guide")],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              speakable: {
                "@type": "SpeakableSpecification",
                cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
              },
              "@id": `${CANONICAL}#article`,
              headline: "Dosage Units Guide: U-100 vs U-40, Sterile Water & Reconstitution Basics",
              description: DESC,
              url: CANONICAL,
              inLanguage: "en",
              datePublished: "2026-07-24",
              dateModified: "2026-07-25",
              author: {
                "@type": "Organization",
                "@id": "https://doseroutine.com/#organization",
                name: "DoseRoutine",
                url: "https://doseroutine.com",
              },
              publisher: {
                "@type": "Organization",
                "@id": "https://doseroutine.com/#organization",
                name: "DoseRoutine",
                url: "https://doseroutine.com",
                logo: { "@type": "ImageObject", url: "https://doseroutine.com/favicon.png" },
              },
              image: ["https://doseroutine.com/og-image.png"],
              mainEntityOfPage: { "@id": `${CANONICAL}#webpage` },
              isPartOf: { "@id": "https://doseroutine.com/#website" },
            },
            {
              "@type": "WebPage",
              "@id": `${CANONICAL}#webpage`,
              url: CANONICAL,
              name: TITLE,
              description: DESC,
              inLanguage: "en",
              isPartOf: { "@id": "https://doseroutine.com/#website" },
              breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${CANONICAL}#breadcrumb`,
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://doseroutine.com/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Calculators",
                  item: "https://doseroutine.com/calculator",
                },
                { "@type": "ListItem", position: 3, name: "Dosage Units Guide", item: CANONICAL },
              ],
            },
            {
              "@type": "FAQPage",
              "@id": `${CANONICAL}#faq`,
              url: CANONICAL,
              inLanguage: "en",
              isPartOf: { "@id": "https://doseroutine.com/#website" },
              mainEntity: FAQ.map((f) => ({
                "@type": "Question",
                "@id": `${CANONICAL}#${faqAnchorId(f.q)}`,
                url: `${CANONICAL}#${faqAnchorId(f.q)}`,
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a, inLanguage: "en" },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: DosageUnitsGuidePage,
});

function DosageUnitsGuidePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background">
      <PublicBackHeader />
      {/* Hero */}
      <section className="border-b border-border bg-muted/30 px-5 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Ruler className="h-4 w-4" />
            <span>Dosing basics</span>
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Dosage Units Guide
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            U-100 vs U-40 syringes, sterile vs bacteriostatic water, and how peptide reconstitution
            actually works — in plain English.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/peptide-dosage-calculator">Open the calculator</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/calculators">All DoseRoutine calculators</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* U-100 vs U-40 */}
      <section className="border-b border-border px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <Syringe className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Syringes</span>
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">U-100 vs U-40: what the numbers mean</h2>
          <p className="mt-4 text-muted-foreground">
            The <strong>U number</strong> is the number of units per milliliter the syringe barrel
            is calibrated for. A <strong>U-100</strong> syringe reads 100 units per 1 mL. A{" "}
            <strong>U-40</strong> syringe reads 40 units per 1 mL. Same volume of liquid, different
            unit scale.
          </p>
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-semibold">Syringe</th>
                  <th className="p-3 text-left font-semibold">Units per 1 mL</th>
                  <th className="p-3 text-left font-semibold">0.1 mL equals</th>
                  <th className="p-3 text-left font-semibold">Common use</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium">U-100</td>
                  <td className="p-3">100 units</td>
                  <td className="p-3">10 units</td>
                  <td className="p-3">Human insulin, most peptides, GLP-1s</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium">U-40</td>
                  <td className="p-3">40 units</td>
                  <td className="p-3">4 units</td>
                  <td className="p-3">Veterinary insulin (older protocols)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              <strong>Mixing them up under-doses by 60%.</strong> Drawing 20 units on a U-40 syringe
              from a U-100 concentration delivers only about 8 units of medicine. Always confirm the
              syringe label before every injection.
            </p>
          </div>
        </div>
      </section>

      {/* Water types */}
      <section className="border-b border-border bg-card px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <Droplets className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Diluents</span>
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">Sterile water vs bacteriostatic water</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-5">
              <h3 className="font-semibold">Bacteriostatic water (BAC water)</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Contains 0.9% benzyl alcohol, which inhibits bacterial growth. Standard choice for
                multi-dose peptide vials. Reconstituted vials are typically usable for around{" "}
                <strong>28 days refrigerated</strong>.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-5">
              <h3 className="font-semibold">Sterile water for injection</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No preservative. Use only for single-dose reconstitution or when benzyl alcohol is
                contraindicated (e.g. neonates). A reconstituted single-dose vial should be used{" "}
                <strong>within 24 hours</strong>.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            <strong>Never use tap, distilled, or spring water.</strong> They are not sterile and can
            introduce contaminants directly into your bloodstream.
          </p>
        </div>
      </section>

      {/* Reconstitution basics */}
      <section className="border-b border-border px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <Beaker className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Reconstitution</span>
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">Reconstitution basics</h2>
          <p className="mt-4 text-muted-foreground">
            Reconstitution means mixing freeze-dried peptide powder with a sterile diluent so it
            becomes injectable. The amount of water you add sets the <strong>concentration</strong>,
            which determines how many units you draw per dose.
          </p>
          <ol className="mt-6 space-y-4 text-sm">
            <li className="rounded-lg border border-border p-4">
              <div className="font-semibold">1. Choose a BAC water volume</div>
              <p className="mt-1 text-muted-foreground">
                Common: 2 mL of BAC water for a 5 mg vial → 2.5 mg/mL. More water = weaker
                concentration = more units per dose (easier to measure).
              </p>
            </li>
            <li className="rounded-lg border border-border p-4">
              <div className="font-semibold">2. Add water slowly down the vial wall</div>
              <p className="mt-1 text-muted-foreground">
                Do not spray directly onto the powder — peptides are fragile. Let it dissolve; swirl
                gently, never shake.
              </p>
            </li>
            <li className="rounded-lg border border-border p-4">
              <div className="font-semibold">3. Calculate units per dose</div>
              <p className="mt-1 text-muted-foreground">
                dose (mg) ÷ concentration (mg/mL) × 100 = units on a U-100 syringe. Or skip the
                math: paste your numbers into the{" "}
                <Link to="/peptide-dosage-calculator" className="text-primary underline">
                  peptide dosage calculator
                </Link>
                .
              </p>
            </li>
            <li className="rounded-lg border border-border p-4">
              <div className="font-semibold">4. Store correctly</div>
              <p className="mt-1 text-muted-foreground">
                Refrigerate at 2–8°C, upright, out of light. Label the vial with the date mixed.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* Worked example */}
      <section className="border-b border-border bg-muted/30 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Worked example: 5 mg vial, 250 mcg dose
          </h2>
          <div className="mt-4 rounded-lg border border-border bg-background p-5 text-sm">
            <ul className="space-y-2">
              <li>
                Vial: <strong>5 mg</strong> peptide powder
              </li>
              <li>
                BAC water added: <strong>2 mL</strong>
              </li>
              <li>
                Concentration: 5 mg ÷ 2 mL = <strong>2.5 mg/mL</strong> (2500 mcg/mL)
              </li>
              <li>
                Target dose: <strong>250 mcg</strong> (0.25 mg)
              </li>
              <li>
                Volume: 0.25 mg ÷ 2.5 mg/mL = <strong>0.1 mL</strong>
              </li>
              <li>
                On a U-100 syringe: 0.1 mL × 100 = <strong>10 units</strong>
              </li>
              <li>
                Doses per vial: 5 mg ÷ 0.25 mg = <strong>20 doses</strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Unit conversion reference — unique to this guide */}
      <section className="border-b border-border px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold sm:text-3xl">
            mg, mcg and IU: converting between them
          </h2>
          <p className="mt-4 text-muted-foreground">
            Milligrams and micrograms are pure weight, so they convert with arithmetic alone: 1 mg
            is 1000 mcg, and a 250 mcg dose is 0.25 mg. International units are different. An IU is
            a measure of biological activity, defined separately for each substance, so there is no
            universal IU-to-milligram factor. HCG, vitamin D and growth hormone each have their own
            conversion, and applying one substance's factor to another produces a dose that is wrong
            by an order of magnitude rather than a rounding error.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Common dosing unit conversions used with insulin syringes
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    You have
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    You want
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Conversion
                  </th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    Milligrams (mg)
                  </th>
                  <td className="py-2 pr-4">Micrograms (mcg)</td>
                  <td className="py-2">Multiply by 1000</td>
                </tr>
                <tr className="border-b border-border/60">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    Milliliters (mL)
                  </th>
                  <td className="py-2 pr-4">U-100 syringe units</td>
                  <td className="py-2">Multiply by 100</td>
                </tr>
                <tr className="border-b border-border/60">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    Milliliters (mL)
                  </th>
                  <td className="py-2 pr-4">U-40 syringe units</td>
                  <td className="py-2">Multiply by 40</td>
                </tr>
                <tr className="border-b border-border/60">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    Dose (mg) + concentration (mg/mL)
                  </th>
                  <td className="py-2 pr-4">Volume to draw (mL)</td>
                  <td className="py-2">Divide dose by concentration</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-4 font-normal">
                    International units (IU)
                  </th>
                  <td className="py-2 pr-4">Milligrams (mg)</td>
                  <td className="py-2">Substance-specific — check the label, never assume</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            One habit prevents most measurement mistakes: write the concentration on the vial in
            marker the moment it is mixed. Every later conversion on this page needs that one
            number, and it cannot be recovered by looking at the vial afterwards.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border px-5 py-12" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <h2 id="faq-heading" className="text-2xl font-bold sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-6 space-y-4">
            {FAQ.map((f) => (
              <details
                key={f.q}
                id={faqAnchorId(f.q)}
                className="group scroll-mt-24 rounded-lg border border-border p-4"
              >
                <summary className="cursor-pointer font-semibold group-open:mb-2">{f.q}</summary>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="border-b border-border px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-xl font-semibold">Use it with a calculator</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/peptide-dosage-calculator"
              className="rounded-lg border border-border p-4 hover:border-primary"
            >
              <div className="font-semibold">Peptide Dosage Calculator</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Convert any peptide dose to exact U-100 syringe units.
              </p>
            </Link>
            <Link
              to="/peptide-reconstitution-calculator"
              className="rounded-lg border border-border p-4 hover:border-primary"
            >
              <div className="font-semibold">Peptide Reconstitution Calculator</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Plan BAC water volume, mg/mL and doses per vial.
              </p>
            </Link>
            <Link
              to="/trt-dosage-calculator"
              className="rounded-lg border border-border p-4 hover:border-primary"
            >
              <div className="font-semibold">TRT Dosage Calculator</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Weekly testosterone mg to per-shot mL and units.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <RelatedLinks currentPath="/dosage-units-guide" kind="calculators" />
      {/* Footer */}
      <footer className="border-t border-border bg-card px-5 py-8">
        <div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} DoseRoutine. This guide is for educational purposes
            only and does not constitute medical advice.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/legal" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/medical-disclaimer" className="hover:text-foreground">
              Medical Disclaimer
            </Link>
          </div>
        </div>
      </footer>
      <AttributionFooter sourceUrl={CANONICAL} />
    </main>
  );
}
