#!/usr/bin/env node
/**
 * Crawl smoke test: every route, plus its `?lang=xx` duplicates.
 *
 * Google kept reporting "crawled — currently not indexed" and redirect errors
 * on `?lang=xx` copies of our pages. This walks the whole route surface the
 * way a crawler does and fails CI when any of it misbehaves:
 *
 *   • every URL answers 200 or a 3xx that resolves — never 4xx, never 5xx
 *   • redirect chains terminate: no loops, no more than MAX_HOPS hops
 *   • `?lang=xx` (and the other duplicate params) land on the clean path
 *   • the final HTML carries exactly one self-referencing canonical and a
 *     valid hreflang cluster (`en` + `x-default`) — checked by the shared
 *     rule engine in hreflang-canonical-check.mjs
 *   • the final page is not `noindex`
 *
 * Usage:
 *   node scripts/crawl-smoke.mjs
 *   CRAWL_SMOKE_BASE_URL=http://localhost:3000 node scripts/crawl-smoke.mjs
 *   CRAWL_SMOKE_SAMPLE=0 node scripts/crawl-smoke.mjs      # every sitemap URL
 *   CRAWL_SMOKE_LANGS=ar,es node scripts/crawl-smoke.mjs   # locales to probe
 */

import { checkPage, normaliseUrl } from "./hreflang-canonical-check.mjs";
import { parseSitemap, pickSample } from "./sitemap-robots-check.mjs";

export const DEFAULT_BASE_URL = "https://doseroutine.com";
export const MAX_HOPS = 5;

/** Locales the language switcher can produce; each must collapse to the clean path. */
export const LANGS = ["ar", "de", "es", "fr", "hi", "it", "ja", "ko", "nl", "pt", "zh"];

/* ---------------------------------------------------------------- helpers */

/** `?lang=xx` variants of a URL, one per locale. */
export function langVariants(url, langs = LANGS) {
  return langs.map((lang) => {
    const u = new URL(url);
    u.searchParams.set("lang", lang);
    return u.toString();
  });
}

/** Robots directives declared in the HTML (meta robots / googlebot). */
export function extractRobotsMeta(html) {
  const out = [];
  // Inline scripts mention robots directives (the preview shell injects a
  // noindex tag client-side); only real markup counts.
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const re = /<meta[^>]+name=["'](robots|googlebot)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const content = /content=["']([^"']*)["']/i.exec(m[0]);
    if (content) out.push(content[1].toLowerCase());
  }
  return out;
}

/** True when the page (or its headers) tell crawlers not to index it. */
export function isNoindex(html, headers = {}) {
  const header = (headers["x-robots-tag"] || "").toLowerCase();
  return header.includes("noindex") || extractRobotsMeta(html).some((c) => c.includes("noindex"));
}

/**
 * Validate a redirect chain on its own terms — no HTML involved.
 *
 * `chain` is [{ url, status, location }] in request order; `finalStatus` is
 * the status of the last response.
 */
export function evaluateChain({ start, chain, finalStatus, finalUrl, maxHops = MAX_HOPS }) {
  const failures = [];
  const label = start;

  const seen = new Set();
  for (const hop of chain) {
    const key = normaliseUrl(hop.url) ?? hop.url;
    if (seen.has(key)) {
      failures.push(`${label}: redirect loop — revisits ${hop.url}`);
      return failures;
    }
    seen.add(key);
    if (hop.status >= 300 && hop.status < 400 && !hop.location) {
      failures.push(`${label}: ${hop.status} at ${hop.url} without a Location header`);
      return failures;
    }
  }

  if (chain.length > maxHops) {
    failures.push(`${label}: ${chain.length} redirect hops (max ${maxHops})`);
  }
  if (finalStatus === 404) {
    failures.push(`${label}: 404 at ${finalUrl}`);
  } else if (finalStatus >= 500) {
    failures.push(`${label}: server error ${finalStatus} at ${finalUrl}`);
  } else if (finalStatus >= 400) {
    failures.push(`${label}: client error ${finalStatus} at ${finalUrl}`);
  } else if (finalStatus >= 300) {
    failures.push(`${label}: chain never resolved (still ${finalStatus} at ${finalUrl})`);
  }
  return failures;
}

/**
 * Duplicate params must be gone by the end of the chain, and the destination
 * must be the same page without them.
 */
export function evaluateDuplicateParams({ start, finalUrl }) {
  const failures = [];
  let from;
  let to;
  try {
    from = new URL(start);
    to = new URL(finalUrl);
  } catch {
    return [`${start}: unparseable URL in chain (${finalUrl})`];
  }
  for (const key of ["lang", "n"]) {
    if (from.searchParams.has(key) && to.searchParams.has(key)) {
      failures.push(`${start}: ?${key}= survived the redirect (${finalUrl})`);
    }
  }
  if (from.searchParams.has("lang") && to.pathname !== from.pathname) {
    failures.push(`${start}: ?lang= redirected off its own path (${to.pathname})`);
  }
  return failures;
}

