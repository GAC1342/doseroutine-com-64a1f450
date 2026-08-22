/**
 * Per-page internal linking recommendations.
 *
 * Derived from the keyword map so the plan can never drift from the pages that
 * actually exist: every recommendation points at a `status: "live"` target (or
 * a known evergreen destination), and every reason is explicit so a writer can
 * see why the link belongs in the body rather than in a link dump.
 *
 * Ordering is fully deterministic (kind rank -> volume -> path) so the admin
 * view, the CSV export and the rendered related-pages modules always agree.
 */

import { KEYWORD_PAGE_MAP, type KeywordCluster, type KeywordTarget } from "@/lib/keyword-page-map";

export type LinkKind =
  | "hub" // up-link to the cluster hub
  | "sibling" // same cluster, closest neighbour
  | "related-cluster" // adjacent cluster the reader moves to next
  | "comparison" // /vs/ page for switchers
  | "tool" // product surface that answers the query directly
  | "faq"; // canonical answer hub

export type InternalLink = {
  path: string;
  /** Anchor text to use — descriptive, never "click here". */
  anchor: string;
  kind: LinkKind;
  /** Why the link earns its place on this page. */
  reason: string;
};

/** Which clusters feed each other. Keeps the link graph intentional. */
const RELATED_CLUSTERS: Record<KeywordCluster, KeywordCluster[]> = {
  "Hub: medication reminder app": ["Best-of roundups", "Platform (iOS / Android)", "Audience"],
  "Best-of roundups": [
    "Hub: medication reminder app",
    "Competitor alternatives",
    "Platform (iOS / Android)",
  ],
  "Platform (iOS / Android)": ["Best-of roundups", "How-to / setup"],
  Audience: ["Best-of roundups", "How-to / setup"],
  "Competitor alternatives": ["Best-of roundups", "Product surfaces"],
  "How-to / setup": ["Hub: medication reminder app", "Product surfaces", "Audience"],
  "Product surfaces": ["Hub: medication reminder app", "How-to / setup"],
};

const CLUSTER_HUB: Partial<Record<KeywordCluster, string>> = {
  "Hub: medication reminder app": "/best-medication-reminder-app",
  "Best-of roundups": "/best-medication-reminder-app",
  "Platform (iOS / Android)": "/best-medication-reminder-app",
  Audience: "/best-medication-reminder-app",
  "Competitor alternatives": "/vs",
  "How-to / setup": "/best-medication-reminder-app",
  "Product surfaces": "/best-medication-reminder-app",
};

/** Comparison pages that exist as routes, in stable order. */
export const COMPARISON_PAGES: Array<{ path: string; anchor: string }> = [
  { path: "/vs", anchor: "How DoseRoutine compares with other apps" },
  { path: "/vs/medisafe", anchor: "DoseRoutine vs Medisafe" },
  { path: "/vs/mytherapy", anchor: "DoseRoutine vs MyTherapy" },
  { path: "/vs/pill-reminder", anchor: "DoseRoutine vs basic pill reminders" },
  { path: "/vs/round-health", anchor: "DoseRoutine vs Round Health" },
];

/** Evergreen destinations every content page may link to. */
const EVERGREEN: Record<string, { path: string; anchor: string; kind: LinkKind; reason: string }> =
  {
    faq: {
      path: "/faq",
      anchor: "DoseRoutine FAQs",
      kind: "faq",
      reason: "Canonical answers hub — absorbs the long tail of follow-up questions.",
    },
    adherence: {
      path: "/adherence",
      anchor: "how adherence is calculated",
      kind: "tool",
      reason: "Turns the article's advice into a number the reader can track.",
    },
    interactions: {
      path: "/interaction-checker",
      anchor: "the interaction checker",
      kind: "tool",
      reason: "Direct utility for timing and combination questions.",
    },
    doctorReport: {
      path: "/doctor-report",
      anchor: "the doctor-ready medication report",
      kind: "tool",
      reason: "Next step for readers preparing for an appointment.",
    },
    install: {
      path: "/install",
      anchor: "install DoseRoutine",
      kind: "tool",
      reason: "Transactional endpoint for readers who have decided.",
    },
  };

const KIND_RANK: Record<LinkKind, number> = {
  hub: 0,
  sibling: 1,
  "related-cluster": 2,
  comparison: 3,
  tool: 4,
  faq: 5,
};

function liveTargets(): KeywordTarget[] {
  return KEYWORD_PAGE_MAP.filter((r) => r.status === "live");
}

function anchorFor(target: KeywordTarget): string {
  // Sentence-case the primary keyword: descriptive anchors, no exact-match spam.
  return target.primaryKeyword.charAt(0).toUpperCase() + target.primaryKeyword.slice(1);
}

function sortLinks(links: InternalLink[]): InternalLink[] {
  const volume = new Map(KEYWORD_PAGE_MAP.map((r) => [r.targetPath, r.volume]));
  return links.sort(
    (a, b) =>
      KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
      (volume.get(b.path) ?? 0) - (volume.get(a.path) ?? 0) ||
      a.path.localeCompare(b.path),
  );
}

