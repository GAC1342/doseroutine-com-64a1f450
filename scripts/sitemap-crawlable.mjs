#!/usr/bin/env node
/**
 * Sitemap crawlability gate.
 *
 * A sitemap is a promise: "these URLs are the canonical, indexable pages".
 * Google penalises the whole file when that promise breaks, which is what our
 * "crawled — currently not indexed" backlog looked like. For every URL the
 * generated sitemap lists, this asserts:
 *
 *   • the response is 200, or a 3xx that resolves to a 200 (no 4xx/5xx)
 *   • no redirect loops and no chains longer than MAX_HOPS
 *   • the destination is itself listed in the sitemap (a sitemap URL must
 *     never point at a page the sitemap does not advertise)
 *   • the destination is indexable — no `noindex` meta and no
 *     `X-Robots-Tag: noindex` header
 *   • the destination's canonical points at itself
 *
 * Usage:
 *   node scripts/sitemap-crawlable.mjs
 *   SITEMAP_CRAWL_BASE_URL=http://localhost:3000 node scripts/sitemap-crawlable.mjs
 *   SITEMAP_CRAWL_SAMPLE=0 node scripts/sitemap-crawlable.mjs   # every URL
 */

import { crawl, evaluateChain, isNoindex, MAX_HOPS, reorigin } from "./crawl-smoke.mjs";
import { extractCanonicals, normaliseUrl } from "./hreflang-canonical-check.mjs";
import { parseSitemap, pickSample } from "./sitemap-robots-check.mjs";

export const DEFAULT_BASE_URL = "https://doseroutine.com";

/**
 * Verdict for one sitemap URL. Pure — the caller supplies the fetch results.
 */
export function evaluateSitemapUrl({
  url,
  chain,
  finalStatus,
  finalUrl,
  html,
  headers = {},
  sitemapUrls = null,
  siteOrigin = null,
  maxHops = MAX_HOPS,
}) {
  const failures = evaluateChain({ start: url, chain, finalStatus, finalUrl, maxHops });
  if (failures.length) return failures;

  const finalNorm = normaliseUrl(reorigin(finalUrl, siteOrigin));
  const selfNorm = normaliseUrl(reorigin(url, siteOrigin));

  if (sitemapUrls && finalNorm !== selfNorm && !sitemapUrls.has(finalNorm)) {
    failures.push(`${url}: redirects to ${finalUrl}, which the sitemap does not list`);
  }
  if (isNoindex(html, headers)) {
    failures.push(`${url}: destination ${finalUrl} is noindex but is listed in the sitemap`);
    return failures;
  }

  const canonicals = extractCanonicals(html);
  if (canonicals.length === 0) {
    failures.push(`${url}: no <link rel="canonical"> on ${finalUrl}`);
  } else if (canonicals.length > 1) {
    failures.push(`${url}: ${canonicals.length} canonical tags on ${finalUrl}`);
  } else if (normaliseUrl(canonicals[0]) !== finalNorm) {
    failures.push(`${url}: canonical on ${finalUrl} points elsewhere (${canonicals[0]})`);
  }

  return failures;
}

/* -------------------------------------------------------------------- run */

async function main() {
  const base = (process.env.SITEMAP_CRAWL_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const sample = Number(process.env.SITEMAP_CRAWL_SAMPLE ?? "80");
  const origin = new URL(base).origin;

  const rootXml = await (await fetch(`${base}/sitemap.xml`)).text();
  const root = parseSitemap(rootXml);
  const listed = [];
  if (root.kind === "index") {
    for (const child of root.locs) {
      const childXml = await (await fetch(child)).text();
      listed.push(...parseSitemap(childXml).locs);
    }
  } else {
    listed.push(...root.locs);
  }
  if (listed.length === 0) {
    console.error(`No URLs found in ${base}/sitemap.xml`);
    process.exit(1);
  }

  const localised = listed.map((u) => u.replace(/^https:\/\/[^/]+/, origin));
  const sitemapUrls = new Set(listed.map((u) => normaliseUrl(u)).filter(Boolean));
  const siteOrigin = new URL(DEFAULT_BASE_URL).origin;
  const targets = sample > 0 ? pickSample(localised, sample) : localised;
  console.log(`Checking ${targets.length} of ${listed.length} sitemap URLs for crawlability…`);

  const failures = [];
  const queue = [...targets];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      try {
        const result = await crawl(url, { userAgent: "DoseRoutineCI-SitemapCrawl/1.0" });
        failures.push(...evaluateSitemapUrl({ url, ...result, sitemapUrls, siteOrigin }));
      } catch (err) {
        failures.push(`${url}: fetch failed (${err.message})`);
      }
    }
  });
  await Promise.all(workers);

  if (failures.length) {
    console.error(`\n${failures.length} sitemap crawlability problem(s):\n`);
    for (const f of failures.slice(0, 200)) console.error(`  • ${f}`);
    if (failures.length > 200) console.error(`  … and ${failures.length - 200} more`);
    process.exit(1);
  }
  console.log(`\nAll ${targets.length} sitemap URLs are crawlable and self-canonical.`);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("sitemap-crawlable.mjs");
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
