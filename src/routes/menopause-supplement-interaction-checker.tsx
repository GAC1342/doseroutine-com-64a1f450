import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HelpCircle, Info, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";

const CANONICAL = "https://doseroutine.com/menopause-supplement-interaction-checker";
const TITLE = "Menopause Supplement Interaction Checker | DoseRoutine";
const DESC =
  "Free menopause supplement interaction checker — check black cohosh, soy isoflavones, vitex, DHEA, red clover and HRT together with DoseRoutine.";

const ORG = {
  "@type": "Organization",
  "@id": "https://doseroutine.com/#organization",
  name: "DoseRoutine",
  url: "https://doseroutine.com",
  logo: "https://doseroutine.com/icon-512.png",
};

const FAQS = [
  {
    q: "What is a menopause supplement interaction checker?",
    a: "A tool that flags known conflicts between menopause-related supplements (black cohosh, soy isoflavones, red clover, vitex, DHEA, evening primrose) and the prescriptions women often take at the same time — estradiol HRT, progesterone, birth control, thyroid medication, SSRIs, blood thinners, and blood pressure drugs. DoseRoutine's checker uses named pharmacokinetic and receptor-level mechanisms for every flagged pair, not vague warnings.",
  },
  {
    q: "Which menopause supplements interact with HRT?",
    a: "St. John's wort (reduces estradiol levels via CYP3A4 induction), black cohosh (usually not combined for redundant coverage), DHEA (adds peripheral hormone conversion), vitex (modulates progesterone signalling), and high-dose soy isoflavones or red clover (weak additive ER activity). Non-hormonal options like maca, magnesium, and omega-3 don't meaningfully interact with HRT.",
  },
  {
    q: "Which menopause supplements interact with birth control?",
    a: "St. John's wort is the biggest issue — it induces CYP3A4 and can reduce ethinyl-estradiol enough to cause breakthrough bleeding or contraceptive failure. Most menopause-specific herbs (black cohosh, red clover, soy isoflavones) don't meaningfully reduce contraceptive efficacy but should still be checked pair-by-pair.",
  },
  {
    q: "Which menopause supplements interact with thyroid medication?",
    a: "Soy isoflavones reduce levothyroxine absorption if taken within 4 hours. Ashwagandha can push TSH down. Iron and calcium have the same absorption-timing issue. Always dose levothyroxine on an empty stomach and separate other supplements by 4 hours.",
  },
  {
    q: "Are menopause supplements safe with SSRIs?",
    a: "Most are compatible. St. John's wort with any SSRI is a serotonin-syndrome risk — do not combine. Black cohosh, soy isoflavones, and red clover have no meaningful SSRI interaction. Maca has small trials suggesting benefit for SSRI-induced low libido.",
  },
  {
    q: "How do I use the DoseRoutine menopause interaction checker?",
    a: "Open the interaction checker at doseroutine.com/interaction-checker, add every supplement and prescription you take (including HRT, birth control, thyroid medication), and DoseRoutine will show pairwise flags with mechanism and severity. Free for 7 days.",
  },
];

const MEDICAL_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
  },
  "@id": CANONICAL + "#medicalpage",
  url: CANONICAL,
  name: TITLE,
  description: DESC,
  inLanguage: "en",
  headline: TITLE,
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  image: ["https://doseroutine.com/og/hub-mens-health.jpg"],
  datePublished: "2026-07-23",
  dateModified: "2026-07-31",
  audience: { "@type": "PeopleAudience", audienceType: "Adult women", suggestedGender: "Female" },
  publisher: ORG,
  author: ORG,
  copyrightHolder: ORG,
  isBasedOn: CANONICAL,
  about: [
    { "@type": "MedicalCondition", name: "Menopause" },
    { "@type": "MedicalCondition", name: "Perimenopause" },
    { "@type": "MedicalTherapy", name: "Hormone Replacement Therapy (HRT)" },
  ],
};

const BREADCRUMB_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "DoseRoutine", item: "https://doseroutine.com" },
    { "@type": "ListItem", position: 2, name: "Menopause Interaction Checker", item: CANONICAL },
  ],
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": CANONICAL + "#faq",
  inLanguage: "en",
  isBasedOn: CANONICAL,
  publisher: ORG,
  author: ORG,
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

