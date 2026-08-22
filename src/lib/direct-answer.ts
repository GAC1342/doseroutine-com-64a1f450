/**
 * Builds the 40-60 word "direct answer" paragraph that sits immediately under
 * the H1 on a library page.
 *
 * Rules this module enforces:
 *  - plain declarative reference prose, never product framing
 *    ("DoseRoutine helps you..." is stripped, not generated);
 *  - every clause is derived from data already on the record — no invented
 *    facts, no invented numbers;
 *  - target length 40-60 words so answer engines can quote it whole.
 */

import { halfLifeLabel } from "./half-life-label";
import { splitProseSentences } from "./compound-definition";

export interface DirectAnswerCompound {
  name: string;
  category?: string | null;
  goalTags?: string[] | null;
  halfLifeHours?: number | null;
  typicalTiming?: string | null;
  isInjectable?: boolean | null;
  isControlled?: boolean | null;
}

const MIN_WORDS = 40;
const MAX_WORDS = 60;

const GOAL_PHRASES: Record<string, string> = {
  "weight-loss": "weight loss",
  muscle: "muscle and strength",
  recovery: "tissue recovery",
  brain: "cognition and mood",
  longevity: "healthy aging",
  mitochondria: "mitochondrial function",
  endurance: "endurance",
  prostate: "prostate health",
  testosterone: "testosterone support",
  libido: "libido",
  "mens-longevity": "men's healthspan",
  "womens-longevity": "women's healthspan",
  menopause: "menopause symptoms",
  fertility: "fertility",
  immune: "immune function",
  cardiovascular: "heart and circulatory health",
  "bone-joint": "bone and joint health",
  sleep: "sleep quality",
  "blood-sugar": "blood sugar control",
  "skin-hair": "skin and hair",
};

/** Product/marketing framing that must never appear in a reference answer. */
const MARKETING = /\b(DoseRoutine|our app|we help|helps you|sign up|free trial|track your)\b/i;

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function wordCount(text: string): number {
  return words(text).length;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function splitSentences(text: string): string[] {
  // Abbreviation-aware so "(e.g., barberry)" and "examine.com" never split a
  // sentence into fragments that would later be published out of order.
  return splitProseSentences(text).filter((s) => s.length > 0 && !MARKETING.test(s));
}

function humanCategory(cat: string | null | undefined): string {
  const c = (cat ?? "").toLowerCase();
  if (c === "peptide") return "research peptide";
  if (c === "glp1") return "GLP-1 receptor agonist";
  if (c === "medication") return "prescription medication";
  if (!c) return "compound";
  return c.replace(/_/g, " ");
}

/** Turn stored timing codes ("with_meal") into readable prose. */
function humanTiming(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!t) return null;
  if (t.includes("with meal") || t.includes("with food")) return "with a meal";
  if (t.includes("empty")) return "on an empty stomach";
  if (t.includes("bedtime") || t.includes("night")) return "in the evening";
  if (t.includes("morning")) return "in the morning";
  return t;
}

/**
 * Facts derived only from structured fields, used to pad the answer up to the
 * 40-word floor when the prose lead is short.
 */
function structuredFacts(c: DirectAnswerCompound): string[] {
  const out: string[] = [];
  const goals = (c.goalTags ?? [])
    .filter(Boolean)
    .slice(0, 3)
    .map((g) => GOAL_PHRASES[g] ?? g.replace(/[-_]/g, " "));
  if (goals.length > 0) {
    out.push(`Research on ${c.name} focuses on ${joinList(goals)}.`);
  }
  if (c.isInjectable) {
    out.push(`${c.name} is administered by injection rather than orally.`);
  }
  const timing = humanTiming(c.typicalTiming);
  if (timing) {
    out.push(`It is typically taken ${timing}.`);
  }
  if (typeof c.halfLifeHours === "number" && c.halfLifeHours > 0) {
    out.push(
      `The reported ${halfLifeLabel(c.category).toLowerCase()} is about ${c.halfLifeHours} hours, which shapes dosing frequency.`,
    );
  }
  if (c.isControlled) {
    out.push(`${c.name} is a controlled substance in some jurisdictions.`);
  }
  out.push(
    `Dose, response, and interaction risk vary by individual, so use should be reviewed with a clinician.`,
  );
  return out;
}

/**
 * Assemble the direct answer. `lead` is the existing definitional lead built
 * from the compound's own prose; structured facts extend it to length.
 */
export function buildDirectAnswer(c: DirectAnswerCompound, lead: string): string {
  const picked: string[] = [];
  let count = 0;

  const push = (sentence: string) => {
    if (count >= MIN_WORDS) return false;
    const n = wordCount(sentence);
    // Never blow past the ceiling by more than the tail of one sentence.
    if (count > 0 && count + n > MAX_WORDS + 8) return false;
    picked.push(sentence);
    count += n;
    return true;
  };

  // Prose sentences must stay contiguous: skipping one and then appending a
  // later one produces a paragraph that reads as a broken quote.
  for (const s of splitSentences(lead || "")) {
    if (!push(s)) break;
  }
  if (picked.length === 0) {
    push(`${c.name} is a ${humanCategory(c.category)}.`);
  }
  for (const s of structuredFacts(c)) push(s);

  let out = picked
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Hard ceiling: trim whole sentences from the end, never mid-sentence.
  while (wordCount(out) > MAX_WORDS + 8 && picked.length > 1) {
    picked.pop();
    out = picked.join(" ").trim();
  }
  return out;
}

/**
 * Plain-text form of the direct answer, optimized for machine quoting.
 *
 * Answer engines and copy/paste both do better with ASCII punctuation, no
 * markdown, no citation markers, and single spaces. This never rewords the
 * answer — it only normalizes characters and whitespace.
 */
export function toPlainExcerpt(text: string): string {
  const out = (text || "")
    // markdown emphasis / code / links -> their text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]+/g, " ")
    // inline citation markers like [1] or [1,2]
    .replace(/\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]/g, "")
    // smart punctuation -> ASCII
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!out) return "";
  return /[.!?]$/.test(out) ? out : `${out}.`;
}

/** The quotable excerpt plus its attribution line, ready to paste. */
export function excerptWithAttribution(excerpt: string, name: string, url: string): string {
  return `"${toPlainExcerpt(excerpt)}" — DoseRoutine, ${name}. ${url}`;
}
