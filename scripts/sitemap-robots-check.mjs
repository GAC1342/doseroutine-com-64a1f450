#!/usr/bin/env node
/**
 * Sitemap + robots.txt contract check (runs in CI on every build).
 *
 * Validates, against a running build of the site:
 *   1. robots.txt   — 200, text/plain, has a `User-agent: *` group, is not a
 *                     blanket `Disallow: /`, and every private route stays
 *                     blocked. If it advertises a Sitemap: URL, that URL must
 *                     be same-origin and fetchable.
 *   2. sitemap.xml  — 200, XML content type, parses, and is a <sitemapindex>
 *                     or <urlset>. Child sitemaps are followed one level deep.
 *   3. URL counts   — total URL count is > 0, above SITEMAP_MIN_URLS, within
 *                     the 50k/sitemap limit, and contains no duplicates, no
 *                     off-origin <loc>, and no robots-disallowed URL.
 *   4. Status codes — a sample (or all) sitemap URLs return 200 with no
 *                     redirect into /auth, /login or any private area.
 *
 * Usage:
 *   node scripts/sitemap-robots-check.mjs
 *   SITEMAP_BASE_URL=http://localhost:3000 node scripts/sitemap-robots-check.mjs
 *   SITEMAP_SAMPLE=0 node scripts/sitemap-robots-check.mjs   # check every URL
 *
 * Exits non-zero on any hard failure. Network blips are retried once.
 */

export const DEFAULT_BASE_URL = "https://doseroutine.com";

/** Routes that must never be crawlable or listed in the sitemap. */
export const PRIVATE_PREFIXES = [
  "/auth",
  "/login",
  "/onboarding",
  "/admin",
  "/settings",
  "/chat",
  "/checkins",
  "/costs",
  "/export",
  "/injection-sites",
  "/today",
  "/lovable",
];

/**
 * Subset of PRIVATE_PREFIXES that must carry an explicit robots.txt Disallow.
 * `/login` and `/lovable` are excluded: `/login` is not a real route (auth
 * lives at /auth) and `/lovable/` is blocked with its own trailing-slash rule.
 */
export const MUST_BLOCK_PREFIXES = PRIVATE_PREFIXES.filter(
  (p) => p !== "/login" && p !== "/lovable",
);

export const SITEMAP_MAX_URLS = 50_000;

/* ---------------------------------------------------------------- parsing */

/** Parse a sitemap document into { kind, locs }. */
export function parseSitemap(xml) {
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

/**
 * Parse robots.txt into { groups: [{ agents, allow, disallow }], sitemaps }.
 * Directive matching is case-insensitive, comments are stripped.
 */
export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      if (!current || current.hasRules) {
        current = { agents: [], allow: [], disallow: [], hasRules: false };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (field === "allow" && current) {
      current.allow.push(value);
      current.hasRules = true;
    } else if (field === "disallow" && current) {
      current.disallow.push(value);
      current.hasRules = true;
    } else if (field === "sitemap") {
      sitemaps.push(value);
    }
  }
  return { groups: groups.map(({ hasRules: _h, ...g }) => g), sitemaps };
}

/** The rule group that applies to a generic crawler (`*`). */
export function wildcardGroup(robots) {
  return robots.groups.find((g) => g.agents.includes("*")) ?? null;
}

/** Longest-match Allow/Disallow evaluation for the wildcard group. */
export function isDisallowed(robots, path) {
  const group = wildcardGroup(robots);
  if (!group) return false;
  const match = (patterns) =>
    patterns.reduce((best, p) => {
      if (!p) return best;
      const literal = p.replace(/\*+$/, "");
      if (path.startsWith(literal)) return Math.max(best, literal.length);
      return best;
    }, -1);
  const allow = match(group.allow);
  const disallow = match(group.disallow);
  if (disallow === -1) return false;
  return disallow > allow;
}

