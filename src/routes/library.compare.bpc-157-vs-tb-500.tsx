import { cn } from "@/lib/utils";
import { faqAnchorId } from "@/lib/faq-snippet";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, ShieldAlert, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import {
  PeptideDosageGlossary,
  PEPTIDE_DOSAGE_GLOSSARY_JSONLD,
} from "@/components/peptide-dosage-glossary";
import { Card, cardClassName } from "@/components/ui/card";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/compare/bpc-157-vs-tb-500";
const TITLE = "BPC-157 vs TB-500: Mechanism, Recovery & Stack Guide";
const DESC =
  "BPC-157 vs TB-500 compared: how each peptide works, recovery evidence, typical dosing and how people stack them. Track both in DoseRoutine.";
const OG_IMAGE = "https://doseroutine.com/og/bpc-157-vs-tb-500.jpg";
const OG_IMAGE_ALT =
  "BPC-157 vs TB-500 comparison — mechanism, recovery and stacking guide by DoseRoutine";

export const FAQ_PAIRS: { q: string; a: string }[] = [
  {
    q: "What's the main difference between BPC-157 and TB-500?",
    a: "BPC-157 promotes healing largely by upregulating growth factors and angiogenesis (new blood vessel formation) at the site of injury. TB-500 (a synthetic fragment of Thymosin Beta-4) works systemically by sequestering G-actin, which drives cell migration, tissue remodeling and reduced inflammation.",
  },
  {
    q: "Can you stack BPC-157 and TB-500 together?",
    a: "In performance and recovery communities the two are commonly stacked because their mechanisms are complementary (localized angiogenesis + systemic cell migration). Neither is FDA-approved and no controlled human trials evaluate the combination — talk to a qualified clinician before combining research peptides.",
  },
  {
    q: "Which one works faster?",
    a: "BPC-157 has a short half-life (hours) and is typically dosed daily; anecdotal reports describe earlier localized improvement. TB-500 has a much longer half-life (days) and is commonly dosed 1–2× weekly, with more gradual systemic effects.",
  },
  {
    q: "Are BPC-157 and TB-500 legal?",
    a: "Both are unapproved by the FDA for human use and are banned by WADA for competitive athletes. Legal status varies by jurisdiction — they are typically sold as research chemicals, not medicines.",
  },
];

export const Route = createFileRoute("/library/compare/bpc-157-vs-tb-500")({
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
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:secure_url", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "640" },
      { property: "og:image:alt", content: OG_IMAGE_ALT },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "article:publisher", content: "https://doseroutine.com" },
      { property: "article:section", content: "Peptides" },
      { property: "article:tag", content: "BPC-157" },
      { property: "article:tag", content: "TB-500" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@doseroutine" },
      { name: "twitter:creator", content: "@doseroutine" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: OG_IMAGE_ALT },

      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/compare/bpc-157-vs-tb-500"),
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
          mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
          image: [OG_IMAGE],
          datePublished: "2026-07-25",
          dateModified: "2026-07-25",
          inLanguage: "en",
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
            logo: { "@type": "ImageObject", url: "https://doseroutine.com/icon-512.png" },
          },
          about: [
            { "@type": "DefinedTerm", name: "BPC-157" },
            { "@type": "DefinedTerm", name: "TB-500" },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://doseroutine.com/" },
            {
              "@type": "ListItem",
              position: 2,
              name: "Library",
              item: "https://doseroutine.com/library",
            },
            { "@type": "ListItem", position: 3, name: "BPC-157 vs TB-500", item: CANONICAL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_PAIRS.map((f) => ({
            "@type": "Question",
            "@id": `${CANONICAL}#${faqAnchorId(f.q)}`,
            url: `${CANONICAL}#${faqAnchorId(f.q)}`,
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          ...PEPTIDE_DOSAGE_GLOSSARY_JSONLD,
          "@id": `${CANONICAL}#glossary`,
          url: `${CANONICAL}#glossary`,
        }),
      },
    ]),
  }),
  component: ComparePage,
});

type Row = { label: string; bpc: string; tb: string };

