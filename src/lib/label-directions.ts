/**
 * Turns a manufacturer's label into values our dose form understands.
 *
 * Nothing here is advice — it just reads what the label already says so the
 * user starts from the printed directions instead of a blank form. Every
 * value is validated and stays editable.
 */
import type { ProductLabel } from "@/lib/product-lookup.server";
import { convertDose, type LabelUnit, parseSupplementLabel } from "@/lib/label-parse";

/**
 * Where each pre-filled value came from:
 *  - "label"    — printed on the Supplement Facts panel or in the directions
 *  - "inferred" — we worked it out from the label (e.g. spreading 2×/day into times)
 *  - "missing"  — nothing usable found; the user fills it in
 */
export type FieldSource = "label" | "inferred" | "missing";

export type PrefillProvenance = {
  dose: FieldSource;
  count: FieldSource;
  frequency: FieldSource;
  timing: FieldSource;
  food: FieldSource;
};

export type LabelPrefill = {
  /** Amount of the main ingredient in one capsule / soft gel. */
  strengthPerUnit: number | null;
  unit: LabelUnit | null;
  /** Capsules per dose as printed on the label. */
  countPerDose: number | null;
  /** Doses per day as printed on the label. */
  dosesPerDay: number | null;
  /** strengthPerUnit × countPerDose (one dose, not the daily total). */
  dosePerTake: number | null;
  /** Suggested times of day inferred from the directions text. */
  times: string[] | null;
  withFood: boolean | null;
  /** Best guess at the compound to search for in our library. */
  searchTerm: string;
  provenance: PrefillProvenance;
};

const SUPPORTED_UNITS: LabelUnit[] = ["mg", "mcg", "iu", "g", "ml"];

/** Ingredient rows that are label boilerplate rather than the active item. */
const SKIP_INGREDIENTS =
  /^(calories|total fat|saturated fat|trans fat|cholesterol|sodium|total carbohydrate|dietary fiber|protein|sugars?|added sugars?)$/i;

function toUnit(raw: string | null | undefined): LabelUnit | null {
  if (!raw) return null;
  const u = raw.toLowerCase().replace("µ", "m").replace(/\./g, "").trim();
  if (u === "mg" || u === "milligram" || u === "milligrams") return "mg";
  if (u === "mcg" || u === "ug" || u === "microgram" || u === "micrograms") return "mcg";
  if (u === "g" || u === "gram" || u === "grams") return "g";
  if (u === "iu") return "iu";
  if (u === "ml") return "ml";
  return null;
}

/** Pick the ingredient the product is actually sold for: the largest real amount. */
export function primaryIngredient(label: ProductLabel) {
  const candidates = label.ingredients.filter(
    (i) => i.amount != null && i.amount > 0 && toUnit(i.unit) && !SKIP_INGREDIENTS.test(i.name),
  );
  if (candidates.length === 0) return null;
  // Compare on a common scale so 1 g beats 400 mcg.
  const scored = candidates.map((i) => {
    const unit = toUnit(i.unit)!;
    const mg = convertDose(i.amount!, unit, "mg");
    return { ingredient: i, unit, rank: mg ?? i.amount! };
  });
  scored.sort((a, b) => b.rank - a.rank);
  return scored[0];
}

const TIME_HINTS: { re: RegExp; time: string }[] = [
  { re: /before bed|at bedtime|bedtime|before sleep|night/i, time: "21:00" },
  { re: /breakfast|morning|a\.?m\.?\b/i, time: "08:00" },
  { re: /lunch|midday|noon/i, time: "12:00" },
  { re: /dinner|evening|supper|p\.?m\.?\b/i, time: "18:00" },
];

