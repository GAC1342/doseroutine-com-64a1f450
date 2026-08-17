#!/usr/bin/env node
/**
 * Automated crawler audit.
 *
 * Crawls every URL in the sitemap (or a sample) plus all internal links found
 * on those pages, and revalidates three things on each build:
 *
 *   1. Metadata  — title, meta description, single self-referencing canonical,
 *                  og:title / og:description / og:type, twitter:card,
 *                  exactly one <h1>, no accidental noindex.
 *   2. Links     — every internal link resolves to 200 (no 404s, no redirect
 *                  chains into /auth or private areas).
 *   3. JSON-LD   — every <script type="application/ld+json"> parses and the
 *                  recognised @type nodes carry their required fields.
 *
 * Usage:
 *   node scripts/crawl-audit.mjs                      # sample crawl of the live site
 *   CRAWL_LIMIT=0 node scripts/crawl-audit.mjs        # full crawl (every sitemap URL)
 *   CRAWL_BASE_URL=http://localhost:8080 node scripts/crawl-audit.mjs
 *
 * Exits non-zero when any hard failure is found. Transient network errors are
 * retried once and then reported as warnings, so CDN blips never red-flag a build.
 */

export const DEFAULT_BASE_URL = "https://doseroutine.com";

/* ------------------------------------------------------------------ parsing */

/** Extract every <loc> from a sitemap document and detect index vs urlset. */
export function parseSitemapXml(xml) {
  const kind = /<sitemapindex[\s>]/i.test(xml)
    ? "index"
    : /<urlset[\s>]/i.test(xml)
      ? "urlset"
      : "unknown";
  const locs = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const raw = m[1]
      .trim()
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    if (raw) locs.push(raw);
  }
  return { kind, locs };
}

function attr(tag, name) {
  const m = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag);
  return m ? m[1].trim() : null;
}

/** All <meta> tags as { name|property -> content }. */
export function extractMeta(html) {
  const out = {};
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const key = (attr(tag, "property") || attr(tag, "name") || "").toLowerCase();
    if (!key) continue;
    const content = attr(tag, "content");
    if (content != null && out[key] == null) out[key] = content;
  }
  return out;
}

export function extractCanonicals(html) {
  const out = [];
  const re = /<link\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!/\brel\s*=\s*["']?canonical["']?/i.test(m[0])) continue;
    const href = attr(m[0], "href");
    if (href) out.push(href);
  }
  return out;
}

export function extractTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

