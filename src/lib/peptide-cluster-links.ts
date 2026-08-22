/**
 * Internal-linking map for the /peptides education cluster.
 *
 * Every guide in the cluster must link back to the pillar page and to the
 * calculator hub with keyword-relevant anchor text — "click here" style or
 * bare-slug anchors waste the link. Centralising it here means a page cannot
 * silently drop those two links, and the anchors stay consistent sitewide.
 */

export type ClusterLink = { to: string; label: string };

/** The two links every cluster page must carry. */
export const PILLAR_LINK: ClusterLink = { to: "/peptides", label: "What are peptides?" };
export const CALCULATOR_LINK: ClusterLink = {
  to: "/peptides-calculator",
  label: "Peptides calculator",
};

/**
 * Per-page anchor text for the two hub links. Keyword-relevant to the page
 * doing the linking, so the same destination is described differently from
 * each source rather than repeating one anchor across the cluster.
 */
const HUB_ANCHORS: Record<string, { pillar: string; calculator: string }> = {
  "/peptides": {
    pillar: "What are peptides?",
    calculator: "Peptides calculator",
  },
  "/peptides-calculator": {
    pillar: "What are peptides?",
    calculator: "Peptides calculator",
  },
  "/peptides/peptide-bond": {
    pillar: "What are peptides? Types and uses",
    calculator: "Peptides calculator: reconstitution math",
  },
  "/peptides/collagen-peptides": {
    pillar: "What are peptides, and how collagen differs",
    calculator: "Peptides calculator for injectable protocols",
  },
  "/peptides/cell-penetrating-peptides": {
    pillar: "What are peptides? Plain-English overview",
    calculator: "Peptides calculator for dosed protocols",
  },
  "/peptides/how-to-vet-a-peptide-supplier": {
    pillar: "What are peptides? Types, uses and safety",
    calculator: "Peptides calculator: dose your vial correctly",
  },
  "/peptides/bpc-157": {
    pillar: "What are peptides? Types, uses and safety",
    calculator: "Peptides calculator for BPC-157 dosing",
  },
  "/peptides/tb-500": {
    pillar: "What are peptides? Types, uses and safety",
    calculator: "Peptides calculator for TB-500 dosing",
  },
  "/peptides/semax": {
    pillar: "What are peptides? Types, uses and safety",
    calculator: "Peptides calculator for Semax dosing",
  },
  "/peptides/bacteriostatic-water": {
    pillar: "What are peptides? Types, uses and safety",
    calculator: "Peptides calculator: how much water to add",
  },
  "/peptides/how-to-reconstitute-peptides": {
    pillar: "What are peptides? Types, uses and safety",
    calculator: "Peptides calculator for reconstitution math",
  },
  "/peptides/peptide-dosage-chart": {
    pillar: "What are peptides? Types, uses and safety",
    calculator: "Peptides calculator for your own dosage chart",
  },
  "/peptides/cjc-1295-ipamorelin": {
    pillar: "What are peptides? Types, uses and safety",
    calculator: "Peptides calculator for CJC-1295 and ipamorelin dosing",
  },
  "/peptides/retatrutide-dosing": {
    pillar: "What are peptides? Types, uses and safety",
    calculator: "Peptides calculator for retatrutide dose conversions",
  },
};