const OG_IMAGE = "https://doseroutine.com/og/hub-mens-health.jpg";

type SearchParams = { compound?: string; with?: string };

export const Route = createFileRoute("/menopause-supplement-interaction-checker")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    compound: typeof search.compound === "string" ? search.compound : undefined,
    with: typeof search.with === "string" ? search.with : undefined,
  }),
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
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Menopause Supplement Interaction Checker — DoseRoutine",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "DoseRoutine menopause supplement interaction checker card" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(MEDICAL_LD) },
      { type: "application/ld+json", children: JSON.stringify(BREADCRUMB_LD) },
      { type: "application/ld+json", children: JSON.stringify(FAQ_LD) },
    ],
  }),
  component: MenopauseInteractionCheckerLanding,
});

const PAIR_LABELS: Record<string, string> = {
  hrt: "HRT (estradiol)",
  estradiol: "Estradiol",
  progesterone: "Progesterone",
  "birth-control": "Birth control (oral contraceptives)",
  contraceptives: "Birth control",
  levothyroxine: "Levothyroxine (thyroid medication)",
  "thyroid-medication": "Thyroid medication",
  thyroid: "Thyroid medication",
  ssri: "SSRIs / SNRIs",
  ssris: "SSRIs / SNRIs",
  "blood-thinners": "Blood thinners (warfarin, apixaban)",
  warfarin: "Warfarin",
  aspirin: "Aspirin",
  statins: "Statins",
  "blood-pressure-medication": "Blood pressure medication",
  metformin: "Metformin",
  iron: "Iron",
  calcium: "Calcium",
};

const COMPOUND_LABELS: Record<string, string> = {
  "black-cohosh": "Black Cohosh",
  "soy-isoflavones": "Soy Isoflavones",
  vitex: "Vitex",
  "evening-primrose-oil": "Evening Primrose Oil",
  "dhea-women": "DHEA",
  "red-clover": "Red Clover",
  "maca-menopause": "Maca",
  "estradiol-hrt": "Estradiol / HRT",
  "progesterone-women": "Progesterone",
  "nmn-women": "NMN",
  "nad-precursors": "NAD+ Precursors",
  "collagen-peptides-women": "Collagen Peptides",
  "spermidine-women": "Spermidine",
  "resveratrol-women": "Resveratrol",
  "magnesium-glycinate-women": "Magnesium Glycinate",
  "coq10-women": "CoQ10",
  "creatine-women": "Creatine",
  "omega-3-women": "Omega-3",
  "testosterone-women": "Low-dose Testosterone",
  "maca-libido": "Maca (libido)",
  "l-arginine-women": "L-Arginine",
  "tribulus-women": "Tribulus",
  "vaginal-probiotics": "Vaginal Probiotics",
  "ashwagandha-women": "Ashwagandha",
  "myo-inositol": "Myo-Inositol",
  "d-chiro-inositol": "D-Chiro-Inositol",
  "coq10-fertility": "CoQ10 (fertility)",
  "vitamin-d-fertility": "Vitamin D",
  "folate-vs-folic-acid": "Folate",
  "iron-cycle": "Iron",
  "b6-luteal": "Vitamin B6",
};

