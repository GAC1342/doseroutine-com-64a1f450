/**
 * Per-session context for workouts: free-form tags plus the two ratings that
 * explain why a session felt the way it did (sleep and stress). RPE already
 * lives on the log row; these helpers keep all three presented consistently
 * across the log sheet, the calendar, and the summary strip.
 */

export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 24;

/** Ratings are 1–5 so they stay tappable on a phone. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const SLEEP_LABELS: Record<number, string> = {
  1: "Terrible",
  2: "Poor",
  3: "OK",
  4: "Good",
  5: "Great",
};

export const STRESS_LABELS: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Very high",
};

/** Starter chips shown under the tag input before the user has their own. */
export const SUGGESTED_TAGS = [
  "deload",
  "PR",
  "fasted",
  "outdoors",
  "sore",
  "travel",
  "morning",
  "evening",
  "easy",
  "hard",
  "rehab",
  "with partner",
];

export type SessionContext = {
  tags: string[];
  sleepQuality: number | null;
  stressLevel: number | null;
  rpe: number | null;
  notes: string | null;
};

/** Trim, collapse whitespace, lowercase-compare, and cap length. */
export function normalizeTag(raw: string): string {
  return raw
    .replace(/[,\n\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TAG_LENGTH);
}

/** Adds a tag if it is new (case-insensitive) and there is room left. */
export function addTag(tags: readonly string[], raw: string): string[] {
  const next = normalizeTag(raw);
  if (!next) return [...tags];
  if (tags.some((t) => t.toLowerCase() === next.toLowerCase())) return [...tags];
  if (tags.length >= MAX_TAGS) return [...tags];
  return [...tags, next];
}

export function removeTag(tags: readonly string[], tag: string): string[] {
  return tags.filter((t) => t.toLowerCase() !== tag.toLowerCase());
}

/** Splits a pasted/typed string on commas so "sore, travel" adds two tags. */
export function addTagsFromInput(tags: readonly string[], raw: string): string[] {
  let out = [...tags];
  for (const part of raw.split(",")) out = addTag(out, part);
  return out;
}

/** Sanitises whatever came back from the database into a safe string list. */
export function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const next = normalizeTag(item);
    if (next && !out.some((t) => t.toLowerCase() === next.toLowerCase())) out.push(next);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function clampRating(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  if (rounded < RATING_MIN || rounded > RATING_MAX) return null;
  return rounded;
}

export function sleepLabel(value: number | null | undefined): string | null {
  const v = clampRating(value ?? null);
  return v == null ? null : `Sleep ${SLEEP_LABELS[v]}`;
}

export function stressLabel(value: number | null | undefined): string | null {
  const v = clampRating(value ?? null);
  return v == null ? null : `Stress ${STRESS_LABELS[v]}`;
}

/** Short chips shown on a calendar day entry: "RPE 8 · Sleep Good · Stress Low". */
export function contextChips(ctx: {
  rpe?: number | null;
  sleep_quality?: number | null;
  stress_level?: number | null;
}): string[] {
  const chips: string[] = [];
  if (ctx.rpe != null) chips.push(`RPE ${Math.round(ctx.rpe)}`);
  const sleep = sleepLabel(ctx.sleep_quality);
  if (sleep) chips.push(sleep);
  const stress = stressLabel(ctx.stress_level);
  if (stress) chips.push(stress);
  return chips;
}

export type ContextAverages = {
  /** Sessions that recorded each metric — averages of 0 samples are null. */
  rpe: number | null;
  sleep: number | null;
  stress: number | null;
  /** Most-used tags in the window, highest count first. */
  topTags: { tag: string; count: number }[];
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/**
 * Averages RPE / sleep / stress and counts tags across a window of logs.
 * Only completed sessions count — planned rows have no lived experience yet.
 */
export function summarizeContext(
  logs: readonly {
    status?: string | null;
    rpe?: number | null;
    sleep_quality?: number | null;
    stress_level?: number | null;
    tags?: unknown;
  }[],
  limitTags = 3,
): ContextAverages {
  const done = logs.filter((l) => l.status === "completed");
  const counts = new Map<string, { tag: string; count: number }>();
  for (const log of done) {
    for (const tag of readTags(log.tags)) {
      const key = tag.toLowerCase();
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  const topTags = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limitTags);

  const pick = (key: "rpe" | "sleep_quality" | "stress_level") =>
    done.map((l) => clampRatingOrRpe(key, l[key] ?? null)).filter((v): v is number => v != null);

  return {
    rpe: mean(pick("rpe")),
    sleep: mean(pick("sleep_quality")),
    stress: mean(pick("stress_level")),
    topTags,
  };
}

function clampRatingOrRpe(key: string, value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (key === "rpe") return value >= 1 && value <= 10 ? value : null;
  return clampRating(value);
}
