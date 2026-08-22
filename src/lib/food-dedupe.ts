/**
 * Duplicate detection for the food catalog.
 *
 * Pure functions only — no database access — so the scoring rules can be unit
 * tested and reused by both the USDA import path and the catalog-wide
 * duplicate review panel.
 */

import { normalizeGtin14 } from "./gtin-log";

export type DuplicateVerdict = "exact" | "strong" | "probable" | "none";

export type DedupeFood = {
  id?: string;
  name: string;
  nameNorm?: string | null;
  brand?: string | null;
  gtin?: string | null;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  aliases?: string[];
};

/** Words that describe preparation/packaging rather than the food itself. */
const STOP_TOKENS = new Set([
  "raw",
  "nfs",
  "upc",
  "gtin",
  "includes",
  "food",
  "foods",
  "product",
  "products",
  "brand",
  "branded",
  "fresh",
  "and",
  "with",
  "the",
  "of",
  "or",
  "a",
  "in",
  "no",
  "all",
  "each",
  "per",
  "usda",
  "commodity",
]);

/**
 * Tokens that materially change what a food *is*. If two names disagree on any
 * of these, they are never the same food (raw vs cooked chicken, whole vs skim
 * milk), no matter how close the rest of the name is.
 */
const DISTINGUISHING_TOKENS = [
  "cooked",
  "roasted",
  "grilled",
  "fried",
  "baked",
  "boiled",
  "steamed",
  "dried",
  "dry",
  "frozen",
  "canned",
  "smoked",
  "whole",
  "skim",
  "nonfat",
  "lowfat",
  "reduced",
  "light",
  "skinless",
  "boneless",
  "unsweetened",
  "sweetened",
  "salted",
  "unsalted",
  "juice",
  "powder",
  "oil",
  "flour",
];

/**
 * Invisible characters that carry no meaning in a food name: zero-width space
 * and joiners, the byte-order mark, word joiner, soft hyphen, directional
 * marks and Mongolian vowel separator. Copy/paste from spreadsheets, PDFs and
 * some label scanners sprinkles these into names. They must be deleted (not
 * turned into a space) or they split a word in half — "chi<ZWSP>cken" would
 * tokenize as "chi" + "cken" and miss an obvious duplicate.
 */
const INVISIBLE_CHARS = /[\u00ad\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u206a-\u206f\ufeff]/g;

/** Other non-printing control characters, treated as separators, not letters. */
// eslint-disable-next-line no-control-regex -- stripping control characters is the purpose of this pattern.
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

/**
 * Fold a name to a comparable ASCII form.
 *
 * NFD splits "é" into "e" + a combining accent, so decomposing first and then
 * dropping the combining marks makes "crème", "creme" and the NFC/NFD spellings
 * of the same string collapse to one value. Without this, a decomposed accent
 * used to be replaced by a space and shredded the token ("cr" + "me").
 *
 * Invisible formatting characters are removed outright, and control characters
 * collapse to whitespace, so a pasted name matches the typed one.
 */