function humanize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function MenopauseInteractionCheckerLanding() {
  const { compound, with: withKey } = Route.useSearch();
  const compoundLabel = compound ? (COMPOUND_LABELS[compound] ?? humanize(compound)) : undefined;
  const withLabel = withKey ? (PAIR_LABELS[withKey] ?? humanize(withKey)) : undefined;
  const hasPair = Boolean(compoundLabel && withLabel);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      {/* Original: https://doseroutine.com/menopause-supplement-interaction-checker — © DoseRoutine */}
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Menopause Supplement Interaction Checker
          </h1>
          <p className="text-lg text-muted-foreground">
            Check menopause supplements — black cohosh, soy isoflavones, vitex, DHEA, red clover,
            evening primrose — against HRT, birth control, thyroid medication, SSRIs, and everything
            else you take. Free for 7 days.
          </p>
          <div className="pt-2">
            <Link
              to="/interaction-checker"
              className="inline-flex items-center gap-1 rounded-md px-4 py-2 text-white font-semibold"
              style={{ backgroundColor: "hsl(var(--accent, 12 78% 60%))" }}
            >
              Open the interaction checker <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {hasPair && (
          <Card
            id="selected-pair"
            className="p-5 border-2 scroll-mt-24"
            style={{ borderColor: "hsl(var(--accent, 12 78% 60%))" }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Selected pair
            </div>
            <h2 className="mt-1 text-xl font-bold">
              {compoundLabel} + {withLabel}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You came from a compound page — open the full checker to see this pair alongside every
              other supplement and prescription in your routine, with mechanism and severity for
              each flagged combination.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/interaction-checker"
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-white text-sm font-semibold"
                style={{ backgroundColor: "hsl(var(--accent, 12 78% 60%))" }}
              >
                Check {compoundLabel} + {withLabel} <ArrowRight className="h-4 w-4" />
              </Link>
              {compound && (
                <a
                  href={`/library/womens-health/${compound}#interactions`}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-semibold"
                >
                  Back to {compoundLabel} interactions
                </a>
              )}
            </div>
          </Card>
        )}

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">What this checks</h2>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm">
            <li>
              <strong>HRT interactions</strong> — estradiol, progesterone, testosterone.
            </li>
            <li>
              <strong>Birth control interactions</strong> — combined pills, mini-pill, IUD, ring.
            </li>
            <li>
              <strong>Thyroid medication timing</strong> — levothyroxine absorption conflicts.
            </li>
            <li>
              <strong>SSRI and mood-medication</strong> — serotonin and sedation risk.
            </li>
            <li>
              <strong>Blood thinner interactions</strong> — warfarin, apixaban, aspirin.
            </li>
            <li>
              <strong>Blood pressure medication</strong> — additive hypotension.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Menopause hubs and compound pages</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <a href="/library/womens-health/menopause-hormones" className="block">
              <Card className="h-full p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold">Menopause & Hormone Balance</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every compound, every HRT interaction.
                </p>
              </Card>
            </a>
            <a href="/library/womens-health/longevity" className="block">
              <Card className="h-full p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold">Longevity for Women</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bone, muscle, sleep and heart support.
                </p>
              </Card>
            </a>
            <a href="/library/womens-health/sexual-health" className="block">
              <Card className="h-full p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold">Sexual Health & Libido</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Testosterone context, maca, ashwagandha.
                </p>
              </Card>
            </a>
            <a href="/library/womens-health/fertility-cycle" className="block">
              <Card className="h-full p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold">Fertility & Cycle Support</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Inositol, CoQ10, folate, vitamin D.
                </p>
              </Card>
            </a>
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="mic-faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 id="mic-faq" className="text-2xl font-bold">
              FAQ
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <Card key={i} className="p-4">
                <h3 className="text-base font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed">{f.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="p-5 border-2" style={{ borderColor: "hsl(var(--accent, 12 78% 60%))" }}>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5" style={{ color: "hsl(var(--accent, 12 78% 60%))" }} />
            <div className="text-sm">
              <p className="font-semibold text-base">Open the DoseRoutine interaction checker</p>
              <p className="text-muted-foreground mt-1">
                Add every supplement, HRT dose, and prescription — see the full pairwise safety
                picture in one view. Free for 7 days.
              </p>
              <Link
                to="/interaction-checker"
                className="mt-3 inline-flex items-center gap-1 rounded-md px-3 py-2 text-white font-semibold"
                style={{ backgroundColor: "hsl(var(--accent, 12 78% 60%))" }}
              >
                Open interaction checker <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Card>

        <footer className="border-t pt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Educational, not medical advice. Menopause decisions belong with your gynecologist or
            menopause specialist.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} <strong>DoseRoutine</strong> — original content at{" "}
            <a href={CANONICAL} className="underline">
              {CANONICAL}
            </a>
            .
          </p>
        </footer>
        <AttributionFooter sourceUrl={CANONICAL} />
      </article>
    </main>
  );
}
