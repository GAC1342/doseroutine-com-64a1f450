import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";

const CANONICAL = "https://doseroutine.com/library/guides/bph-natural-support";
const TITLE = "BPH Natural Support: Supplements & Lifestyle | DoseRoutine";
const DESC =
  "A plain-English guide to natural support for benign prostatic hyperplasia (BPH): evidence-based supplements, lifestyle changes and when to see a doctor.";

const FAQS = [
  {
    q: "What is BPH?",
    a: "Benign prostatic hyperplasia — non-cancerous prostate enlargement that starts around age 40 and causes urinary symptoms in most men by 70. BPH does not cause prostate cancer, but the symptoms overlap.",
  },
  {
    q: "When should I see a doctor instead of trying supplements?",
    a: "Immediately if you see blood in urine, can't urinate at all, have painful urination with fever, or notice sudden severe symptoms. Otherwise, still get a baseline prostate exam and PSA before self-treating.",
  },
  {
    q: "How long should I try supplements before deciding they don't work?",
    a: "8–12 weeks minimum. Prostate compounds work slowly. If symptoms haven't improved by 3 months, see a urologist about tamsulosin or finasteride.",
  },
  {
    q: "Do supplements replace finasteride or tamsulosin?",
    a: "No. Finasteride actually shrinks the prostate; tamsulosin relaxes the bladder neck. Supplements can improve symptoms without those mechanisms. For moderate-to-severe BPH, prescription options are usually more effective.",
  },
  {
    q: "What lifestyle changes actually help?",
    a: "Limit fluids 2 hours before bed, cut caffeine and alcohol (both irritate the bladder), lose weight (obesity worsens BPH), and get regular exercise (reduces urinary symptom severity in RCTs).",
  },
  {
    q: "Can I take a BPH stack alongside a daily multivitamin or omega-3?",
    a: "Yes. Multis and fish oil don't meaningfully interact with saw palmetto, pygeum or beta-sitosterol. Watch total zinc across products (cap around 30 mg/day) and total vitamin K if you're on warfarin.",
  },
  {
    q: "Will a BPH supplement stack affect erections or libido?",
    a: "Saw palmetto occasionally reduces libido in a small percentage of men, similar to but milder than finasteride. Beta-sitosterol and pygeum have no consistent sexual-function signal. Log libido and erection quality in DoseRoutine so you can tell if it's the compound.",
  },
  {
    q: "Is it safe to combine multiple prostate botanicals?",
    a: "Yes when kept at standard doses (saw palmetto 320 mg + beta-sitosterol 60 mg + pygeum 100 mg). Don't double any single compound to 'boost' effect. Run the combo through the interaction checker for any prescription overlap.",
  },
];

const REFS = [
  {
    cite: "Foster HE, Barry MJ, Dahm P, et al. Surgical management of lower urinary tract symptoms attributed to BPH: AUA Guideline. J Urol. 2018;200(3):612–619 (updated 2023).",
    url: "https://www.auanet.org/guidelines-and-quality/guidelines/benign-prostatic-hyperplasia-(bph)-guideline",
  },
  {
    cite: "Tacklind J, MacDonald R, Rutks I, Stanke JU, Wilt TJ. Serenoa repens for benign prostatic hyperplasia. Cochrane Database Syst Rev. 2012;(12):CD001423.",
    url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001423.pub3/full",
  },
  {
    cite: "Barry MJ, Meleth S, Lee JY, et al. Effect of increasing doses of saw palmetto extract on lower urinary tract symptoms (CAMUS/STEP). JAMA. 2011;306(12):1344–1351.",
    url: "https://jamanetwork.com/journals/jama/fullarticle/1104300",
  },
  {
    cite: "European Association of Urology. Guidelines on the Management of Non-Neurogenic Male Lower Urinary Tract Symptoms (updated annually).",
    url: "https://uroweb.org/guidelines/management-of-non-neurogenic-male-luts",
  },
  {
    cite: "Parsons JK. Modifiable risk factors for benign prostatic hyperplasia and lower urinary tract symptoms: new approaches to old problems. J Urol. 2007;178(2):395–401.",
    url: "https://pubmed.ncbi.nlm.nih.gov/17561143/",
  },
  {
    cite: "Wilt T, Ishani A, MacDonald R, Rutks I, Stark G. Pygeum africanum for benign prostatic hyperplasia. Cochrane Database Syst Rev. 2002;(1):CD001044.",
    url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001044/full",
  },
];