/**
 * Recommended internal links for a page, keyed by its route path.
 * Returns an empty list for paths outside the keyword map.
 */
export function internalLinksFor(path: string, limit = 8): InternalLink[] {
  const target = KEYWORD_PAGE_MAP.find((r) => r.targetPath === path);
  if (!target) return [];

  const seen = new Set<string>([path]);
  const links: InternalLink[] = [];
  const push = (link: InternalLink) => {
    if (seen.has(link.path)) return;
    seen.add(link.path);
    links.push(link);
  };

  const hub = CLUSTER_HUB[target.cluster];
  if (hub && hub !== path) {
    push({
      path: hub,
      anchor: hub === "/vs" ? "the full app comparison" : "the medication reminder app guide",
      kind: "hub",
      reason: `Up-link to the ${target.cluster} hub so authority consolidates on one page.`,
    });
  }

  // Siblings in the same cluster. The cluster's strongest page deliberately
  // links DOWN to its weakest siblings (that is how a hub passes authority);
  // every other page links up to the strongest two. Between them, no live page
  // in a cluster is left without an inbound link.
  const siblings = liveTargets().filter(
    (r) => r.cluster === target.cluster && r.targetPath !== path,
  );
  const isClusterLead = siblings.every(
    (r) =>
      r.volume < target.volume || (r.volume === target.volume && target.targetPath < r.targetPath),
  );
  for (const sibling of [...siblings]
    .sort((a, b) =>
      isClusterLead
        ? a.volume - b.volume || a.targetPath.localeCompare(b.targetPath)
        : b.volume - a.volume || a.targetPath.localeCompare(b.targetPath),
    )
    .slice(0, 2)) {
    push({
      path: sibling.targetPath,
      anchor: anchorFor(sibling),
      kind: "sibling",
      reason: `Same cluster (${sibling.cluster}) — readers comparing options expect both.`,
    });
  }

  // One strongest page from each adjacent cluster.
  for (const cluster of RELATED_CLUSTERS[target.cluster] ?? []) {
    const best = liveTargets()
      .filter((r) => r.cluster === cluster && r.targetPath !== path)
      .sort((a, b) => b.volume - a.volume)[0];
    if (!best) continue;
    push({
      path: best.targetPath,
      anchor: anchorFor(best),
      kind: "related-cluster",
      reason: `Adjacent cluster (${cluster}) — the natural next question after this page.`,
    });
  }

  // Comparison pages: always for decision-stage and navigational intent.
  if (target.stage === "decision" || target.intent === "navigational") {
    for (const cmp of COMPARISON_PAGES.slice(0, 3)) {
      push({
        path: cmp.path,
        anchor: cmp.anchor,
        kind: "comparison",
        reason:
          "Decision-stage reader is shortlisting; comparisons reduce the bounce back to search.",
      });
    }
  } else {
    push({
      path: COMPARISON_PAGES[0].path,
      anchor: COMPARISON_PAGES[0].anchor,
      kind: "comparison",
      reason: "Gives an informational reader a route into the decision cluster.",
    });
  }

  // Tools that match the page's job.
  if (/interaction|supplement|timing/i.test(`${target.primaryKeyword} ${target.pageJob}`)) {
    push(EVERGREEN.interactions);
  }
  if (/adherence|missed|dose|schedule|multiple/i.test(target.primaryKeyword)) {
    push(EVERGREEN.adherence);
  }
  if (/doctor|report|prescription/i.test(`${target.primaryKeyword} ${target.pageJob}`)) {
    push(EVERGREEN.doctorReport);
  }
  if (target.intent === "transactional" || target.stage === "decision") {
    push(EVERGREEN.install);
  }
  push(EVERGREEN.faq);

  return sortLinks(links).slice(0, limit);
}

/** The whole plan, page by page — used by the admin view and the CSV export. */
export function internalLinkPlan(): Array<{ target: KeywordTarget; links: InternalLink[] }> {
  return KEYWORD_PAGE_MAP.map((target) => ({
    target,
    links: internalLinksFor(target.targetPath),
  }));
}

/** Inbound link count per path across the whole plan — spots orphan pages. */
export function inboundLinkCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { links } of internalLinkPlan()) {
    for (const link of links) counts.set(link.path, (counts.get(link.path) ?? 0) + 1);
  }
  return counts;
}

/** Live keyword-map pages nothing else links to. */
export function orphanPages(): string[] {
  const counts = inboundLinkCounts();
  return KEYWORD_PAGE_MAP.filter((r) => r.status === "live" && !counts.get(r.targetPath))
    .map((r) => r.targetPath)
    .sort();
}

export function internalLinkPlanToCsv(): string {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const header = ["Page", "Links to", "Anchor text", "Link type", "Why"];
  const lines = internalLinkPlan().flatMap(({ target, links }) =>
    links.map((link) =>
      [target.targetPath, link.path, link.anchor, link.kind, link.reason].map(escape).join(","),
    ),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}