export function foldName(name: string | null | undefined): string {
  return (
    String(name ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(INVISIBLE_CHARS, "")
      .replace(CONTROL_CHARS, " ")
      .toLowerCase()
      // Greek final sigma is a positional spelling of sigma: "στραγγιστός" and
      // "στραγγιστόσ" are the same word. Fold it so word boundaries (and only
      // word boundaries) decide tokenization.
      .replace(/\u03c2/g, "\u03c3")
      // Standalone Greek tonos / dialytika marks (U+0384, U+0385) are not
      // combining marks, so NFD leaves them behind. Drop them instead of letting
      // them survive as punctuation that splits a word.
      .replace(
        /[\u0384\u0385\u1fbd-\u1fc1\u1fcd-\u1fcf\u1fdd-\u1fdf\u1fed-\u1fef\u1ffd\u1ffe]/g,
        "",
      )
      // Turkish dotless i (ı, U+0131) is a distinct letter, so lowercasing alone
      // leaves "kırmızı" and "kirmizi" as different strings. Dotted capital İ
      // (U+0130) already folds via NFD (I + combining dot above). Fold the
      // dotless form to plain "i" so both spellings of a Turkish product name
      // compare equal without touching word boundaries.
      .replace(/\u0131/g, "i")
      // Visually identical Greek/Cyrillic letters pasted into a Latin name
      // ("Grillеd Chiсkеn" with a Cyrillic е/с) would otherwise never match.
      .split(/(\s+)/)
      .map(foldConfusables)
      .join("")
  );
}

/**
 * Latin lookalikes for Greek and Cyrillic letters that render identically in
 * most fonts. Only applied to a word that already contains a Latin letter, so
 * a genuinely Greek or Cyrillic name keeps its own script (and still compares
 * equal to itself), while a mixed-script homoglyph spoof folds to plain Latin.
 */
const CONFUSABLES: Record<string, string> = {
  // Greek
  "\u03b1": "a",
  "\u03b2": "b",
  "\u03b5": "e",
  "\u03b7": "n",
  "\u03b9": "i",
  "\u03ba": "k",
  "\u03bd": "v",
  "\u03bf": "o",
  "\u03c1": "p",
  "\u03c3": "s",
  "\u03c4": "t",
  "\u03c5": "u",
  "\u03c7": "x",
  "\u03bc": "u",
  // Cyrillic
  "\u0430": "a",
  "\u0432": "b",
  "\u0435": "e",
  "\u0437": "3",
  "\u0438": "n",
  "\u0439": "n",
  "\u043a": "k",
  "\u043c": "m",
  "\u043d": "h",
  "\u043e": "o",
  "\u0440": "p",
  "\u0441": "c",
  "\u0442": "t",
  "\u0443": "y",
  "\u0445": "x",
  "\u0456": "i",
  "\u0455": "s",
  "\u0458": "j",
  "\u04bb": "h",
};

const LATIN_LETTER = /[a-z]/;

/** Fold homoglyphs in a single word, only when it already looks Latin. */
export function foldConfusables(word: string): string {
  if (!LATIN_LETTER.test(word)) return word;
  let out = "";
  for (const ch of word) out += CONFUSABLES[ch] ?? ch;
  return out;
}

export function normalizeTokens(name: string): string[] {
  return (
    foldName(name)
      // Unicode-aware: keep letters from any script (Greek, Cyrillic, ...) so a
      // non-Latin name still produces real tokens instead of collapsing to
      // nothing. Punctuation and symbols remain word separators.
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !STOP_TOKENS.has(t))
  );
}

