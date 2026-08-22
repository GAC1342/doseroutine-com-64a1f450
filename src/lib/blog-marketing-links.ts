/**
 * Reverse internal-linking: blog posts → the most relevant /best-* roundups
 * and /for/* use-case pages.
 *
 * `marketing-blog-links.ts` sends marketing pages *into* research sections.
 * This module closes the loop automatically so topical clusters link both
 * ways, without hand-maintaining a second table:
 *
 * 1. Reciprocity — any marketing page whose plan already deep-links a post
 *    gets a link back from that post.
 * 2. Topic match — a post's tags (compound / mechanism labels) are scored
 *    against each page's topic keywords, so new posts pick up the right pages
 *    with no extra wiring.
 *
 * Results are ranked (reciprocal first, then topic score) and capped so a post
 * never turns into a link farm.
 */

import type { BlogPost } from "@/lib/blog-posts";
import { MARKETING_BLOG_LINKS } from "@/lib/marketing-blog-links";

export type MarketingPage = {
  /** Key used in MARKETING_BLOG_LINKS. */
  key: string;
  href: string;
  /** Descriptive anchor text — never "read more". */
  anchor: string;
  blurb: string;
  /** Lowercase topic keywords matched against post tags and title. */
  topics: string[];
};

/**
 * Small, render-safe metadata for the 12 marketing pages. Kept here (rather
 * than importing the large roundup dataset) so the blog route stays light;
 * `blog-marketing-links.test.ts` asserts every key still exists upstream.
 */
export const MARKETING_PAGES: MarketingPage[] = [
  {
    key: "best-glp-1-tracking-app",
    href: "/best-glp-1-tracking-app",
    anchor: "the best GLP-1 tracking apps compared for 2026",
    blurb: "How dose logging, titration history and side-effect notes differ across apps.",
    topics: ["glp-1", "semaglutide", "tirzepatide", "retatrutide", "orforglipron", "gip"],
  },
  {
    key: "best-peptide-tracking-app",
    href: "/best-peptide-tracking-app",
    anchor: "the best peptide tracking apps for reconstitution and vial math",
    blurb: "Which trackers handle concentration, syringe units and vial expiry properly.",
    topics: ["peptide", "retatrutide", "reconstitution", "subcutaneous injection", "vial"],
  },
  {
    key: "best-app-for-tracking-peptides-supplements-hormones",
    href: "/best-app-for-tracking-peptides-supplements-hormones",
    anchor: "tracking peptides, supplements and hormones in one place",
    blurb: "Why a single timeline beats three separate apps when protocols overlap.",
    topics: ["peptide", "supplement", "hormone", "stack", "glp-1"],
  },
  {
    key: "best-supplement-tracker-app",
    href: "/best-supplement-tracker-app",
    anchor: "the best supplement tracker apps for daily adherence",
    blurb: "Reminder reliability, interaction checks and adherence history compared.",
    topics: ["supplement", "protein", "lean mass preservation", "metformin"],
  },
  {
    key: "best-biohacking-tracker-app",
    href: "/best-biohacking-tracker-app",
    anchor: "the best biohacking trackers for self-experiments",
    blurb: "Logging protocols, labs and outcomes so a change can actually be attributed.",
    topics: ["biohacking", "phase 3", "lean mass preservation", "experiment"],
  },
  {
    key: "best-health-stack-insights-app",
    href: "/best-health-stack-insights-app",
    anchor: "a health app that turns your log into insights",
    blurb: "Adherence trends, timing patterns and what your data says over months.",
    topics: ["adherence", "glp-1", "stack", "supplement", "peptide"],
  },
  {
    key: "best-trt-tracking-app",
    href: "/best-trt-tracking-app",
    anchor: "the best TRT tracking apps for injections and labs",
    blurb: "Injection scheduling, site rotation and bloodwork trends in one record.",
    topics: ["trt", "testosterone", "hormone", "subcutaneous injection", "intramuscular"],
  },
  {
    key: "best-hormone-therapy-app-for-men",
    href: "/best-hormone-therapy-app-for-men",
    anchor: "hormone therapy management apps for men",
    blurb: "Protocol tracking built around labs, dose changes and symptom notes.",
    topics: ["hormone", "testosterone", "trt"],
  },
  {
    key: "best-hrt-tracking-app-for-women",
    href: "/best-hrt-tracking-app-for-women",
    anchor: "HRT tracking apps for women",
    blurb: "Estradiol, progesterone and testosterone doses tracked next to symptoms and labs.",
    topics: ["hrt", "estradiol", "progesterone", "menopause", "hormone"],
  },

  {
    key: "glp-1",
    href: "/for/glp-1",
    anchor: "how DoseRoutine handles GLP-1 protocols week to week",
    blurb: "Weekly shot reminders, titration steps and missed-dose handling.",
    topics: ["glp-1", "semaglutide", "tirzepatide", "retatrutide", "orforglipron", "gip"],
  },
  {
    key: "peptides",
    href: "/for/peptides",
    anchor: "DoseRoutine's peptide reconstitution and vial tracking",
    blurb: "Built-in mixing calculator, unit conversion and vial-life countdown.",
    topics: ["peptide", "reconstitution", "vial", "subcutaneous injection", "retatrutide"],
  },
  {
    key: "trt",
    href: "/for/trt",
    anchor: "DoseRoutine for TRT schedules and injection sites",
    blurb: "Site rotation map, dose history and lab reminders for hormone protocols.",
    topics: ["trt", "testosterone", "hormone", "subcutaneous injection"],
  },
  {
    key: "biohackers",
    href: "/for/biohackers",
    anchor: "DoseRoutine for biohackers running structured protocols",
    blurb: "Stack versioning and outcome tracking for people testing changes deliberately.",
    topics: ["biohacking", "experiment", "phase 3", "lean mass preservation"],
  },
];

export type ResolvedMarketingLink = {
  key: string;
  href: string;
  anchor: string;
  blurb: string;
  /** True when that page's own plan already deep-links this post. */
  reciprocal: boolean;
  score: number;
};

/** Pages whose planned links point at this post slug. */
function reciprocalKeys(slug: string): Set<string> {
  const keys = new Set<string>();
  for (const [pageKey, links] of Object.entries(MARKETING_BLOG_LINKS)) {
    if (links.some((l) => l.post === slug)) keys.add(pageKey);
  }
  return keys;
}

function haystack(post: BlogPost): string {
  return [
    post.heading,
    post.title,
    post.description,
    ...post.tags.map((t) => t.label),
    ...post.sections.map((s) => s.heading),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Rank marketing pages for a post. Reciprocal pages always win, then topic
 * overlap. Pages with no signal at all are dropped rather than padded.
 */
export function resolveBlogMarketingLinks(post: BlogPost, limit = 3): ResolvedMarketingLink[] {
  const recip = reciprocalKeys(post.slug);
  const text = haystack(post);

  const scored = MARKETING_PAGES.map((page) => {
    const hits = page.topics.filter((t) => text.includes(t)).length;
    const reciprocal = recip.has(page.key);
    return {
      key: page.key,
      href: page.href,
      anchor: page.anchor,
      blurb: page.blurb,
      reciprocal,
      score: hits + (reciprocal ? 10 : 0),
    };
  }).filter((p) => p.score > 0);

  scored.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return scored.slice(0, limit);
}