const TIMES_BY_COUNT: Record<number, string[]> = {
  1: ["08:00"],
  2: ["08:00", "20:00"],
  3: ["08:00", "13:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

/** How many times a day the directions say to take it. */
export function dosesPerDayFromText(text: string | null): number | null {
  if (!text) return null;
  if (/three times (a|per) day|3 times (a|per) day|thrice daily/i.test(text)) return 3;
  if (/twice (a|per) day|two times (a|per) day|twice daily|2 times (a|per) day/i.test(text))
    return 2;
  if (/once (a|per) day|once daily|one time (a|per) day|daily/i.test(text)) return 1;
  return null;
}

/** Capsules per dose from wording like "take 2 softgels". */
export function countFromText(text: string | null): number | null {
  if (!text) return null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const m = text.match(
    /\b(?:take|use)\s*(\d{1,2}|one|two|three|four|five|six)\s*(soft\s?gels?|softgels?|capsules?|caps?|tablets?|pills?|gummies|gummy|scoops?)/i,
  );
  if (!m) return null;
  const raw = m[1].toLowerCase();
  const n = words[raw] ?? Number(raw);
  return Number.isFinite(n) && n > 0 && n <= 20 ? n : null;
}

export function buildPrefill(label: ProductLabel): LabelPrefill {
  const directions = label.directions;

  const primary = primaryIngredient(label);
  let strength = primary?.ingredient.amount ?? null;
  let unit = primary?.unit ?? null;
  let doseSource: FieldSource = primary ? "label" : "missing";

  // Some labels only state the amount inside the directions / statements text.
  if (strength == null && directions) {
    const parsed = parseSupplementLabel(directions);
    if (parsed) {
      strength = parsed.strengthPerUnit;
      unit = parsed.unit;
      doseSource = "inferred";
    }
  }

  const servingCount = label.servingCount && label.servingCount > 0 ? label.servingCount : null;
  const countFromDirections = countFromText(directions);
  const countPerDose = countFromDirections ?? servingCount ?? null;
  const countSource: FieldSource = countFromDirections
    ? "label"
    : servingCount
      ? "inferred"
      : "missing";

  const perDayFromDirections = dosesPerDayFromText(directions);
  const dosesPerDay = perDayFromDirections ?? label.servingsPerDay ?? null;
  const frequencySource: FieldSource = perDayFromDirections
    ? "label"
    : label.servingsPerDay
      ? "inferred"
      : "missing";

  // DSLD ingredient amounts are per serving, so per-capsule = amount / serving count.
  const perUnit =
    strength != null && servingCount && servingCount > 1
      ? Math.round((strength / servingCount) * 1e6) / 1e6
      : strength;

  const dosePerTake =
    perUnit != null && countPerDose != null
      ? Math.round(perUnit * countPerDose * 1e6) / 1e6
      : perUnit;

  let times: string[] | null = null;
  let timingSource: FieldSource = "missing";
  const hit = directions ? TIME_HINTS.find((h) => h.re.test(directions)) : undefined;
  if (dosesPerDay && dosesPerDay > 1) {
    times = TIMES_BY_COUNT[dosesPerDay] ?? null;
    timingSource = times ? "inferred" : "missing";
  } else if (hit) {
    times = [hit.time];
    timingSource = "label";
  }

  const foodMentioned = directions
    ? /with (a )?(meal|food|breakfast|dinner|lunch)|empty stomach|between meals/i.test(directions)
    : false;
  const withFood = directions
    ? /with (a )?(meal|food|breakfast|dinner|lunch)/i.test(directions)
    : null;

  const searchTerm = (primary?.ingredient.name ?? label.name)
    .replace(/\b\d[\d,.]*\s*(mg|mcg|g|iu|ml)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    strengthPerUnit: perUnit,
    unit: unit && SUPPORTED_UNITS.includes(unit) ? unit : null,
    countPerDose,
    dosesPerDay,
    dosePerTake:
      dosePerTake != null && dosePerTake > 0 && dosePerTake <= 1_000_000 ? dosePerTake : null,
    times,
    withFood,
    searchTerm,
    provenance: {
      dose: dosePerTake != null && dosePerTake > 0 ? doseSource : "missing",
      count: countSource,
      frequency: frequencySource,
      timing: timingSource,
      food: foodMentioned ? "label" : "missing",
    },
  };
}

export type ConfidenceLevel = "high" | "medium" | "low";

export type PrefillConfidence = {
  /** 0–100. How much of the dosing we could read straight off the label. */
  score: number;
  level: ConfidenceLevel;
  /** Short plain-English verdict for the card. */
  headline: string;
  /** Per-field breakdown the user can scan. */
  checks: { label: string; source: FieldSource; detail: string }[];
};

const FIELD_WEIGHTS: { key: keyof PrefillProvenance; label: string; weight: number }[] = [
  { key: "dose", label: "Dose amount", weight: 40 },
  { key: "count", label: "How many per dose", weight: 20 },
  { key: "frequency", label: "Times per day", weight: 25 },
  { key: "timing", label: "Time of day", weight: 15 },
];

const SOURCE_DETAIL: Record<FieldSource, string> = {
  label: "Read from the label",
  inferred: "Worked out from the label",
  missing: "Not on the label — you'll set this",
};

/** Sources we trust to be transcribed from a real Supplement Facts panel. */
const VERIFIED_SOURCES = /NIH Dietary Supplement Label Database/i;

/**
 * How much of the dosing came straight off the manufacturer's label, versus
 * inferred or missing. Shown before the user applies anything so they know
 * how much to double-check.
 */
export function scorePrefillConfidence(
  label: ProductLabel,
  prefill: LabelPrefill,
): PrefillConfidence {
  let earned = 0;
  const checks = FIELD_WEIGHTS.map(({ key, label: fieldLabel, weight }) => {
    const source = prefill.provenance[key];
    earned += source === "label" ? weight : source === "inferred" ? weight * 0.6 : 0;
    return { label: fieldLabel, source, detail: SOURCE_DETAIL[source] };
  });

  // Community-edited sources rarely carry a full Supplement Facts panel, so
  // cap how confident we claim to be about them.
  const verified = VERIFIED_SOURCES.test(label.sourceName);
  let score = Math.round(verified ? earned : earned * 0.7);
  if (prefill.provenance.dose === "missing") score = Math.min(score, 40);
  score = Math.max(0, Math.min(100, score));

  const level: ConfidenceLevel = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
  const headline =
    level === "high"
      ? "Most of this came straight off the label"
      : level === "medium"
        ? "Some of this we worked out — check it"
        : "Very little was readable — check every field";

  return { score, level, headline, checks };
}

/** One-line plain-English summary for the product card. */
export function summarisePrefill(label: ProductLabel, prefill: LabelPrefill): string {
  const parts: string[] = [];
  if (prefill.dosePerTake != null && prefill.unit) {
    parts.push(`${prefill.dosePerTake} ${prefill.unit} per dose`);
  }
  if (prefill.countPerDose) {
    const noun = label.servingUnitNoun ?? "capsule";
    parts.push(`${prefill.countPerDose} ${noun}${prefill.countPerDose > 1 ? "s" : ""} at a time`);
  }
  if (prefill.dosesPerDay) {
    parts.push(prefill.dosesPerDay === 1 ? "once a day" : `${prefill.dosesPerDay}× a day`);
  }
  return parts.join(" · ");
}
