/**
 * Per-URL image entries for the XML sitemap (Google Images discovery).
 *
 * Every image here is DoseRoutine-branded: either a hand-made hero card in
 * `public/og/` or a generated brand card in `public/og/pages/` (see
 * `scripts/generate-page-og.py`). No stock or generic imagery — a shared
 * fallback card would be identical across URLs and is deliberately omitted.
 *
 * Titles and captions are derived from the same data that renders the page,
 * so they can never drift from the page's own H1 / summary.
 */
import { ROUNDUP_LIST, USE_CASE_LIST } from "@/lib/app-roundups";
import { CALCULATOR_PAGES } from "@/lib/compound-calculators";
import { PAGE_OG_CARD_SLUGS } from "@/lib/page-og-manifest";
import { FEATURE_VISUALS, absolute } from "@/lib/feature-visuals";

export const BASE_URL = "https://doseroutine.com";

export type SitemapImage = { loc: string; title?: string; caption?: string };

/** Google ignores very long captions; keep them snippet-sized. */
function caption(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "")}…`;
}

function generatedCard(slug: string): string | null {
  return PAGE_OG_CARD_SLUGS.has(slug) ? `${BASE_URL}/og/pages/${slug}.png` : null;
}

/**
 * Hand-made hero cards that already exist for editorial pages. Kept explicit
 * because these are bespoke artwork, not generated from page data.
 */
const EDITORIAL_CARDS: Record<string, SitemapImage> = {
  "/dose-routine": {
    loc: `${BASE_URL}/og/doseroutine-home.jpg`,
    title: "DoseRoutine — peptide, supplement and hormone tracking",
    caption:
      "DoseRoutine tracks peptides, supplements and hormone protocols with interaction checks, dose scheduling and adherence scoring.",
  },
  "/compare": {
    loc: `${BASE_URL}/og/compare-default.jpg`,
    title: "Compare compounds side by side",
    caption:
      "Side-by-side comparisons of peptides and supplements: dosing, evidence and interactions.",
  },
  "/library/mens-health": {
    loc: `${BASE_URL}/og/hub-mens-health.jpg`,
    title: "Men's health compound library",
    caption:
      "Evidence summaries for men's health compounds: testosterone support, prostate, libido and recovery.",
  },
  "/library/prostate-health": {
    loc: `${BASE_URL}/og/hub-prostate.jpg`,
    title: "Prostate health supplements",
    caption:
      "What the evidence says about saw palmetto, beta-sitosterol and other prostate support supplements.",
  },
  "/library/testosterone-support": {
    loc: `${BASE_URL}/og/hub-testosterone.jpg`,
    title: "Testosterone support supplements",
    caption:
      "Testosterone support compounds ranked by evidence quality, with dosing and interaction notes.",
  },
  "/library/guides/bph-natural-support": {
    loc: `${BASE_URL}/og/guide-bph.jpg`,
    title: "Natural BPH support guide",
    caption: "Evidence-based guide to natural support options for benign prostatic hyperplasia.",
  },
  "/library/guides/low-testosterone-symptoms": {
    loc: `${BASE_URL}/og/guide-low-t.jpg`,
    title: "Low testosterone symptoms guide",
    caption: "Symptoms of low testosterone, the labs that confirm it, and what to do next.",
  },
  "/library/guides/erectile-dysfunction-supplements": {
    loc: `${BASE_URL}/og/guide-ed.jpg`,
    title: "Erectile dysfunction supplements guide",
    caption: "Which erectile dysfunction supplements have real trial evidence, and which do not.",
  },
  "/library/compare/saw-palmetto-vs-beta-sitosterol": {
    loc: `${BASE_URL}/og/compare-saw-beta.jpg`,
    title: "Saw palmetto vs beta-sitosterol",
    caption: "Saw palmetto and beta-sitosterol compared on evidence, dosing and prostate outcomes.",
  },
  "/library/compare/tongkat-ali-vs-fadogia-agrestis": {
    loc: `${BASE_URL}/og/compare-tongkat-fadogia.jpg`,
    title: "Tongkat ali vs fadogia agrestis",
    caption: "Tongkat ali and fadogia agrestis compared on human evidence, dosing and safety.",
  },
  "/library/compare/ashwagandha-vs-tongkat-ali": {
    loc: `${BASE_URL}/og/compare-ashwagandha-tongkat.jpg`,
    title: "Ashwagandha vs tongkat ali",
    caption: "Ashwagandha and tongkat ali compared on testosterone, stress and sleep evidence.",
  },
  "/library/compare/semaglutide-vs-tirzepatide": {
    loc: `${BASE_URL}/og/compare-sema-tirz.jpg`,
    title: "Semaglutide vs tirzepatide",
    caption:
      "Semaglutide and tirzepatide compared on trial weight loss, dosing schedules and side effects.",
  },
  "/library/compare/bpc-157-vs-tb-500": {
    loc: `${BASE_URL}/og/bpc-157-vs-tb-500.jpg`,
    title: "BPC-157 vs TB-500",
    caption: "BPC-157 and TB-500 compared on mechanism, evidence quality and typical protocols.",
  },
  "/library/retatrutide-dosage": {
    loc: `${BASE_URL}/og/retatrutide-dosage.jpg`,
    title: "Retatrutide dosage guide",
    caption: "Retatrutide dosing by trial phase, titration schedule and reconstitution math.",
  },
  "/library/cjc-1295-ipamorelin": {
    loc: `${BASE_URL}/og/cjc-1295-ipamorelin.jpg`,
    title: "CJC-1295 and ipamorelin guide",
    caption:
      "CJC-1295 / ipamorelin protocols, dosing and what the growth hormone evidence supports.",
  },
  "/library/peptide-stacks-for-muscle-growth": {
    loc: `${BASE_URL}/og/peptide-stacks-for-muscle-growth.jpg`,
    title: "Peptide stacks for muscle growth",
    caption:
      "Peptide stacks used for muscle growth, with evidence grades and interaction warnings.",
  },
};

/** path -> branded image, built once at module load. */
const IMAGE_BY_PATH: Map<string, SitemapImage> = (() => {
  const map = new Map<string, SitemapImage>(Object.entries(EDITORIAL_CARDS));

  for (const roundup of ROUNDUP_LIST) {
    const loc = generatedCard(roundup.slug);
    if (loc) {
      map.set(`/${roundup.slug}`, {
        loc,
        title: roundup.h1,
        caption: caption(roundup.shortAnswer),
      });
    }
  }

  for (const useCase of USE_CASE_LIST) {
    const loc = generatedCard(useCase.slug);
    if (loc) {
      map.set(`/for/${useCase.slug}`, {
        loc,
        title: useCase.h1,
        caption: caption(useCase.shortAnswer),
      });
    }
  }

  for (const page of CALCULATOR_PAGES) {
    const loc = generatedCard(page.slug);
    if (loc) {
      map.set(`/calculators/${page.slug}`, {
        loc,
        title: page.h1,
        caption: caption(page.description),
      });
    }
  }

  // Feature visuals win over a generated card: they are bespoke artwork and
  // show the actual feature the URL is about.
  for (const visual of FEATURE_VISUALS) {
    for (const path of visual.socialPaths) {
      map.set(path, {
        loc: absolute(visual.jpg),
        title: visual.title,
        caption: caption(visual.caption),
      });
    }
  }

  return map;
})();

/** The branded image for a sitemap URL, or null when the page has none. */
export function sitemapImageFor(path: string): SitemapImage | null {
  return IMAGE_BY_PATH.get(path) ?? null;
}

/** Every path that carries an image entry (used by tests). */
export function sitemapImagePaths(): string[] {
  return [...IMAGE_BY_PATH.keys()].sort();
}