export const Route = createFileRoute("/library/guides/bph-natural-support")({
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
      { property: "og:image", content: "https://doseroutine.com/og/guide-bph.jpg" },
      { property: "og:image:secure_url", content: "https://doseroutine.com/og/guide-bph.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "DoseRoutine — BPH natural support guide" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: "https://doseroutine.com/og/guide-bph.jpg" },
      { name: "twitter:image:alt", content: "DoseRoutine — BPH natural support guide" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/guides/bph-natural-support"),
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
          image: ["https://doseroutine.com/og/guide-bph.jpg"],
          inLanguage: "en",
          author: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine" },
          publisher: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine",
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
            { "@type": "ListItem", position: 3, name: "BPH Natural Support", item: CANONICAL },
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
            BPH Natural Support Guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Benign prostatic hyperplasia (BPH) — an enlarged prostate — is the most common cause of
            male urinary symptoms after 50. This guide covers the natural options with real evidence
            and when to move to prescription treatment.
          </p>
        </header>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-primary" /> See a doctor first
          </div>
          <p className="text-sm text-muted-foreground">
            Weak stream, frequent urination and nighttime waking can also signal prostatitis,
            bladder problems or prostate cancer. Get a baseline exam and PSA before self-treating.
            Never delay care for blood in urine, fever, or inability to urinate.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">The BPH natural stack</h2>
          <p className="text-sm text-muted-foreground">
            European urology has used these four compounds together for decades. Individually
            they're modest; stacked, they're the most-studied non-drug approach to mild-to-moderate
            BPH.
          </p>
          <ul className="space-y-3">
            <li>
              <Link to="/library/$slug" params={{ slug: "saw-palmetto" }} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <span className="font-semibold">Saw Palmetto</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    — 320 mg/day standardized extract
                  </span>
                </Card>
              </Link>
            </li>
            <li>
              <Link to="/library/$slug" params={{ slug: "beta-sitosterol" }} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <span className="font-semibold">Beta-Sitosterol</span>{" "}
                  <span className="text-sm text-muted-foreground">— 60–130 mg/day</span>
                </Card>
              </Link>
            </li>
            <li>
              <Link to="/library/$slug" params={{ slug: "pygeum" }} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <span className="font-semibold">Pygeum africanum</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    — 100 mg/day, best for nocturia
                  </span>
                </Card>
              </Link>
            </li>
            <li>
              <Link to="/library/$slug" params={{ slug: "stinging-nettle-root" }} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <span className="font-semibold">Stinging Nettle Root</span>{" "}
                  <span className="text-sm text-muted-foreground">— 360–600 mg/day</span>
                </Card>
              </Link>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Lifestyle changes that actually help</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              <strong>Cut fluids 2 hours before bed</strong> — the single biggest thing you can do
              about nocturia.
            </li>
            <li>
              <strong>Reduce caffeine and alcohol</strong> — both irritate the bladder and worsen
              urgency.
            </li>
            <li>
              <strong>Lose weight if BMI &gt; 27</strong> — obesity meaningfully worsens BPH
              symptoms.
            </li>
            <li>
              <strong>Regular exercise</strong> — moderate aerobic activity improves urinary symptom
              scores in RCTs.
            </li>
            <li>
              <strong>Pelvic floor training</strong> — worth learning if urgency is your main issue.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">When to escalate</h2>
          <p className="text-sm text-muted-foreground">
            If symptoms are moderate-to-severe or 3 months of supplements + lifestyle haven't
            helped, ask about tamsulosin (relaxes bladder neck, fast-acting) or finasteride (shrinks
            the prostate over 6+ months). Surgical options exist for severe cases.
          </p>
        </section>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="text-sm font-semibold">Check your BPH stack for interactions</div>
          <p className="text-sm text-muted-foreground">
            Prostate botanicals overlap with 5-AR inhibitors, alpha-blockers and blood thinners. Run
            every combo before you add a compound.
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
            Cochrane reviews, RCTs and urology guidelines cited on this page. Last reviewed
            2026-07-27.
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
            <p className="font-semibold">Track your BPH protocol in DoseRoutine</p>
            <p className="text-muted-foreground">
              Log the full stack, set PSA-test reminders and share a shareable summary.
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
            <Link
              to="/library/compare/saw-palmetto-vs-beta-sitosterol"
              className="text-primary hover:underline"
            >
              Saw Palmetto vs Beta-Sitosterol
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/$slug"
              params={{ slug: "saw-palmetto" }}
              className="text-primary hover:underline"
            >
              Saw Palmetto
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/$slug"
              params={{ slug: "beta-sitosterol" }}
              className="text-primary hover:underline"
            >
              Beta-Sitosterol
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/$slug"
              params={{ slug: "pygeum" }}
              className="text-primary hover:underline"
            >
              Pygeum
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/$slug"
              params={{ slug: "stinging-nettle-root" }}
              className="text-primary hover:underline"
            >
              Stinging Nettle Root
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/guides/erectile-dysfunction-supplements"
              className="text-primary hover:underline"
            >
              ED supplements guide
            </Link>{" "}
            ·{" "}
            <Link to="/library/testosterone-support" className="text-primary hover:underline">
              Testosterone support
            </Link>{" "}
            ·{" "}
            <Link to="/library/mens-health" className="text-primary hover:underline">
              Men's Health
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Educational, not medical advice. BPH shares symptoms with prostate cancer — always get
          evaluated before starting a self-directed protocol.
        </p>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/guides/bph-natural-support" />
      </article>
    </main>
  );
}
