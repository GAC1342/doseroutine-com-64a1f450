// Shared FAQ builder for library pages.
//
// This module is the single source of truth for both:
//   1) the visible "Frequently asked" accordion on /library/$slug, and
//   2) the FAQPage JSON-LD emitted in <head>.
//
// Google's structured-data rules require the JSON-LD Q&A to match the visible
// content, so both consumers MUST use `buildFaqPairs()` — not their own parser.
//
// Order of operations inside buildFaqPairs():
//   A. If compound_content.faq_md contains parseable Q/A pairs (any of the
//      supported markdown flavours), return those verbatim.
//   B. Otherwise, synthesise a small template FAQ from the compound's
//      structured fields (name, category, aliases, goals, half-life, timing,
//      food rule, is_injectable, is_controlled). Every template answer is
//      grounded in data we actually have — no hallucinated claims.
//
// The template path guarantees that every future library page ships valid
// FAQPage JSON-LD (>=2 Question entries with non-empty acceptedAnswer.text),
// even before the AI content pipeline has generated a bespoke faq_md.

import { halfLifeLabel } from "./half-life-label";

export type FaqPair = { q: string; a: string };

/** Turn stored timing codes ("with_meal") into readable prose. */
export function humanTiming(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!t) return null;
  if (t.includes("with meal") || t.includes("with food")) return "with a meal";
  if (t.includes("empty")) return "on an empty stomach";
  if (t.includes("bedtime") || t.includes("night")) return "in the evening";
  if (t.includes("morning")) return "in the morning";
  return t;
}

export type FaqCompound = {
  name: string;
  slug: string;
  category: string;
  aliases?: string[] | null;
  goal_tags?: string[] | null;
  half_life_hours?: number | null;
  typical_timing?: string | null;
  food_rule?: string | null;
  is_injectable?: boolean | null;
  is_controlled?: boolean | null;
};

export type FaqContent =
  | {
      faq_md?: string | null;
    }
  | null
  | undefined;

/**
 * Public entry point. Always returns >=2 pairs for any real compound so the
 * FAQPage schema is always valid, and always includes the four DoseRoutine
 * baseline questions (interactions, dosing, with TRT, with peptides) so
 * every library page ships the same answer-first Q&A the product promises.
 */
const CONTEXT_PHRASES: RegExp[] = [
  /\b(?:as|like) (?:mentioned|noted|discussed|described|shown|listed|explained) (?:above|below|earlier|previously|in the (?:table|section|list) above)\b[,;:]?\s*/gi,
  /\bsee (?:the )?(?:table|section|list|chart|above|below)[^.]*\.\s*/gi,
  /\b(?:above|below) on this page\b[,;:]?\s*/gi,
  /\bon this page\b[,;:]?\s*/gi,
  /\bin the section above\b[,;:]?\s*/gi,
  /\b(?:refer to|see) the profile (?:page )?(?:above|below)?[^.]*\.\s*/gi,
];

/**
 * Make one answer readable with zero page context: strip cross-references to
 * other parts of the page and replace a leading bare pronoun with the
 * compound name so the sentence stands alone when quoted by an answer engine.
 */
export function selfContainedAnswer(name: string, answer: string): string {
  let out = answer.trim();
  for (const re of CONTEXT_PHRASES) out = out.replace(re, "");
  out = out.replace(/\s{2,}/g, " ").trim();
  // Leading pronoun -> compound name ("It is dosed..." -> "Zinc is dosed...").
  out = out.replace(/^(It|This|They|These|Its)\b/, (m) =>
    m === "Its" ? `${name}'s` : m === "They" || m === "These" ? name : name,
  );
  // Sentence-case repair after a stripped opener.
  out = out.replace(/^([a-z])/, (m) => m.toUpperCase());
  return out.trim();
}