/** Jaccard similarity of two token sets, 0..1. */
export function tokenOverlap(a: string, b: string): number {
  const setA = new Set(normalizeTokens(a));
  const setB = new Set(normalizeTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  const union = setA.size + setB.size - shared;
  return union === 0 ? 0 : shared / union;
}

/** True when the two names disagree on a preparation/fat-level qualifier. */
export function conflictingQualifiers(a: string, b: string): boolean {
  const setA = new Set(normalizeTokens(a));
  const setB = new Set(normalizeTokens(b));
  return DISTINGUISHING_TOKENS.some((token) => setA.has(token) !== setB.has(token));
}

function within(a: number, b: number, tolerance: number): boolean {
  const x = Number(a) || 0;
  const y = Number(b) || 0;
  const base = Math.max(Math.abs(x), Math.abs(y));
  if (base === 0) return true;
  // Small absolute differences on tiny values (0.4 g vs 0.6 g fat) are noise.
  if (Math.abs(x - y) <= 1) return true;
  return Math.abs(x - y) / base <= tolerance;
}

/** kcal within 15%, each macro within 20% per 100 g. */
export function macrosClose(a: DedupeFood, b: DedupeFood): boolean {
  return (
    within(a.kcal100, b.kcal100, 0.15) &&
    within(a.protein100, b.protein100, 0.2) &&
    within(a.carbs100, b.carbs100, 0.2) &&
    within(a.fat100, b.fat100, 0.2)
  );
}

function norm(value: string | null | undefined): string {
  return (
    foldName(value)
      // Unicode-aware for the same reason as normalizeTokens: a Greek or
      // Cyrillic name must not normalize to an empty string.
      .replace(/[^\p{L}\p{N}%,/\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Barcode digits, left-padded to GTIN-14 so the same product still matches
 * when one source stores a UPC-A ("012345678905") and another the EAN-13 or
 * zero-stripped form ("12345678905"). USDA and Open Food Facts disagree on
 * leading zeros constantly.
 */
function digits(value: string | null | undefined, source = "food-dedupe"): string {
  return normalizeGtin14(value, source).value;
}

export type DuplicateScore = {
  verdict: DuplicateVerdict;
  score: number;
  reason: string;
};

/** One deterministic input to the match decision. */
export type MatchSignal = {
  /** Stable machine key — safe to assert on in tests. */
  key:
    | "names"
    | "barcode"
    | "alias"
    | "token-overlap"
    | "qualifiers"
    | "brand"
    | "kcal100"
    | "protein100"
    | "carbs100"
    | "fat100";
  label: string;
  /** Whether the signal supports a match (true), opposes it (false), or is neutral (null). */
  passed: boolean | null;
  /** Human-readable evidence, always the same for the same inputs. */
  detail: string;
};

/** Deterministic explanation of why two foods matched — or did not. */
export type MatchExplanation = DuplicateScore & {
  /** Identifier of the rule that decided the verdict. */
  rule:
    | "missing-name"
    | "same-barcode"
    | "identical-name"
    | "alias-hit"
    | "qualifier-conflict"
    | "name-and-macros"
    | "brand-and-name"
    | "similar-and-macros"
    | "below-threshold";
  signals: MatchSignal[];
  /** One line per signal, prefixed +/-/~, plus the deciding rule. */
  lines: string[];
  /** The lines joined with newlines — paste-able into test failure output. */
  text: string;
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function macroSignal(
  key: "kcal100" | "protein100" | "carbs100" | "fat100",
  label: string,
  a: number,
  b: number,
  tolerance: number,
): MatchSignal {
  const x = Number(a) || 0;
  const y = Number(b) || 0;
  const base = Math.max(Math.abs(x), Math.abs(y));
  const delta = Math.abs(x - y);
  const relative = base === 0 ? 0 : delta / base;
  return {
    key,
    label,
    passed: within(x, y, tolerance),
    detail: `${x} vs ${y} (Δ ${Math.round(delta * 100) / 100}, ${pct(relative)} of ${Math.round(base * 100) / 100}, tolerance ${pct(tolerance)})`,
  };
}

function conflictingQualifierTokens(a: string, b: string): string[] {
  const setA = new Set(normalizeTokens(a));
  const setB = new Set(normalizeTokens(b));
  return DISTINGUISHING_TOKENS.filter((token) => setA.has(token) !== setB.has(token));
}

function sharedTokens(a: string, b: string): { shared: string[]; only: string[] } {
  const setA = new Set(normalizeTokens(a));
  const setB = new Set(normalizeTokens(b));
  const shared = [...setA].filter((t) => setB.has(t)).sort();
  const only = [...new Set([...setA, ...setB])].filter((t) => !(setA.has(t) && setB.has(t))).sort();
  return { shared, only };
}

function finish(
  base: {
    verdict: DuplicateVerdict;
    score: number;
    reason: string;
    rule: MatchExplanation["rule"];
  },
  signals: MatchSignal[],
): MatchExplanation {
  const lines = signals.map((s) => {
    const mark = s.passed === true ? "+" : s.passed === false ? "-" : "~";
    return `${mark} ${s.label}: ${s.detail}`;
  });
  lines.push(
    `= ${base.verdict.toUpperCase()} (score ${Math.round(base.score * 100) / 100}, rule "${base.rule}"${
      base.reason ? `, ${base.reason}` : ""
    })`,
  );
  return { ...base, signals, lines, text: lines.join("\n") };
}

/**
 * Full, deterministic breakdown of a duplicate comparison.
 *
 * Same inputs always produce the same signals, ordering and wording, so tests
 * can assert on `rule`/`signals` and print `text` when an expectation fails.
 */
export function explainDuplicate(incoming: DedupeFood, existing: DedupeFood): MatchExplanation {
  const incomingName = norm(incoming.nameNorm || incoming.name);
  const existingName = norm(existing.nameNorm || existing.name);

  const nameSignal: MatchSignal = {
    key: "names",
    label: "Names",
    passed: incomingName && existingName ? incomingName === existingName : false,
    detail: `"${incomingName || "(empty)"}" vs "${existingName || "(empty)"}"`,
  };

  if (!incomingName || !existingName) {
    return finish({ verdict: "none", score: 0, reason: "", rule: "missing-name" }, [nameSignal]);
  }

  const gtinA = digits(incoming.gtin, "food-dedupe.incoming");
  const gtinB = digits(existing.gtin, "food-dedupe.existing");
  const significant = gtinA.replace(/^0+/, "").length;
  const barcodeMatch = significant >= 8 && gtinA === gtinB;
  const barcodeSignal: MatchSignal = {
    key: "barcode",
    label: "Barcode",
    passed: barcodeMatch ? true : gtinA && gtinB ? false : null,
    detail:
      gtinA || gtinB
        ? `${gtinA || "(none)"} vs ${gtinB || "(none)"}${significant < 8 && gtinA ? " (too few digits to trust)" : ""}`
        : "neither food has a barcode",
  };

  if (barcodeMatch) {
    return finish({ verdict: "exact", score: 1, reason: "Same barcode", rule: "same-barcode" }, [
      barcodeSignal,
      nameSignal,
    ]);
  }

  if (incomingName === existingName) {
    return finish(
      { verdict: "exact", score: 1, reason: "Identical name", rule: "identical-name" },
      [nameSignal, barcodeSignal],
    );
  }

  const matchedAlias = (existing.aliases ?? []).find((alias) => norm(alias) === incomingName);
  const aliasSignal: MatchSignal = {
    key: "alias",
    label: "Alias",
    passed: matchedAlias ? true : (existing.aliases ?? []).length > 0 ? false : null,
    detail: matchedAlias
      ? `incoming name matches alias "${matchedAlias}"`
      : (existing.aliases ?? []).length > 0
        ? `no alias of ${(existing.aliases ?? []).length} matched`
        : "existing food has no aliases",
  };

  if (matchedAlias) {
    return finish(
      { verdict: "strong", score: 0.95, reason: "Matches an existing alias", rule: "alias-hit" },
      [aliasSignal, nameSignal],
    );
  }

  const overlap = tokenOverlap(incoming.name, existing.name);
  const { shared, only } = sharedTokens(incoming.name, existing.name);
  const conflicts = conflictingQualifierTokens(incoming.name, existing.name);
  const brandA = norm(incoming.brand);
  const brandB = norm(existing.brand);
  const sameBrand = Boolean(brandA) && brandA === brandB;

  const overlapSignal: MatchSignal = {
    key: "token-overlap",
    label: "Token overlap",
    passed: overlap >= 0.6,
    detail: `${pct(overlap)} — shared [${shared.join(", ") || "none"}], differing [${only.join(", ") || "none"}]`,
  };
  const qualifierSignal: MatchSignal = {
    key: "qualifiers",
    label: "Qualifiers",
    passed: conflicts.length === 0,
    detail: conflicts.length
      ? `conflicting: ${conflicts.join(", ")}`
      : "no preparation/variant conflicts",
  };
  const brandSignal: MatchSignal = {
    key: "brand",
    label: "Brand",
    passed: sameBrand ? true : brandA || brandB ? false : null,
    detail: brandA || brandB ? `"${brandA || "(none)"}" vs "${brandB || "(none)"}"` : "no brands",
  };
  const macroSignals = [
    macroSignal("kcal100", "Calories/100 g", incoming.kcal100, existing.kcal100, 0.15),
    macroSignal("protein100", "Protein/100 g", incoming.protein100, existing.protein100, 0.2),
    macroSignal("carbs100", "Carbs/100 g", incoming.carbs100, existing.carbs100, 0.2),
    macroSignal("fat100", "Fat/100 g", incoming.fat100, existing.fat100, 0.2),
  ];
  const close = macroSignals.every((s) => s.passed === true);

  const signals = [
    nameSignal,
    overlapSignal,
    qualifierSignal,
    brandSignal,
    barcodeSignal,
    aliasSignal,
    ...macroSignals,
  ];

  if (conflicts.length) {
    return finish(
      {
        verdict: "none",
        score: overlap,
        reason: "Different preparation or variant",
        rule: "qualifier-conflict",
      },
      signals,
    );
  }
  if (overlap >= 0.85 && close) {
    return finish(
      {
        verdict: "strong",
        score: overlap,
        reason: "Nearly identical name and macros",
        rule: "name-and-macros",
      },
      signals,
    );
  }
  if (sameBrand && overlap >= 0.6) {
    return finish(
      {
        verdict: "probable",
        score: overlap,
        reason: "Same brand and similar name",
        rule: "brand-and-name",
      },
      signals,
    );
  }
  if (overlap >= 0.6 && close) {
    return finish(
      {
        verdict: "probable",
        score: overlap,
        reason: "Similar name and matching macros",
        rule: "similar-and-macros",
      },
      signals,
    );
  }
  return finish({ verdict: "none", score: overlap, reason: "", rule: "below-threshold" }, signals);
}

/**
 * Compare an incoming food against an existing catalog row.
 *
 * `exact`/`strong` are safe to suggest as an automatic merge; `probable`
 * always needs an explicit admin decision.
 */
export function classifyDuplicate(incoming: DedupeFood, existing: DedupeFood): DuplicateScore {
  const { verdict, score, reason } = explainDuplicate(incoming, existing);
  return { verdict, score, reason };
}

/** One-line summary, e.g. `strong 0.9 name-and-macros — Nearly identical name and macros`. */
export function summarizeMatch(explanation: MatchExplanation): string {
  const score = Math.round(explanation.score * 100) / 100;
  return `${explanation.verdict} ${score} ${explanation.rule}${
    explanation.reason ? ` — ${explanation.reason}` : ""
  }`;
}

const RANK: Record<DuplicateVerdict, number> = { exact: 3, strong: 2, probable: 1, none: 0 };

/** Best duplicate candidate for an incoming food, if any. */
export function bestDuplicate<T extends DedupeFood>(
  incoming: DedupeFood,
  candidates: T[],
): { candidate: T; match: DuplicateScore } | null {
  let best: { candidate: T; match: DuplicateScore } | null = null;
  for (const candidate of candidates) {
    if (candidate.id && candidate.id === incoming.id) continue;
    const match = classifyDuplicate(incoming, candidate);
    if (match.verdict === "none") continue;
    if (
      !best ||
      RANK[match.verdict] > RANK[best.match.verdict] ||
      (RANK[match.verdict] === RANK[best.match.verdict] && match.score > best.match.score)
    ) {
      best = { candidate, match };
    }
  }
  return best;
}

/** Group a catalog slice into duplicate pairs for the review panel. */
export function findDuplicatePairs<T extends DedupeFood>(
  foods: T[],
): { a: T; b: T; match: DuplicateScore }[] {
  const pairs: { a: T; b: T; match: DuplicateScore }[] = [];
  for (let i = 0; i < foods.length; i += 1) {
    for (let j = i + 1; j < foods.length; j += 1) {
      const a = foods[i]!;
      const b = foods[j]!;
      const match = classifyDuplicate(a, b);
      if (match.verdict === "none") continue;
      pairs.push({ a, b, match });
    }
  }
  return pairs.sort(
    (x, y) => RANK[y.match.verdict] - RANK[x.match.verdict] || y.match.score - x.match.score,
  );
}
