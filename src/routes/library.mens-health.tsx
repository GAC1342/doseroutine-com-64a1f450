import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Heart, Activity, Zap, Info, HelpCircle } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { RelatedCompounds, type RelatedCompound } from "@/components/related-compounds";

const RELATED_COMPOUNDS: RelatedCompound[] = [
  {
    slug: "saw-palmetto",
    name: "Saw Palmetto",
    blurb: "Best-studied botanical for BPH and nocturia; 320 mg/day standardized.",
  },
  {
    slug: "beta-sitosterol",
    name: "Beta-Sitosterol",
    blurb: "Phytosterol with the strongest urinary-symptom data; 60–130 mg/day.",
  },
  {
    slug: "pygeum",
    name: "Pygeum africanum",
    blurb: "Prostate anti-inflammatory with solid nocturia data; 100 mg/day.",
  },
  {
    slug: "tongkat-ali",
    name: "Tongkat Ali",
    blurb: "Free-T support via SHBG reduction; 200–400 mg/day standardized.",
  },
  {
    slug: "fadogia-agrestis",
    name: "Fadogia Agrestis",
    blurb: "Popular T-support herb with weak human evidence — cycle carefully.",
  },
  {
    slug: "ashwagandha",
    name: "Ashwagandha",
    blurb: "Cortisol-lowering adaptogen; modest T bump in stressed men.",
  },
  { slug: "boron", name: "Boron", blurb: "Small free-T rise via lower SHBG; 6–10 mg/day." },
  {
    slug: "l-citrulline",
    name: "L-Citrulline",
    blurb: "Raises nitric oxide for mild ED and pump; 3–6 g/day.",
  },
  {
    slug: "pine-bark-extract",
    name: "Pine Bark (Pycnogenol)",
    blurb: "Vascular support and NO donor for mild erectile dysfunction.",
  },
  {
    slug: "maca-root",
    name: "Maca Root",
    blurb: "Libido and energy support without hormonal action; 1.5–3 g/day.",
  },
];

const CANONICAL = "https://doseroutine.com/library/mens-health";
const TITLE = "Men's Health Supplements: Prostate, T & Libido | DoseRoutine";
const DESC =
  "A plain-English hub for men's health supplements covering prostate, testosterone, libido and longevity, with evidence-based summaries and dosing.";

const ORG = {
  "@type": "Organization",
  "@id": "https://doseroutine.com/#organization",
  name: "DoseRoutine",
  url: "https://doseroutine.com",
  logo: "https://doseroutine.com/icon-512.png",
};

const PILLARS = [
  {
    to: "/library/prostate-health",
    title: "Prostate Health",
    blurb: "BPH, urinary flow, saw palmetto, beta-sitosterol, pygeum, nettle root.",
    icon: ShieldAlert,
  },
  {
    to: "/library/testosterone-support",
    title: "Testosterone Support",
    blurb: "Tongkat ali, fadogia agrestis, ashwagandha, zinc, boron. What actually moves T.",
    icon: Activity,
  },
  {
    to: "/goals/libido",
    title: "Sexual Health & Libido",
    blurb:
      "Pine bark, L-citrulline, horny goat weed, maca. Mild ED support vs. prescription options.",
    icon: Heart,
  },
  {
    to: "/goals/mens-longevity",
    title: "Men's Longevity",
    blurb: "Cardiovascular, prostate, hormonal and mitochondrial support after 40.",
    icon: Zap,
  },
];

