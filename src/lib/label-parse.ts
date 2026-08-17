/**
 * Supplement label reader.
 *
 * Users often have the Supplement Facts panel in front of them ("Omega-3
 * 1,000 mg per softgel, serving size 2 softgels") rather than a tidy daily
 * total. This turns pasted label text into per-capsule strength + count,
 * entirely with local pattern matching — no network call, works offline.
 */

/** Units the dose form supports. */
export type LabelUnit = "mg" | "mcg" | "iu" | "g" | "ml";

const MASS_TO_MG: Record<string, number> = { g: 1000, mg: 1, mcg: 0.001 };

/** Max characters we scan — pasted pages can be huge. */
export const LABEL_MAX_CHARS = 4000;

export type ParsedLabel = {
  /** Amount of active ingredient in ONE capsule, in `unit`. */
  strengthPerUnit: number;
  unit: LabelUnit;
  /** Capsules per serving (defaults to 1 when the label doesn't say). */
  countPerServing: number;
  /** strengthPerUnit × countPerServing. */
  totalPerServing: number;
  /** Wording found on the label: "soft gel", "capsule", "tablet"… */
  noun: string;
  /** "high" when the label states a per-capsule amount, "medium" when derived. */
  confidence: "high" | "medium";
};

/**
 * Convert between dose units. Only mass units interconvert; iu and ml have no
 * universal conversion so they are returned unchanged (and never cross over).
 */
export function convertDose(value: number, from: LabelUnit, to: LabelUnit): number | null {
  if (from === to) return value;
  const a = MASS_TO_MG[from];
  const b = MASS_TO_MG[to];
  if (a == null || b == null) return null;
  return Math.round(((value * a) / b) * 1e6) / 1e6;
}

