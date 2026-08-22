/**
 * FAQ anchor parity.
 *
 * Answer engines only trust FAQPage schema when the Question/Answer text it
 * declares is the same text a human sees on the page — and Google's "jump to
 * the answer" links only work when each Question carries an `@id`/`url`
 * fragment that resolves to a real element id in the HTML.
 *
 * These helpers parse the rendered HTML of a page, pull every FAQPage block out
 * of its JSON-LD, and verify each Question:
 *   1. declares an anchor fragment (`@id` / `url` ending in `#slug`),
 *   2. that fragment exists as an `id="slug"` element in the served HTML,
 *   3. the visible text of that anchored block contains the exact question, and
 *   4. the visible text of that anchored block contains the exact answer.
 *
 * Everything works on raw HTML strings so it runs against SSR output, a local
 * dev server, or the deployed site with no browser.
 */

export interface FaqSchemaPair {
  question: string;
  answer: string;
  /** Fragment declared by the schema (without "#"), if any. */
  anchor: string | null;
  /** Raw @id / url value the anchor came from. */
  anchorSource: string | null;
}

export interface FaqParityIssue {
  question: string;
  code:
    | "missing-anchor"
    | "anchor-not-in-html"
    | "question-text-mismatch"
    | "answer-text-mismatch"
    | "question-not-on-page"
    | "answer-not-on-page"
    | "empty-answer";
  detail: string;
}

export interface FaqParityResult {
  pairs: FaqSchemaPair[];
  issues: FaqParityIssue[];
  ok: boolean;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#x27": "'",
  "#x2F": "/",
  "#160": " ",
  rsquo: "\u2019",
  lsquo: "\u2018",
  ldquo: "\u201c",
  rdquo: "\u201d",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  deg: "\u00b0",
  times: "\u00d7",
  middot: "\u00b7",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, name: string) => {
    const direct = ENTITIES[name] ?? ENTITIES[name.toLowerCase()];
    if (direct) return direct;
    if (/^#x/i.test(name)) return String.fromCodePoint(parseInt(name.slice(2), 16));
    if (/^#/.test(name)) return String.fromCodePoint(parseInt(name.slice(1), 10));
    return match;
  });
}

/** Strip tags/scripts and collapse whitespace so text can be compared safely. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeText(input: string): string {
  return decodeEntities(input)
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Every parsed JSON-LD object emitted by the page (arrays and @graph flattened). */
export function extractJsonLdNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const raw = decodeEntities(match[1] ?? "").trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const push = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(push);
        return;
      }
      if (!value || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      nodes.push(node);
      if (node["@graph"]) push(node["@graph"]);
    };
    push(parsed);
  }
  return nodes;
}

function typeIs(value: unknown, expected: string): boolean {
  if (typeof value === "string") return value.toLowerCase() === expected.toLowerCase();
  if (Array.isArray(value)) return value.some((v) => typeIs(v, expected));
  return false;
}

function fragmentOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const hash = value.indexOf("#");
  if (hash === -1) return null;
  const frag = value.slice(hash + 1).trim();
  return frag || null;
}

function answerTextOf(question: Record<string, unknown>): string {
  const accepted = question["acceptedAnswer"];
  if (!accepted || typeof accepted !== "object") return "";
  const answer = (Array.isArray(accepted) ? accepted[0] : accepted) as Record<string, unknown>;
  const text = answer?.["text"];
  return typeof text === "string" ? text : "";
}

/** Pull every Question/Answer pair out of the FAQPage blocks in the HTML. */
export function extractFaqSchemaPairs(html: string): FaqSchemaPair[] {
  const pairs: FaqSchemaPair[] = [];
  for (const node of extractJsonLdNodes(html)) {
    if (!typeIs(node["@type"], "FAQPage")) continue;
    const main = node["mainEntity"];
    const entries = Array.isArray(main) ? main : main ? [main] : [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const q = entry as Record<string, unknown>;
      if (!typeIs(q["@type"], "Question")) continue;
      const name = typeof q["name"] === "string" ? q["name"] : "";
      if (!name) continue;
      const anchorSourceRaw =
        fragmentOf(q["@id"]) !== null
          ? (q["@id"] as string)
          : fragmentOf(q["url"]) !== null
            ? (q["url"] as string)
            : fragmentOf(answerObjectUrl(q)) !== null
              ? (answerObjectUrl(q) as string)
              : null;
      pairs.push({
        question: name,
        answer: answerTextOf(q),
        anchor: anchorSourceRaw ? fragmentOf(anchorSourceRaw) : null,
        anchorSource: anchorSourceRaw,
      });
    }
  }
  return pairs;
}