export function extractH1s(html) {
  const out = [];
  const re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(
      m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  return out;
}

export function extractJsonLdBlocks(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/** Internal (same-origin) href targets found in the document body. */
export function extractInternalLinks(html, pageUrl) {
  const base = new URL(pageUrl);
  const out = new Set();
  const re = /<a\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = attr(m[0], "href");
    if (!href) continue;
    if (/^(mailto:|tel:|javascript:|data:|#)/i.test(href)) continue;
    let u;
    try {
      u = new URL(href, pageUrl);
    } catch {
      continue;
    }
    if (u.origin !== base.origin) continue;
    u.hash = "";
    out.add(u.toString());
  }
  return [...out];
}

export function normaliseUrl(target, base) {
  try {
    const u = new URL(target, base);
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/"))
      u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- json-ld rules */

/** Required properties per recognised schema.org @type. */
export const JSONLD_REQUIRED = {
  Article: ["headline"],
  BlogPosting: ["headline"],
  NewsArticle: ["headline"],
  MedicalWebPage: ["name"],
  Drug: ["name"],
  Substance: ["name"],
  Product: ["name"],
  FAQPage: ["mainEntity"],
  Question: ["name", "acceptedAnswer"],
  BreadcrumbList: ["itemListElement"],
  Organization: ["name"],
  WebSite: ["name"],
  WebPage: ["name"],
  SoftwareApplication: ["name"],
  HowTo: ["name"],
  ItemList: ["itemListElement"],
  ScholarlyArticle: ["headline"],
};

function flattenNodes(value, acc = []) {
  if (Array.isArray(value)) {
    for (const v of value) flattenNodes(v, acc);
    return acc;
  }
  if (value && typeof value === "object") {
    acc.push(value);
    if (Array.isArray(value["@graph"])) flattenNodes(value["@graph"], acc);
  }
  return acc;
}

/** Validate every JSON-LD block on a page. Returns a list of problem strings. */
export function checkJsonLd(html) {
  const problems = [];
  const blocks = extractJsonLdBlocks(html);
  if (blocks.length === 0) return ["No JSON-LD structured data on page"];

  blocks.forEach((raw, i) => {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      problems.push(
        `JSON-LD block #${i + 1} does not parse: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }
    const nodes = flattenNodes(parsed);
    if (nodes.length === 0) {
      problems.push(`JSON-LD block #${i + 1} contains no objects`);
      return;
    }
    const top = Array.isArray(parsed) ? parsed[0] : parsed;
    if (top && typeof top === "object" && !top["@context"]) {
      problems.push(`JSON-LD block #${i + 1} is missing @context`);
    }
    // A `{"@context": ..., "@graph": [...]}` wrapper legitimately has no @type.
    const isGraphWrapper = top && typeof top === "object" && Array.isArray(top["@graph"]);
    for (const node of nodes) {
      const types = Array.isArray(node["@type"])
        ? node["@type"]
        : node["@type"]
          ? [node["@type"]]
          : [];
      if (types.length === 0 && node !== top) continue;
      if (types.length === 0) {
        if (!isGraphWrapper) problems.push(`JSON-LD block #${i + 1} root node is missing @type`);
        continue;
      }

      for (const t of types) {
        const required = JSONLD_REQUIRED[t];
        if (!required) continue;
        for (const field of required) {
          const v = node[field];
          const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
          if (empty) problems.push(`JSON-LD ${t} is missing required field "${field}"`);
        }
      }
    }
  });

  return problems;
}

/* ------------------------------------------------------------ metadata rules */

export const TITLE_MAX = 70;
export const TITLE_MIN = 10;
export const DESC_MIN = 50;
export const DESC_MAX = 165;

/**
 * Validate metadata for one crawled page.
 * @returns {string[]} problem descriptions (empty when the page is clean)
 */
export function checkMetadata(url, html) {
  const problems = [];
  const meta = extractMeta(html);

  const title = extractTitle(html);
  if (!title) problems.push("Missing <title>");
  else if (title.length < TITLE_MIN)
    problems.push(`Title too short (${title.length} chars): "${title}"`);
  else if (title.length > TITLE_MAX)
    problems.push(`Title too long (${title.length} > ${TITLE_MAX}): "${title}"`);

  const desc = meta["description"];
  if (!desc) problems.push("Missing meta description");
  else if (desc.length < DESC_MIN)
    problems.push(`Meta description too short (${desc.length} chars)`);
  else if (desc.length > DESC_MAX)
    problems.push(`Meta description too long (${desc.length} > ${DESC_MAX})`);

  const robots = (meta["robots"] || "").toLowerCase();
  if (robots.includes("noindex")) problems.push("Page is marked noindex");

  const canonicals = extractCanonicals(html);
  if (canonicals.length === 0) problems.push('Missing <link rel="canonical">');
  else if (canonicals.length > 1) problems.push(`Multiple canonical tags (${canonicals.length})`);
  else {
    const raw = canonicals[0];
    if (!/^https?:\/\//i.test(raw)) problems.push(`Canonical is not absolute: ${raw}`);
    else if (normaliseUrl(raw) !== normaliseUrl(url))
      problems.push(`Canonical points elsewhere: ${raw}`);
  }

  for (const key of ["og:title", "og:description", "og:type"]) {
    if (!meta[key]) problems.push(`Missing ${key}`);
  }
  if (!meta["twitter:card"]) problems.push("Missing twitter:card");

  const h1s = extractH1s(html).filter(Boolean);
  if (h1s.length === 0) problems.push("No <h1> on page");
  else if (h1s.length > 1)
    problems.push(`Multiple <h1> tags (${h1s.length}): ${h1s.slice(0, 3).join(" | ")}`);

  return problems;
}

/** Classify an HTTP response for a link target. Returns a reason or null. */
export function classifyLinkStatus(url, status, location) {
  if (status === 200) return null;
  if (status >= 300 && status < 400) {
    const target = location ? new URL(location, url).pathname : "(no Location)";
    if (/^\/(auth|login|sign-?in|register)(\/|$)/i.test(target))
      return `Redirects to auth wall (-> ${target})`;
    if (/^\/(admin|settings|today|dashboard|account|onboarding)(\/|$)/i.test(target))
      return `Redirects into a private area (-> ${target})`;
    return `Unexpected redirect HTTP ${status} -> ${target}`;
  }
  return `Broken link (HTTP ${status})`;
}

/* --------------------------------------------------------------- crawl driver */

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
      for (;;) {
        const idx = i++;
        if (idx >= items.length) return;
        results[idx] = await worker(items[idx]);
      }
    }),
  );
  return results;
}

async function fetchWithRetry(url, init, retries = 1) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, {
        redirect: "manual",
        headers: { "user-agent": "DoseRoutineCrawlAudit/1.0" },
        ...init,
      });
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/** Evenly sample up to `limit` items so every sitemap section is represented. */
export function sampleEvenly(items, limit) {
  if (!limit || limit <= 0 || items.length <= limit) return items;
  const step = items.length / limit;
  const out = [];
  for (let i = 0; i < limit; i++) out.push(items[Math.floor(i * step)]);
  return [...new Set(out)];
}

async function main() {
  const base = (process.env.CRAWL_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const limit = process.env.CRAWL_LIMIT != null ? Number(process.env.CRAWL_LIMIT) : 60;
  const linkLimit =
    process.env.CRAWL_LINK_LIMIT != null ? Number(process.env.CRAWL_LINK_LIMIT) : 400;
  const concurrency = Number(process.env.CRAWL_CONCURRENCY || 8);

  const failures = [];
  const warnings = [];

  console.log(`crawl-audit: base=${base} limit=${limit || "all"} concurrency=${concurrency}`);

  // 1. discover sitemap URLs (index-aware, one level of nesting)
  const seenSitemaps = new Set();
  const pageUrls = [];
  const queue = [`${base}/sitemap.xml`];
  while (queue.length) {
    const sm = queue.shift();
    if (seenSitemaps.has(sm)) continue;
    seenSitemaps.add(sm);
    let res;
    try {
      res = await fetchWithRetry(sm);
    } catch (err) {
      failures.push({ url: sm, kind: "sitemap", problem: `Fetch failed: ${err?.message || err}` });
      continue;
    }
    if (res.status !== 200) {
      failures.push({ url: sm, kind: "sitemap", problem: `HTTP ${res.status}` });
      continue;
    }
    const { kind, locs } = parseSitemapXml(await res.text());
    if (kind === "unknown" || locs.length === 0) {
      failures.push({
        url: sm,
        kind: "sitemap",
        problem: "Not a valid sitemap (no <loc> entries)",
      });
      continue;
    }
    if (kind === "index") queue.push(...locs);
    else pageUrls.push(...locs);
  }

  const unique = [...new Set(pageUrls)];
  console.log(
    `crawl-audit: discovered ${unique.length} URLs across ${seenSitemaps.size} sitemap file(s)`,
  );
  const targets = sampleEvenly(unique, limit);
  console.log(`crawl-audit: auditing ${targets.length} page(s)`);

  // 2. crawl pages: metadata + JSON-LD, collecting internal links
  const linkTargets = new Set();
  await runPool(
    targets,
    async (url) => {
      let res;
      try {
        res = await fetchWithRetry(url);
      } catch (err) {
        warnings.push({ url, kind: "network", problem: `Fetch failed: ${err?.message || err}` });
        return;
      }
      if (res.status !== 200) {
        failures.push({
          url,
          kind: "status",
          problem: classifyLinkStatus(url, res.status, res.headers.get("location")),
        });
        return;
      }
      const html = await res.text();
      for (const p of checkMetadata(url, html))
        failures.push({ url, kind: "metadata", problem: p });
      for (const p of checkJsonLd(html)) failures.push({ url, kind: "jsonld", problem: p });
      for (const link of extractInternalLinks(html, url)) linkTargets.add(link);
    },
    concurrency,
  );

  // 3. verify internal links resolve
  const crawled = new Set(targets.map((u) => normaliseUrl(u)));
  const links = sampleEvenly(
    [...linkTargets].filter((l) => !crawled.has(normaliseUrl(l))),
    linkLimit,
  );
  console.log(`crawl-audit: checking ${links.length} internal link target(s)`);
  await runPool(
    links,
    async (url) => {
      let res;
      try {
        res = await fetchWithRetry(url, { method: "HEAD" });
        if (res.status === 405 || res.status === 501) res = await fetchWithRetry(url);
      } catch (err) {
        warnings.push({
          url,
          kind: "network",
          problem: `Link fetch failed: ${err?.message || err}`,
        });
        return;
      }
      const problem = classifyLinkStatus(url, res.status, res.headers.get("location"));
      if (problem) failures.push({ url, kind: "link", problem });
    },
    concurrency,
  );

  // 4. report
  const report = {
    base,
    generatedAt: new Date().toISOString(),
    sitemapUrls: unique.length,
    pagesAudited: targets.length,
    linksChecked: links.length,
    failures,
    warnings,
  };
  const { writeFileSync } = await import("node:fs");
  writeFileSync("crawl-audit-report.json", JSON.stringify(report, null, 2));

  const byKind = failures.reduce((acc, f) => ({ ...acc, [f.kind]: (acc[f.kind] || 0) + 1 }), {});
  console.log("\ncrawl-audit summary:", JSON.stringify(byKind));
  if (warnings.length)
    console.log(`crawl-audit: ${warnings.length} transient warning(s) (not fatal)`);

  if (failures.length) {
    console.error(`\ncrawl-audit FAILED with ${failures.length} issue(s):\n`);
    for (const f of failures.slice(0, 100))
      console.error(`  [${f.kind}] ${f.url}\n      ${f.problem}`);
    if (failures.length > 100)
      console.error(`  ...and ${failures.length - 100} more (see crawl-audit-report.json)`);
    process.exit(1);
  }

  console.log("\ncrawl-audit PASSED: metadata, links and JSON-LD are clean.");
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  main().catch((err) => {
    console.error("crawl-audit crashed:", err);
    process.exit(1);
  });
}
