// Concise "why" tags derived from an interaction's mechanism text.
// Pure keyword mapping — no schema change, no network, no AI.

export type ReasonTag =
  | "Absorption"
  | "CYP metabolism"
  | "Kidney clearance"
  | "Bleeding risk"
  | "Blood pressure"
  | "Blood sugar"
  | "Serotonin"
  | "Sedation"
  | "Hormonal"
  | "Liver strain"
  | "Electrolytes"
  | "Stimulant load"
  | "Same axis";

// Ordered: earlier entries win when a mechanism matches several.
const TAG_KEYWORDS: Array<{ tag: ReasonTag; keywords: string[] }> = [
  {
    tag: "Absorption",
    keywords: [
      "absorption",
      "absorb",
      "chelat",
      "bioavailab",
      "uptake",
      "compete for",
      "competes for",
      "binds",
      "binding in the gut",
      "gut transporter",
    ],
  },
  {
    tag: "CYP metabolism",
    keywords: [
      "cyp",
      "cytochrome",
      "p450",
      "3a4",
      "2d6",
      "1a2",
      "enzyme induction",
      "inhibits metabolism",
    ],
  },
  {
    tag: "Kidney clearance",
    keywords: ["renal", "kidney", "clearance", "excretion", "nephro"],
  },
  {
    tag: "Bleeding risk",
    keywords: ["bleed", "anticoagul", "platelet", "clotting", "inr", "warfarin"],
  },
  {
    tag: "Blood pressure",
    keywords: ["blood pressure", "hypertens", "hypotens", "vasodilat", "vasoconstrict"],
  },
  {
    tag: "Blood sugar",
    keywords: ["blood sugar", "glucose", "glycem", "glycaem", "insulin", "hypoglyc"],
  },
  {
    tag: "Serotonin",
    keywords: ["serotonin", "serotonerg", "ssri", "maoi", "5-ht"],
  },
  {
    tag: "Sedation",
    keywords: ["sedat", "drowsi", "cns depress", "sleepiness", "gaba"],
  },
  {
    tag: "Hormonal",
    keywords: [
      "hormon",
      "testosterone",
      "estrogen",
      "oestrogen",
      "thyroid",
      "cortisol",
      "hpta",
      "androgen",
    ],
  },
  {
    tag: "Liver strain",
    keywords: ["liver", "hepat", "alt/ast", "transaminase"],
  },
  {
    tag: "Electrolytes",
    keywords: [
      "electrolyte",
      "potassium",
      "sodium",
      "magnesium level",
      "calcium level",
      "hyperkal",
    ],
  },
  {
    tag: "Stimulant load",
    keywords: ["stimulant", "caffeine", "adrenerg", "heart rate", "jitter", "tachycard"],
  },
];

export const MAX_REASON_TAGS = 2;

/**
 * Returns up to two concise reason tags for an interaction.
 * Mechanism text is weighted first; recommendation text is a fallback signal.
 */
export function reasonTags(
  mechanism?: string | null,
  recommendation?: string | null,
  options?: { sameAxis?: boolean; includeSameAxis?: boolean },
): ReasonTag[] {
  const primary = (mechanism ?? "").toLowerCase();
  const secondary = (recommendation ?? "").toLowerCase();

  const fromPrimary: ReasonTag[] = [];
  const fromSecondary: ReasonTag[] = [];

  for (const { tag, keywords } of TAG_KEYWORDS) {
    if (keywords.some((k) => primary.includes(k))) fromPrimary.push(tag);
    else if (keywords.some((k) => secondary.includes(k))) fromSecondary.push(tag);
  }

  const tags = [...fromPrimary, ...fromSecondary];

  if (options?.sameAxis && options?.includeSameAxis) tags.push("Same axis");

  return tags.slice(0, MAX_REASON_TAGS);
}

/** Short plain-English explanation shown in the tag tooltip. */
export const REASON_TAG_DESCRIPTIONS: Record<ReasonTag, string> = {
  Absorption:
    "These compete for uptake in the gut, so taking them together can lower how much you absorb.",
  "CYP metabolism": "One affects the liver enzymes that break the other down, changing its levels.",
  "Kidney clearance":
    "They affect how quickly the kidneys clear one another, so levels can build up.",
  "Bleeding risk": "Both thin the blood or slow clotting, so the combined effect can add up.",
  "Blood pressure": "Both push blood pressure in the same direction, so the effect can stack.",
  "Blood sugar": "Both influence glucose or insulin, so blood sugar can swing more than expected.",
  Serotonin: "Both raise serotonin activity, which can be excessive when combined.",
  Sedation: "Both are calming or sedating, so drowsiness can add up.",
  Hormonal: "They act on the same hormone pathway, so the combined effect is hard to predict.",
  "Liver strain": "Both put load on the liver, so the strain can add up over time.",
  Electrolytes: "They shift electrolyte levels such as potassium, sodium or calcium.",
  "Stimulant load": "Both are stimulating, so heart rate and jitteriness can stack.",
  "Same axis": "Both act on the same body system, so their effects overlap.",
};