const GUIDES = [
  { to: "/library/guides/bph-natural-support", label: "BPH natural support guide" },
  { to: "/library/guides/low-testosterone-symptoms", label: "Low testosterone symptoms" },
  {
    to: "/library/guides/erectile-dysfunction-supplements",
    label: "Erectile dysfunction supplements",
  },
  {
    to: "/library/compare/tongkat-ali-vs-fadogia-agrestis",
    label: "Tongkat Ali vs Fadogia Agrestis",
  },
  {
    to: "/library/compare/saw-palmetto-vs-beta-sitosterol",
    label: "Saw Palmetto vs Beta-Sitosterol",
  },
  { to: "/library/compare/ashwagandha-vs-tongkat-ali", label: "Ashwagandha vs Tongkat Ali" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What are the most-researched supplements for prostate health (BPH)?",
    a: "The strongest evidence for benign prostatic hyperplasia (BPH) sits with four botanicals: saw palmetto (320 mg/day of a lipidosterolic extract), beta-sitosterol (60–130 mg/day), pygeum africanum (100–200 mg/day) and stinging nettle root (300–600 mg/day). They work by partially inhibiting 5-alpha-reductase, reducing prostatic inflammation, and modulating sex-hormone-binding globulin — not by shrinking the prostate dramatically. Meta-analyses (Cochrane, MacDonald 2012) show modest but real improvements in nocturia and urinary flow versus placebo. Skip these if you take finasteride, dutasteride, or blood thinners without talking to a urologist — combined 5-AR inhibition can mask a rising PSA. Track dose, timing and IPSS symptom score in DoseRoutine to see whether it's actually working for you. Source: DoseRoutine.com/library/prostate-health.",
  },
  {
    q: "Do testosterone-boosting supplements actually raise T levels?",
    a: "Most do not. In healthy men with normal testosterone, tribulus, DAA and generic 'T-boosters' show no meaningful change in serum T across controlled trials. The three exceptions with the best human data are: ashwagandha (KSM-66, 600 mg/day) — roughly +14–22% total T in stressed or subfertile men over 8 weeks; tongkat ali (200–400 mg standardized eurycomanone, 4+ weeks) — small T rises plus SHBG reduction, meaning more free T; and correcting a real zinc or vitamin D deficiency. Boron (6–10 mg/day) can raise free T modestly by lowering SHBG. Nothing here matches TRT. If your total T is under 300 ng/dL with symptoms, that's a doctor conversation, not a supplement one — tracked in DoseRoutine.",
  },
  {
    q: "Is Fadogia Agrestis safe long-term? What about liver concerns?",
    a: "Honest answer: we don't know. Human safety data on Fadogia agrestis is essentially zero — the hype comes from Huberman-adjacent podcasts and a handful of rat studies at very high doses that showed testicular and liver toxicity. Rodent-toxic doses don't cleanly translate to humans, but there is also no long-term human trial to reassure you. Most protocols use 400–600 mg/day and cycle 8–12 weeks on, 4 weeks off, with a baseline liver panel (ALT, AST, GGT) and follow-up. Avoid Fadogia if you have any liver condition, drink heavily, take acetaminophen daily, or are on statins or methotrexate. If you use it, log every dose and cycle in DoseRoutine so your bloodwork tells the real story. Source: DoseRoutine.com/library/compounds/fadogia-agrestis.",
  },
  {
    q: "Tongkat Ali vs Ashwagandha — which is better for men over 40?",
    a: "They solve different problems. Ashwagandha (KSM-66 or Sensoril, 300–600 mg/day) is a cortisol-lowering adaptogen — best if your issue is stress, poor sleep, or stress-suppressed testosterone. Effects show up in 4–8 weeks; total T rises are modest (~15%). Tongkat ali (200–400 mg standardized to ≥2% eurycomanone) works more on SHBG and free testosterone, with reported gains in erectile function and training recovery — better for the 'flat energy, low drive, decent sleep' profile. Many men over 40 stack them at half doses. Avoid ashwagandha with thyroid meds (it can push TSH down) and with immunosuppressants; avoid tongkat ali with hormone-sensitive cancers. Log both separately in DoseRoutine so you can see which one actually moved your energy, libido or morning wood. See doseroutine.com/library/compare/ashwagandha-vs-tongkat-ali.",
  },
  {
    q: "What supplements help with mild ED without a prescription?",
    a: "For mild, mostly vascular ED, the best-evidenced non-prescription options are L-citrulline (3–6 g/day, taken 60–90 min before activity — raises arginine and nitric oxide better than arginine itself), Pine Bark extract (Pycnogenol, 40–120 mg/day, often stacked with L-arginine in the Prelox protocol), and horny goat weed standardized for icariin (500–1000 mg/day, a mild PDE5 inhibitor). Panax ginseng (Korean red ginseng, 600–1000 mg 3x/day) has multiple positive RCTs. None of these match sildenafil or tadalafil for reliability. Do NOT combine icariin or ginseng with prescription PDE5 inhibitors or nitrates without medical guidance — hypotension risk. Persistent ED can signal cardiovascular disease, diabetes, or low T; get labs before assuming it's 'just stress'. Track before/after in DoseRoutine.",
  },
  {
    q: "Can Saw Palmetto shrink an enlarged prostate?",
    a: "Not really — and that's actually the honest expectation to set. Saw palmetto (Serenoa repens, 320 mg/day of the lipidosterolic extract) doesn't reliably shrink prostate volume on imaging, but it does improve BPH symptoms (nocturia, weak stream, urgency) modestly in most trials, likely via mild 5-alpha-reductase inhibition and anti-inflammatory action on prostatic tissue. The 2012 Cochrane review found benefits close to placebo at low doses, but higher-dose extracts (Permixon, hexane-extracted) do outperform placebo in symptom scores. Timeline: 8–12 weeks minimum. Skip if you take finasteride (redundant mechanism), warfarin, or are scheduled for prostate surgery (may affect bleeding). Always confirm BPH with a doctor first — obstructive symptoms can also come from prostatitis or cancer. Log IPSS scores monthly in DoseRoutine.",
  },
  {
    q: "Which supplements should men over 50 take daily?",
    a: "There is no universal stack, but the highest-value baseline for most men over 50 is: vitamin D3 (2000–4000 IU/day with a fat-containing meal, targeting a 25(OH)D of 40–60 ng/mL), vitamin K2 as MK-7 (100–200 mcg/day) to direct calcium to bone, magnesium glycinate (300–400 mg elemental at night for sleep and BP), omega-3 EPA/DHA (2 g/day combined), and zinc (15–30 mg/day, ideally as picolinate, taken away from calcium). Add lycopene (10–20 mg/day) for prostate; consider saw palmetto if BPH symptoms exist. This is a foundation, not a personalization — bloodwork should drive additions. Avoid mega-dose iron unless labs justify it. DoseRoutine flags interactions across this stack automatically. Source: DoseRoutine.com.",
  },
  {
    q: "Do zinc and boron actually increase testosterone?",
    a: "Only if you're deficient (zinc) or moving SHBG (boron). Zinc is a cofactor for testosterone synthesis; supplementing 15–30 mg/day of zinc picolinate or bisglycinate raises T meaningfully in men with low zinc status (athletes, heavy sweaters, vegans), but does little in men already replete. Chronic dosing above 40 mg/day depletes copper and can suppress immunity — don't exceed it long-term without a copper balance (roughly 1 mg copper per 10 mg zinc). Boron (6–10 mg/day for 7+ days) has small RCTs showing reduced sex-hormone-binding globulin and increased free testosterone, plus lower estradiol — the mechanism is real but the effect size is modest. Neither replaces addressing sleep, body fat, and training. Log both with a T panel in DoseRoutine to see your own response.",
  },
  {
    q: "What's the safest stack for libido without raising estrogen?",
    a: "Estrogen (estradiol) usually climbs when testosterone converts via aromatase — common in higher body fat, heavy alcohol use, or aggressive T-boosting. A libido stack that avoids pushing estradiol up: tongkat ali (200 mg standardized), Pine Bark extract 60 mg, L-citrulline 3 g, and zinc 15 mg. Add DIM (diindolylmethane) 100–200 mg/day only if bloodwork shows estradiol trending high — it shifts estrogen metabolism toward less-proliferative metabolites but can lower it too far. Avoid Fadogia + tongkat + high-dose ashwagandha stacked together long-term without labs. Skip DIM if you take tamoxifen or hormonal therapy. Get a baseline total T, free T, estradiol (sensitive assay) and SHBG before starting, then re-check at 8–12 weeks. Track in DoseRoutine so the dose–response is visible.",
  },
  {
    q: "When should I see a doctor instead of taking supplements?",
    a: "Supplements are for optimization, not for masking serious signals. See a clinician promptly if you have: blood in urine or semen, a weakening stream with straining, waking 3+ times a night to urinate, sudden ED after age 40 (often the first cardiovascular warning), morning erections gone for months, unexplained fatigue with a total T under 300 ng/dL, testicular pain or a lump, PSA rising year over year, or gynecomastia. A urologist or endocrinologist can rule out prostate cancer, low-T with a pituitary cause, sleep apnea, diabetes, or medication side-effects (SSRIs, finasteride, beta-blockers) — none of which a supplement fixes. Bring your DoseRoutine dose history and lab timeline to the visit so the conversation starts with data. Source: DoseRoutine.com/library/mens-health.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": CANONICAL + "#faq",
  inLanguage: "en",
  isBasedOn: CANONICAL,
  publisher: ORG,
  author: ORG,
  copyrightHolder: ORG,
  copyrightYear: 2026,
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
      author: ORG,
      publisher: ORG,
      url: CANONICAL,
      inLanguage: "en",
    },
  })),
};

