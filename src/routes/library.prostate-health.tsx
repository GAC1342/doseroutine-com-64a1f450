import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/prostate-health";
const TITLE = "Prostate Supplements: BPH & Urinary Support | DoseRoutine";
const DESC =
  "Evidence-based prostate health supplements for BPH and lower urinary tract symptoms: saw palmetto, beta-sitosterol, pygeum, stinging nettle root and more.";

const COMPOUNDS = [
  {
    slug: "saw-palmetto",
    name: "Saw Palmetto",
    note: "Most-used botanical for BPH; 320 mg/day standardized.",
  },
  {
    slug: "beta-sitosterol",
    name: "Beta-Sitosterol",
    note: "Best-evidence phytosterol; 60–130 mg/day for prostate.",
  },
  { slug: "pygeum", name: "Pygeum africanum", note: "Strong nocturia data; 100 mg/day." },
  {
    slug: "stinging-nettle-root",
    name: "Stinging Nettle Root",
    note: "Root (not leaf) — 360–600 mg/day, often stacked.",
  },
  {
    slug: "zinc-picolinate",
    name: "Zinc",
    note: "Prostate concentrates zinc; correct low zinc first.",
  },
];

export const FAQS = [
  {
    q: "What's the difference between BPH and prostatitis?",
    a: "BPH is age-related enlargement of the prostate causing urinary symptoms. Prostatitis is inflammation, often from infection, and needs different treatment. Only a doctor can tell them apart.",
  },
  {
    q: "Does saw palmetto really work?",
    a: "The largest trials (STEP) found no benefit over placebo at the standard 320 mg dose. Smaller trials of the Permixon-brand extract show more consistent symptom improvement. Response is highly product-specific.",
  },
  {
    q: "Can supplements shrink the prostate?",
    a: "Not the way finasteride does. Supplements can improve urinary symptoms without measurably shrinking the gland.",
  },
  {
    q: "Will these affect my PSA test?",
    a: "Saw palmetto and finasteride-like compounds can lower PSA readings. Always tell your doctor what you take before a PSA test.",
  },
  {
    q: "Can I stack saw palmetto with pygeum and beta-sitosterol?",
    a: "Yes — they hit different pathways (5-alpha-reductase, inflammation, sterol metabolism). Combined protocols are common; keep each at the standard dose rather than doubling any one. Run the pair through DoseRoutine's interaction checker before adding a fourth.",
  },
  {
    q: "Are prostate supplements safe with tamsulosin or finasteride?",
    a: "Tamsulosin (Flomax) is usually fine to combine with saw palmetto or beta-sitosterol, but watch for dizziness. Finasteride already blocks 5-alpha-reductase — adding saw palmetto is redundant and may confuse a rising PSA. Tell your urologist about every supplement.",
  },
  {
    q: "How long before I know if a prostate stack is working?",
    a: "Give it 8–12 weeks and track your IPSS score, nocturia count, and urinary flow. If nothing has moved by 12 weeks at a standard dose, the compound is not your responder — swap, don't stack more.",
  },
];

const REFS = [
  {
    cite: "Barry MJ, Meleth S, Lee JY, et al. Effect of increasing doses of saw palmetto extract on lower urinary tract symptoms (CAMUS/STEP trial). JAMA. 2011;306(12):1344–1351.",
    url: "https://jamanetwork.com/journals/jama/fullarticle/1104300",
  },
  {
    cite: "Tacklind J, MacDonald R, Rutks I, Stanke JU, Wilt TJ. Serenoa repens for benign prostatic hyperplasia. Cochrane Database Syst Rev. 2012;(12):CD001423.",
    url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001423.pub3/full",
  },
  {
    cite: "Wilt T, Ishani A, MacDonald R, Stark G, Mulrow C, Lau J. Beta-sitosterols for benign prostatic hyperplasia. Cochrane Database Syst Rev. 2000;(2):CD001043.",
    url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001043/full",
  },
  {
    cite: "Wilt T, Ishani A, MacDonald R, Rutks I, Stark G. Pygeum africanum for benign prostatic hyperplasia. Cochrane Database Syst Rev. 2002;(1):CD001044.",
    url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001044/full",
  },
  {
    cite: "Safarinejad MR. Urtica dioica for treatment of benign prostatic hyperplasia: a prospective, randomized, double-blind, placebo-controlled, crossover study. J Herb Pharmacother. 2005;5(4):1–11.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16635963/",
  },
  {
    cite: "Foster HE, Barry MJ, Dahm P, et al. Surgical management of lower urinary tract symptoms attributed to BPH: AUA Guideline. J Urol. 2018;200(3):612–619 (with 2023 amendments).",
    url: "https://www.auanet.org/guidelines-and-quality/guidelines/benign-prostatic-hyperplasia-(bph)-guideline",
  },
  {
    cite: "European Association of Urology. Management of Non-Neurogenic Male LUTS Guidelines (updated annually).",
    url: "https://uroweb.org/guidelines/management-of-non-neurogenic-male-luts",
  },
];

