import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/guides/low-testosterone-symptoms";
const TITLE = "Low Testosterone: Symptoms, Labs & Next Steps | DoseRoutine";
const DESC =
  "The real symptoms of low testosterone in men, which blood tests to order, and what to do next — from lifestyle changes to when TRT is indicated.";

export const FAQS = [
  {
    q: "What is 'low' testosterone?",
    a: "Most labs flag total T under 300 ng/dL as low. But 'clinical low T' also requires symptoms plus two morning tests confirming the low reading — a single result isn't a diagnosis.",
  },
  {
    q: "What blood tests should I ask for?",
    a: "Total testosterone, free testosterone, SHBG, LH, FSH, estradiol, and prolactin — drawn between 7am and 10am. LH/FSH tell your doctor whether the issue is in the testes or the pituitary.",
  },
  {
    q: "Can lifestyle changes fix low T?",
    a: "Sometimes. Losing significant weight, sleeping 7+ hours, resistance training, and treating sleep apnea have all been shown to raise testosterone in men whose lifestyle was the cause. Rarely enough alone for clinical hypogonadism.",
  },
  {
    q: "When is TRT the right answer?",
    a: "When testing confirms persistent low T, symptoms are affecting quality of life, and reversible causes (weight, sleep, drugs, thyroid) have been ruled out. TRT is a lifelong commitment with real trade-offs (fertility, hematocrit).",
  },
  {
    q: "Can natural boosters replace TRT?",
    a: "No. Supplements produce small changes in free T at best. They're not a treatment for confirmed hypogonadism.",
  },
  {
    q: "How do common medications lower testosterone?",
    a: "Opioids, SSRIs, long-term glucocorticoids, ketoconazole, and finasteride can all suppress testosterone or its effects. Beta-blockers can worsen erectile function without changing serum T. Bring a full medication list to your endocrinologist before assuming supplements are the answer.",
  },
  {
    q: "Does low T raise heart disease or diabetes risk?",
    a: "Untreated low testosterone associates with higher rates of type 2 diabetes, metabolic syndrome, and — in older cohorts — cardiovascular mortality. Treating with TRT in genuinely hypogonadal men appears cardiovascular-neutral in the TRAVERSE trial, but restoring T does not treat existing heart disease.",
  },
  {
    q: "How fast should I retest after starting a T-support protocol?",
    a: "8–12 weeks after starting a stack, at the same morning window as your baseline. Don't test at week 2 — early changes are noise. Log every dose in DoseRoutine so the lab result maps cleanly to what you actually took.",
  },
];

const REFS = [
  {
    cite: "Bhasin S, Brito JP, Cunningham GR, et al. Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline. J Clin Endocrinol Metab. 2018;103(5):1715–1744.",
    url: "https://academic.oup.com/jcem/article/103/5/1715/4939465",
  },
  {
    cite: "Mulligan T, Frick MF, Zuraw QC, Stemhagen A, McWhirter C. Prevalence of hypogonadism in males aged at least 45 years: the HIM study. Int J Clin Pract. 2006;60(7):762–769.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16846397/",
  },
  {
    cite: "Leproult R, Van Cauter E. Effect of 1 week of sleep restriction on testosterone levels in young healthy men. JAMA. 2011;305(21):2173–2174.",
    url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
  },
  {
    cite: "Corona G, Rastrelli G, Monami M, et al. Body weight loss reverts obesity-associated hypogonadotropic hypogonadism: a systematic review and meta-analysis. Eur J Endocrinol. 2013;168(6):829–843.",
    url: "https://pubmed.ncbi.nlm.nih.gov/23482592/",
  },
  {
    cite: "Mulhall JP, Trost LW, Brannigan RE, et al. Evaluation and Management of Testosterone Deficiency: AUA Guideline. J Urol. 2018;200(2):423–432.",
    url: "https://www.auanet.org/guidelines-and-quality/guidelines/testosterone-deficiency-guideline",
  },
  {
    cite: "Wittert G. The relationship between sleep disorders and testosterone in men. Asian J Androl. 2014;16(2):262–265.",
    url: "https://pubmed.ncbi.nlm.nih.gov/24435056/",
  },
];

const SYMPTOMS = [
  "Low libido and reduced spontaneous erections",
  "Persistent fatigue and low motivation",
  "Difficulty gaining or maintaining muscle mass",
  "Increased body fat, especially around the abdomen",
  "Depressed mood or irritability",
  "Poor sleep quality",
  "Reduced facial or body hair over time",
  "Decreased bone density (osteopenia on DEXA)",
];

