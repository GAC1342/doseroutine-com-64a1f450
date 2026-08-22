/**
 * Rich Results–style validator for FAQPage JSON-LD.
 *
 * Mirrors the checks Google's Rich Results Test applies to FAQPage markup, so
 * CI fails before a page ships schema that would be rejected for
 * featured-snippet / FAQ-rich-result eligibility.
 *
 * Rules enforced (Google FAQPage structured data guidelines):
 *  - Node parses as JSON and is an object with @context schema.org
 *  - @type is FAQPage
 *  - mainEntity is a non-empty array of Question items
 *  - Each Question has @type Question and a non-empty `name` (<= 300 chars)
 *  - Each Question has acceptedAnswer with @type Answer and non-empty `text`
 *  - Answer text contains no script/form/interactive markup
 *  - Question names are unique within a page
 *  - Any @id / url values are absolute https URLs
 */

export type FaqRichResultIssue = { path: string; message: string };
export type FaqRichResultReport = {
  source: string;
  valid: boolean;
  questionCount: number;
  issues: FaqRichResultIssue[];
};

const MAX_QUESTION_CHARS = 300;
const MIN_ANSWER_CHARS = 20;
const MAX_ANSWER_CHARS = 5000;
/** Google rejects interactive/script markup inside answer text. */
const FORBIDDEN_ANSWER_MARKUP = /<\s*(script|style|form|input|button|iframe|textarea|select)\b/i;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function typeMatches(node: Record<string, unknown>, expected: string): boolean {
  const t = node["@type"];
  return Array.isArray(t) ? t.includes(expected) : t === expected;
}

/** Validate a single parsed FAQPage node. */
export function validateFaqPageNode(node: unknown, source = "faq"): FaqRichResultReport {
  const issues: FaqRichResultIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });

  if (!isPlainObject(node)) {
    return {
      source,
      valid: false,
      questionCount: 0,
      issues: [{ path: "$", message: "FAQ schema is not a JSON object" }],
    };
  }

  const context = str(node["@context"]);
  if (!/schema\.org/.test(context))
    add("@context", `expected schema.org, got "${context || "none"}"`);
  if (!typeMatches(node, "FAQPage"))
    add("@type", `expected FAQPage, got "${String(node["@type"] ?? "none")}"`);

  for (const key of ["@id", "url"]) {
    const v = str(node[key]);
    if (v && !v.startsWith("https://")) add(key, `${key} must be an absolute https URL`);
  }

  const mainEntity = node.mainEntity;
  if (!Array.isArray(mainEntity) || mainEntity.length === 0) {
    add("mainEntity", "mainEntity must be a non-empty array of Question items");
    return { source, valid: false, questionCount: 0, issues };
  }

  const seen = new Set<string>();
  mainEntity.forEach((raw, i) => {
    const p = `mainEntity[${i}]`;
    if (!isPlainObject(raw)) {
      add(p, "Question entry is not an object");
      return;
    }
    if (!typeMatches(raw, "Question")) add(`${p}.@type`, "expected @type Question");

    const name = str(raw.name);
    if (!name) add(`${p}.name`, "missing question text");
    else if (name.length > MAX_QUESTION_CHARS)
      add(`${p}.name`, `question is ${name.length} chars (max ${MAX_QUESTION_CHARS})`);
    else {
      const key = name.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) add(`${p}.name`, `duplicate question: "${name}"`);
      seen.add(key);
    }

    const answer = raw.acceptedAnswer;
    if (!isPlainObject(answer)) {
      add(`${p}.acceptedAnswer`, "missing acceptedAnswer");
      return;
    }
    if (!typeMatches(answer, "Answer")) add(`${p}.acceptedAnswer.@type`, "expected @type Answer");

    const text = str(answer.text);
    if (!text) add(`${p}.acceptedAnswer.text`, "missing answer text");
    else if (text.length < MIN_ANSWER_CHARS)
      add(`${p}.acceptedAnswer.text`, `answer is ${text.length} chars (min ${MIN_ANSWER_CHARS})`);
    else if (text.length > MAX_ANSWER_CHARS)
      add(`${p}.acceptedAnswer.text`, `answer is ${text.length} chars (max ${MAX_ANSWER_CHARS})`);
    if (FORBIDDEN_ANSWER_MARKUP.test(text))
      add(`${p}.acceptedAnswer.text`, "answer contains script/form/interactive markup");

    const url = str(answer.url);
    if (url && !url.startsWith("https://"))
      add(`${p}.acceptedAnswer.url`, "url must be absolute https");
  });

  return { source, valid: issues.length === 0, questionCount: mainEntity.length, issues };
}

/** Parse a raw JSON-LD string and validate it as FAQPage markup. */
export function validateFaqPageJson(json: string, source = "faq"): FaqRichResultReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return {
      source,
      valid: false,
      questionCount: 0,
      issues: [{ path: "$", message: `FAQ JSON-LD is not parseable: ${(err as Error).message}` }],
    };
  }
  return validateFaqPageNode(parsed, source);
}

/** Every FAQPage node inside a route head payload's JSON-LD scripts. */
export function extractFaqPageNodes(head: {
  scripts?: Array<{ type?: string; children?: string }>;
}): unknown[] {
  const nodes: unknown[] = [];
  for (const s of head.scripts ?? []) {
    if (s?.type !== "application/ld+json" || typeof s.children !== "string") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(s.children);
    } catch {
      nodes.push({ __invalid: true });
      continue;
    }
    const graph =
      isPlainObject(parsed) && Array.isArray(parsed["@graph"]) ? parsed["@graph"] : null;
    const list = graph ?? (Array.isArray(parsed) ? parsed : [parsed]);
    for (const n of list) if (isPlainObject(n) && typeMatches(n, "FAQPage")) nodes.push(n);
  }
  return nodes;
}

/** Flat "source: path — message" strings, empty when everything is eligible. */
export function faqRichResultFailures(reports: readonly FaqRichResultReport[]): string[] {
  return reports.flatMap((r) => r.issues.map((i) => `${r.source}: ${i.path} — ${i.message}`));
}
