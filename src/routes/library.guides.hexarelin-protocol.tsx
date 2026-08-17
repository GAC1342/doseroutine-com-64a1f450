import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Info, Syringe } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";

const CANONICAL = "https://doseroutine.com/library/guides/hexarelin-protocol";
const TITLE = "Hexarelin Protocol: Dosing, Benefits & Safety | DoseRoutine";
const DESC =
  "How Hexarelin works as a GH secretagogue: realistic benefits, typical dosing, desensitisation and cortisol risks, and how it compares to Ipamorelin.";

const FAQS = [
  {
    q: "What is Hexarelin?",
    a: "Hexarelin is a synthetic hexapeptide growth hormone secretagogue (GHS) — a ghrelin-receptor (GHS-R1a) agonist that triggers a pulse of growth hormone release from the pituitary. It is a research peptide, not an approved medicine in the US, UK, EU, Canada or Australia.",
  },
  {
    q: "How does Hexarelin differ from Ipamorelin?",
    a: "Both hit the same GHS-R1a receptor, but Hexarelin produces a stronger GH pulse while also raising cortisol and prolactin and desensitising faster. Ipamorelin is far more selective — a weaker pulse with essentially no cortisol or prolactin bump. Most people using GHS long-term choose Ipamorelin for that reason.",
  },
  {
    q: "What are typical Hexarelin doses?",
    a: "Protocols reported in the literature and in community use sit around 100 mcg per administration, 1–3 times daily, subcutaneously, on an empty stomach. Cycle lengths are usually kept short (roughly 4–8 weeks) specifically because receptor desensitisation blunts the GH response with continuous use. These are reported figures, not a recommendation — Hexarelin is not an approved medicine and dosing should never be self-directed.",
  },
  {
    q: "Why does Hexarelin stop working?",
    a: "GHS-R1a downregulates with repeated stimulation. Studies of continuous Hexarelin administration show a substantially attenuated GH response within a few weeks. That desensitisation is the single biggest practical limitation of the compound and the reason cycles are kept short with washout periods.",
  },
  {
    q: "Does Hexarelin raise cortisol and prolactin?",
    a: "Yes. Unlike selective secretagogues, Hexarelin stimulates ACTH/cortisol and prolactin release alongside GH, particularly at higher doses. Elevated prolactin can cause low libido, gynecomastia risk and mood changes; chronically elevated cortisol works against the body-composition goals people take it for.",
  },
  {
    q: "Do you take Hexarelin with food?",
    a: "Reported protocols use a fasted window — roughly 20–30 minutes before or at least 2 hours after eating, especially away from fat and carbohydrate. Elevated blood glucose and free fatty acids blunt GH release, so a dose taken right after a meal wastes the pulse.",
  },
  {
    q: "Is Hexarelin stacked with CJC-1295?",
    a: "It's a commonly reported pairing — a GHRH analogue (CJC-1295 or Sermorelin) plus a GHS like Hexarelin acts on two separate pathways and produces a larger combined pulse than either alone. It also compounds the side-effect and desensitisation profile, and stacking two unapproved research peptides multiplies the unknowns.",
  },
  {
    q: "Is Hexarelin legal?",
    a: "Hexarelin is not approved for human use by the FDA, EMA, MHRA or TGA and is sold as a research chemical. It is banned in sport under WADA's S2 category (peptide hormones and growth factors) and will show on a tested athlete's panel. Legality of possession varies by country.",
  },
  {
    q: "What monitoring makes sense?",
    a: "Anyone using a GH secretagogue should track fasting glucose and HbA1c (GH is diabetogenic), IGF-1, prolactin, and morning cortisol — with a baseline before starting. GH secretagogues can worsen insulin resistance and unmask impaired glucose tolerance.",
  },
  {
    q: "Who should avoid it entirely?",
    a: "Anyone with an active or prior malignancy, diabetes or impaired glucose tolerance, untreated pituitary disease, or who is pregnant or breastfeeding. GH and IGF-1 are growth signals — raising them with an undiagnosed tumour present is a serious risk.",
  },
];

const REFS = [
  {
    cite: "Ghigo E, Arvat E, Muccioli G, Camanni F. Growth hormone-releasing peptides. Eur J Endocrinol. 1997;136(5):445–460.",
    url: "https://pubmed.ncbi.nlm.nih.gov/9186262/",
  },
  {
    cite: "Imbimbo BP, Mant T, Edwards M, et al. Growth hormone-releasing activity of hexarelin in humans: a dose-response study. Eur J Clin Pharmacol. 1994;46(5):421–425.",
    url: "https://pubmed.ncbi.nlm.nih.gov/7957536/",
  },
  {
    cite: "Rahim A, O'Neill PA, Shalet SM. Growth hormone status during long-term hexarelin therapy. J Clin Endocrinol Metab. 1998;83(5):1644–1649.",
    url: "https://pubmed.ncbi.nlm.nih.gov/9589671/",
  },
  {
    cite: "Arvat E, Di Vito L, Maccagno B, et al. Effects of GHRP-2 and hexarelin on ACTH, cortisol and GH secretion in humans. J Endocrinol Invest. 1997;20(7):387–393.",
    url: "https://pubmed.ncbi.nlm.nih.gov/9309537/",
  },
  {
    cite: "Sigalos JT, Pastuszak AW. The Safety and Efficacy of Growth Hormone Secretagogues. Sex Med Rev. 2018;6(1):45–53.",
    url: "https://pubmed.ncbi.nlm.nih.gov/28691628/",
  },
  {
    cite: "World Anti-Doping Agency. The Prohibited List — S2: Peptide Hormones, Growth Factors, Related Substances and Mimetics.",
    url: "https://www.wada-ama.org/en/prohibited-list",
  },
];