export const Route = createFileRoute("/library/guides/low-testosterone-symptoms")({
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
      { property: "og:image", content: "https://doseroutine.com/og/guide-low-t.jpg" },
      { property: "og:image:secure_url", content: "https://doseroutine.com/og/guide-low-t.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "DoseRoutine — Low testosterone symptoms guide" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: "https://doseroutine.com/og/guide-low-t.jpg" },
      { name: "twitter:image:alt", content: "DoseRoutine — Low testosterone symptoms guide" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/guides/low-testosterone-symptoms"),
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
          image: ["https://doseroutine.com/og/guide-low-t.jpg"],
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
              name: "Low Testosterone Symptoms",
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
            Low Testosterone Symptoms in Men
          </h1>
          <p className="text-lg text-muted-foreground">
            Testosterone declines slowly with age. Real clinical low T (hypogonadism) is a proper
            medical diagnosis — not something you should self-treat with supplements.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">The classic symptoms</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {SYMPTOMS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            These overlap heavily with poor sleep, depression, chronic stress and thyroid problems —
            get labs before assuming it's T.
          </p>
        </section>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-primary" /> Get the right labs
          </div>
          <p className="text-sm text-muted-foreground">
            Ask for: total T, free T, SHBG, LH, FSH, estradiol, prolactin. Morning draw (7–10am),
            fasted, on two separate days. A single low reading isn't a diagnosis.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Things to try first (before TRT)</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              <strong>Lose visible belly fat</strong> — abdominal fat converts testosterone to
              estrogen. Weight loss alone can restore T.
            </li>
            <li>
              <strong>Sleep 7+ hours</strong> — men who sleep &lt;5 hours have ~15% lower
              testosterone.
            </li>
            <li>
              <strong>Treat sleep apnea</strong> — untreated OSA is a common hidden cause.
            </li>
            <li>
              <strong>Resistance training</strong> — 3–4x/week, compound lifts.
            </li>
            <li>
              <strong>Fix nutrient deficiencies</strong> — zinc, vitamin D, magnesium if low on
              labs.
            </li>
            <li>
              <strong>Reduce alcohol</strong> — chronic heavy drinking suppresses T.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Natural support with evidence</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                to="/library/$slug"
                params={{ slug: "tongkat-ali" }}
                className="text-primary hover:underline"
              >
                Tongkat Ali
              </Link>{" "}
              — best-evidence adaptogen for free T
            </li>
            <li>
              <Link
                to="/library/$slug"
                params={{ slug: "ashwagandha" }}
                className="text-primary hover:underline"
              >
                Ashwagandha
              </Link>{" "}
              — lowers cortisol; mild T bump in stressed men
            </li>
            <li>
              <Link
                to="/library/$slug"
                params={{ slug: "zinc-picolinate" }}
                className="text-primary hover:underline"
              >
                Zinc
              </Link>{" "}
              — only helps if deficient
            </li>
            <li>
              <Link
                to="/library/$slug"
                params={{ slug: "boron" }}
                className="text-primary hover:underline"
              >
                Boron
              </Link>{" "}
              — small free-T bump via lower SHBG
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">When TRT is the right answer</h2>
          <p className="text-sm text-muted-foreground">
            Confirmed persistent low T + symptoms + reversible causes ruled out. TRT is effective
            but is a lifelong commitment. It suppresses fertility, requires monitoring for
            hematocrit and PSA, and stopping abruptly causes a painful crash. Discuss with an
            endocrinologist or men's-health-focused physician.
          </p>
        </section>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="text-sm font-semibold">Check T-support supplements for interactions</div>
          <p className="text-sm text-muted-foreground">
            Boron, zinc, ashwagandha and tongkat ali all touch hormone pathways that overlap with
            SSRIs, thyroid medication, and TRT. Run the combo before you add anything.
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
            Peer-reviewed studies and urology/endocrinology guidelines cited on this page. Last
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
            <p className="font-semibold">Track your labs and protocol in DoseRoutine</p>
            <p className="text-muted-foreground">
              Blood work tracker, TRT dose logging, and shareable doctor reports in one place.
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
              to="/library/guides/erectile-dysfunction-supplements"
              className="text-primary hover:underline"
            >
              ED supplements guide
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/compare/ashwagandha-vs-tongkat-ali"
              className="text-primary hover:underline"
            >
              Ashwagandha vs Tongkat Ali
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/compare/tongkat-ali-vs-fadogia-agrestis"
              className="text-primary hover:underline"
            >
              Tongkat Ali vs Fadogia
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/$slug"
              params={{ slug: "tongkat-ali" }}
              className="text-primary hover:underline"
            >
              Tongkat Ali
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/$slug"
              params={{ slug: "ashwagandha" }}
              className="text-primary hover:underline"
            >
              Ashwagandha
            </Link>{" "}
            ·{" "}
            <Link to="/trt-dosage-calculator" className="text-primary hover:underline">
              TRT dosage calculator
            </Link>{" "}
            ·{" "}
            <Link to="/library/mens-health" className="text-primary hover:underline">
              Men's Health
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Educational, not medical advice. Do not start TRT or self-diagnose hypogonadism without a
          physician.
        </p>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/guides/low-testosterone-symptoms" />
      </article>
    </main>
  );
}
