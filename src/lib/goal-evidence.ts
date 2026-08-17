/**
 * Evidence-driven goal tagging.
 *
 * Historically most compounds inherited a single default tag ("longevity"),
 * which produced goal hubs and "Related benefits" clusters that had no real
 * evidence link to the compound. This module derives goal tags from the
 * compound's OWN written evidence (benefits / evidence / mechanism / overview
 * markdown) using explicit phrase lists — never from category defaults.
 *
 * It is deterministic and side-effect free so it can be unit tested and re-run
 * by scripts/audit-goal-tags.ts to regenerate the retagging migration.
 */

import type { GoalSlug } from "./goals";

/**
 * Demographic / life-stage hubs. These are editorial audience groupings, not
 * mechanistic claims, so they are never auto-derived or auto-removed.
 */
export const CURATED_GOAL_TAGS: readonly string[] = [
  "mens-longevity",
  "womens-longevity",
  "menopause",
  "fertility",
];

/**
 * Phrases that indicate a real evidence link between a compound and a goal.
 * Matched case-insensitively against the compound's written sections.
 */
export const GOAL_EVIDENCE_PHRASES: Record<string, string[]> = {
  "weight-loss": [
    "weight loss",
    "fat loss",
    "body fat",
    "appetite suppress",
    "appetite regulation",
    "satiety",
    "obesity",
    "overweight",
    "glp-1",
    "energy expenditure",
    "thermogenesis",
    "lipolysis",
    "waist circumference",
  ],
  muscle: [
    "muscle protein synthesis",
    "lean mass",
    "lean body mass",
    "muscle mass",
    "hypertrophy",
    "strength gain",
    "muscular strength",
    "sarcopenia",
    "anabolic",
    "resistance training",
  ],
  recovery: [
    "wound healing",
    "tissue repair",
    "tissue regeneration",
    "tendon",
    "ligament",
    "cartilage repair",
    "injury recovery",
    "post-exercise recovery",
    "muscle soreness",
    "muscle damage",
    "collagen synthesis",
    "healing",
  ],
  brain: [
    "cognitive function",
    "cognition",
    "memory",
    "learning",
    "focus",
    "attention",
    "neuroprotect",
    "nootropic",
    "bdnf",
    "acetylcholine",
    "mood",
    "anxiety",
    "depressive",
    "depression",
  ],
  longevity: [
    "lifespan",
    "healthspan",
    "senescence",
    "senescent",
    "cellular aging",
    "cellular ageing",
    "autophagy",
    "nad+",
    "telomere",
    "sirtuin",
    "age-related decline",
    "anti-aging",
    "biological age",
  ],
  mitochondria: [
    "mitochondri",
    "atp production",
    "oxidative phosphorylation",
    "electron transport chain",
    "cellular energy production",
  ],
  endurance: [
    "vo2",
    "vo₂",
    "aerobic capacity",
    "endurance",
    "stamina",
    "time to exhaustion",
    "exercise capacity",
    "exercise performance",
  ],
  prostate: [
    "prostate",
    "benign prostatic",
    "bph",
    "urinary flow",
    "lower urinary tract",
    "psa",
  ],
  testosterone: [
    "testosterone",
    "luteinizing hormone",
    "free testosterone",
    "androgen",
    "hypogonad",
  ],
  libido: [
    "libido",
    "sexual desire",
    "sexual function",
    "sexual performance",
    "erectile",
    "arousal",
  ],
  immune: [
    "immune function",
    "immune response",
    "immune system",
    "immunity",
    "natural killer",
    "t-lymphocyte",
    "t lymphocyte",
    "antiviral",
    "common cold",
    "infection duration",
    "respiratory infection",
  ],
  cardiovascular: [
    "blood pressure",
    "cardiovascular",
    "endothelial",
    "ldl cholesterol",
    "triglyceride",
    "arterial stiffness",
    "heart health",
    "cardiac function",
    "lipid profile",
  ],
  "bone-joint": [
    "bone mineral density",
    "bone density",
    "osteoporosis",
    "osteopenia",
    "osteoarthritis",
    "joint pain",
    "joint function",
    "cartilage",
    "bone loss",
  ],
  sleep: [
    "sleep quality",
    "sleep latency",
    "sleep onset",
    "sleep duration",
    "insomnia",
    "circadian rhythm",
  ],
  "blood-sugar": [
    "insulin sensitivity",
    "insulin resistance",
    "blood glucose",
    "glycemic control",
    "glycaemic control",
    "hba1c",
    "fasting glucose",
  ],
  "skin-hair": [
    "skin elasticity",
    "skin hydration",
    "wrinkle",
    "photoaging",
    "hair growth",
    "hair loss",
    "alopecia",
    "dermal",
  ],
};

export interface GoalEvidenceSources {
  /** Strongest signal: what the compound is documented to do. */
  benefitsMd?: string | null;
  evidenceMd?: string | null;
  /** Weaker signal: mechanism / general overview prose. */
  mechanismMd?: string | null;
  overviewMd?: string | null;
  educationMd?: string | null;
}

