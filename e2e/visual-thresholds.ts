/**
 * Configurable pixel-diff thresholds for the screenshot regression specs.
 *
 * Historically every spec hardcoded `maxDiffPixelRatio: 0.02`, so a harmless
 * anti-aliasing or font-hinting shift on a staging run failed the job and the
 * only fix was editing test code. Thresholds are now resolved at runtime from
 * a profile plus optional env overrides, so staging can be forgiving while the
 * production gate stays strict.
 *
 * Profiles (VISUAL_DIFF_PROFILE):
 *   strict   - release/gate runs; near pixel-perfect
 *   default  - local + PR runs (previous behaviour)
 *   staging  - staging/preview deploys; absorbs minor rendering drift
 *   lenient  - smoke runs on unpinned browsers/GPUs
 *
 * Fine-grained overrides (win over the profile when set):
 *   VISUAL_MAX_DIFF_PIXEL_RATIO   e.g. 0.05
 *   VISUAL_MAX_DIFF_PIXELS        e.g. 2500
 *   VISUAL_PIXEL_THRESHOLD        per-pixel colour tolerance, 0..1
 *
 * Per-spec overrides use a suffixed variable, e.g. for scope "exercise-art":
 *   VISUAL_EXERCISE_ART_MAX_DIFF_PIXEL_RATIO=0.04
 */

export type VisualDiffProfile = "strict" | "default" | "staging" | "lenient";

export type VisualThresholds = {
  /** Fraction of differing pixels tolerated (0..1). */
  maxDiffPixelRatio: number;
  /** Absolute differing-pixel budget; undefined = ratio only. */
  maxDiffPixels?: number;
  /** Per-pixel colour difference tolerance (0..1). */
  threshold: number;
};

const PROFILES: Record<VisualDiffProfile, VisualThresholds> = {
  strict: { maxDiffPixelRatio: 0.001, threshold: 0.1 },
  default: { maxDiffPixelRatio: 0.02, threshold: 0.2 },
  staging: { maxDiffPixelRatio: 0.05, maxDiffPixels: 5000, threshold: 0.25 },
  lenient: { maxDiffPixelRatio: 0.1, maxDiffPixels: 20000, threshold: 0.3 },
};

const PROFILE_NAMES = Object.keys(PROFILES) as VisualDiffProfile[];

export function isVisualDiffProfile(value: string): value is VisualDiffProfile {
  return (PROFILE_NAMES as string[]).includes(value);
}

type Env = Record<string, string | undefined>;

function envKey(scope: string | undefined, name: string): string {
  if (!scope) return `VISUAL_${name}`;
  const slug = scope.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
  return `VISUAL_${slug}_${name}`;
}

/** Reads a scoped override first, then the global one. */
function readNumber(
  env: Env,
  scope: string | undefined,
  name: string,
  { min, max }: { min: number; max: number },
): number | undefined {
  for (const key of [envKey(scope, name), envKey(undefined, name)]) {
    const raw = env[key];
    if (raw === undefined || raw.trim() === "") continue;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new Error(`${key} must be a number, received "${raw}"`);
    }
    if (parsed < min || parsed > max) {
      throw new Error(`${key} must be between ${min} and ${max}, received ${parsed}`);
    }
    return parsed;
  }
  return undefined;
}

export function resolveVisualProfile(env: Env = process.env): VisualDiffProfile {
  const raw = (env["VISUAL_DIFF_PROFILE"] ?? "").trim().toLowerCase();
  if (!raw) return "default";
  if (!isVisualDiffProfile(raw)) {
    throw new Error(
      `VISUAL_DIFF_PROFILE must be one of ${PROFILE_NAMES.join(", ")}, received "${raw}"`,
    );
  }
  return raw;
}

/**
 * Resolves the effective thresholds for a spec.
 *
 * @param scope optional per-spec name enabling `VISUAL_<SCOPE>_*` overrides
 */
export function resolveVisualThresholds(scope?: string, env: Env = process.env): VisualThresholds {
  const base = PROFILES[resolveVisualProfile(env)];

  const maxDiffPixelRatio =
    readNumber(env, scope, "MAX_DIFF_PIXEL_RATIO", { min: 0, max: 1 }) ?? base.maxDiffPixelRatio;
  const maxDiffPixels =
    readNumber(env, scope, "MAX_DIFF_PIXELS", { min: 0, max: Number.MAX_SAFE_INTEGER }) ??
    base.maxDiffPixels;
  const threshold = readNumber(env, scope, "PIXEL_THRESHOLD", { min: 0, max: 1 }) ?? base.threshold;

  return maxDiffPixels === undefined
    ? { maxDiffPixelRatio, threshold }
    : { maxDiffPixelRatio, maxDiffPixels, threshold };
}

/**
 * Playwright `toHaveScreenshot` options with the resolved thresholds merged in.
 * Callers can still override any field.
 */
export function snapshotOptions(
  scope?: string,
  extra: Record<string, unknown> = {},
  env: Env = process.env,
) {
  return {
    ...resolveVisualThresholds(scope, env),
    animations: "disabled" as const,
    scale: "css" as const,
    ...extra,
  };
}

/** One-line summary for CI logs so a run's tolerance is always visible. */
export function describeVisualThresholds(scope?: string, env: Env = process.env): string {
  const t = resolveVisualThresholds(scope, env);
  const pixels = t.maxDiffPixels === undefined ? "" : `, maxDiffPixels=${t.maxDiffPixels}`;
  return `[visual] profile=${resolveVisualProfile(env)}${scope ? ` scope=${scope}` : ""} maxDiffPixelRatio=${t.maxDiffPixelRatio}${pixels}, threshold=${t.threshold}`;
}
