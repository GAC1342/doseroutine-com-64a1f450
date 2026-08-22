import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Activity, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/testosterone-support";
const TITLE = "Testosterone Support: Compounds & Evidence | DoseRoutine";
const DESC =
  "Which natural testosterone-support compounds actually have evidence: tongkat ali, fadogia, ashwagandha, zinc, boron. Plain-English dosing notes.";

const COMPOUNDS = [
  {
    slug: "tongkat-ali",
    name: "Tongkat Ali",
    note: "Best-evidence adaptogen for free T; 200–400 mg/day standardized.",
  },
  {
    slug: "fadogia-agrestis",
    name: "Fadogia Agrestis",
    note: "Popular but weak human evidence; 600 mg/day, cycle on/off.",
  },
  {
    slug: "ashwagandha",
    name: "Ashwagandha",
    note: "Reliable cortisol lowering; small T bump in stressed men.",
  },
  {
    slug: "zinc-picolinate",
    name: "Zinc",
    note: "Only helps if you're deficient — 15–30 mg/day, evening.",
  },
  { slug: "boron", name: "Boron", note: "Small free-T bump via lower SHBG; 6–10 mg/day." },
];

export const FAQS = [
  {
    q: "Do natural testosterone boosters actually work?",
    a: "Most don't. In healthy men with normal testosterone, most supplements show no change in total T. The exceptions with the strongest evidence are tongkat ali and ashwagandha, and their effects are modest.",
  },
  {
    q: "What's the difference between total and free testosterone?",
    a: "Total T is everything in your blood. Free T is the small fraction not bound to SHBG or albumin — that's the biologically active portion. Some supplements move free T without moving total T.",
  },
  {
    q: "Should I get tested before trying anything?",
    a: "Yes. Get a baseline morning testosterone panel (total T, free T, SHBG, LH, FSH, estradiol). If T is clinically low, see an endocrinologist — supplements won't fix true hypogonadism.",
  },
  {
    q: "Is TRT better than natural boosters?",
    a: "TRT is far more effective at raising testosterone, but it's a lifelong medication with real side effects (fertility suppression, hematocrit rise, need for regular labs). Discuss with a physician.",
  },
  {
    q: "How long until a T-support stack starts working?",
    a: "Ashwagandha and tongkat ali typically need 4–8 weeks before serum T or free T shifts show on a lab. Retest at 8–12 weeks in the same morning window; anything shorter is noise.",
  },
  {
    q: "Can I stack tongkat ali with ashwagandha?",
    a: "Yes, and many men do. Use half doses of each (200 mg tongkat + 300 mg ashwagandha) rather than full doses stacked. Skip the combo if you're on thyroid medication or immunosuppressants — ashwagandha can push both.",
  },
  {
    q: "Do these supplements interact with TRT or SSRIs?",
    a: "TRT already saturates the androgen pathway, so most T-boosters are redundant on it. Ashwagandha can add to SSRI serotonergic load; tongkat ali is generally neutral. Always list every supplement on your intake form and check pairs in the interaction checker.",
  },
];

const REFS = [
  {
    cite: "Bhasin S, Brito JP, Cunningham GR, et al. Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline. J Clin Endocrinol Metab. 2018;103(5):1715–1744.",
    url: "https://academic.oup.com/jcem/article/103/5/1715/4939465",
  },
  {
    cite: "Lopresti AL, Drummond PD, Smith SJ. A randomized, double-blind, placebo-controlled, crossover study examining the hormonal and vitality effects of ashwagandha (Withania somnifera) in aging, overweight males. Am J Mens Health. 2019;13(2).",
    url: "https://pubmed.ncbi.nlm.nih.gov/30854916/",
  },
  {
    cite: "Ambiye VR, Langade D, Dongre S, et al. Clinical evaluation of the spermatogenic activity of the root extract of ashwagandha in oligospermic males: a pilot study. Evid Based Complement Alternat Med. 2013;2013:571420.",
    url: "https://pubmed.ncbi.nlm.nih.gov/24371462/",
  },
  {
    cite: "Tambi MI, Imran MK, Henkel RR. Standardized water-soluble extract of Eurycoma longifolia (Tongkat Ali) as testosterone booster for managing men with late-onset hypogonadism? Andrologia. 2012;44(Suppl 1):226–230.",
    url: "https://pubmed.ncbi.nlm.nih.gov/21671978/",
  },
  {
    cite: "Leitão AE, Vieira MCS, Pelegrini A, et al. A 6-month, double-blind, placebo-controlled, randomized trial to evaluate the effect of Eurycoma longifolia (Tongkat Ali) and concurrent training on erectile function and testosterone levels in androgen-deficient men. Maturitas. 2021;145:78–85.",
    url: "https://pubmed.ncbi.nlm.nih.gov/33549758/",
  },
  {
    cite: "Naghii MR, Mofid M, Asgari AR, Hedayati M, Daneshpour MS. Comparative effects of daily and weekly boron supplementation on plasma steroid hormones and proinflammatory cytokines. J Trace Elem Med Biol. 2011;25(1):54–58.",
    url: "https://pubmed.ncbi.nlm.nih.gov/21129941/",
  },
  {
    cite: "Prasad AS, Mantzoros CS, Beck FW, Hess JW, Brewer GJ. Zinc status and serum testosterone levels of healthy adults. Nutrition. 1996;12(5):344–348.",
    url: "https://pubmed.ncbi.nlm.nih.gov/8875519/",
  },
];