function num(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normUnit(raw: string): LabelUnit | null {
  const u = raw.toLowerCase().replace("µ", "m").trim();
  if (u === "mg" || u === "milligram" || u === "milligrams") return "mg";
  if (u === "mcg" || u === "ug" || u === "microgram" || u === "micrograms") return "mcg";
  if (u === "g" || u === "gram" || u === "grams") return "g";
  if (u === "iu" || u === "i.u.") return "iu";
  if (u === "ml" || u === "milliliter" || u === "millilitre") return "ml";
  return null;
}

const UNIT_RE = "(mcg|µg|ug|mg|g|iu|i\\.u\\.|ml|milligrams?|micrograms?|grams?)";
const NUM_RE = "(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)";
const FORM_RE = "(soft\\s?gels?|softgels?|capsules?|caps?|tablets?|pills?|gummies|gummy|scoops?)";

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

function singularNoun(raw: string): string {
  const n = raw.toLowerCase().replace(/\s+/g, " ").trim();
  if (/soft\s?gel/.test(n)) return "soft gel";
  if (/gumm/.test(n)) return "gummy";
  if (n.startsWith("cap")) return "capsule";
  if (n.startsWith("tablet")) return "tablet";
  if (n.startsWith("pill")) return "pill";
  if (n.startsWith("scoop")) return "scoop";
  return "capsule";
}

/** Number of capsules per serving, e.g. "Serving size: 2 softgels". */
function findServingCount(text: string): { count: number; noun: string } | null {
  const patterns = [
    new RegExp(`serving\\s*size\\s*[:\\-]?\\s*${NUM_RE}\\s*${FORM_RE}`, "i"),
    new RegExp(`${NUM_RE}\\s*${FORM_RE}\\s*per\\s*serving`, "i"),
    new RegExp(`(?:take|use)\\s*${NUM_RE}\\s*${FORM_RE}`, "i"),
    new RegExp(`serving\\s*size\\s*[:\\-]?\\s*(one|two|three|four|five|six)\\s*${FORM_RE}`, "i"),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const raw = m[1].toLowerCase();
    const count = WORD_NUMBERS[raw] ?? num(m[1]);
    if (count == null || count <= 0) continue;
    return { count, noun: singularNoun(m[2]) };
  }
  return null;
}

/** Amount stated for a single capsule, e.g. "1,000 mg per softgel". */
function findPerUnitStrength(
  text: string,
): { value: number; unit: LabelUnit; noun: string } | null {
  const patterns = [
    new RegExp(`${NUM_RE}\\s*${UNIT_RE}\\s*(?:per|/|each)\\s*${FORM_RE}`, "i"),
    new RegExp(
      `each\\s*${FORM_RE}\\s*(?:contains|provides|delivers|has)\\s*[^\\d]{0,20}${NUM_RE}\\s*${UNIT_RE}`,
      "i",
    ),
    new RegExp(`per\\s*${FORM_RE}\\s*[:\\-]?\\s*${NUM_RE}\\s*${UNIT_RE}`, "i"),
  ];
  // First shape: number unit per form. Others: form … number unit.
  const m0 = text.match(patterns[0]);
  if (m0) {
    const value = num(m0[1]);
    const unit = normUnit(m0[2]);
    if (value != null && unit) return { value, unit, noun: singularNoun(m0[3]) };
  }
  for (const re of patterns.slice(1)) {
    const m = text.match(re);
    if (!m) continue;
    const value = num(m[2]);
    const unit = normUnit(m[3]);
    if (value != null && unit) return { value, unit, noun: singularNoun(m[1]) };
  }
  return null;
}

/** Amount stated for a whole serving, e.g. "1 g per serving". */
function findPerServingStrength(text: string): { value: number; unit: LabelUnit } | null {
  const patterns = [
    new RegExp(`${NUM_RE}\\s*${UNIT_RE}\\s*(?:per|/)\\s*serving`, "i"),
    new RegExp(`(?:per|each)\\s*serving\\s*[:\\-]?\\s*${NUM_RE}\\s*${UNIT_RE}`, "i"),
    new RegExp(`amount\\s*per\\s*serving\\s*[^\\d]{0,40}?${NUM_RE}\\s*${UNIT_RE}`, "i"),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const value = num(m[1]);
    const unit = normUnit(m[2]);
    if (value != null && unit) return { value, unit };
  }
  return null;
}

/**
 * Read a pasted supplement label. Returns null when nothing usable is found —
 * callers should leave the form untouched and say what to look for.
 */
export function parseSupplementLabel(raw: string): ParsedLabel | null {
  if (!raw) return null;
  const text = raw.slice(0, LABEL_MAX_CHARS).replace(/\s+/g, " ");
  if (!text.trim()) return null;

  const serving = findServingCount(text);
  const perUnit = findPerUnitStrength(text);

  if (perUnit) {
    const count = serving?.count ?? 1;
    return {
      strengthPerUnit: perUnit.value,
      unit: perUnit.unit,
      countPerServing: count,
      totalPerServing: Math.round(perUnit.value * count * 1e6) / 1e6,
      noun: perUnit.noun ?? serving?.noun ?? "capsule",
      confidence: "high",
    };
  }

  const perServing = findPerServingStrength(text);
  if (perServing) {
    const count = serving?.count ?? 1;
    const strength = Math.round((perServing.value / count) * 1e6) / 1e6;
    if (strength <= 0) return null;
    return {
      strengthPerUnit: strength,
      unit: perServing.unit,
      countPerServing: count,
      totalPerServing: perServing.value,
      noun: serving?.noun ?? "capsule",
      confidence: count > 1 ? "medium" : "high",
    };
  }

  return null;
}

/**
 * Fit a parsed label to the unit the form is currently using. Mass units are
 * converted; when conversion isn't possible the label's own unit is returned
 * so the caller can switch the dropdown.
 */
export function fitLabelToUnit(
  parsed: ParsedLabel,
  currentUnit: string,
): { strength: number; unit: LabelUnit; total: number } {
  const target = normUnit(currentUnit);
  if (target) {
    const converted = convertDose(parsed.strengthPerUnit, parsed.unit, target);
    if (converted != null && converted > 0) {
      return {
        strength: converted,
        unit: target,
        total: Math.round(converted * parsed.countPerServing * 1e6) / 1e6,
      };
    }
  }
  return {
    strength: parsed.strengthPerUnit,
    unit: parsed.unit,
    total: parsed.totalPerServing,
  };
}