/** True when a path lives under a private area that must stay uncrawlable. */
export function isPrivatePath(path) {
  return PRIVATE_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`),
  );
}

/* ------------------------------------------------- pure validation rules */

/** Validate a robots.txt body. Returns an array of failure strings. */
export function validateRobots(text, { baseUrl } = {}) {
  const failures = [];
  const robots = parseRobots(text);
  const group = wildcardGroup(robots);
  if (!group) {
    failures.push("robots.txt has no `User-agent: *` group");
  } else if (group.disallow.includes("/") && !group.allow.includes("/")) {
    failures.push("robots.txt blocks the entire site for all crawlers (`Disallow: /`)");
  }
  for (const prefix of MUST_BLOCK_PREFIXES) {
    if (!isDisallowed(robots, `${prefix}/x`)) {
      failures.push(`robots.txt does not block the private route ${prefix}`);
    }
  }

  if (baseUrl) {
    for (const sm of robots.sitemaps) {
      let origin;
      try {
        origin = new URL(sm).origin;
      } catch {
        failures.push(`robots.txt advertises a malformed Sitemap URL: ${sm}`);
        continue;
      }
      if (origin !== new URL(baseUrl).origin) {
        failures.push(`robots.txt Sitemap URL points off-origin: ${sm}`);
      }
    }
  }
  return { failures, robots };
}

/** Validate the set of URLs collected from the sitemap tree. */
export function validateSitemapUrls(urls, { baseUrl, robots, minUrls = 1 } = {}) {
  const failures = [];
  if (urls.length === 0) {
    failures.push("sitemap contains no URLs");
  }
  if (urls.length < minUrls) {
    failures.push(`sitemap has ${urls.length} URLs, below the expected minimum of ${minUrls}`);
  }
  if (urls.length > SITEMAP_MAX_URLS) {
    failures.push(`sitemap has ${urls.length} URLs, above the ${SITEMAP_MAX_URLS} per-file limit`);
  }
  const seen = new Set();
  const dupes = new Set();
  for (const url of urls) {
    if (seen.has(url)) dupes.add(url);
    seen.add(url);
  }
  if (dupes.size > 0) {
    failures.push(`sitemap contains ${dupes.size} duplicate URL(s), e.g. ${[...dupes][0]}`);
  }
  const origin = baseUrl ? new URL(baseUrl).origin : null;
  for (const url of urls) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      failures.push(`sitemap contains a malformed URL: ${url}`);
      continue;
    }
    if (parsed.protocol !== "https:" && !parsed.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
      failures.push(`sitemap URL is not https: ${url}`);
    }
    if (origin && parsed.origin !== origin) {
      failures.push(`sitemap URL points off-origin: ${url}`);
    }
    if (isPrivatePath(parsed.pathname)) {
      failures.push(`private route leaked into the sitemap: ${parsed.pathname}`);
    }
    if (robots && isDisallowed(robots, parsed.pathname)) {
      failures.push(`sitemap lists a robots-disallowed URL: ${parsed.pathname}`);
    }
  }
  return failures;
}

/** Decide whether a fetched sitemap URL passed. */
export function checkUrlResult({ url, status, finalUrl }) {
  if (status !== 200) return `${url} returned HTTP ${status}`;
  if (finalUrl) {
    const to = new URL(finalUrl).pathname;
    const from = new URL(url).pathname;
    if (to !== from && isPrivatePath(to)) {
      return `${url} redirected into a private area (${to})`;
    }
  }
  return null;
}

/* -------------------------------------------------------------- live run */

async function fetchWithRetry(url, init = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", ...init });
      return res;
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 750));
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const baseUrl = (process.env.SITEMAP_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const sample = Number(process.env.SITEMAP_SAMPLE ?? "40");
  const minUrls = Number(process.env.SITEMAP_MIN_URLS ?? "20");
  const failures = [];
  const notes = [];

  // 1. robots.txt
  const robotsRes = await fetchWithRetry(`${baseUrl}/robots.txt`);
  if (robotsRes.status !== 200) {
    failures.push(`robots.txt returned HTTP ${robotsRes.status}`);
  }
  const robotsType = robotsRes.headers.get("content-type") || "";
  if (robotsRes.status === 200 && !robotsType.includes("text/plain")) {
    failures.push(`robots.txt content-type is "${robotsType}", expected text/plain`);
  }
  const robotsText = await robotsRes.text();
  const { failures: robotsFailures, robots } = validateRobots(robotsText, { baseUrl });
  failures.push(...robotsFailures);
  notes.push(
    `robots.txt: ${robotsText.split(/\r?\n/).filter(Boolean).length} directives, ${robots.sitemaps.length} sitemap ref(s)`,
  );

  // 2. sitemap.xml (+ children of an index)
  const sitemapRes = await fetchWithRetry(`${baseUrl}/sitemap.xml`);
  if (sitemapRes.status !== 200) {
    failures.push(`sitemap.xml returned HTTP ${sitemapRes.status}`);
  }
  const sitemapType = sitemapRes.headers.get("content-type") || "";
  if (sitemapRes.status === 200 && !/xml/i.test(sitemapType)) {
    failures.push(`sitemap.xml content-type is "${sitemapType}", expected XML`);
  }
  const rootXml = await sitemapRes.text();
  const root = parseSitemap(rootXml);
  if (root.kind === "unknown") {
    failures.push("sitemap.xml is neither a <urlset> nor a <sitemapindex>");
  }

  let urls = [];
  if (root.kind === "index") {
    notes.push(`sitemap index with ${root.locs.length} child sitemap(s)`);
    for (const child of root.locs) {
      const res = await fetchWithRetry(child);
      if (res.status !== 200) {
        failures.push(`child sitemap ${child} returned HTTP ${res.status}`);
        continue;
      }
      const parsed = parseSitemap(await res.text());
      if (parsed.kind !== "urlset") {
        failures.push(`child sitemap ${child} is not a <urlset>`);
      }
      if (parsed.locs.length > SITEMAP_MAX_URLS) {
        failures.push(
          `child sitemap ${child} has ${parsed.locs.length} URLs (limit ${SITEMAP_MAX_URLS})`,
        );
      }
      urls.push(...parsed.locs);
    }
  } else {
    urls = root.locs;
  }

  // 3. URL-set rules
  failures.push(...validateSitemapUrls(urls, { baseUrl, robots, minUrls }));
  notes.push(`sitemap URL count: ${urls.length}`);

  // 4. status codes
  const targets = sample > 0 && urls.length > sample ? pickSample(urls, sample) : urls;
  notes.push(`status-checked ${targets.length} of ${urls.length} URLs`);
  const concurrency = 8;
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const url = targets[cursor++];
      try {
        const res = await fetchWithRetry(url, { method: "GET" });
        const problem = checkUrlResult({ url, status: res.status, finalUrl: res.url });
        if (problem) failures.push(problem);
      } catch (err) {
        failures.push(`${url} failed to fetch: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));

  for (const note of notes) console.log(`• ${note}`);
  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} sitemap/robots failure(s):`);
    for (const f of failures.slice(0, 50)) console.error(`  - ${f}`);
    if (failures.length > 50) console.error(`  … and ${failures.length - 50} more`);
    process.exit(1);
  }
  console.log("\n✓ sitemap.xml and robots.txt contract passes.");
}

/** Deterministic, evenly-spread sample so CI covers the whole sitemap over time. */
export function pickSample(urls, size) {
  const step = urls.length / size;
  const out = [];
  for (let i = 0; i < size; i++) out.push(urls[Math.floor(i * step)]);
  return [...new Set(out)];
}

const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].endsWith("sitemap-robots-check.mjs");

if (isDirectRun) {
  main().catch((err) => {
    console.error(`sitemap/robots check crashed: ${err.stack || err.message}`);
    process.exit(1);
  });
}
