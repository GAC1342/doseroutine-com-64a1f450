/**
 * Builds a tight 1-2 sentence definitional lead for a compound page.
 *
 * Answer engines lift the first substantive sentence on a page. Library pages
 * previously led with a long legal disclaimer, so that was the sentence being
 * extracted. This helper produces a short, factual definition instead, sourced
 * only from data already on the record (no invented facts).
 *
 * Source priority:
 *   1. Curated rescue "quick answer" text, when present.
 *   2. First sentences of the compound's overview / body / education markdown.
 *   3. A deterministic one-liner from name + category (+ primary use tags).
 */

const MAX_CHARS = 320;

/** Remove markdown syntax so the lead reads as plain prose. */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ABBREVIATIONS = [
  "u.s.",
  "e.g.",
  "i.e.",
  "etc.",
  "vs.",
  "approx.",
  "dr.",
  "mr.",
  "ms.",
  "st.",
  "s.c.",
  "i.m.",
  "i.v.",
  "p.o.",
  "b.i.d.",
  "t.i.d.",
  "q.d.",
  "no.",
  "fig.",
  "cf.",
];

const DOT = "\u0001";

/** Hide periods that do not end a sentence so splitting stays accurate. */
function protectPeriods(text: string): string {
  let out = text;
  for (const abbr of ABBREVIATIONS) {
    out = out.replace(new RegExp(abbr.replace(/\./g, "\\."), "gi"), (m) => m.replace(/\./g, DOT));
  }
  // Single-letter initials ("U. S.", "A. Smith") and decimals ("0.5 mg").
  out = out.replace(/\b([A-Za-z])\.(?=\s?[A-Za-z]\.)/g, `$1${DOT}`);
  out = out.replace(/(\d)\.(?=\d)/g, `$1${DOT}`);
  return out;
}

function restorePeriods(text: string): string {
  return text.split(DOT).join(".");
}

/** Take at most the first two sentences, capped at MAX_CHARS. */
function firstSentences(text: string, limit = 2): string {
  const clean = stripMarkdown(text);
  if (!clean) return "";
  const protectedText = protectPeriods(clean);
  const parts = (protectedText.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [])
    .map((p) => p.trim())
    .filter(Boolean);
  let out = parts.length > 0 ? parts.slice(0, limit).join(" ").trim() : protectedText;
  if (out.length > MAX_CHARS) {
    const cut = out.slice(0, MAX_CHARS);
    const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    out = lastStop > 80 ? cut.slice(0, lastStop + 1) : `${cut.replace(/[\s,;:-]+$/, "")}…`;
  }
  return restorePeriods(out).trim();
}

function articleFor(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

export interface CompoundDefinitionInput {
  name: string;
  category?: string | null;
  goalTags?: string[] | null;
  aliases?: string[] | null;
  isInjectable?: boolean | null;
}

/**
 * Deterministic fallback definition built only from structured fields.
 */
export function fallbackCompoundDefinition(c: CompoundDefinitionInput): string {
  const category = (c.category ?? "compound").toString().trim() || "compound";
  const lowerCat = category.toLowerCase();
  const goals = (c.goalTags ?? [])
    .filter(Boolean)
    .slice(0, 3)
    .map((g) => g.replace(/[-_]/g, " "));
  const route = c.isInjectable
    ? "typically administered by injection"
    : "typically taken orally or as directed";
  const goalPart =
    goals.length > 0
      ? ` It is most commonly tracked for ${goals.length === 1 ? goals[0] : `${goals.slice(0, -1).join(", ")} and ${goals[goals.length - 1]}`}.`
      : "";
  return `${c.name} is ${articleFor(lowerCat)} ${lowerCat} ${route}.${goalPart}`;
}

/**
 * Returns the definitional lead sentence(s) for a compound page.
 */
export function compoundDefinitionLead(
  c: CompoundDefinitionInput,
  sources: {
    rescueAnswer?: string | null;
    overviewMd?: string | null;
    bodyMd?: string | null;
    educationMd?: string | null;
  } = {},
): string {
  const candidates = [
    sources.rescueAnswer,
    sources.overviewMd,
    sources.bodyMd,
    sources.educationMd,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const lead = firstSentences(raw);
    // Ignore placeholder / boilerplate leads that carry no definition.
    if (lead.length >= 40 && !/being prepared/i.test(lead)) return lead;
  }
  return fallbackCompoundDefinition(c);
}