export interface GoalEvidenceScore {
  goal: string;
  /** Weighted phrase hits (benefits/evidence count double). */
  score: number;
  /** Distinct phrases that matched, for the audit report. */
  matches: string[];
  /** Distinct phrases that matched inside benefits/evidence prose. */
  primaryMatches: string[];
  /** True when at least one hit came from benefits/evidence prose. */
  primary: boolean;
}

const WEIGHT_PRIMARY = 2;
const WEIGHT_SECONDARY = 1;

/** Minimum weighted score for a tag to be considered evidence-backed. */
export const GOAL_SCORE_THRESHOLD = 6;

/**
 * Minimum number of DISTINCT evidence phrases that must appear in the
 * benefits/evidence prose. One passing mention ("supports immune system")
 * inside an unrelated monograph must never create a goal hub link.
 */
export const GOAL_DISTINCT_PHRASE_MINIMUM = 2;


function countPhrase(haystack: string, phrase: string): number {
  if (!haystack) return 0;
  let from = 0;
  let n = 0;
  while (true) {
    const i = haystack.indexOf(phrase, from);
    if (i === -1) break;
    n += 1;
    from = i + phrase.length;
  }
  return n;
}

/** Score every goal against a compound's own written evidence. */
export function scoreGoalEvidence(sources: GoalEvidenceSources): GoalEvidenceScore[] {
  const primaryText = [sources.benefitsMd, sources.evidenceMd]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  const secondaryText = [sources.mechanismMd, sources.overviewMd, sources.educationMd]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const out: GoalEvidenceScore[] = [];
  for (const [goal, phrases] of Object.entries(GOAL_EVIDENCE_PHRASES)) {
    let score = 0;
    const matches: string[] = [];
    const primaryMatches: string[] = [];
    for (const phrase of phrases) {
      const inPrimary = countPhrase(primaryText, phrase);
      const inSecondary = countPhrase(secondaryText, phrase);
      if (inPrimary === 0 && inSecondary === 0) continue;
      matches.push(phrase);
      if (inPrimary > 0) primaryMatches.push(phrase);
      // Cap per-phrase contribution so one repeated word cannot carry a tag.
      score += Math.min(inPrimary, 3) * WEIGHT_PRIMARY + Math.min(inSecondary, 2) * WEIGHT_SECONDARY;
    }
    if (score > 0)
      out.push({ goal, score, matches, primaryMatches, primary: primaryMatches.length > 0 });
  }
  return out.sort((a, b) => b.score - a.score || a.goal.localeCompare(b.goal));
}


export interface DerivedGoalTags {
  /** Final tag list: curated demographic tags + evidence-backed tags. */
  tags: string[];
  /** Tags dropped because the page carries no evidence for them. */
  removed: string[];
  /** Tags added from the compound's own evidence. */
  added: string[];
  scores: GoalEvidenceScore[];
}

/**
 * Categories that never belong on a benefit hub. Prescription medications are
 * prescribed for a diagnosis, not chosen as a goal-driven supplement, so a
 * mention of "cognition" inside a levothyroxine monograph must not file it
 * under the Brain & Cognition hub.
 */
export const NON_GOAL_CATEGORIES: readonly string[] = ["medication"];

/**
 * Derive the evidence-backed goal tag set for one compound.
 *
 * Rules:
 *  - a tag qualifies at GOAL_SCORE_THRESHOLD weighted hits AND at least
 *    GOAL_DISTINCT_PHRASE_MINIMUM distinct phrases in benefits/evidence prose;
 *  - prescription medications only keep curated demographic tags;
 *  - curated demographic tags are always preserved;
 *  - at most `max` evidence tags, strongest first;
 *  - when nothing qualifies, the existing tags are left untouched (we never
 *    strip a page down to zero tags on thin content).
 */
export function deriveGoalTags(
  existing: string[] | null | undefined,
  sources: GoalEvidenceSources,
  max = 4,
  category?: string | null,
): DerivedGoalTags {
  const current = (existing ?? []).filter(Boolean);
  const scores = scoreGoalEvidence(sources);

  if (category && NON_GOAL_CATEGORIES.includes(category.toLowerCase())) {
    const tags = current.filter((t) => CURATED_GOAL_TAGS.includes(t));
    return { tags, removed: current.filter((t) => !tags.includes(t)), added: [], scores };
  }

  const qualified = scores
    .filter(
      (s) =>
        s.score >= GOAL_SCORE_THRESHOLD &&
        s.primaryMatches.length >= GOAL_DISTINCT_PHRASE_MINIMUM,
    )
    .slice(0, max)
    .map((s) => s.goal);

  if (qualified.length === 0) {
    return { tags: current, removed: [], added: [], scores };
  }


  const curated = current.filter((t) => CURATED_GOAL_TAGS.includes(t));
  const tags = Array.from(new Set([...qualified, ...curated]));
  const removed = current.filter((t) => !tags.includes(t));
  const added = tags.filter((t) => !current.includes(t));
  return { tags, removed, added, scores };
}

/** Type guard helper for callers that need the narrow union. */
export function asGoalSlug(tag: string): GoalSlug | null {
  return tag as GoalSlug;
}
