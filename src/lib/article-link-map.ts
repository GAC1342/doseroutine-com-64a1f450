/**
 * Internal linking map for the /articles hub-and-spoke cluster.
 *
 * Rules encoded here (checked by scripts/validate-articles.mjs and the
 * publishing tests):
 *  - Every "best apps for…" style post links to its cluster pillar.
 *  - The pillar links back out to its spokes so equity circulates.
 *  - Every post carries at least MIN_INTERNAL_LINKS in-body internal links.
 */

import { CONTENT_CALENDAR, type CalendarEntry } from "@/lib/content-calendar";

export const ARTICLES_PREFIX = "/articles";

/** Canonical pillar for each editorial cluster. */
export const CLUSTER_PILLARS: Record<string, string> = {
  "Best-apps hub": "/articles/best-medication-reminder-apps",
  Audience: "/articles/best-medication-reminder-apps",
  Platform: "/articles/best-medication-reminder-apps",
  Feature: "/articles/best-medication-reminder-apps",
  Comparison: "/articles/best-medication-reminder-apps",
  "How-to": "/articles/medication-reminder-app",
  Troubleshooting: "/articles/medication-reminder-app",
  Trust: "/articles/medication-reminder-app",
  Timing: "/articles/medication-reminder-app",
  Interactions: "/articles/medication-reminder-app",
  Definitions: "/articles/medication-reminder-app",
  Calculator: "/articles/best-apps-for-peptide-tracking",
  Objection: "/articles/best-medication-reminder-apps",
};

/** The site-wide pillar every commercial roundup must reach. */
export const PRIMARY_PILLAR = "/articles/best-medication-reminder-apps";

/** Where the primary pillar itself sends equity. */
export const SECONDARY_PILLAR = "/articles/medication-reminder-app";

export const MIN_INTERNAL_LINKS = 3;

export type LinkPlan = {
  slug: string;
  path: string;
  /** Pillar this post must link to. */
  pillar: string;
  /** Sibling cluster posts worth linking when they are live. */
  siblings: string[];
  /** Product/support routes planned for this post. */
  supporting: string[];
  /** True for roundups that must link the primary pillar. */
  requiresPrimaryPillar: boolean;
};

function isRoundup(entry: CalendarEntry): boolean {
  return (
    entry.searchIntent === "commercial" ||
    /^best /i.test(entry.title) ||
    entry.primaryKeyword.startsWith("best ")
  );
}

function planFor(entry: CalendarEntry): LinkPlan {
  const path = `${ARTICLES_PREFIX}/${entry.slug}`;
  const pillar = CLUSTER_PILLARS[entry.cluster] ?? PRIMARY_PILLAR;
  const siblings = CONTENT_CALENDAR.filter(
    (e) => e.cluster === entry.cluster && e.slug !== entry.slug,
  )
    .slice(0, 4)
    .map((e) => `${ARTICLES_PREFIX}/${e.slug}`);

  return {
    slug: entry.slug,
    path,
    // A pillar never links to itself; it points at the buyer's guide instead.
    pillar: pillar === path ? SECONDARY_PILLAR : pillar,
    siblings,
    supporting: entry.secondaryLinks,
    requiresPrimaryPillar: isRoundup(entry) && path !== PRIMARY_PILLAR,
  };
}

export const LINK_MAP: LinkPlan[] = CONTENT_CALENDAR.map(planFor);

export function linkPlan(slug: string): LinkPlan | null {
  return LINK_MAP.find((p) => p.slug === slug) ?? null;
}

/** Internal paths linked from a markdown body. */
export function internalLinksIn(markdown: string): string[] {
  const out = new Set<string>();
  for (const m of markdown.matchAll(/\]\((\/[a-z0-9\-/.$]*)\)/gi)) out.add(m[1]);
  return [...out];
}

export type LinkViolation = { slug: string; rule: string; detail: string };

/**
 * Checks a published body against its plan. `liveSlugs` limits sibling
 * expectations to posts that already exist, so week 1 is not penalised for
 * week 6 not being written yet.
 */
export function checkLinks(
  slug: string,
  markdown: string,
  liveSlugs: readonly string[],
): LinkViolation[] {
  const plan = linkPlan(slug);
  if (!plan) return [{ slug, rule: "calendar", detail: "slug is not in the content calendar" }];

  const links = internalLinksIn(markdown);
  const violations: LinkViolation[] = [];

  if (links.length < MIN_INTERNAL_LINKS) {
    violations.push({
      slug,
      rule: "min-internal-links",
      detail: `${links.length} internal links, needs ${MIN_INTERNAL_LINKS}`,
    });
  }

  const pillarLive = liveSlugs.includes(plan.pillar.replace(`${ARTICLES_PREFIX}/`, ""));
  if (plan.requiresPrimaryPillar && pillarLive && !links.includes(plan.pillar)) {
    violations.push({ slug, rule: "pillar-link", detail: `must link ${plan.pillar}` });
  }

  const liveSiblings = plan.siblings.filter((s) =>
    liveSlugs.includes(s.replace(`${ARTICLES_PREFIX}/`, "")),
  );
  if (liveSiblings.length > 0 && !liveSiblings.some((s) => links.includes(s))) {
    violations.push({
      slug,
      rule: "cluster-link",
      detail: `link at least one live cluster sibling (${liveSiblings.join(", ")})`,
    });
  }

  if (links.includes(plan.path)) {
    violations.push({ slug, rule: "self-link", detail: "post links to itself" });
  }

  return violations;
}
