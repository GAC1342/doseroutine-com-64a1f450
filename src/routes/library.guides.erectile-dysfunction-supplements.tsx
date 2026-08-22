import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Info } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/guides/erectile-dysfunction-supplements";
const TITLE = "ED Supplements: What Actually Has Evidence | DoseRoutine";
const DESC =
  "Evidence-based supplements for mild erectile dysfunction: L-citrulline, pine bark extract, horny goat weed, plus when to skip them and see a doctor.";

export const FAQS = [
  {
    q: "Should I try supplements before seeing a doctor about ED?",
    a: "No. New-onset ED is often the earliest warning sign of cardiovascular disease. Get a full cardiovascular and hormone workup first. Supplements are for mild, situational issues — not for cardiac red flags.",
  },
  {
    q: "How do these compare to Viagra or Cialis?",
    a: "PDE5 inhibitors (sildenafil, tadalafil, vardenafil) are far more effective. Natural options are useful as mild adjuncts or for men who can't take PDE5 inhibitors for cardiovascular reasons — never as a replacement without a doctor's OK.",
  },
  {
    q: "Which combination has the best evidence?",
    a: "Pycnogenol + L-arginine (Ledda 2010) showed significant improvement in erectile function over 6 months. L-citrulline is a more stable NO precursor than L-arginine and often preferred.",
  },
  {
    q: "Can I take these with Viagra or Cialis?",
    a: "Horny goat weed is a weak PDE5 inhibitor — do NOT stack it with prescription PDE5 drugs (additive blood pressure drop). L-citrulline and pine bark are generally safer to combine, but always run any stack past your doctor if you're on cardiovascular meds.",
  },
  {
    q: "How long until I know if they're working?",
    a: "6–8 weeks minimum for pine bark. L-citrulline can show acute effects within 1–2 hours.",
  },
  {
    q: "Are these ED supplements safe with nitrates or blood-pressure meds?",
    a: "No. L-citrulline, L-arginine and horny goat weed all lower blood pressure or boost nitric oxide. Combined with nitrates (nitroglycerin, isosorbide) they can trigger severe hypotension. If you're on any BP or heart medication, run every pair through the interaction checker and clear it with your cardiologist first.",
  },
  {
    q: "Does timing matter — take them daily or before sex?",
    a: "L-citrulline works acutely 60–90 minutes before activity at 3–6 g. Pine bark and Panax ginseng are daily-dosed and build up over 6–8 weeks. Icariin (horny goat weed) is somewhere in between — daily dosing gives more consistent effect than on-demand.",
  },
  {
    q: "Will ED supplements affect my fertility or testosterone?",
    a: "L-citrulline and pine bark are neutral on hormones. High-dose Panax ginseng and horny goat weed can nudge free T slightly upward but do not meaningfully change fertility. Persistent ED plus low libido should trigger a hormone panel — not more supplements.",
  },
];

const REFS = [
  {
    cite: "Ledda A, Belcaro G, Cesarone MR, Dugall M, Schönlau F. Investigation of a complex plant extract for mild to moderate erectile dysfunction in a randomized, double-blind, placebo-controlled, parallel-arm study (Pycnogenol + L-arginine). BJU Int. 2010;106(7):1030–1033.",
    url: "https://pubmed.ncbi.nlm.nih.gov/20184576/",
  },
  {
    cite: "Cormio L, De Siati M, Lorusso F, et al. Oral L-citrulline supplementation improves erection hardness in men with mild erectile dysfunction. Urology. 2011;77(1):119–122.",
    url: "https://pubmed.ncbi.nlm.nih.gov/21195829/",
  },
  {
    cite: "Shindel AW, Xin ZC, Lin G, et al. Erectogenic and neurotrophic effects of icariin, a purified extract of horny goat weed (Epimedium spp.) in vitro and in vivo. J Sex Med. 2010;7(4 Pt 1):1518–1528.",
    url: "https://pubmed.ncbi.nlm.nih.gov/20141584/",
  },
  {
    cite: "Burnett AL, Nehra A, Breau RH, et al. Erectile Dysfunction: AUA Guideline. J Urol. 2018;200(3):633–641.",
    url: "https://www.auanet.org/guidelines-and-quality/guidelines/erectile-dysfunction-(ed)-guideline",
  },
  {
    cite: "Gupta BP, Murad MH, Clifton MM, Prokop L, Nehra A, Kopecky SL. The effect of lifestyle modification and cardiovascular risk factor reduction on erectile dysfunction: a systematic review and meta-analysis. Arch Intern Med. 2011;171(20):1797–1803.",
    url: "https://pubmed.ncbi.nlm.nih.gov/21911624/",
  },
  {
    cite: "Hackett G, Kirby M, Wylie K, et al. British Society for Sexual Medicine Guidelines on the Management of Erectile Dysfunction in Men — 2017. J Sex Med. 2018;15(4):430–457.",
    url: "https://pubmed.ncbi.nlm.nih.gov/29550461/",
  },
];

