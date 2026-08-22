#!/usr/bin/env node
/**
 * Content publishing workflow gate for /articles.
 *
 * Run before committing a draft:  node scripts/validate-articles.mjs
 *
 * Validates, for every markdown draft in src/content/article-drafts/:
 *  - slug: kebab-case, unique, matches the filename and the editorial calendar
 *  - frontmatter: required keys present, title/description within SEO limits
 *  - structure: single H1, speakable answer paragraph, FAQs section
 *  - schema fields: enough FAQ pairs to emit valid FAQPage JSON-LD
 *  - internal links: pillar + cluster rules from src/lib/article-link-map.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DIR = "src/content/article-drafts";
const REQUIRED_KEYS = [
  "target_keyword",
  "meta_title",
  "meta_description",
  "suggested_slug",
  "og_image_concept",
];
const MAX_TITLE = 65;
const MIN_DESC = 70;
const MAX_DESC = 160;
const MIN_FAQS = 3;
const MIN_INTERNAL_LINKS = 3;
const PRIMARY_PILLAR = "/articles/best-medication-reminder-apps";
const ARTICLES_PREFIX = "/articles";

function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) return { meta: null, rest: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, rest: raw.slice(m[0].length) };
}

function calendarEntries() {
  const src = readFileSync("src/lib/content-calendar.ts", "utf8");
  const marker = "CONTENT_CALENDAR: CalendarEntry[] = ";
  const start = src.indexOf("[", src.indexOf(marker) + marker.length);
  const end = src.lastIndexOf("];");
  return JSON.parse(src.slice(start, end + 1));
}

const calendar = calendarEntries();
const bySlug = new Map(calendar.map((e) => [e.slug, e]));

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".md") && !f.startsWith("INTERNAL-LINKING"))
  .sort();

const docs = [];
const errors = [];
const warnings = [];

for (const file of files) {
  const raw = readFileSync(path.join(DIR, file), "utf8");
  const { meta, rest } = parseFrontmatter(raw);
  const fail = (msg) => errors.push(`${file}: ${msg}`);

  if (!meta) {
    fail("missing frontmatter block");
    continue;
  }
  for (const key of REQUIRED_KEYS) if (!meta[key]) fail(`missing frontmatter key "${key}"`);

  const slug = meta["suggested_slug"] ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(`slug "${slug}" is not kebab-case`);
  if (slug && !file.replace(/^\d+-/, "").startsWith(slug))
    fail(`filename does not match slug "${slug}"`);

  if ((meta["meta_title"] ?? "").length > MAX_TITLE)
    fail(`meta_title is ${meta["meta_title"].length} chars (max ${MAX_TITLE})`);
  const dl = (meta["meta_description"] ?? "").length;
  if (dl < MIN_DESC || dl > MAX_DESC)
    fail(`meta_description is ${dl} chars (want ${MIN_DESC}-${MAX_DESC})`);

  const h1s = rest.match(/^#\s+.+$/gm) ?? [];
  if (h1s.length !== 1) fail(`expected exactly 1 H1, found ${h1s.length}`);
  if (!/<p class="dr-speakable-answer">[\s\S]*?<\/p>/.test(rest))
    fail('missing <p class="dr-speakable-answer"> summary');

  const faqSplit = rest.split(/\r?\n##\s+FAQs?\s*\r?\n/);
  const faqCount = faqSplit[1] ? (faqSplit[1].match(/^\*\*.+\*\*$/gm) ?? []).length : 0;
  if (faqCount < MIN_FAQS) fail(`only ${faqCount} FAQ pairs (need ${MIN_FAQS}) for FAQPage schema`);

  const links = [...new Set([...rest.matchAll(/\]\((\/[^)\s]+)\)/g)].map((m) => m[1]))];
  if (links.length < MIN_INTERNAL_LINKS)
    fail(`${links.length} internal links (need ${MIN_INTERNAL_LINKS})`);
  if (links.includes(`${ARTICLES_PREFIX}/${slug}`)) fail("post links to itself");

  const entry = bySlug.get(slug);
  if (!entry) warnings.push(`${file}: slug "${slug}" is not in the 60-day calendar`);
  else if (
    (entry.searchIntent === "commercial" || /^best /i.test(entry.title)) &&
    `${ARTICLES_PREFIX}/${slug}` !== PRIMARY_PILLAR &&
    !links.includes(PRIMARY_PILLAR)
  )
    fail(`roundup must link the pillar ${PRIMARY_PILLAR}`);

  docs.push({ file, slug, links });
}

const seen = new Map();
for (const d of docs) {
  if (seen.has(d.slug))
    errors.push(`duplicate slug "${d.slug}" in ${seen.get(d.slug)} and ${d.file}`);
  seen.set(d.slug, d.file);
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);

console.log(
  `\nvalidated ${docs.length} drafts — ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length > 0 ? 1 : 0);