export const Route = createFileRoute("/library/prostate-health")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "author", content: "DoseRoutine" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: "https://doseroutine.com/og/hub-prostate.jpg" },
      { property: "og:image:secure_url", content: "https://doseroutine.com/og/hub-prostate.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "DoseRoutine — Prostate Health hub" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: "https://doseroutine.com/og/hub-prostate.jpg" },
      { name: "twitter:image:alt", content: "DoseRoutine — Prostate Health" },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/library/prostate-health")],
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
          image: ["https://doseroutine.com/og/hub-prostate.jpg"],
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
              name: "Men's Health",
              item: "https://doseroutine.com/library/mens-health",
            },
            { "@type": "ListItem", position: 3, name: "Prostate Health", item: CANONICAL },
          ],
        }),
      },
    ]),
  }),
  component: ProstateHub,
});

function ProstateHub() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Prostate Health Supplements
          </h1>
          <p className="text-lg text-muted-foreground">
            An enlarged prostate (BPH) affects roughly 50% of men in their 50s and up to 80–90% by
            age 70. The compounds below are the most-researched non-drug options for urinary
            symptoms.
          </p>
        </header>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-primary" /> See a doctor first
          </div>
          <p className="text-sm text-muted-foreground">
            New urinary symptoms — weak stream, frequent urination, waking to urinate — can also
            come from prostatitis, prostate cancer, or bladder problems. Rule those out before
            starting any supplement protocol.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Top compounds</h2>
          <ul className="space-y-3">
            {COMPOUNDS.map((c) => (
              <li key={c.slug}>
                <Link to="/library/$slug" params={{ slug: c.slug }} className="block">
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{c.name}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Compare & guides</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                to="/library/compare/saw-palmetto-vs-beta-sitosterol"
                className="text-primary hover:underline"
              >
                Saw Palmetto vs Beta-Sitosterol
              </Link>
            </li>
            <li>
              <Link
                to="/library/guides/bph-natural-support"
                className="text-primary hover:underline"
              >
                BPH natural support guide
              </Link>
            </li>
            <li>
              <Link
                to="/library/guides/erectile-dysfunction-supplements"
                className="text-primary hover:underline"
              >
                ED supplements: what actually has evidence
              </Link>
            </li>
            <li>
              <Link to="/library/testosterone-support" className="text-primary hover:underline">
                Testosterone support hub
              </Link>
            </li>
            <li>
              <Link
                to="/library/$slug"
                params={{ slug: "saw-palmetto" }}
                className="text-primary hover:underline"
              >
                Saw Palmetto compound page
              </Link>
            </li>
            <li>
              <Link
                to="/library/$slug"
                params={{ slug: "pygeum" }}
                className="text-primary hover:underline"
              >
                Pygeum africanum compound page
              </Link>
            </li>
            <li>
              <Link to="/library/mens-health" className="text-primary hover:underline">
                Men's Health hub
              </Link>
            </li>
          </ul>
        </section>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="text-sm font-semibold">Check for interactions before you stack</div>
          <p className="text-sm text-muted-foreground">
            Saw palmetto, beta-sitosterol and pygeum overlap with 5-AR inhibitors, blood thinners
            and PSA-affecting drugs. Run your combo through the checker before adding a new
            compound.
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
          <h2 className="text-2xl font-bold">References & sources</h2>
          <p className="text-xs text-muted-foreground">
            Peer-reviewed trials, Cochrane reviews and urology guidelines cited on this page. Last
            reviewed 2026-07-27.
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
            <p className="font-semibold">Track your prostate stack in DoseRoutine</p>
            <p className="text-muted-foreground">
              Multi-time dosing, PSA-test reminders, and clean doctor reports.
            </p>
            <Link
              to="/auth"
              className="mt-2 inline-flex items-center gap-1 text-primary font-medium"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <p className="text-xs text-muted-foreground">
          Educational, not medical advice. Talk to a licensed clinician before starting any prostate
          protocol.
        </p>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/prostate-health" />
      </article>
    </main>
  );
}
