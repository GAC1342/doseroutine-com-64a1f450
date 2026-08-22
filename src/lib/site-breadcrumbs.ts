/**
 * Path-driven breadcrumb trails for public pages that don't already render
 * their own trail.
 *
 * Google detects a page's BreadcrumbList markup far more reliably when the
 * page also shows a matching visible trail, and a trail is a genuine
 * navigation aid on deep guide/article URLs. Compound pages
 * (`/library/<slug>`), interaction pages, blog tag archives, and the
 * per-compound calculators already render their own trails, so this resolver
 * deliberately returns null for them to avoid two trails on one page.
 */

export type TrailCrumb = { label: string; path: string };

/** Section landing pages: first segment -> human label. */
const SECTION_LABELS: Record<string, string> = {
  articles: "Articles",
  blog: "Blog",
  calculators: "Calculators",
  compare: "Compare",
  for: "Who it's for",
  goals: "Goals",
  help: "Help",
  legal: "Legal",
  library: "Library",
  peptides: "Peptides",
  vs: "Comparisons",
};

/** Exact-path labels where prettifying the slug would read badly. */
const PATH_LABELS: Record<string, string> = {
  "/about": "About",
  "/ai-policy": "AI policy",
  "/alternatives": "Alternatives",
  "/best-app-for-tracking-peptides-supplements-hormones": "Best all-in-one tracking app",
  "/best-biohacking-tracker-app": "Best biohacking tracker",
  "/best-dose-tracking-apps": "Best dose tracking apps",
  "/best-glp-1-tracking-app": "Best GLP-1 tracking app",
  "/best-health-stack-insights-app": "Best health stack insights app",
  "/best-hormone-therapy-app-for-men": "Best hormone therapy app",
  "/best-hrt-tracking-app-for-women": "Best HRT tracking app for women",

  "/best-medication-reminder-app": "Best medication reminder app",
  "/best-peptide-tracking-app": "Best peptide tracking app",
  "/best-supplement-tracker-app": "Best supplement tracker",
  "/best-trt-tracking-app": "Best TRT tracking app",
  "/booty-workout": "Booty workout",
  "/calculator": "Calculators",
  "/closed-testing": "Closed testing",
  "/cookies": "Cookies",
  "/data-deletion": "Data deletion",
  "/dosage-units-guide": "Dosage units guide",
  "/dose-routine": "Dose routine",
  "/editorial-policy": "Editorial policy",
  "/faq": "FAQ",
  "/install": "Install",
  "/interaction-checker": "Interaction checker",
  "/interactions": "Interactions",
  "/legal": "Legal",
  "/manual": "Manual",
  "/medical-disclaimer": "Medical disclaimer",
  "/menopause-supplement-interaction-checker": "Menopause interaction checker",
  "/peptide-calculator": "Peptide calculator",
  "/peptide-dosage-calculator": "Peptide dosage calculator",
  "/peptide-interaction-checker": "Peptide interaction checker",
  "/peptide-reconstitution-calculator": "Peptide reconstitution calculator",
  "/peptides-calculator": "Peptides calculator",
  "/privacy": "Privacy",
  "/reconstitution-calculator": "Reconstitution calculator",
  "/refund-policy": "Refund policy",
  "/sources": "Sources",
  "/status": "Status",
  "/trt-dosage-calculator": "TRT dosage calculator",
  "/trt-supplement-interactions": "TRT supplement interactions",
  "/vs-supplement-planner": "vs Supplement planner",
};

/** Legal pages hang off /legal rather than the site root. */
const LEGAL_CHILDREN = new Set([
  "/ai-policy",
  "/cookies",
  "/data-deletion",
  "/medical-disclaimer",
  "/privacy",
  "/refund-policy",
]);

/**
 * Route prefixes whose pages render their own visible trail (or are app
 * screens behind auth, where breadcrumbs would be noise).
 */
