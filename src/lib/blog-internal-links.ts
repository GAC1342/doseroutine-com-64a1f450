/**
 * Automatic internal linking for blog posts.
 *
 * Each post is matched against the compound guide pages in /library and the
 * per-compound dosing calculators in CALCULATOR_PAGES. Matching uses the
 * post's compound/mechanism tags first (strong signal, hand-curated) and its
 * body text second (weaker signal), so a new post picks up the right guides
 * and tools without anyone editing a link list.
 *
 * Links already present in `post.related` are skipped so the "Keep reading"
 * list and the auto-linked tools block never duplicate each other.
 */

import { CALCULATOR_PAGES } from "@/lib/compound-calculators";
import type { BlogPost } from "@/lib/blog-posts";

export type InternalLink = {
  href: string;
  label: string;
  /** Short reason shown next to the link. */
  blurb: string;
  kind: "guide" | "calculator";
};

type LinkTarget = InternalLink & {
  /** Lowercase terms that indicate this target is relevant. */
  terms: string[];
};

/** Compound and topic guides in the library. */
const GUIDE_TARGETS: LinkTarget[] = [
  {
    href: "/library/retatrutide-dosage",
    label: "Retatrutide dosage guide",
    blurb: "Titration schedule, ranges and cautions.",
    kind: "guide",
    terms: ["retatrutide", "triple agonist", "glucagon receptor"],
  },
  {
    href: "/library/cjc-1295-ipamorelin",
    label: "CJC-1295 with ipamorelin",
    blurb: "DAC vs no-DAC, timing and reconstitution maths.",
    kind: "guide",
    terms: ["cjc-1295", "cjc 1295", "ipamorelin", "growth hormone secretagogue", "ghrh"],
  },
  {
    href: "/library/guides/hexarelin-protocol",
    label: "Hexarelin routine and benefits",
    blurb: "Dosing, tolerance and interaction cautions.",
    kind: "guide",
    terms: ["hexarelin", "ghrelin receptor", "growth hormone secretagogue"],
  },
  {
    href: "/library/compare/semaglutide-vs-tirzepatide",
    label: "Semaglutide vs tirzepatide",
    blurb: "Mechanism, dosing and results side by side.",
    kind: "guide",
    terms: [
      "semaglutide",
      "tirzepatide",
      "wegovy",
      "ozempic",
      "mounjaro",
      "zepbound",
      "glp-1",
      "gip",
    ],
  },
  {
    href: "/library/compare/bpc-157-vs-tb-500",
    label: "BPC-157 vs TB-500",
    blurb: "Two repair peptides compared on dosing and stacking.",
    kind: "guide",
    terms: ["bpc-157", "bpc 157", "tb-500", "tb 500", "thymosin", "tissue repair"],
  },
  {
    href: "/library/peptide-stacks-for-muscle-growth",
    label: "Peptide stacks for muscle growth",
    blurb: "What people combine for lean mass, and the risks.",
    kind: "guide",
    terms: [
      "muscle",
      "lean mass",
      "myostatin",
      "bimagrumab",
      "trevogrumab",
      "activin",
      "hypertrophy",
      "sarcopenia",
    ],
  },
  {
    href: "/library/testosterone-support",
    label: "Testosterone support library",
    blurb: "TRT and natural support compounds with interactions.",
    kind: "guide",
    terms: ["testosterone", "trt", "hcg", "estradiol", "hypogonadism", "androgen"],
  },
  {
    href: "/library/mens-health",
    label: "Men's health compound library",
    blurb: "Prostate, libido, hormones and longevity compounds.",
    kind: "guide",
    terms: ["men's health", "prostate", "erectile", "libido", "bph"],
  },
  {
    href: "/library/womens-health",
    label: "Women's health compound library",
    blurb: "Menopause, fertility, hormones and longevity compounds.",
    kind: "guide",
    terms: ["women", "menopause", "fertility", "estrogen", "progesterone", "pcos"],
  },
  {
    href: "/library/womens-health/longevity",
    label: "Longevity compound library",
    blurb: "NAD precursors, senolytics and what the trials show.",
    kind: "guide",
    terms: [
      "longevity",
      "klotho",
      "reprogramming",
      "yamanaka",
      "epigenetic",
      "nad",
      "nmn",
      "senolytic",
      "aging",
      "ageing",
    ],
  },
  {
    href: "/library/guides/glp1-dopamine-and-relationships",
    label: "GLP-1s, dopamine and relationships",
    blurb: "Reward-signalling changes people report on GLP-1s.",
    kind: "guide",
    terms: ["dopamine", "reward", "appetite", "cravings", "alcohol"],
  },
  {
    href: "/library/guides/low-testosterone-symptoms",
    label: "Low testosterone symptoms",
    blurb: "Signs, what to test and where support fits.",
    kind: "guide",
    terms: ["low testosterone", "fatigue", "libido", "hypogonadism"],
  },
];

/** Calculators, derived from the same source that builds /calculators/*. */
const CALCULATOR_TARGETS: LinkTarget[] = CALCULATOR_PAGES.map((page) => ({
  href: `/calculators/${page.slug}`,
  label: `${page.name} dosage calculator`,
  blurb: "Work out BAC water, units and dose per injection.",
  kind: "calculator" as const,
  terms: [
    page.name.toLowerCase(),
    ...page.name
      .toLowerCase()
      .split(/[\s/+]+/)
      .filter((part) => part.length > 3),
  ],
}));

const ALL_TARGETS: LinkTarget[] = [...GUIDE_TARGETS, ...CALCULATOR_TARGETS];

function postHaystack(post: BlogPost): string {
  return [
    post.heading,
    post.description,
    post.intro,
    ...post.keyPoints,
    ...post.sections.map((s) => [s.heading, ...(s.body ?? []), ...(s.bullets ?? [])].join(" ")),
    ...post.faqs.map((f) => `${f.q} ${f.a}`),
  ]
    .join(" ")
    .toLowerCase();
}

function scoreTarget(target: LinkTarget, tagText: string[], haystack: string): number {
  let score = 0;
  for (const term of new Set(target.terms)) {
    if (!term) continue;
    // A tag match is curated metadata, so it counts far more than prose.
    if (tagText.some((tag) => tag.includes(term) || term.includes(tag))) score += 10;
    else if (haystack.includes(term)) score += 2;
  }
  return score;
}

export type AutoLinks = { guides: InternalLink[]; calculators: InternalLink[] };

/**
 * Pick the most relevant compound guides and calculators for a post.
 * Returns at most `maxPerKind` of each, strongest match first.
 */
export function autoInternalLinks(post: BlogPost, maxPerKind = 3): AutoLinks {
  const tagText = post.tags.map((t) => t.label.toLowerCase());
  const haystack = postHaystack(post);
  const alreadyLinked = new Set(post.related.map((r) => r.href));

  const scored = ALL_TARGETS.filter((t) => !alreadyLinked.has(t.href))
    .map((target) => ({ target, score: scoreTarget(target, tagText, haystack) }))
    .filter((entry) => entry.score >= 4)
    .sort((a, b) => b.score - a.score || a.target.label.localeCompare(b.target.label));

  const pick = (kind: InternalLink["kind"]) =>
    scored
      .filter((entry) => entry.target.kind === kind)
      .slice(0, maxPerKind)
      .map(({ target }) => ({
        href: target.href,
        label: target.label,
        blurb: target.blurb,
        kind: target.kind,
      }));

  return { guides: pick("guide"), calculators: pick("calculator") };
}
