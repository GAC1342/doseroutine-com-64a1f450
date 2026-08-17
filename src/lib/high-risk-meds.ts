/**
 * Slug prefixes for prescription medications considered "high-risk"
 * for interaction surfaces: cardiovascular, blood-pressure, and
 * anticoagulant/antiplatelet drugs. Prefix match keeps the list
 * resilient to brand/dose suffixes (e.g. "finasteride-1mg").
 */
const HIGH_RISK_SLUG_PREFIXES: readonly string[] = [
  // ACE inhibitors
  "lisinopril",
  "enalapril",
  "ramipril",
  "benazepril",
  "captopril",
  "perindopril",
  // ARBs
  "losartan",
  "valsartan",
  "olmesartan",
  "irbesartan",
  "candesartan",
  "telmisartan",
  // Beta blockers
  "metoprolol",
  "atenolol",
  "carvedilol",
  "propranolol",
  "bisoprolol",
  "nebivolol",
  "labetalol",
  "sotalol",
  // Calcium channel blockers
  "amlodipine",
  "diltiazem",
  "verapamil",
  "nifedipine",
  "felodipine",
  // Diuretics
  "hydrochlorothiazide",
  "furosemide",
  "spironolactone",
  "chlorthalidone",
  "torsemide",
  "bumetanide",
  // Alpha agonists / other antihypertensives
  "clonidine",
  "guanfacine",
  "doxazosin",
  "prazosin",
  "hydralazine",
  // Anticoagulants
  "warfarin",
  "apixaban",
  "rivaroxaban",
  "dabigatran",
  "edoxaban",
  "heparin",
  // Antiplatelets
  "clopidogrel",
  "ticagrelor",
  "prasugrel",
  "aspirin",
  // Antiarrhythmics / heart failure
  "amiodarone",
  "digoxin",
  "flecainide",
  "dronedarone",
  // Nitrates
  "nitroglycerin",
  "isosorbide",
];

export type HighRiskCategory =
  | "ace-arb"
  | "beta-blocker"
  | "ccb"
  | "diuretic"
  | "alpha"
  | "anticoagulant"
  | "antiplatelet"
  | "antiarrhythmic"
  | "nitrate";

const CATEGORY_MAP: Array<{ cat: HighRiskCategory; slugs: string[] }> = [
  {
    cat: "ace-arb",
    slugs: [
      "lisinopril",
      "enalapril",
      "ramipril",
      "benazepril",
      "captopril",
      "perindopril",
      "losartan",
      "valsartan",
      "olmesartan",
      "irbesartan",
      "candesartan",
      "telmisartan",
    ],
  },
  {
    cat: "beta-blocker",
    slugs: [
      "metoprolol",
      "atenolol",
      "carvedilol",
      "propranolol",
      "bisoprolol",
      "nebivolol",
      "labetalol",
      "sotalol",
    ],
  },
  { cat: "ccb", slugs: ["amlodipine", "diltiazem", "verapamil", "nifedipine", "felodipine"] },
  {
    cat: "diuretic",
    slugs: [
      "hydrochlorothiazide",
      "furosemide",
      "spironolactone",
      "chlorthalidone",
      "torsemide",
      "bumetanide",
    ],
  },
  { cat: "alpha", slugs: ["clonidine", "guanfacine", "doxazosin", "prazosin", "hydralazine"] },
  {
    cat: "anticoagulant",
    slugs: ["warfarin", "apixaban", "rivaroxaban", "dabigatran", "edoxaban", "heparin"],
  },
  { cat: "antiplatelet", slugs: ["clopidogrel", "ticagrelor", "prasugrel", "aspirin"] },
  { cat: "antiarrhythmic", slugs: ["amiodarone", "digoxin", "flecainide", "dronedarone"] },
  { cat: "nitrate", slugs: ["nitroglycerin", "isosorbide"] },
];

export const HIGH_RISK_CATEGORY_LABEL: Record<HighRiskCategory, string> = {
  "ace-arb": "ACE inhibitor / ARB",
  "beta-blocker": "Beta blocker",
  ccb: "Calcium channel blocker",
  diuretic: "Diuretic",
  alpha: "Alpha agonist / antihypertensive",
  anticoagulant: "Anticoagulant (blood thinner)",
  antiplatelet: "Antiplatelet",
  antiarrhythmic: "Antiarrhythmic / heart failure",
  nitrate: "Nitrate",
};

function slugMatchesPrefix(slug: string | null | undefined, prefix: string): boolean {
  if (!slug) return false;
  return slug === prefix || slug.startsWith(prefix + "-");
}

export function isHighRiskCardioMed(
  compound: { slug: string | null; category: string | null } | null | undefined,
): boolean {
  if (!compound || compound.category !== "medication" || !compound.slug) return false;
  return HIGH_RISK_SLUG_PREFIXES.some((p) => slugMatchesPrefix(compound.slug, p));
}

export function classifyHighRiskCardioMed(
  compound: { slug: string | null; category: string | null } | null | undefined,
): HighRiskCategory | null {
  if (!compound || compound.category !== "medication" || !compound.slug) return null;
  for (const entry of CATEGORY_MAP) {
    if (entry.slugs.some((p) => slugMatchesPrefix(compound.slug, p))) return entry.cat;
  }
  return null;
}