const SKIP_PREFIXES = [
  "/api/",
  "/admin",
  "/auth",
  "/lovable",
  "/interactions/",
  "/calculators/",
  "/blog/tag",
  "/today",
  "/stack",
  "/schedule",
  "/fitness",
  "/nutrition",
  "/scan",
  "/labs",
  "/insights",
  "/settings",
  "/profile",
  "/coach",
  "/timer",
  "/pill-id",
  "/health-sync",
  "/more",
  "/onboarding",
];

/** Tokens that should stay upper-case when a slug is prettified. */
const UPPER_TOKENS = new Set([
  "ai",
  "bac",
  "bpc",
  "cjc",
  "faq",
  "glp",
  "hcg",
  "hgh",
  "hrt",
  "igf",
  "iu",
  "mk",
  "nad",
  "pct",
  "shbg",
  "tb",
  "trt",
  "usa",
]);

export function prettifySlug(slug: string): string {
  const words = slug.split("-").filter(Boolean);
  if (!words.length) return slug;
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (UPPER_TOKENS.has(lower)) return lower.toUpperCase();
      // Alphanumeric codes like "157", "1295", "5" keep their digits as-is.
      if (/^\d+$/.test(word)) return word;
      if (i === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
      return lower;
    })
    .join(" ")
    .replace(/\bGlp 1\b/gi, "GLP-1");
}

function normalize(pathname: string): string {
  const [bare] = pathname.split(/[?#]/);
  if (!bare || bare === "/") return "/";
  return bare.length > 1 && bare.endsWith("/") ? bare.slice(0, -1) : bare;
}

/**
 * Library pages that do NOT render a trail of their own, so the shared one
 * must cover them. Everything else under /library/ (compound detail pages,
 * the women's-health cluster) already ships its own trail.
 */
const LIBRARY_TRAIL_PATHS = new Set([
  "/library/cjc-1295-ipamorelin",
  "/library/mens-health",
  "/library/prostate-health",
  "/library/retatrutide-dosage",
  "/library/testosterone-support",
]);

export function shouldRenderTrail(pathname: string): boolean {
  const path = normalize(pathname);
  if (path === "/") return false;
  if (SKIP_PREFIXES.some((p) => path === p || path.startsWith(p))) return false;
  // Compound library pages own their trail; the index, guides, comparison
  // pages and the listed topic pages do not.
  if (
    path.startsWith("/library/") &&
    !path.startsWith("/library/guides/") &&
    !path.startsWith("/library/compare/") &&
    !LIBRARY_TRAIL_PATHS.has(path)
  ) {
    return false;
  }
  return true;
}

/**
 * Build the visible trail for a pathname, or null when the page should not
 * show one. The shape mirrors the BreadcrumbList JSON-LD the routes emit:
 * Home is prepended by the renderer, and the final crumb is the current page.
 */
export function resolveTrail(pathname: string): TrailCrumb[] | null {
  if (!shouldRenderTrail(pathname)) return null;
  const path = normalize(pathname);
  const segments = path.slice(1).split("/");
  const crumbs: TrailCrumb[] = [];

  if (LEGAL_CHILDREN.has(path)) {
    crumbs.push({ label: "Legal", path: "/legal" });
  }

  let acc = "";
  segments.forEach((segment, i) => {
    acc += `/${segment}`;
    const isLast = i === segments.length - 1;
    const label =
      PATH_LABELS[acc] ?? (i === 0 ? SECTION_LABELS[segment] : undefined) ?? prettifySlug(segment);
    // "/library/guides/<slug>" — the middle "guides" segment is not a page.
    // "/library/guides/<slug>" and "/library/compare/<slug>" — the middle
    // segment is a grouping, not a page of its own.
    if (!isLast && (acc === "/library/guides" || acc === "/library/compare")) return;

    crumbs.push({ label, path: acc });
  });

  return crumbs.length ? crumbs : null;
}