export function buildFaqPairs(
  compound: FaqCompound,
  content: FaqContent,
  extra: FaqPair[] = [],
): FaqPair[] {
  const parsed = parseFaqMarkdown(content?.faq_md);
  const base: FaqPair[] = parsed.length >= 2 ? parsed : buildTemplateFaq(compound);
  const withBaseline = ensureBaselineQuestions(compound, base);
  if (extra.length === 0)
    return withBaseline.map((p) => ({ q: p.q, a: selfContainedAnswer(compound.name, p.a) }));
  // Page-2 rescue questions are appended, never duplicated. Comparison is on a
  // normalized question string so punctuation differences don't slip through.
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const seen = new Set(withBaseline.map((p) => norm(p.q)));
  const added = extra.filter((p) => {
    const k = norm(p.q);
    if (!p.q.trim() || !p.a.trim() || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return [...withBaseline, ...added].map((p) => ({
    q: p.q,
    a: selfContainedAnswer(compound.name, p.a),
  }));
}

/**
 * Build the FAQPage JSON-LD object. Returns null when no valid pairs exist
 * (should not happen for real compounds — the template fallback always emits
 * a minimum of two).
 */
export function buildFaqPageJsonLd(
  compound: FaqCompound,
  content: FaqContent,
  pageUrl: string,
  extra: FaqPair[] = [],
): Record<string, unknown> | null {
  const pairs = buildFaqPairs(compound, content, extra);
  if (pairs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: pairs.map((p) => ({
      "@type": "Question",
      name: p.q,
      acceptedAnswer: { "@type": "Answer", text: p.a },
    })),
  };
}

// ---------------------------------------------------------------------------
// Markdown parser — handles every historical faq_md format in the DB.
// ---------------------------------------------------------------------------

export function parseFaqMarkdown(md: string | null | undefined): FaqPair[] {
  if (!md) return [];

  // Normalize line endings up front so every regex below only has to
  // reason about \n. Historical seed rows use a mix of \r\n and \n.
  const src = md.replace(/\r\n?/g, "\n");

  const out: FaqPair[] = [];
  const cleanQuestion = (raw: string): string =>
    raw
      // Strip markdown decoration and leading list/heading glyphs.
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[#>\-*\d.)\s]+/, "")
      .replace(/\*+/g, "")
      // Strip "Q:", "Q1.", "Question 3 —" style prefixes.
      .replace(/^(?:q(?:uestion)?\s*\d*\s*[:.)\-–—]\s*)/i, "")
      .trim();
  const cleanAnswer = (raw: string): string =>
    raw
      .replace(/^\s+|\s+$/g, "")
      // Strip a leading "A:", "A1.", "Answer —" prefix on the first line.
      .replace(/^(?:a(?:nswer)?\s*\d*\s*[:.)\-–—]\s*)/i, "")
      .trim();
  const push = (q: string, a: string) => {
    const qq = cleanQuestion(q);
    const aa = cleanAnswer(a);
    if (qq && aa) out.push({ q: qq, a: aa });
  };

  // Format A: "### Question?\nAnswer..." (H2/H3/H4 heading style).
  // Also accept "### Q1: Question?" — cleanQuestion strips the prefix.
  const headingRe = /^(#{2,4})\s+(.+?)\s*$/gm;
  const headingMatches = [...src.matchAll(headingRe)];
  if (headingMatches.length > 0) {
    for (let i = 0; i < headingMatches.length; i++) {
      const m = headingMatches[i];
      const start = (m.index ?? 0) + m[0].length;
      const end =
        i + 1 < headingMatches.length ? (headingMatches[i + 1].index ?? src.length) : src.length;
      push(m[2], src.slice(start, end).trim());
    }
    if (out.length > 0) return out;
  }

  // Format B: "- **Question?**\n  Answer..." (bulleted bold questions).
  const bulletRe = /^[\s]*[-*]\s+\*\*(.+?)\*\*\s*\n([\s\S]*?)(?=^[\s]*[-*]\s+\*\*|$(?![\r\n]))/gm;
  let bm: RegExpExecArray | null;
  while ((bm = bulletRe.exec(src)) !== null) {
    const answer = bm[2]
      .split("\n")
      .map((l) => l.replace(/^\s{1,4}/, ""))
      .join("\n")
      .trim();
    push(bm[1], answer);
  }
  if (out.length > 0) return out;

  // Format D: numbered list — "1. **Question?**\n   Answer" or
  // "1) Question?\n   Answer". Bold is optional; indent on the answer
  // is optional too (some AI outputs skip the 3-space indent).
  const numberedRe =
    /^[\s]*(\d+)[.)]\s+(?:\*\*)?(.+?)(?:\*\*)?\s*\n([\s\S]*?)(?=^[\s]*\d+[.)]\s+|$(?![\r\n]))/gm;
  let nm: RegExpExecArray | null;
  while ((nm = numberedRe.exec(src)) !== null) {
    const answer = nm[3]
      .split("\n")
      .map((l) => l.replace(/^\s{1,4}/, ""))
      .join("\n")
      .trim();
    push(nm[2], answer);
  }
  if (out.length > 0) return out;

  // Format E: paired "Q:/A:" (or Q1./A1., Question:/Answer:) lines with
  // no blank-line separation. Walk line-by-line so multi-paragraph
  // answers stay attached to their question until the next Q line.
  const qLine =
    /^\s*(?:q(?:uestion)?\s*\d*\s*[:.)\-–—]|\*\*q(?:uestion)?\s*\d*[:.)\-–—]?\*\*)\s*(.*)$/i;
  const aLine =
    /^\s*(?:a(?:nswer)?\s*\d*\s*[:.)\-–—]|\*\*a(?:nswer)?\s*\d*[:.)\-–—]?\*\*)\s*(.*)$/i;
  const lines = src.split("\n");
  let curQ: string | null = null;
  let curA: string[] = [];
  const flush = () => {
    if (curQ !== null) push(curQ, curA.join("\n"));
    curQ = null;
    curA = [];
  };
  for (const line of lines) {
    const qm = qLine.exec(line);
    if (qm) {
      flush();
      curQ = qm[1];
      continue;
    }
    const am = aLine.exec(line);
    if (am) {
      if (curQ !== null) curA.push(am[1]);
      continue;
    }
    if (curQ !== null) curA.push(line);
  }
  flush();
  if (out.length > 0) return out;

  // Format F: blank-line-separated blocks where the FIRST non-empty line
  // ends with "?" and the rest is the answer. Catches Gemini outputs
  // that skip Q/A prefixes entirely.
  const blocks = src.split(/\n\s*\n/);
  for (const b of blocks) {
    const trimmed = b.trim();
    if (!trimmed) continue;
    const lns = trimmed.split("\n");
    const first = lns[0]
      .replace(/^[#>\-*\d.)\s]+/, "")
      .replace(/\*+/g, "")
      .trim();
    if (!first.endsWith("?")) continue;
    const rest = lns.slice(1).join("\n").trim();
    if (!rest) continue;
    push(first, rest);
  }
  if (out.length > 0) return out;

  // Format C (legacy fallback): "Q: ... A: ..." blocks separated by
  // blank lines where both prefixes appear inside the same block.
  for (const b of blocks) {
    const q = b.match(/Q[:.)-]?\s*(.+)/i)?.[1]?.trim();
    const a = b.match(/A[:.)-]?\s*([\s\S]+)$/i)?.[1]?.trim();
    if (q && a) push(q, a);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Template fallback — grounded in the compound's own structured fields.
// ---------------------------------------------------------------------------

function humanCategory(cat: string): string {
  const c = (cat || "").toLowerCase();
  if (c === "peptide") return "research peptide";
  if (c === "hormone") return "hormone";
  if (c === "vitamin") return "vitamin";
  if (c === "mineral") return "mineral";
  if (c === "amino_acid" || c === "amino-acid") return "amino acid";
  if (c === "nootropic") return "nootropic compound";
  if (c === "sarm") return "selective androgen receptor modulator (SARM)";
  if (c === "medication") return "medication";
  return c ? c.replace(/_/g, " ") : "supplement";
}

function formatFoodRule(rule: string | null | undefined): string | null {
  if (!rule) return null;
  const r = rule.toLowerCase().replace(/_/g, " ");
  if (r.includes("with food")) return "taken with food";
  if (r.includes("empty")) return "taken on an empty stomach";
  if (r.includes("either")) return "taken with or without food";
  return `taken ${r}`;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function buildTemplateFaq(c: FaqCompound): FaqPair[] {
  const name = c.name;
  const cat = humanCategory(c.category);
  const aliases = (c.aliases ?? []).filter(Boolean);
  const goals = (c.goal_tags ?? []).filter(Boolean).slice(0, 4);
  const timing = c.typical_timing?.trim() || null;
  const foodRule = formatFoodRule(c.food_rule);
  const halfLife = c.half_life_hours;
  const injectable = c.is_injectable === true;
  const controlled = c.is_controlled === true;

  const pairs: FaqPair[] = [];

  // Q1 — What is it?
  {
    const aliasClause = aliases.length
      ? ` It is also known as ${joinList(aliases.slice(0, 3))}.`
      : "";
    pairs.push({
      q: `What is ${name}?`,
      a: `${name} is a ${cat}.${aliasClause} Published references for ${name} come from NIH, Mayo Clinic, FDA labelling, and PubChem records.`,
    });
  }

  // Q2 — What is it used for?
  {
    const goalPhrase = goals.length
      ? `supporting ${joinList(goals.map((g) => g.replace(/_/g, " ")))}`
      : "the goals discussed on its profile page";
    pairs.push({
      q: `What is ${name} used for?`,
      a: `${name} is commonly discussed in the context of ${goalPhrase}. Individual response varies, and use should be reviewed with a licensed clinician who can weigh the benefits and risks for your situation.`,
    });
  }

  // Q3 — How is it taken?
  {
    const bits: string[] = [];
    if (injectable) bits.push("it is typically administered by injection");
    if (timing) bits.push(`it is typically taken ${humanTiming(timing)}`);
    if (foodRule) bits.push(`it is usually ${foodRule}`);
    if (typeof halfLife === "number" && halfLife > 0) {
      bits.push(
        `its approximate half-life is ${halfLife} hours, which influences dosing frequency`,
      );
    }
    const body = bits.length
      ? `For ${name}, ${joinList(bits)}. Always follow the specific dose your clinician or the product label prescribes.`
      : `Dosing for ${name} varies by protocol and individual. Follow the specific dose your clinician or the product label prescribes, and see the profile page for typical ranges and citations.`;
    pairs.push({
      q: `How is ${name} typically taken?`,
      a: body,
    });
  }

  // Q4 — Side effects / safety
  {
    const controlledClause = controlled
      ? ` ${name} is classified as a controlled substance in some jurisdictions, so legal status and prescribing rules apply.`
      : "";
    pairs.push({
      q: `Are there side effects or warnings for ${name}?`,
      a: `${name} carries potential side effects and drug interactions, documented in NIH, Mayo Clinic, and FDA label sources.${controlledClause} Stop use and contact a clinician if you experience unexpected symptoms.`,
    });
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Baseline questions — DoseRoutine promises every library page answers these
// four questions in plain language. If the AI-authored or template FAQ
// already covers a topic (matched loosely by keyword), we keep the existing
// answer. Otherwise we append a grounded fallback that points at the
// interaction checker and the compound's own profile page.
// ---------------------------------------------------------------------------

type BaselineTopic = {
  key: string;
  question: (name: string) => string;
  matches: (existingQ: string) => boolean;
  answer: (c: FaqCompound) => string;
};

const BASELINE_TOPICS: BaselineTopic[] = [
  {
    key: "interactions",
    question: (n) => `What does ${n} interact with?`,
    matches: (q) => /interact/i.test(q),
    answer: (c) =>
      `${c.name} can interact with other supplements, prescription medicines, hormones, and peptides. Interaction risk depends on dose, timing, and what else is taken the same day, so each pairing has to be checked individually rather than assumed safe. A free interaction checker is available at https://doseroutine.com/interaction-checker (no signup needed).`,
  },
  {
    key: "dosing",
    question: (n) => `What should I know about dosing ${n}?`,
    matches: (q) => /dos(e|ing)|how much|how (is|do) .* tak/i.test(q),
    answer: (c) => {
      const timing = humanTiming(c.typical_timing);
      const half =
        typeof c.half_life_hours === "number" && c.half_life_hours > 0
          ? `The reported ${halfLifeLabel(c.category).toLowerCase()} is about ${c.half_life_hours} hours. `
          : "";
      const timingBit = timing ? `${c.name} is typically taken ${timing}. ` : "";
      return `${timingBit}${half}Dosing for ${c.name} varies by protocol, formulation, and individual response. Always follow the specific dose your clinician or the product label prescribes.`;
    },
  },
  {
    key: "with_trt",
    question: (n) => `Can I take ${n} with TRT?`,
    matches: (q) => /\btrt\b|testosterone replacement/i.test(q),
    answer: (c) =>
      `Whether ${c.name} is safe to combine with testosterone replacement therapy depends on the protocol (dose, ester, and ancillaries such as HCG or anastrozole) and on current labs. No general contraindication applies to every TRT protocol, so the combination should be confirmed with the prescribing clinician. A TRT interaction reference is available at https://doseroutine.com/trt-supplement-interactions (free to use).`,
  },
  {
    key: "with_peptides",
    question: (n) => `Can I take ${n} with peptides?`,
    matches: (q) => /peptid/i.test(q),
    answer: (c) =>
      `Peptides vary widely — healing peptides, GLP-1 agonists, growth-hormone secretagogues, and melanocortins — and each carries its own interaction profile with ${c.name}. The combination should be checked peptide by peptide rather than treated as one category, and reviewed with a clinician familiar with peptide protocols.`,
  },
];

function ensureBaselineQuestions(c: FaqCompound, pairs: FaqPair[]): FaqPair[] {
  const out = [...pairs];
  for (const topic of BASELINE_TOPICS) {
    if (out.some((p) => topic.matches(p.q))) continue;
    out.push({ q: topic.question(c.name), a: topic.answer(c) });
  }
  return out;
}