const ROWS: Row[] = [
  {
    label: "Class",
    bpc: "Synthetic 15-amino-acid pentadecapeptide from gastric juice protein BPC",
    tb: "Synthetic 17-amino-acid fragment of Thymosin Beta-4 (Tβ4)",
  },
  {
    label: "Primary mechanism",
    bpc: "Upregulates VEGF and growth factors → angiogenesis + collagen synthesis at the injury site",
    tb: "Binds G-actin → drives cell migration, differentiation and tissue remodeling; anti-inflammatory",
  },
  {
    label: "Best-studied use cases",
    bpc: "Tendon, ligament and gut/GI healing; localized musculoskeletal recovery",
    tb: "Systemic soft-tissue recovery, muscle injury, cardiac tissue models",
  },
  {
    label: "Typical research dose",
    bpc: "200–500 mcg/day (SC or IM near site)",
    tb: "2–5 mg per injection, 1–2× per week",
  },
  {
    label: "Half-life",
    bpc: "Short (hours) — usually daily dosing",
    tb: "Long (days) — weekly dosing typical",
  },
  {
    label: "Onset",
    bpc: "Anecdotally faster for local injuries",
    tb: "Gradual, systemic",
  },
  {
    label: "Route",
    bpc: "Subcutaneous, intramuscular; oral forms exist but bioavailability is debated",
    tb: "Subcutaneous or intramuscular",
  },
  {
    label: "Common side effects",
    bpc: "Injection-site reaction; rare GI upset, dizziness, fatigue",
    tb: "Injection-site reaction; lethargy, transient head/muscle pain",
  },
  {
    label: "Regulatory status",
    bpc: "Not FDA-approved; WADA-prohibited",
    tb: "Not FDA-approved; WADA-prohibited",
  },
  {
    label: "Stacks well with",
    bpc: "TB-500, collagen peptides, GHK-Cu (skin/connective tissue)",
    tb: "BPC-157, IGF-1 LR3 (research contexts)",
  },
];

