// Curated list of high-value ("money") pages to monitor daily for
// indexing regressions and rich-snippet regressions. Keep small
// enough (<= ~50) to stay under GSC URL Inspection quota.

export const SITE_ORIGIN = "https://doseroutine.com";
export const GSC_SITE_URL = "sc-domain:doseroutine.com";

export const SEO_MONITOR_URLS: string[] = [
  // Core
  "/",
  "/about",
  "/library",
  "/interaction-checker",
  "/peptide-interaction-checker",
  "/trt-supplement-interactions",
  "/help",
  // Calculators
  "/peptide-dosage-calculator",
  "/peptide-reconstitution-calculator",
  "/trt-dosage-calculator",
  "/calculator",
  // Comparisons
  "/vs-supplement-planner",
  "/vs/medisafe",
  "/vs/mytherapy",
  "/vs/cronometer",
  "/vs/round-health",
  "/vs/pill-reminder",
  // Top library compounds
  "/library/testosterone-cypionate",
  "/library/semaglutide",
  "/library/tirzepatide",
  "/library/bpc-157",
  "/library/tb-500",
  "/library/nad-plus",
  "/library/creatine-monohydrate",
  "/library/magnesium-glycinate",
  "/library/nattokinase",
  "/library/l-theanine",
  "/library/astaxanthin",
  "/library/quercetin",
  "/library/black-seed-oil",
  "/library/urolithin-a",
  "/library/nicotinamide-riboside",
];

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_ORIGIN}${path}`;
}