/**
 * Re-origin a URL so a locally served build can be compared against the
 * production canonicals it renders (canonical/hreflang always name the live
 * domain, even in a preview build).
 */
export function reorigin(url, siteOrigin) {
  if (!siteOrigin) return url;
  try {
    const u = new URL(url);
    const site = new URL(siteOrigin);
    u.protocol = site.protocol;
    u.port = "";
    u.host = site.host;
    return u.toString();
  } catch {
    return url;
  }
}

/** Full verdict for one crawled URL. */
export function evaluateCrawl({
  start,
  chain,
  finalStatus,
  finalUrl,
  html,
  headers = {},
  origin,
  siteOrigin = null,
  sitemapUrls = null,
  maxHops = MAX_HOPS,
}) {
  const failures = evaluateChain({ start, chain, finalStatus, finalUrl, maxHops });
  if (failures.length) return failures;

  failures.push(...evaluateDuplicateParams({ start, finalUrl }));
  if (isNoindex(html, headers)) {
    failures.push(`${start}: final page ${finalUrl} is noindex`);
    return failures;
  }
  failures.push(...checkPage({ url: reorigin(finalUrl, siteOrigin), html, origin, sitemapUrls }));
  return failures;
}

/* ------------------------------------------------------------------ fetch */

/** Follow redirects manually so the whole chain is observable. */
export async function crawl(
  url,
  { maxHops = MAX_HOPS, userAgent = "DoseRoutineCI-CrawlSmoke/1.0" } = {},
) {
  const chain = [];
  let current = url;
  for (let hop = 0; hop <= maxHops; hop++) {
    const res = await fetch(current, { redirect: "manual", headers: { "user-agent": userAgent } });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      chain.push({ url: current, status: res.status, location });
      current = new URL(location, current).toString();
      continue;
    }
    // Preview/sandbox hosts deliberately answer with a noindex header so the
    // staging copy never gets indexed; that is not a production defect.
    const isLocal = /^(localhost|127\.0\.0\.1)$/.test(new URL(current).hostname);
    const headers = { "x-robots-tag": isLocal ? "" : res.headers.get("x-robots-tag") || "" };
    const html = res.ok ? await res.text() : "";
    return { chain, finalStatus: res.status, finalUrl: current, html, headers };
  }
  const last = chain[chain.length - 1];
  return { chain, finalStatus: last?.status ?? 508, finalUrl: current, html: "", headers: {} };
}

/* -------------------------------------------------------------------- run */

async function main() {
  const base = (process.env.CRAWL_SMOKE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const sample = Number(process.env.CRAWL_SMOKE_SAMPLE ?? "60");
  const langs = (process.env.CRAWL_SMOKE_LANGS || "ar,es,zh").split(",").filter(Boolean);
  const origin = new URL(base).origin;
  // Canonicals and hreflang always name the live domain; when auditing a local
  // build we compare against that domain, not localhost.
  const siteOrigin = new URL(DEFAULT_BASE_URL).origin;

  const rootXml = await (await fetch(`${base}/sitemap.xml`)).text();
  const root = parseSitemap(rootXml);
  const urls = [];
  if (root.kind === "index") {
    for (const child of root.locs) {
      const childXml = await (await fetch(child)).text();
      urls.push(...parseSitemap(childXml).locs);
    }
  } else {
    urls.push(...root.locs);
  }
  if (urls.length === 0) {
    console.error(`No URLs found in ${base}/sitemap.xml`);
    process.exit(1);
  }

  // Compare against the site's own origin even when auditing a local build.
  const sitemapUrls = new Set(urls.map((u) => normaliseUrl(u)).filter(Boolean));

  const routeTargets = (sample > 0 ? pickSample(urls, sample) : urls).map((u) =>
    u.replace(/^https:\/\/[^/]+/, origin),
  );
  // Probe the ?lang= duplicates on a smaller slice — the redirect rule is
  // global, so a spread of paths proves it without a 12x crawl.
  const langTargets = (
    sample > 0 ? pickSample(routeTargets, Math.min(12, routeTargets.length)) : routeTargets
  ).flatMap((u) => langVariants(u, langs));

  const targets = [...routeTargets, ...langTargets];
  console.log(
    `Crawling ${routeTargets.length} routes + ${langTargets.length} ?lang= variants (of ${urls.length} sitemap URLs)…`,
  );

  const failures = [];
  const queue = [...targets];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const start = queue.shift();
      try {
        const result = await crawl(start);
        failures.push(
          ...evaluateCrawl({ start, ...result, origin: siteOrigin, siteOrigin, sitemapUrls }),
        );
      } catch (err) {
        failures.push(`${start}: fetch failed (${err.message})`);
      }
    }
  });
  await Promise.all(workers);

  if (failures.length) {
    console.error(`\n${failures.length} crawl problem(s):\n`);
    for (const f of failures.slice(0, 200)) console.error(`  • ${f}`);
    if (failures.length > 200) console.error(`  … and ${failures.length - 200} more`);
    process.exit(1);
  }
  console.log(`\nAll ${targets.length} URLs crawlable with correct canonical + hreflang.`);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("crawl-smoke.mjs");
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