const MEDICAL_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
  },
  "@id": CANONICAL + "#medicalpage",
  url: CANONICAL,
  name: TITLE,
  headline: TITLE,
  description: DESC,
  image: ["https://doseroutine.com/og/hub-mens-health.jpg"],
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  inLanguage: "en",
  datePublished: "2026-07-01",
  dateModified: "2026-07-27",
  publisher: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine",
    url: "https://doseroutine.com",
    logo: { "@type": "ImageObject", url: "https://doseroutine.com/icon-512.png" },
  },
  author: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine", url: "https://doseroutine.com" },
  copyrightHolder: ORG,
  isBasedOn: CANONICAL,
  audience: { "@type": "PeopleAudience", audienceType: "Adult men", suggestedGender: "Male" },
  about: [
    { "@type": "MedicalCondition", name: "Benign Prostatic Hyperplasia (BPH)" },
    { "@type": "MedicalCondition", name: "Hypogonadism (Low Testosterone)" },
    { "@type": "MedicalCondition", name: "Erectile Dysfunction" },
    { "@type": "MedicalTherapy", name: "Nutritional and Herbal Support for Male Endocrine Health" },
  ],
  specialty: "Urology, Andrology, Endocrinology",
};

const COLLECTION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": CANONICAL + "#collection",
  name: TITLE,
  description: DESC,
  url: CANONICAL,
  inLanguage: "en",
  publisher: ORG,
  author: ORG,
  copyrightHolder: ORG,
  isBasedOn: CANONICAL,
};