/** Sibling suggestions, keyed by the page doing the linking. */
const SIBLINGS: Record<string, ClusterLink[]> = {
  "/peptides": [
    { to: "/peptides/bpc-157", label: "BPC-157 peptides" },
    { to: "/peptides/tb-500", label: "TB-500 peptides" },
    { to: "/peptides/semax", label: "Semax peptides" },
    { to: "/peptides/peptide-bond", label: "What is a peptide bond?" },
    { to: "/peptides/collagen-peptides", label: "Collagen peptides supplements" },
    { to: "/peptides/cell-penetrating-peptides", label: "Cell-penetrating peptides" },
    { to: "/peptides/how-to-vet-a-peptide-supplier", label: "How to vet a peptide supplier" },
    { to: "/peptides/how-to-reconstitute-peptides", label: "How to reconstitute peptides" },
    { to: "/peptides/bacteriostatic-water", label: "Bacteriostatic water explained" },
    { to: "/peptides/peptide-dosage-chart", label: "Peptide dosage chart" },
    { to: "/peptides/cjc-1295-ipamorelin", label: "CJC-1295 and ipamorelin" },
    { to: "/peptides/retatrutide-dosing", label: "Retatrutide dosing guide" },
  ],
  "/peptides-calculator": [
    { to: "/peptides/bpc-157", label: "BPC-157 peptides" },
    { to: "/peptides/tb-500", label: "TB-500 peptides" },
    { to: "/peptides/semax", label: "Semax peptides" },
    { to: "/peptides/peptide-bond", label: "Why peptides need cold storage" },
    { to: "/peptides/how-to-vet-a-peptide-supplier", label: "How to vet a peptide supplier" },
    {
      to: "/peptides/how-to-reconstitute-peptides",
      label: "How to reconstitute peptides step by step",
    },
    { to: "/peptides/bacteriostatic-water", label: "Bacteriostatic water: how much to add" },
    { to: "/peptides/peptide-dosage-chart", label: "Peptide dosage chart" },
  ],
  "/peptides/bpc-157": [
    { to: "/peptides/tb-500", label: "TB-500 peptides" },
    { to: "/library/compare/bpc-157-vs-tb-500", label: "BPC-157 vs TB-500" },
    { to: "/library/bpc-157", label: "BPC-157 in the compound library" },
    { to: "/peptides/how-to-vet-a-peptide-supplier", label: "How to vet a peptide supplier" },
  ],
  "/peptides/tb-500": [
    { to: "/peptides/bpc-157", label: "BPC-157 peptides" },
    { to: "/library/compare/bpc-157-vs-tb-500", label: "BPC-157 vs TB-500" },
    { to: "/library/tb-500", label: "TB-500 in the compound library" },
    { to: "/peptides/how-to-vet-a-peptide-supplier", label: "How to vet a peptide supplier" },
  ],
  "/peptides/semax": [
    { to: "/library/semax", label: "Semax in the compound library" },
    { to: "/peptides/bpc-157", label: "BPC-157 peptides" },
    { to: "/peptides/how-to-vet-a-peptide-supplier", label: "How to vet a peptide supplier" },
    { to: "/peptides/peptide-bond", label: "Why peptides need cold storage" },
  ],
  "/peptides/peptide-bond": [
    { to: "/peptides/collagen-peptides", label: "Collagen peptides supplements" },
    { to: "/reconstitution-calculator", label: "Reconstitution calculator" },
    { to: "/dosage-units-guide", label: "Dosage units guide" },
  ],
  "/peptides/collagen-peptides": [
    { to: "/library/collagen", label: "Collagen peptides in the compound library" },
    { to: "/peptides/peptide-bond", label: "What is a peptide bond?" },
    { to: "/best-supplement-tracker-app", label: "Best supplement tracker app" },
  ],
  "/peptides/cell-penetrating-peptides": [
    { to: "/peptides/peptide-bond", label: "What is a peptide bond?" },
    { to: "/library", label: "Compound library" },
  ],
  "/peptides/how-to-vet-a-peptide-supplier": [
    { to: "/peptides/bpc-157", label: "BPC-157 peptides" },
    { to: "/peptides/tb-500", label: "TB-500 peptides" },
    { to: "/peptides/peptide-bond", label: "Why peptides need cold storage" },
  ],
  "/peptides/bacteriostatic-water": [
    {
      to: "/peptides/how-to-reconstitute-peptides",
      label: "How to reconstitute peptides step by step",
    },
    { to: "/peptides/peptide-dosage-chart", label: "Peptide dosage chart" },
    { to: "/reconstitution-calculator", label: "Reconstitution calculator" },
    { to: "/peptides/how-to-vet-a-peptide-supplier", label: "How to vet a peptide supplier" },
  ],
  "/peptides/how-to-reconstitute-peptides": [
    { to: "/peptides/bacteriostatic-water", label: "Bacteriostatic water explained" },
    { to: "/peptides/peptide-dosage-chart", label: "Peptide dosage chart" },
    { to: "/dosage-units-guide", label: "Dosage units guide: mg, mcg and IU" },
    { to: "/peptides/bpc-157", label: "BPC-157 peptides" },
  ],
  "/peptides/peptide-dosage-chart": [
    { to: "/peptides/how-to-reconstitute-peptides", label: "How to reconstitute peptides" },
    { to: "/peptides/bacteriostatic-water", label: "Bacteriostatic water explained" },
    { to: "/peptides/cjc-1295-ipamorelin", label: "CJC-1295 and ipamorelin dosing" },
    { to: "/peptide-interaction-checker", label: "Peptide interaction checker" },
  ],
  "/peptides/cjc-1295-ipamorelin": [
    { to: "/library/ipamorelin", label: "Ipamorelin in the compound library" },
    { to: "/library/cjc-1295", label: "CJC-1295 in the compound library" },
    { to: "/peptides/how-to-reconstitute-peptides", label: "How to reconstitute peptides" },
    { to: "/peptides/how-to-vet-a-peptide-supplier", label: "How to vet a peptide supplier" },
  ],
  "/peptides/retatrutide-dosing": [
    { to: "/library/retatrutide", label: "Retatrutide in the compound library" },
    { to: "/library/retatrutide-dosage", label: "Retatrutide dosage calculator" },
    { to: "/peptides/how-to-reconstitute-peptides", label: "How to reconstitute peptides" },
    { to: "/peptides/peptide-dosage-chart", label: "Peptide dosage chart" },
  ],
};

/**
 * Builds the "See also" list for a cluster page: the pillar and calculator hub
 * first (unless this page IS one of them), then page-specific siblings, then
 * any extra links the page passes in. De-duplicated by destination.
 */
export function clusterRelated(path: string, extra: ClusterLink[] = []): ClusterLink[] {
  const anchors = HUB_ANCHORS[path];
  const hubs: ClusterLink[] = [];
  if (path !== PILLAR_LINK.to) {
    hubs.push({ to: PILLAR_LINK.to, label: anchors?.pillar ?? PILLAR_LINK.label });
  }
  if (path !== CALCULATOR_LINK.to) {
    hubs.push({ to: CALCULATOR_LINK.to, label: anchors?.calculator ?? CALCULATOR_LINK.label });
  }

  const seen = new Set<string>([path]);
  const out: ClusterLink[] = [];
  for (const link of [...hubs, ...(SIBLINGS[path] ?? []), ...extra]) {
    if (seen.has(link.to)) continue;
    seen.add(link.to);
    out.push(link);
  }
  return out;
}

/** Every page in the cluster, for tests and sitemap coverage checks. */
export const PEPTIDE_CLUSTER_PATHS = [
  "/peptides",
  "/peptides-calculator",
  "/peptides/bpc-157",
  "/peptides/tb-500",
  "/peptides/semax",
  "/peptides/peptide-bond",
  "/peptides/collagen-peptides",
  "/peptides/cell-penetrating-peptides",
  "/peptides/how-to-vet-a-peptide-supplier",
  "/peptides/bacteriostatic-water",
  "/peptides/how-to-reconstitute-peptides",
  "/peptides/peptide-dosage-chart",
  "/peptides/cjc-1295-ipamorelin",
  "/peptides/retatrutide-dosing",
] as const;