export const Route = createFileRoute("/library/guides/erectile-dysfunction-supplements")({
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
      { property: "og:image", content: "https://doseroutine.com/og/guide-ed.jpg" },
      { property: "og:image:secure_url", content: "https://doseroutine.com/og/guide-ed.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "DoseRoutine — ED supplements: what actually has evidence",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: "https://doseroutine.com/og/guide-ed.jpg" },
      { name: "twitter:image:alt", content: "DoseRoutine — ED supplements guide" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/guides/erectile-dysfunction-supplements"),
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
          image: ["https://doseroutine.com/og/guide-ed.jpg"],
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
            { "@type": "ListItem", position: 3, name: "ED Supplements Guide", item: CANONICAL },
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
            Erectile Dysfunction Supplements
          </h1>
          <p className="text-lg text-muted-foreground">
            What actually has evidence for mild-to-moderate erectile function, what doesn't, and
            when supplements are the wrong tool for the job.
          </p>
        </header>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-primary" /> See a doctor first
          </div>
          <p className="text-sm text-muted-foreground">
            New or persistent ED is one of the earliest warning signs of cardiovascular disease. Get
            a proper workup — blood pressure, lipids, HbA1c, morning testosterone panel — before
            treating it as a supplement problem.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Compounds with real evidence</h2>
          <ul className="space-y-3">
            <li>
              <Link to="/library/$slug" params={{ slug: "l-citrulline" }} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <span className="font-semibold">L-Citrulline</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    — 3–6 g/day; boosts nitric oxide via arginine pathway
                  </span>
                </Card>
              </Link>
            </li>
            <li>
              <Link to="/library/$slug" params={{ slug: "pine-bark-extract" }} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <span className="font-semibold">Pine Bark Extract (Pycnogenol)</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    — 100 mg/day; improves endothelial NO
                  </span>
                </Card>
              </Link>
            </li>
            <li>
              <Link to="/library/$slug" params={{ slug: "horny-goat-weed" }} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <span className="font-semibold">Horny Goat Weed (Epimedium)</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    — weak PDE5 inhibitor; do not stack with PDE5 drugs
                  </span>
                </Card>
              </Link>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">The best-studied combination</h2>
          <p className="text-sm text-muted-foreground">
            Pycnogenol + L-citrulline (or L-arginine): the Ledda 2010 RCT reported significant
            improvement in erectile function scores over 6 months. Both compounds boost nitric oxide
            by complementary mechanisms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Things that matter more than any supplement</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              <strong>Sleep 7+ hours</strong> — morning testosterone tracks with sleep length.
            </li>
            <li>
              <strong>Aerobic exercise</strong> — the single best long-term intervention for
              erectile function.
            </li>
            <li>
              <strong>Stop smoking</strong> — smoking causes endothelial dysfunction.
            </li>
            <li>
              <strong>Treat sleep apnea</strong> — untreated OSA is a very common hidden cause of
              ED.
            </li>
            <li>
              <strong>Reduce alcohol</strong> — chronic heavy drinking worsens ED.
            </li>
            <li>
              <strong>Address relationship / stress issues</strong> — often the actual cause in men
              under 40.
            </li>
          </ul>
        </section>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="text-sm font-semibold">Check every ED-support pair for interactions</div>
          <p className="text-sm text-muted-foreground">
            L-citrulline, pine bark, and horny goat weed all touch nitric-oxide or PDE5 pathways
            that overlap with nitrates and PDE5 inhibitors. Run the combo before you stack.
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
            Peer-reviewed RCTs and sexual-medicine guidelines cited on this page. Last reviewed
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
            <p className="font-semibold">Track your ED protocol in DoseRoutine</p>
            <p className="text-muted-foreground">
              Multi-time dosing, interaction checks with your other meds, and clean doctor reports.
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
            <Link to="/library/prostate-health" className="text-primary hover:underline">
              Prostate Health hub
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/guides/low-testosterone-symptoms"
              className="text-primary hover:underline"
            >
              Low testosterone symptoms
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/$slug"
              params={{ slug: "l-citrulline" }}
              className="text-primary hover:underline"
            >
              L-Citrulline
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/$slug"
              params={{ slug: "pine-bark-extract" }}
              className="text-primary hover:underline"
            >
              Pine Bark Extract
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/$slug"
              params={{ slug: "horny-goat-weed" }}
              className="text-primary hover:underline"
            >
              Horny Goat Weed
            </Link>{" "}
            ·{" "}
            <Link to="/interaction-checker" className="text-primary hover:underline">
              Interaction checker
            </Link>{" "}
            ·{" "}
            <Link to="/library/mens-health" className="text-primary hover:underline">
              Men's Health hub
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Educational, not medical advice. Persistent ED can be an early warning of cardiovascular
          disease — please see a doctor.
        </p>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/guides/erectile-dysfunction-supplements" />
      </article>
    </main>
  );
}
