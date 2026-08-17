/**
 * Configurable thresholds for the blog SEO score gate.
 *
 * Values live in `seo-score.config.json` at the repo root so CI can be
 * tightened or loosened without touching code. This module is pure: it holds
 * the defaults, the shape, and the merge/validation logic. Reading the file
 * from disk lives in `seo-score-config.load.ts` (node-only).
 */

export type SeoCheckId =
  | "title_length"
  | "title_brand"
  | "title_keyword"
  | "description_length"
  | "description_sentence"
  | "h1_present"
  | "h1_distinct"
  | "h2_count"
  | "h2_unique"
  | "h2_length"
  | "intro_keyword"
  | "intro_length";

export type RuleConfig = {
  enabled: boolean;
  weight: number;
  min?: number;
  max?: number;
  minCoverage?: number;
  windowWords?: number;
  suffixPattern?: string;
};

export type SeoScoreConfig = {
  /** A post scoring below this (out of 100) fails CI. */
  passingScore: number;
  /** Checks that fail CI regardless of the total score. */
  blockingChecks: SeoCheckId[];
  rules: Record<SeoCheckId, RuleConfig>;
};

export const DEFAULT_SEO_SCORE_CONFIG: SeoScoreConfig = {
  passingScore: 85,
  blockingChecks: [
    "title_length",
    "title_keyword",
    "description_length",
    "h1_present",
    "h2_count",
    "intro_keyword",
  ],
  rules: {
    title_length: { enabled: true, weight: 12, min: 30, max: 65 },
    title_brand: { enabled: true, weight: 6, suffixPattern: "\\|\\s*DoseRoutine\\s*$" },
    title_keyword: { enabled: true, weight: 12, minCoverage: 0.01 },
    description_length: { enabled: true, weight: 12, min: 70, max: 160 },
    description_sentence: { enabled: true, weight: 6 },
    h1_present: { enabled: true, weight: 8, min: 20 },
    h1_distinct: { enabled: true, weight: 6 },
    h2_count: { enabled: true, weight: 10, min: 3 },
    h2_unique: { enabled: true, weight: 6 },
    h2_length: { enabled: true, weight: 4, max: 80 },
    intro_keyword: { enabled: true, weight: 14, minCoverage: 0.4, windowWords: 100 },
    intro_length: { enabled: true, weight: 4, min: 40, max: 120 },
  },
};

export const SEO_CHECK_IDS = Object.keys(DEFAULT_SEO_SCORE_CONFIG.rules) as SeoCheckId[];

function isCheckId(value: string): value is SeoCheckId {
  return (SEO_CHECK_IDS as string[]).includes(value);
}

function num(value: unknown, fallback: number | undefined, label: string): number | undefined {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`seo-score config: ${label} must be a finite number`);
  }
  return value;
}

/**
 * Merge a raw JSON config over the defaults. Unknown keys and bad types throw
 * so a typo can never silently disable a check in CI.
 */
export function mergeSeoScoreConfig(raw: unknown): SeoScoreConfig {
  if (raw === undefined || raw === null) return DEFAULT_SEO_SCORE_CONFIG;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("seo-score config: expected a JSON object");
  }
  const input = raw as Record<string, unknown>;

  const passingScore = num(input["passingScore"], DEFAULT_SEO_SCORE_CONFIG.passingScore, "passingScore")!;
  if (passingScore < 0 || passingScore > 100) {
    throw new Error("seo-score config: passingScore must be between 0 and 100");
  }

  let blockingChecks = DEFAULT_SEO_SCORE_CONFIG.blockingChecks;
  if (input["blockingChecks"] !== undefined) {
    if (!Array.isArray(input["blockingChecks"])) {
      throw new Error("seo-score config: blockingChecks must be an array");
    }
    blockingChecks = (input["blockingChecks"] as unknown[]).map((id) => {
      if (typeof id !== "string" || !isCheckId(id)) {
        throw new Error(`seo-score config: unknown check id in blockingChecks: ${String(id)}`);
      }
      return id;
    });
  }

  const rules = { ...DEFAULT_SEO_SCORE_CONFIG.rules };
  const rawRules = input["rules"];
  if (rawRules !== undefined) {
    if (typeof rawRules !== "object" || rawRules === null || Array.isArray(rawRules)) {
      throw new Error("seo-score config: rules must be an object");
    }
    for (const [id, value] of Object.entries(rawRules as Record<string, unknown>)) {
      if (!isCheckId(id)) throw new Error(`seo-score config: unknown rule id: ${id}`);
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`seo-score config: rule ${id} must be an object`);
      }
      const base = rules[id];
      const patch = value as Record<string, unknown>;
      const enabled = patch["enabled"] === undefined ? base.enabled : Boolean(patch["enabled"]);
      const weight = num(patch["weight"], base.weight, `rules.${id}.weight`)!;
      if (weight < 0) throw new Error(`seo-score config: rules.${id}.weight must be >= 0`);
      rules[id] = {
        ...base,
        enabled,
        weight,
        min: num(patch["min"], base.min, `rules.${id}.min`),
        max: num(patch["max"], base.max, `rules.${id}.max`),
        minCoverage: num(patch["minCoverage"], base.minCoverage, `rules.${id}.minCoverage`),
        windowWords: num(patch["windowWords"], base.windowWords, `rules.${id}.windowWords`),
        suffixPattern:
          patch["suffixPattern"] === undefined
            ? base.suffixPattern
            : String(patch["suffixPattern"]),
      };
    }
  }

  // Blocking a disabled rule can never fail, so surface it as a config error.
  for (const id of blockingChecks) {
    if (!rules[id].enabled) {
      throw new Error(`seo-score config: ${id} is in blockingChecks but disabled`);
    }
  }

  return { passingScore, blockingChecks, rules };
}

/** Environment overrides so a single CI run can tighten the bar ad hoc. */
export function applyEnvOverrides(
  config: SeoScoreConfig,
  env: Record<string, string | undefined> = {},
): SeoScoreConfig {
  const raw = env["SEO_SCORE_PASSING_SCORE"];
  if (raw === undefined || raw === "") return config;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error("SEO_SCORE_PASSING_SCORE must be a number between 0 and 100");
  }
  return { ...config, passingScore: parsed };
}