function answerObjectUrl(question: Record<string, unknown>): unknown {
  const accepted = question["acceptedAnswer"];
  if (!accepted || typeof accepted !== "object") return undefined;
  const answer = (Array.isArray(accepted) ? accepted[0] : accepted) as Record<string, unknown>;
  return answer?.["url"];
}

/**
 * Visible text of the block that owns `id="anchor"`.
 *
 * We do not have a DOM here, so we walk forward from the opening tag and stop
 * at the next element that declares another `faq-` anchor (or after a generous
 * character budget). That is enough to keep neighbouring FAQ entries from
 * bleeding into each other while staying tolerant of markup changes.
 */
export function anchoredBlockText(html: string, anchor: string, budget = 6000): string | null {
  const idRe = new RegExp(`<([a-zA-Z0-9-]+)\\b[^>]*\\bid=["']${escapeRegExp(anchor)}["']`, "i");
  const match = idRe.exec(html);
  if (!match) return null;
  const start = match.index;
  const rest = html.slice(start + match[0].length, start + match[0].length + budget);
  const nextAnchor = /\bid=["'](faq-[^"']+)["']/i.exec(rest);
  const slice = nextAnchor ? rest.slice(0, nextAnchor.index) : rest;
  return htmlToText(slice);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface FaqParityOptions {
  /** Fail when a Question declares no anchor fragment at all. Default true. */
  requireAnchors?: boolean;
}

/** Verify every FAQ Question/Answer in the JSON-LD maps to its anchored block. */
export function checkFaqAnchorParity(
  html: string,
  options: FaqParityOptions = {},
): FaqParityResult {
  const requireAnchors = options.requireAnchors ?? true;
  const pairs = extractFaqSchemaPairs(html);
  const issues: FaqParityIssue[] = [];

  for (const pair of pairs) {
    if (!pair.answer.trim()) {
      issues.push({
        question: pair.question,
        code: "empty-answer",
        detail: "acceptedAnswer.text is empty",
      });
      continue;
    }
    if (!pair.anchor) {
      if (requireAnchors) {
        issues.push({
          question: pair.question,
          code: "missing-anchor",
          detail: "Question has no @id/url fragment pointing at an on-page block",
        });
        continue;
      }
      // No anchor declared: fall back to whole-page parity so schema text can
      // never drift from what a reader actually sees.
      const pageText = normalizeText(htmlToText(html));
      if (!pageText.includes(normalizeText(pair.question))) {
        issues.push({
          question: pair.question,
          code: "question-not-on-page",
          detail: "schema question text is not rendered anywhere on the page",
        });
      }
      if (!pageText.includes(normalizeText(pair.answer))) {
        issues.push({
          question: pair.question,
          code: "answer-not-on-page",
          detail: "schema answer text is not rendered verbatim anywhere on the page",
        });
      }
      continue;
    }
    const blockText = anchoredBlockText(html, pair.anchor);
    if (blockText === null) {
      issues.push({
        question: pair.question,
        code: "anchor-not-in-html",
        detail: `no element with id="${pair.anchor}" in the rendered HTML`,
      });
      continue;
    }
    const haystack = normalizeText(blockText);
    if (!haystack.includes(normalizeText(pair.question))) {
      issues.push({
        question: pair.question,
        code: "question-text-mismatch",
        detail: `#${pair.anchor} does not contain the schema question text`,
      });
    }
    if (!haystack.includes(normalizeText(pair.answer))) {
      issues.push({
        question: pair.question,
        code: "answer-text-mismatch",
        detail: `#${pair.anchor} does not contain the schema answer text verbatim`,
      });
    }
  }

  return { pairs, issues, ok: issues.length === 0 };
}