export const Route = createFileRoute("/library/testosterone-support")({
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
      { property: "og:image", content: "https://doseroutine.com/og/hub-testosterone.jpg" },
      {
        property: "og:image:secure_url",
        content: "https://doseroutine.com/og/hub-testosterone.jpg",
      },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "DoseRoutine — Testosterone Support hub" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: "https://doseroutine.com/og/hub-testosterone.jpg" },
      { name: "twitter:image:alt", content: "DoseRoutine — Testosterone Support" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/testosterone-support"),
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
          image: ["https://doseroutine.com/og/hub-testosterone.jpg"],
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
            { "@type": "ListItem", position: 3, name: "Testosterone Support", item: CANONICAL },
          ],
        }),
      },
    ]),
  }),
  component: TSupportHub,
});

function TSupportHub() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Testosterone Support</h1>
          <p className="text-lg text-muted-foreground">
            Testosterone drops about 1% per year after 30. A few compounds have real evidence for
            supporting healthy levels — most don't. Here's what actually holds up in trials.
          </p>
        </header>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" /> Test before you guess
          </div>
          <p className="text-sm text-muted-foreground">
            If you suspect low T, get a morning blood panel (total T, free T, SHBG, LH, FSH,
            estradiol) before starting anything. Supplements can't fix clinical hypogonadism.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Compounds with the best evidence</h2>
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
                to="/library/compare/tongkat-ali-vs-fadogia-agrestis"
                className="text-primary hover:underline"
              >
                Tongkat Ali vs Fadogia Agrestis
              </Link>
            </li>
            <li>
              <Link
                to="/library/compare/ashwagandha-vs-tongkat-ali"
                className="text-primary hover:underline"
              >
                Ashwagandha vs Tongkat Ali
              </Link>
            </li>
            <li>
              <Link
                to="/library/guides/low-testosterone-symptoms"
                className="text-primary hover:underline"
              >
                Low testosterone symptoms guide
              </Link>
            </li>
            <li>
              <Link
                to="/library/guides/erectile-dysfunction-supplements"
                className="text-primary hover:underline"
              >
                ED supplements guide (often overlaps with low T)
              </Link>
            </li>
            <li>
              <Link to="/library/prostate-health" className="text-primary hover:underline">
                Prostate health hub
              </Link>
            </li>
            <li>
              <Link
                to="/library/$slug"
                params={{ slug: "tongkat-ali" }}
                className="text-primary hover:underline"
              >
                Tongkat Ali compound page
              </Link>
            </li>
            <li>
              <Link
                to="/library/$slug"
                params={{ slug: "ashwagandha" }}
                className="text-primary hover:underline"
              >
                Ashwagandha compound page
              </Link>
            </li>
            <li>
              <Link to="/trt-dosage-calculator" className="text-primary hover:underline">
                TRT dosage calculator
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
          <div className="text-sm font-semibold">Check your T-stack for interactions</div>
          <p className="text-sm text-muted-foreground">
            Ashwagandha, tongkat ali, boron and zinc all hit hormone pathways that overlap with
            thyroid meds, SSRIs and TRT. Run the combo through the checker before you add another
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
            Peer-reviewed trials and endocrine society guidelines cited on this page. Last reviewed
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
            <p className="font-semibold">Track your T-support stack in DoseRoutine</p>
            <p className="text-muted-foreground">
              Log doses, cycle on/off, and see it all in one lab-ready report.
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
          Educational, not medical advice. Do not use natural T-support compounds to self-treat
          suspected hypogonadism.
        </p>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/testosterone-support" />
      </article>
    </main>
  );
}
