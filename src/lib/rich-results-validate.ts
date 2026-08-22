/**
 * Rich-results validator for server-rendered HTML.
 *
 * Mirrors the field-level expectations Google's Rich Results Test applies to
 * FAQPage, BreadcrumbList, WebPage/CollectionPage and Article-shaped nodes,
 * plus the canonical/hreflang/social-tag contract the site relies on.
 *
 * Every problem is returned as a warning string so tests can assert an empty
 * array and fail loudly on any *new* warning, not just hard errors.
 */

export interface RichResultsOptions {
  /** Absolute URL the page is expected to canonicalise to. */
  canonical: string;
  /** Site origin used to detect internal URLs. */
  origin?: string;
  /** Require an FAQPage block on this page. */
  requireFaq?: boolean;
  /** Require a BreadcrumbList block on this page. */
  requireBreadcrumb?: boolean;
  /** Expected trailing breadcrumb name (the page itself), when known. */
  breadcrumbLeafName?: string;
  /** Require og:image + twitter:image. */
  requireImage?: boolean;
}

/** Minimal HTML entity decode so escaped titles are measured at their real length. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

const SCHEMA_CONTEXT = /^https?:\/\/schema\.org\/?$/i;

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function absolute(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function typeMatches(t: unknown, expected: string): boolean {
  if (typeof t === "string") return t.trim().toLowerCase() === expected.toLowerCase();
  if (Array.isArray(t)) return t.some((x) => typeMatches(x, expected));
  return false;
}

function flatten(node: unknown): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) return (obj["@graph"] as unknown[]).flatMap(flatten);
    return [obj];
  }
  return [];
}

/** Every JSON-LD node in the document, with @graph containers unwrapped. */
export function extractJsonLd(html: string): {
  nodes: Record<string, unknown>[];
  parseErrors: string[];
} {
  const nodes: Record<string, unknown>[] = [];
  const parseErrors: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = m[1].trim();
    if (!raw) {
      parseErrors.push("empty application/ld+json block");
      continue;
    }
    try {
      nodes.push(...flatten(JSON.parse(raw)));
    } catch (e) {
      parseErrors.push(`JSON-LD parse error — ${(e as Error).message}`);
    }
  }
  return { nodes, parseErrors };
}

function attrsOf(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*["']([^"']*)["']/g)) {
    out[m[1].toLowerCase()] = m[2];
  }
  return out;
}

export function headLinks(html: string, rel: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrsOf(m[0]);
    if ((a["rel"] ?? "").toLowerCase() === rel) out.push(a);
  }
  return out;
}

export function metaContent(html: string, key: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrsOf(m[0]);
    if ((a["name"] ?? a["property"] ?? "").toLowerCase() === key.toLowerCase()) {
      out.push(a["content"] ?? "");
    }
  }
  return out;
}

function validateFaq(node: Record<string, unknown>, warn: (s: string) => void) {
  if (!SCHEMA_CONTEXT.test(String(node["@context"] ?? ""))) {
    warn("FAQPage: @context must be schema.org");
  }
  const raw = node.mainEntity;
  const entities = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (entities.length === 0) {
    warn("FAQPage: mainEntity must be a non-empty array");
    return;
  }
  const seen = new Set<string>();
  entities.forEach((q, i) => {
    const question = (q ?? {}) as Record<string, unknown>;
    if (!typeMatches(question["@type"], "Question"))
      warn(`FAQPage: mainEntity[${i}] is not a Question`);
    if (!nonEmpty(question.name)) warn(`FAQPage: mainEntity[${i}].name is empty`);
    const key = String(question.name ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (seen.has(key)) warn(`FAQPage: duplicate question "${question.name}"`);
    seen.add(key);
    const answer = (question.acceptedAnswer ?? {}) as Record<string, unknown>;
    if (!typeMatches(answer["@type"], "Answer")) {
      warn(`FAQPage: mainEntity[${i}].acceptedAnswer is not an Answer`);
    }
    if (!nonEmpty(answer.text)) warn(`FAQPage: mainEntity[${i}].acceptedAnswer.text is empty`);
    else if ((answer.text as string).trim().length < 20) {
      warn(`FAQPage: answer for "${question.name}" is shorter than 20 characters`);
    }
  });
}

function validateBreadcrumb(
  node: Record<string, unknown>,
  warn: (s: string) => void,
  leafName?: string,
) {
  if (!SCHEMA_CONTEXT.test(String(node["@context"] ?? ""))) {
    warn("BreadcrumbList: @context must be schema.org");
  }
  const items = node.itemListElement;
  if (!Array.isArray(items) || items.length === 0) {
    warn("BreadcrumbList: itemListElement must be a non-empty array");
    return;
  }
  items.forEach((raw, i) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    if (!typeMatches(item["@type"], "ListItem"))
      warn(`BreadcrumbList: item ${i} is not a ListItem`);
    if (item.position !== i + 1) {
      warn(`BreadcrumbList: item ${i} position ${String(item.position)} should be ${i + 1}`);
    }
    if (!nonEmpty(item.name)) warn(`BreadcrumbList: item ${i} has no name`);
    const target =
      typeof item.item === "string" ? item.item : (item.item as { "@id"?: string })?.["@id"];
    if (!absolute(target)) warn(`BreadcrumbList: item ${i} has no absolute item URL`);
  });
  if (leafName) {
    const last = (items[items.length - 1] ?? {}) as Record<string, unknown>;
    if (String(last.name ?? "").trim() !== leafName.trim()) {
      warn(`BreadcrumbList: last crumb is "${String(last.name)}", expected "${leafName}"`);
    }
  }
}

