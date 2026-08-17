#!/usr/bin/env node
/**
 * CI check: every /library/<compound> page must open with a quotable
 * "direct answer" paragraph immediately under the H1, and nothing that reads
 * as a call to action or marketing copy may appear above it.
 *
 * What it enforces per page:
 *  1. exactly one <h1>;
 *  2. the first element after the </h1> is the direct-answer paragraph
 *     (<p class="dr-speakable-intro">) — no wrapper, badge row, or CTA between;
 *  3. the answer is 40-60 words of plain declarative prose;
 *  4. the answer contains no product framing ("DoseRoutine helps you...",
 *     "sign up", "free trial", ...);
 *  5. no CTA/marketing markup (sign-up links, /auth or /pricing hrefs,
 *     "Start free", "Get started", ...) appears anywhere above the H1 inside
 *     the page's <main>.
 *
 * Usage:
 *   node scripts/check-direct-answers.mjs                # http://localhost:8080
 *   BASE_URL=https://doseroutine.com node scripts/check-direct-answers.mjs
 *   node scripts/check-direct-answers.mjs --limit 25     # sample N pages
 *
 * Exits non-zero with a per-page failure list when anything is off.
 */

const BASE_URL = (process.env["BASE_URL"] || "http://localhost:8080").replace(/\/$/, "");

export const MIN_WORDS = 40;
export const MAX_WORDS = 60;

/** Product/marketing framing that must never appear in a reference answer. */
export const MARKETING =
  /\b(DoseRoutine|our app|we help|helps you|sign up|sign-up|free trial|start free|get started|track your)\b/i;

/** Markup that signals a CTA block rather than reference content. */
export const CTA_MARKUP = [
  { label: "auth link", re: /href="\/auth\b/i },
  { label: "pricing link", re: /href="\/pricing\b/i },
  { label: "signup copy", re: /\b(sign up free|start free|get started|create your free)\b/i },
  { label: "trial copy", re: /\b(free trial|7-day trial|14-day trial)\b/i },
];

function stripTags(html) {
  return html
    .replace(/<!--.*?-->/gs, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Audits one page's server-rendered HTML. Returns a list of human-readable
 * problems; an empty list means the page passes.
 */
export function auditHtml(html) {
  const problems = [];

  const mainStart = html.search(/<main\b/i);
  const scope = mainStart >= 0 ? html.slice(mainStart) : html;

  const h1Matches = [...scope.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)];
  if (h1Matches.length === 0) return ["no <h1> found"];
  if (h1Matches.length > 1) problems.push(`expected exactly one <h1>, found ${h1Matches.length}`);

  const h1 = h1Matches[0];
  const above = scope.slice(0, h1.index);
  for (const { label, re } of CTA_MARKUP) {
    if (re.test(above)) problems.push(`CTA/marketing (${label}) appears above the H1`);
  }

  const after = scope.slice(h1.index + h1[0].length);
  const nextTag = after.match(/<([a-zA-Z][\w-]*)\b([^>]*)>/);
  if (!nextTag) return [...problems, "nothing rendered after the H1"];

  // Optional alias line ("Also known as: ...") is reference content, so allow it
  // as the only thing permitted between the H1 and the direct answer.
  let cursor = after;
  const aliasFirst = /^\s*<p\b[^>]*>\s*Also known as:/i.test(after);
  if (aliasFirst) cursor = after.slice(after.indexOf("</p>") + 4);

  const answerMatch = cursor.match(/^\s*<p\b([^>]*)>([\s\S]*?)<\/p>/i);
  const isAnswer = answerMatch && /dr-speakable-intro/.test(answerMatch[1]);
  if (!isAnswer) {
    const intruder = cursor.match(/<([a-zA-Z][\w-]*)\b/);
    problems.push(
      `direct answer is not the first element under the H1 (found <${intruder ? intruder[1] : "?"}> instead)`,
    );
    return problems;
  }

  const answer = stripTags(answerMatch[2]);
  const count = wordCount(answer);
  if (count < MIN_WORDS || count > MAX_WORDS) {
    problems.push(`direct answer is ${count} words, expected ${MIN_WORDS}-${MAX_WORDS}`);
  }
  const marketing = answer.match(MARKETING);
  if (marketing) problems.push(`direct answer uses marketing framing: "${marketing[0]}"`);
  if (!/[.!?]$/.test(answer)) problems.push("direct answer does not end in a full sentence");

  return problems;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "doseroutine-ci-direct-answer" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

/**
 * Hand-written hub/landing routes under /library. They are editorial pages with
 * their own layout, not compound entries rendered by library.$slug.tsx, so the
 * direct-answer contract does not apply to them. Derived from the filesystem in
 * the live sweep; listed here so the offline test stays deterministic.
 */
export const NON_COMPOUND_SLUGS = new Set([
  "compare",
  "guides",
  "goals",
  "index",
  "peptide-stacks",
  "peptide-stacks-for-muscle-growth",
  "cjc-1295-ipamorelin",
  "retatrutide-dosage",
  "mens-health",
  "womens-health",
  "prostate-health",
  "testosterone-support",
]);

/** Compound detail slugs only: /library/<slug>, excluding hubs and guides. */
export function compoundSlugsFromSitemap(xml) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const slugs = new Set();
  for (const url of urls) {
    const m = url.match(/\/library\/([a-z0-9-]+)$/i);
    if (!m) continue;
    const slug = m[1];
    if (NON_COMPOUND_SLUGS.has(slug)) continue;
    slugs.add(slug);
  }
  return [...slugs].sort();
}

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  const sitemap = await fetchText(`${BASE_URL}/sitemap.xml`);
  let slugs = compoundSlugsFromSitemap(sitemap);
  if (slugs.length === 0) {
    console.error("No /library/<slug> URLs found in sitemap.xml");
    process.exit(1);
  }
  if (Number.isFinite(limit)) slugs = slugs.slice(0, limit);

  console.log(`Checking direct answers on ${slugs.length} library pages at ${BASE_URL}`);

  const failures = [];
  // Bounded concurrency: SSR renders are slow, but the whole library must be
  // checkable inside a normal CI step.
  const CONCURRENCY = Number(process.env["CHECK_CONCURRENCY"] || 8);
  const queue = [...slugs];
  async function worker() {
    for (;;) {
      const slug = queue.shift();
      if (!slug) return;
      const url = `${BASE_URL}/library/${slug}`;
      try {
        const html = await fetchText(url);
        const problems = auditHtml(html);
        if (problems.length) failures.push({ url, problems });
      } catch (err) {
        failures.push({ url, problems: [`fetch failed: ${err.message}`] });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  failures.sort((a, b) => a.url.localeCompare(b.url));

  if (failures.length === 0) {
    console.log(`PASS — all ${slugs.length} pages open with a ${MIN_WORDS}-${MAX_WORDS} word`);
    console.log("direct answer directly under the H1, with no CTA above it.");
    return;
  }

  console.error(`\nFAIL — ${failures.length}/${slugs.length} pages have problems:\n`);
  for (const { url, problems } of failures) {
    console.error(`  ${url}`);
    for (const p of problems) console.error(`    - ${p}`);
  }
  process.exit(1);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("check-direct-answers.mjs");
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