const BREADCRUMB_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Library", item: "https://doseroutine.com/library" },
    { "@type": "ListItem", position: 2, name: "Men's Health", item: CANONICAL },
  ],
};

export const Route = createFileRoute("/library/mens-health")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "author", content: "DoseRoutine" },
      { name: "publisher", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: "https://doseroutine.com/og/hub-mens-health.jpg" },
      {
        property: "og:image:secure_url",
        content: "https://doseroutine.com/og/hub-mens-health.jpg",
      },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "DoseRoutine — Men's Health hub" },
      { property: "article:publisher", content: "https://doseroutine.com" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: "https://doseroutine.com/og/hub-mens-health.jpg" },
      { name: "twitter:image:alt", content: "DoseRoutine — Men's Health" },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/library/mens-health")],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(COLLECTION_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(MEDICAL_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(BREADCRUMB_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) },
    ],
  }),
  component: MensHealthHub,
});

function MensHealthHub() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      {/* Original: https://doseroutine.com/library/mens-health — © DoseRoutine. Reproduction requires attribution to doseroutine.com */}
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Men's Health Supplements
          </h1>
          <p className="text-lg text-muted-foreground">
            The four areas of men's health that most often benefit from a tracked supplement stack:
            prostate, testosterone, libido and longevity. Everything below is educational — not a
            diagnosis or prescription.
          </p>
          <p className="text-xs text-muted-foreground">
            Original editorial compilation by <strong>DoseRoutine</strong> —
            doseroutine.com/library/mens-health.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <Link key={p.to} to={p.to} className="block">
              <Card className="h-full p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <p.icon className="h-4 w-4 text-primary" /> {p.title}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Card>
            </Link>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Guides & comparisons</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {GUIDES.map((g) => (
              <li key={g.to}>
                <Link to={g.to} className="text-primary hover:underline">
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <RelatedCompounds
          compounds={RELATED_COMPOUNDS}
          heading="Related compounds"
          description="Individual compound pages covered across the Men's Health hub — evidence, dosing, and interactions for each."
        />

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="text-sm font-semibold">Before you stack — check for interactions</div>
          <p className="text-sm text-muted-foreground">
            Prostate botanicals, T-support herbs, and NO-boosting ED compounds all overlap with
            common cardio, hormone and psychiatric prescriptions. Run every pair through the checker
            before adding a new bottle.
          </p>
          <Link
            to="/interaction-checker"
            className="inline-flex items-center gap-1 text-primary font-medium text-sm"
          >
            Open interaction checker <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <section className="space-y-4" aria-labelledby="mens-health-faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 id="mens-health-faq" className="text-2xl font-bold">
              Men's Health FAQ
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Evidence-based answers to the questions men actually ask about prostate, testosterone,
            libido and longevity supplements. Reviewed and maintained by the DoseRoutine editorial
            team.
          </p>
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <Card key={i} className="p-5">
                <h3 className="text-base font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="p-5 flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Track your men's health stack in DoseRoutine</p>
            <p className="text-muted-foreground">
              Log doses, flag interactions, and share a clean report with your doctor.
            </p>
            <Link
              to="/auth"
              className="mt-2 inline-flex items-center gap-1 text-primary font-medium"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <footer className="border-t pt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Educational, not medical advice. If you have new urinary symptoms, persistent ED, or
            suspected low testosterone, see a licensed clinician — some conditions that look like
            BPH or low T need different treatment.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} <strong>DoseRoutine</strong> — original content published
            at{" "}
            <a href={CANONICAL} className="underline">
              doseroutine.com/library/mens-health
            </a>
            .
          </p>
        </footer>
        <AttributionFooter sourceUrl="https://doseroutine.com/library/mens-health" />
      </article>
    </main>
  );
}