const BENEFITS = [
  "Strong, short-lived pulse of endogenous growth hormone (does not replace pituitary function)",
  "Downstream IGF-1 rise with repeat administration",
  "Reported improvements in recovery and sleep depth (largely subjective, poorly controlled data)",
  "Cardioprotective effects in animal models — not demonstrated as a clinical benefit in healthy humans",
  "Appetite stimulation via ghrelin-receptor agonism, which some users want and others don't",
];

const RISKS = [
  "Receptor desensitisation — GH response fades within weeks of continuous use",
  "Cortisol and prolactin elevation, unlike selective secretagogues such as Ipamorelin",
  "Reduced insulin sensitivity and higher fasting glucose",
  "Water retention, joint aches, carpal-tunnel-type symptoms — classic GH excess signs",
  "Numbness or tingling in the hands, and lethargy at higher doses",
  "Unregulated supply chain: purity, dosing accuracy and sterility are not guaranteed",
];

export const Route = createFileRoute("/library/guides/hexarelin-protocol")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "author", content: "DoseRoutine" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "DoseRoutine" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/guides/hexarelin-protocol"),
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
          inLanguage: "en",
          author: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine" },
          publisher: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine",
            logo: { "@type": "ImageObject", url: "https://doseroutine.com/icon-512.png" },
          },
          datePublished: "2026-07-29",
          dateModified: "2026-07-29",
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
              name: "Peptides",
              item: "https://doseroutine.com/library/peptide-stacks-for-muscle-growth",
            },
            { "@type": "ListItem", position: 3, name: "Hexarelin Protocol", item: CANONICAL },
          ],
        }),
      },
    ],
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
            Hexarelin Protocol, Benefits &amp; Safety
          </h1>
          <p className="text-lg text-muted-foreground">
            Hexarelin is one of the strongest growth hormone secretagogues studied in humans — and
            one of the fastest to stop working. Here's the mechanism, what the research actually
            shows, the reported dosing patterns, and the trade-offs that get glossed over.
          </p>
        </header>

        <Card className="p-5 space-y-2 border-l-4 border-l-warning">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-warning" /> Not an approved medicine
          </div>
          <p className="text-sm text-muted-foreground">
            Hexarelin has no marketing authorisation from the FDA, EMA, MHRA or TGA. It is sold as a
            research chemical, banned in tested sport under WADA category S2, and should only be
            considered under the supervision of a physician who knows your labs and history. This
            page is educational reference material, not a protocol to follow.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">How it works: the GH secretagogue pathway</h2>
          <p className="text-sm text-muted-foreground">
            Hexarelin is a synthetic hexapeptide that binds GHS-R1a — the ghrelin receptor — in the
            pituitary and hypothalamus. Activating it triggers a pulse of the body's own growth
            hormone, rather than injecting GH directly. Because the pituitary is still doing the
            work, the release stays pulsatile and remains under some feedback control, which is the
            main argument people make for secretagogues over exogenous HGH.
          </p>
          <p className="text-sm text-muted-foreground">
            There are two distinct levers on GH release. GHRH analogues (Sermorelin, CJC-1295)
            increase the size of the natural pulse. GHS compounds (Hexarelin, Ipamorelin, GHRP-2,
            GHRP-6, and the oral MK-677) act on the ghrelin pathway and simultaneously suppress
            somatostatin, the brake on GH release. They're synergistic, which is why stacking one of
            each is the most commonly reported approach — and also why side effects compound.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Hexarelin vs Ipamorelin vs CJC-1295</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Compound</th>
                  <th className="py-2 pr-3 font-semibold">Class</th>
                  <th className="py-2 pr-3 font-semibold">GH pulse</th>
                  <th className="py-2 font-semibold">Cortisol / prolactin</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-3 font-medium text-foreground">Hexarelin</td>
                  <td className="py-2 pr-3">GHS (ghrelin agonist)</td>
                  <td className="py-2 pr-3">Strongest</td>
                  <td className="py-2">Raises both</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-3 font-medium text-foreground">Ipamorelin</td>
                  <td className="py-2 pr-3">Selective GHS</td>
                  <td className="py-2 pr-3">Moderate</td>
                  <td className="py-2">Essentially neutral</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-3 font-medium text-foreground">GHRP-2 / GHRP-6</td>
                  <td className="py-2 pr-3">GHS</td>
                  <td className="py-2 pr-3">Strong</td>
                  <td className="py-2">Mild to moderate rise</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-medium text-foreground">CJC-1295 / Sermorelin</td>
                  <td className="py-2 pr-3">GHRH analogue</td>
                  <td className="py-2 pr-3">Amplifies natural pulse</td>
                  <td className="py-2">Neutral</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            The short version: Hexarelin buys you the biggest pulse and pays for it with cortisol,
            prolactin and rapid tolerance. That trade is why most long-run protocols in circulation
            have moved toward Ipamorelin.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Reported benefits — and how solid the evidence is</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {BENEFITS.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Human trials of Hexarelin largely measured GH and IGF-1 response, not body composition,
            strength or longevity outcomes. Claims about fat loss and muscle gain are extrapolated
            from what GH does, not from controlled trials of this peptide in healthy adults.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Reported dosing protocols</h2>
          <p className="text-sm text-muted-foreground">
            Documented for reference only. Figures below reflect what appears in the published
            dose-response literature and in circulating community protocols — not a recommendation.
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              <strong>Amount:</strong> around 100 mcg per administration; higher doses raise
              cortisol and prolactin without a proportional GH gain.
            </li>
            <li>
              <strong>Frequency:</strong> 1–3 times daily, spaced roughly 3+ hours apart.
            </li>
            <li>
              <strong>Timing:</strong> fasted — about 20–30 minutes before eating, or 2+ hours
              after. Pre-bed dosing targets the natural nocturnal GH pulse.
            </li>
            <li>
              <strong>Route:</strong> subcutaneous injection with an insulin syringe, rotating
              sites.
            </li>
            <li>
              <strong>Cycle length:</strong> commonly 4–8 weeks with an equal washout, because of
              desensitisation.
            </li>
            <li>
              <strong>Reconstitution:</strong> bacteriostatic water; store reconstituted vials
              refrigerated and respect the beyond-use date.
            </li>
          </ul>
        </section>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Syringe className="h-4 w-4 text-primary" /> Get the reconstitution maths right
          </div>
          <p className="text-sm text-muted-foreground">
            Microgram dosing from a lyophilised vial is where most errors happen — a 10× mistake on
            a 100 mcg dose is easy and consequential. Enter your vial strength and diluent volume
            and get the exact units to draw.
          </p>
          <Link
            to="/reconstitution-calculator"
            className="inline-flex items-center gap-1 text-primary font-medium text-sm"
          >
            Open reconstitution calculator <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Risks and side effects</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {RISKS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Monitoring that actually matters</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              <strong>Before starting:</strong> fasting glucose, HbA1c, IGF-1, prolactin, morning
              cortisol, full blood count.
            </li>
            <li>
              <strong>During:</strong> repeat fasting glucose and IGF-1 at 4–6 weeks; IGF-1 above
              the age-adjusted reference range is a stop signal.
            </li>
            <li>
              <strong>Symptoms to act on:</strong> persistent hand numbness, swelling, new joint
              pain, unusual thirst or urination, nipple tenderness or discharge.
            </li>
          </ul>
        </section>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="text-sm font-semibold">Check interactions before stacking</div>
          <p className="text-sm text-muted-foreground">
            GH secretagogues interact with insulin and diabetes medication, glucocorticoids, thyroid
            hormone and other peptides in a stack. Run the full combination before you add anything.
          </p>
          <Link
            to="/interaction-checker"
            className="inline-flex items-center gap-1 text-primary font-medium text-sm"
          >
            Open interaction checker <ArrowRight className="h-4 w-4" />
          </Link>
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

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">References &amp; sources</h2>
          <p className="text-xs text-muted-foreground">
            Peer-reviewed endocrinology literature and anti-doping guidance cited on this page. Last
            reviewed 2026-07-29.
          </p>
          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-2">
            {REFS.map((r) => (
              <li key={r.url}>
                {r.cite}{" "}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {r.url}
                </a>
              </li>
            ))}
          </ol>
        </section>

        <Card className="p-5 flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Track peptide cycles properly in DoseRoutine</p>
            <p className="text-muted-foreground">
              Reconstitution maths, vial inventory, injection-site rotation, cycle windows and
              blood-work tracking in one place.
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
              to="/library/peptide-stacks-for-muscle-growth"
              className="text-primary hover:underline"
            >
              Peptide stacks for muscle growth
            </Link>{" "}
            ·{" "}
            <Link to="/library/compare/bpc-157-vs-tb-500" className="text-primary hover:underline">
              BPC-157 vs TB-500
            </Link>{" "}
            ·{" "}
            <Link to="/reconstitution-calculator" className="text-primary hover:underline">
              Reconstitution calculator
            </Link>{" "}
            ·{" "}
            <Link to="/dosage-units-guide" className="text-primary hover:underline">
              Dosage units guide
            </Link>{" "}
            ·{" "}
            <Link to="/library" className="text-primary hover:underline">
              Compound library
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Educational reference only, not medical advice. Hexarelin is not an approved medicine — do
          not start, stop or combine any peptide protocol without a qualified physician.
        </p>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/guides/hexarelin-protocol" />
      </article>
    </main>
  );
}