function ComparePage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"
          >
            <FlaskConical className="h-5 w-5 text-primary" />
            DoseRoutine
          </Link>
          <Link to="/library" className="text-sm text-muted-foreground hover:text-foreground">
            Library <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-5 pb-16 pt-8">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <Link to="/library" className="hover:text-foreground">
            Library
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">BPC-157 vs TB-500</span>
        </nav>

        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          BPC-157 vs TB-500
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          The two most-searched healing peptides in the performance and longevity space. They're
          often lumped together, but the mechanisms are meaningfully different — and that difference
          matters when you're choosing one, dosing it, or stacking them for an injury protocol.
        </p>

        <section
          className={cn(cardClassName, "mt-6 rounded-2xl p-5")}
          aria-labelledby="full-profiles"
        >
          <h2 id="full-profiles" className="font-display text-base font-semibold text-foreground">
            Read the full compound profiles
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This page compares the two peptides. For complete dosing, research, and safety details,
            see the individual library entries.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/library/$slug"
              params={{ slug: "bpc-157" }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              BPC-157 library page <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/library/$slug"
              params={{ slug: "tb-500" }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              TB-500 library page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section
          className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground"
          aria-labelledby="disclaimer"
        >
          <h2 id="disclaimer" className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Educational only
          </h2>
          <p className="text-muted-foreground">
            Neither BPC-157 nor TB-500 is FDA-approved for human use. Both are WADA-banned for
            competitive athletes. This page is a research summary, not a prescription. Talk to a
            licensed clinician before using either compound.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="mechanism">
          <h2 id="mechanism" className="font-display text-2xl font-semibold text-foreground">
            Mechanism: angiogenesis vs actin sequestering
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <article className={cn(cardClassName, "rounded-2xl p-5")}>
              <h3 className="font-display text-lg font-semibold text-foreground">
                <Link
                  to="/library/$slug"
                  params={{ slug: "bpc-157" }}
                  className="hover:text-primary hover:underline"
                >
                  BPC-157
                </Link>
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Derived from a protective sequence found in human gastric juice. In animal models it
                upregulates VEGF, boosts angiogenesis (new blood vessel formation) and accelerates
                collagen synthesis at the site of injection. Effects tend to be
                <strong className="text-foreground"> local</strong>: tendons, ligaments, gut lining,
                joints near the injection site.
              </p>
            </article>
            <article className={cn(cardClassName, "rounded-2xl p-5")}>
              <h3 className="font-display text-lg font-semibold text-foreground">
                <Link
                  to="/library/$slug"
                  params={{ slug: "tb-500" }}
                  className="hover:text-primary hover:underline"
                >
                  TB-500
                </Link>
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                A synthetic fragment of Thymosin Beta-4. Its headline mechanism is
                <strong className="text-foreground"> actin sequestering</strong> — binding G-actin
                so cells can migrate, differentiate and rebuild damaged tissue. Effects are
                <strong className="text-foreground"> systemic</strong>: it circulates and acts
                wherever cells need to move, which is why it's usually described as a whole-body
                recovery agent.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="side-by-side">
          <h2 id="side-by-side" className="font-display text-2xl font-semibold text-foreground">
            Side-by-side comparison
          </h2>
          <Card className="mt-3 overflow-x-auto rounded-2xl border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Attribute
                  </th>
                  <th scope="col" className="px-4 py-3">
                    BPC-157
                  </th>
                  <th scope="col" className="px-4 py-3">
                    TB-500
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.label} className="border-t border-border align-top">
                    <th scope="row" className="px-4 py-3 font-medium text-foreground">
                      {r.label}
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">{r.bpc}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.tb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section className="mt-8" aria-labelledby="which-to-pick">
          <h2 id="which-to-pick" className="font-display text-2xl font-semibold text-foreground">
            Which one fits your goal?
          </h2>
          <div className="mt-3 space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Choose BPC-157 if</strong> you're targeting a
              specific local injury (tendon, ligament, joint capsule, gut) and want daily,
              site-directed dosing.
            </p>
            <p>
              <strong className="text-foreground">Choose TB-500 if</strong> the injury is diffuse,
              multi-region, or you're recovering from a heavy training block and want a systemic
              agent with once-a-week dosing.
            </p>
            <p>
              <strong className="text-foreground">Stack them if</strong> you want complementary
              mechanisms — localized angiogenesis + systemic cell migration — for a bigger
              soft-tissue insult (post-surgery, chronic tendinopathy). This is common in the
              performance community but is not backed by controlled human trials.
            </p>
          </div>
        </section>

        <section
          className={cn(cardClassName, "mt-8 rounded-2xl p-5 text-sm text-muted-foreground")}
          aria-labelledby="how-to-stack"
        >
          <h2
            id="how-to-stack"
            className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Info className="h-4 w-4 text-primary" /> A common stacking protocol
          </h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>BPC-157: 250–500 mcg subcutaneous, once daily, 4–6 weeks near the injury site.</li>
            <li>
              TB-500: 2–5 mg subcutaneous, twice weekly (loading phase 4 weeks) → 2 mg weekly
              maintenance.
            </li>
            <li>
              Track pain, range-of-motion and function in DoseRoutine's check-in log to see whether
              the stack is actually moving the needle.
            </li>
          </ul>
          <p className="mt-3">
            Educational only — not medical advice. See our{" "}
            <Link to="/medical-disclaimer" className="text-primary underline">
              medical disclaimer
            </Link>
            .
          </p>
        </section>

        <section className="mt-8" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-2xl font-semibold text-foreground">
            Frequently asked
          </h2>
          <dl className="mt-3 space-y-4 text-sm">
            {FAQ_PAIRS.map((f) => (
              <Card key={f.q} id={faqAnchorId(f.q)} className="scroll-mt-24 border-border p-4">
                <dt className="font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </Card>
            ))}
          </dl>
        </section>

        <section id="glossary" className="mt-8 scroll-mt-24">
          <PeptideDosageGlossary />
        </section>

        <section
          className={cn(cardClassName, "mt-8 rounded-2xl p-5")}
          aria-labelledby="related-tools"
        >
          <h2 id="related-tools" className="font-display text-base font-semibold text-foreground">
            Keep exploring
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jump back to the full compound guides or use DoseRoutine's peptide tools.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/library/$slug"
              params={{ slug: "bpc-157" }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Full BPC-157 profile <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/library/$slug"
              params={{ slug: "tb-500" }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Full TB-500 profile <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/interaction-checker"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/60"
            >
              Check interactions <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/reconstitution-calculator"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/60"
            >
              Reconstitution calculator <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
        <AttributionFooter sourceUrl={CANONICAL} />
      </main>
    </div>
  );
}
