#!/usr/bin/env node
/**
 * Future-date audit across every sitemap URL.
 *
 * Google distrusts a site that advertises content published or modified in
 * the future — it is a classic spam signal and it poisons the freshness
 * signals of the whole sitemap. This sweep fails the build when any of the
 * following carries a timestamp later than "now" (plus a small clock skew
 * allowance):
 *
 *   • <lastmod> in sitemap.xml (and nested sitemaps, one level deep)
 *   • JSON-LD datePublished / dateModified / uploadDate / dateCreated
 *   • <meta property="article:published_time" | "article:modified_time">
 *   • <time datetime="..."> elements
 *
 * Usage:
 *   node scripts/future-date-check.mjs
 *   FUTURE_DATE_BASE_URL=http://localhost:3000 node scripts/future-date-check.mjs
 *   FUTURE_DATE_SAMPLE=0 node scripts/future-date-check.mjs   # every URL
 */

import { parseSitemap, pickSample } from "./sitemap-robots-check.mjs";

/** <url> entries with their optional <lastmod>, from a urlset document. */
export function parseUrlEntries(xml) {
  const out = [];
  const re = /<url>([\s\S]*?)<\/url>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const loc = /<loc>\s*([^<]+?)\s*<\/loc>/i.exec(m[1]);
    if (!loc) continue;
    const lastmod = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/i.exec(m[1]);
    out.push({ loc: loc[1].trim(), lastmod: lastmod ? lastmod[1].trim() : null });
  }
  return out;
}

export const DEFAULT_BASE_URL = "https://doseroutine.com";

/** Clock skew we forgive between the build machine and the server. */
export const SKEW_MS = 60 * 60 * 1000; // 1 hour

const DATE_KEYS = new Set([
  "datepublished",
  "datemodified",
  "datecreated",
  "uploaddate",
  "startdate",
]);

/* ---------------------------------------------------------------- parsing */

/** Parse a date string; returns null when it is not a usable timestamp. */
export function parseDate(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Only accept things that at least look like a date, so free text such as
  // "PT5M" or "weekly" never trips the check.
  if (!/^\d{4}-\d{2}(-\d{2})?/.test(trimmed)) return null;
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : ms;
}

/** Walk any JSON-LD value collecting [key, dateString] pairs. */
export function collectJsonLdDates(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdDates(item, out);
    return out;
  }
  if (!node || typeof node !== "object") return out;
  for (const [key, value] of Object.entries(node)) {
    if (DATE_KEYS.has(key.toLowerCase()) && typeof value === "string") {
      out.push([key, value]);
    } else if (value && typeof value === "object") {
      collectJsonLdDates(value, out);
    }
  }
  return out;
}

/** Every date-ish value a page advertises, as { source, value } records. */
export function extractPageDates(html) {
  const found = [];

  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html)) !== null) {
    let parsed;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      continue; // JSON validity is the jsonld-schema check's job.
    }
    for (const [key, value] of collectJsonLdDates(parsed)) {
      found.push({ source: `json-ld ${key}`, value });
    }
  }

  const metaRe =
    /<meta[^>]+(?:property|name)=["'](article:published_time|article:modified_time|og:updated_time)["'][^>]*>/gi;
  while ((m = metaRe.exec(html)) !== null) {
    const content = /content=["']([^"']+)["']/i.exec(m[0]);
    if (content) found.push({ source: `meta ${m[1]}`, value: content[1] });
  }

  const timeRe = /<time[^>]+datetime=["']([^"']+)["']/gi;
  while ((m = timeRe.exec(html)) !== null) {
    found.push({ source: "<time datetime>", value: m[1] });
  }

  return found;
}

/* ------------------------------------------------------------------ rules */

/**
 * Violations for a single page. `now` is injectable so the rules are unit
 * testable without touching the clock.
 */
export function futureDateViolations({ url, html, now = Date.now(), skewMs = SKEW_MS }) {
  const limit = now + skewMs;
  return extractPageDates(html)
    .map((record) => ({ ...record, ms: parseDate(record.value) }))
    .filter((record) => record.ms !== null && record.ms > limit)
    .map((record) => `${url} — ${record.source} is in the future: ${record.value}`);
}

/** Violations for the <lastmod> values inside a parsed sitemap. */
export function sitemapLastmodViolations(entries, { now = Date.now(), skewMs = SKEW_MS } = {}) {
  const limit = now + skewMs;
  const out = [];
  for (const entry of entries) {
    const raw = typeof entry === "string" ? null : entry.lastmod;
    if (!raw) continue;
    const ms = parseDate(raw);
    if (ms !== null && ms > limit)
      out.push(`sitemap <lastmod> is in the future: ${entry.loc} (${raw})`);
  }
  return out;
}

/* -------------------------------------------------------------------- run */

async function main() {
  const base = (process.env.FUTURE_DATE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const sample = Number(process.env.FUTURE_DATE_SAMPLE ?? "80");

  const entries = [];
  const roots = [`${base}/sitemap.xml`];
  const rootXml = await (await fetch(roots[0])).text();
  const root = parseSitemap(rootXml);
  if (root.kind === "index") {
    for (const child of root.locs) {
      const childXml = await (await fetch(child)).text();
      entries.push(...parseUrlEntries(childXml));
    }
  } else {
    entries.push(...parseUrlEntries(rootXml));
  }
  const urls = entries.map((e) => e.loc);
  if (urls.length === 0) {
    console.error(`No URLs found in ${base}/sitemap.xml`);
    process.exit(1);
  }

  const failures = sitemapLastmodViolations(entries);
  const targets = sample > 0 ? pickSample(urls, sample) : urls;
  console.log(`Checking ${targets.length} of ${urls.length} sitemap URLs for future dates…`);

  let checked = 0;
  const queue = [...targets];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      try {
        const res = await fetch(url, {
          headers: { "user-agent": "DoseRoutineCI-FutureDateCheck/1.0" },
        });
        if (!res.ok) continue;
        failures.push(...futureDateViolations({ url, html: await res.text() }));
      } catch (err) {
        console.warn(`  fetch failed: ${url} (${err.message})`);
      }
      checked += 1;
    }
  });
  await Promise.all(workers);

  if (failures.length) {
    console.error(`\n${failures.length} future-dated value(s) found:\n`);
    for (const f of failures) console.error(`  • ${f}`);
    process.exit(1);
  }
  console.log(`\nNo future dates across ${checked} pages and ${urls.length} sitemap entries.`);
}

const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