/** Returns every rich-results / canonical / social warning found in the HTML. */
export function validateRichResults(html: string, opts: RichResultsOptions): string[] {
  const warnings: string[] = [];
  const warn = (s: string) => warnings.push(s);
  const origin = opts.origin ?? "https://doseroutine.com";

  const { nodes, parseErrors } = extractJsonLd(html);
  parseErrors.forEach(warn);
  if (nodes.length === 0) warn("no JSON-LD blocks found");

  for (const node of nodes) {
    if (!node["@type"]) warn("JSON-LD node without @type");
  }

  const faqs = nodes.filter((n) => typeMatches(n["@type"], "FAQPage"));
  if (opts.requireFaq && faqs.length === 0) warn("missing FAQPage JSON-LD");
  if (faqs.length > 1) warn(`expected at most one FAQPage, found ${faqs.length}`);
  faqs.forEach((f) => validateFaq(f, warn));

  const crumbs = nodes.filter((n) => typeMatches(n["@type"], "BreadcrumbList"));
  if (opts.requireBreadcrumb && crumbs.length === 0) warn("missing BreadcrumbList JSON-LD");
  if (crumbs.length > 1) warn(`expected at most one BreadcrumbList, found ${crumbs.length}`);
  crumbs.forEach((c) => validateBreadcrumb(c, warn, opts.breadcrumbLeafName));

  // Page-level node (WebPage / CollectionPage / Article / one of the AEO types)
  const pageNodes = nodes.filter(
    (n) =>
      typeMatches(n["@type"], "WebPage") ||
      typeMatches(n["@type"], "CollectionPage") ||
      typeMatches(n["@type"], "Article") ||
      typeMatches(n["@type"], "MedicalWebPage") ||
      typeMatches(n["@type"], "QAPage"),
  );
  if (pageNodes.length === 0) warn("no WebPage/CollectionPage/Article node");
  for (const page of pageNodes) {
    if (!nonEmpty(page.name) && !nonEmpty(page.headline)) {
      warn("page node has neither name nor headline");
    }
    const url = page.url ?? page["@id"];
    if (url !== undefined && !absolute(url)) warn(`page node url is not absolute: ${String(url)}`);
    if (absolute(url) && !String(url).startsWith(origin)) {
      warn(`page node url points off-site: ${String(url)}`);
    }
  }

  // Canonical
  const canonicals = headLinks(html, "canonical");
  if (canonicals.length !== 1)
    warn(`expected exactly one canonical link, found ${canonicals.length}`);
  const canonicalHref = canonicals[0]?.["href"] ?? "";
  if (canonicalHref !== opts.canonical) {
    warn(`canonical is "${canonicalHref}", expected "${opts.canonical}"`);
  }

  // hreflang cluster: self-referential en + x-default, both matching canonical
  const alternates = headLinks(html, "alternate").filter((l) => l["hreflang"]);
  if (alternates.length > 0) {
    const byLang = new Map<string, string>();
    for (const alt of alternates) {
      const lang = alt["hreflang"].toLowerCase();
      if (byLang.has(lang)) warn(`duplicate hreflang entry for "${lang}"`);
      byLang.set(lang, alt["href"] ?? "");
    }
    if (!byLang.has("x-default")) warn("hreflang cluster has no x-default");
    if (!byLang.has("en")) warn('hreflang cluster has no "en" entry');
    for (const [lang, href] of byLang) {
      if (!absolute(href)) warn(`hreflang "${lang}" href is not absolute: ${href}`);
      if ((lang === "en" || lang === "x-default") && href !== opts.canonical) {
        warn(`hreflang "${lang}" points at ${href}, expected canonical ${opts.canonical}`);
      }
    }
  }

  // Social + robots
  const ogUrl = metaContent(html, "og:url");
  if (ogUrl.length !== 1) warn(`expected exactly one og:url, found ${ogUrl.length}`);
  else if (ogUrl[0] !== opts.canonical) {
    warn(`og:url is "${ogUrl[0]}", expected canonical "${opts.canonical}"`);
  }
  for (const key of ["og:title", "og:description", "og:type", "twitter:card", "description"]) {
    const values = metaContent(html, key).filter((v) => v.trim().length > 0);
    if (values.length === 0) warn(`missing ${key} meta tag`);
  }
  if (opts.requireImage) {
    for (const key of ["og:image", "twitter:image"]) {
      const [value] = metaContent(html, key);
      if (!absolute(value)) warn(`missing or relative ${key}`);
    }
  }
  const robots = metaContent(html, "robots").join(" ").toLowerCase();
  if (robots.includes("noindex")) warn("page is marked noindex");

  // Title + single H1
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "");
  if (!title) warn("missing <title>");
  else if (title.length > 60) warn(`title is ${title.length} chars (max 60): ${title}`);
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
  if (h1s.length !== 1) warn(`expected exactly one <h1>, found ${h1s.length}`);
  else if (!h1s[0]) warn("<h1> is empty");

  return warnings;
}
