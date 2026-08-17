#!/usr/bin/env node
/**
 * hreflang + canonical consistency audit across all sitemap URLs.
 *
 * For every URL listed in sitemap.xml (following a <sitemapindex> one level
 * deep) this fetches the page HTML and enforces:
 *
 *   canonical
 *     • exactly one <link rel="canonical">
 *     • absolute, https, same-origin
 *     • self-referencing (trailing slash / hash / ?lang= ignored)
 *     • the canonical target is itself listed in the sitemap
 *
 *   hreflang
 *     • every <link rel="alternate" hreflang> href is absolute, https,
 *       same-origin and well-formed
 *     • no duplicate hreflang codes
 *     • codes look like BCP-47 (or x-default)
 *     • when a cluster exists it must contain x-default
 *     • x-default and the default-locale entry point at the canonical URL
 *     • every alternate shares the canonical's pathname (locale is a
 *       ?lang= variant, so a different path means a broken cluster)
 *
 * Usage:
 *   node scripts/hreflang-canonical-check.mjs
 *   HREFLANG_BASE_URL=http://localhost:3000 node scripts/hreflang-canonical-check.mjs
 *   HREFLANG_SAMPLE=0 node scripts/hreflang-canonical-check.mjs   # every URL
 *
 * Exits non-zero on any mismatch, so CI fails the build.
 */

import { parseSitemap, pickSample } from "./sitemap-robots-check.mjs";

export const DEFAULT_BASE_URL = "https://doseroutine.com";
export const DEFAULT_LOCALE = "en";

/* ---------------------------------------------------------------- parsing */

/** All <link> tags in a document, as attribute maps (lowercased keys). */
export function parseLinkTags(html) {
  const out = [];
  const re = /<link\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = {};
    const attrRe = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let a;
    while ((a = attrRe.exec(m[1])) !== null) {
      attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? "";
    }
    out.push(attrs);
  }
  return out;
}

/** Canonical hrefs found in a document, in order. */
export function extractCanonicals(html) {
  return parseLinkTags(html)
    .filter((a) => (a.rel || "").toLowerCase().trim() === "canonical")
    .map((a) => (a.href || "").trim());
}

/** hreflang alternates as { hreflang, href } pairs, in order. */
export function extractAlternates(html) {
  return parseLinkTags(html)
    .filter((a) => (a.rel || "").toLowerCase().trim() === "alternate" && a.hreflang)
    .map((a) => ({ hreflang: a.hreflang.trim(), href: (a.href || "").trim() }));
}

/** Normalise a URL for comparison: drop hash, trailing slash and ?lang=. */
export function normaliseUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.searchParams.delete("lang");
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    u.pathname = path;
    return u.toString().replace(/\/$/, "") || u.origin;
  } catch {
    return null;
  }
}

const BCP47 = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** True when a code is a plausible hreflang value. */
export function isValidHreflang(code) {
  return code === "x-default" || BCP47.test(code);
}

/* ------------------------------------------------- pure validation rules */

/**
 * Validate one page's canonical + hreflang cluster.
 *
 * @returns {string[]} failure strings (empty when consistent)
 */
export function checkPage({
  url,
  html,
  origin,
  sitemapUrls = null,
  defaultLocale = DEFAULT_LOCALE,
}) {
  const failures = [];
  const label = new URL(url).pathname;

  /* ---- canonical ---- */
  const canonicals = extractCanonicals(html);
  if (canonicals.length === 0) {
    failures.push(`${label}: missing <link rel="canonical">`);
    return failures;
  }
  if (canonicals.length > 1) {
    failures.push(`${label}: ${canonicals.length} canonical tags (must be exactly 1)`);
  }
  const canonicalRaw = canonicals[0];
  let canonical;
  try {
    canonical = new URL(canonicalRaw);
  } catch {
    failures.push(`${label}: canonical "${canonicalRaw}" is not an absolute URL`);
    return failures;
  }
  if (origin && canonical.origin !== origin) {
    failures.push(`${label}: canonical points off-origin (${canonicalRaw})`);
  }
  if (canonical.protocol !== "https:" && !/^(localhost|127\.0\.0\.1)$/.test(canonical.hostname)) {
    failures.push(`${label}: canonical is not https (${canonicalRaw})`);
  }
  const selfNorm = normaliseUrl(url);
  const canonNorm = normaliseUrl(canonicalRaw);
  if (canonNorm !== selfNorm) {
    failures.push(`${label}: canonical does not self-reference (points at ${canonicalRaw})`);
  }
  if (sitemapUrls && canonNorm && !sitemapUrls.has(canonNorm)) {
    failures.push(`${label}: canonical target is not listed in the sitemap (${canonicalRaw})`);
  }

  /* ---- hreflang cluster ---- */
  const alternates = extractAlternates(html);
  if (alternates.length === 0) return failures;

  const seen = new Set();
  for (const { hreflang, href } of alternates) {
    if (!isValidHreflang(hreflang)) {
      failures.push(`${label}: invalid hreflang code "${hreflang}"`);
    }
    if (seen.has(hreflang)) {
      failures.push(`${label}: duplicate hreflang "${hreflang}"`);
    }
    seen.add(hreflang);

    let alt;
    try {
      alt = new URL(href);
    } catch {
      failures.push(
        `${label}: hreflang "${hreflang}" href is not an absolute URL (${href || "empty"})`,
      );
      continue;
    }
    if (origin && alt.origin !== origin) {
      failures.push(`${label}: hreflang "${hreflang}" points off-origin (${href})`);
    }
    if (alt.protocol !== "https:" && !/^(localhost|127\.0\.0\.1)$/.test(alt.hostname)) {
      failures.push(`${label}: hreflang "${hreflang}" is not https (${href})`);
    }
    if (canonical.pathname.replace(/\/+$/, "") !== alt.pathname.replace(/\/+$/, "")) {
      failures.push(
        `${label}: hreflang "${hreflang}" leaves the canonical path (${alt.pathname} ≠ ${canonical.pathname})`,
      );
    }
  }

  if (!seen.has("x-default")) {
    failures.push(`${label}: hreflang cluster is missing x-default`);
  }
  if (!seen.has(defaultLocale)) {
    failures.push(`${label}: hreflang cluster is missing the default locale "${defaultLocale}"`);
  }

  for (const code of ["x-default", defaultLocale]) {
    const entry = alternates.find((a) => a.hreflang === code);
    if (entry && normaliseUrl(entry.href) !== canonNorm) {
      failures.push(`${label}: hreflang "${code}" (${entry.href}) does not match the canonical`);
    }
  }

  return failures;
}

/* ---------------------------------------------------- reciprocity rules */

/** Normalise a URL but KEEP the ?lang= variant (locale identity matters here). */
export function normaliseLocaleUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    u.pathname = path;
    const lang = u.searchParams.get("lang");
    const search = lang ? `?lang=${lang}` : "";
    return `${u.origin}${u.pathname === "/" ? "" : u.pathname}${search}` || u.origin;
  } catch {
    return null;
  }
}

/** The locale a URL represents: its ?lang= value, else the default locale. */
export function localeOfUrl(raw, defaultLocale = DEFAULT_LOCALE) {
  try {
    return new URL(raw).searchParams.get("lang") || defaultLocale;
  } catch {
    return defaultLocale;
  }
}

/**
 * Confirm every alternate on a page links back to that page with the
 * expected hreflang code, and advertises the same cluster of locales.
 *
 * @param {object} input
 * @param {string} input.url          the page being audited
 * @param {string} input.html         its HTML
 * @param {Map<string,string|null>|Record<string,string|null>} input.alternateDocs
 *        alternate href (as listed, or its normaliseLocaleUrl form) → HTML,
 *        or null/undefined when the alternate could not be fetched
 * @returns {string[]} failure strings (empty when reciprocal)
 */
export function checkReciprocity({ url, html, alternateDocs, defaultLocale = DEFAULT_LOCALE }) {
  const failures = [];
  const label = new URL(url).pathname;
  const docs =
    alternateDocs instanceof Map ? alternateDocs : new Map(Object.entries(alternateDocs || {}));
  const lookup = (href) =>
    docs.has(href) ? docs.get(href) : (docs.get(normaliseLocaleUrl(href) ?? "") ?? undefined);

  const alternates = extractAlternates(html);
  if (alternates.length === 0) return failures;

  const selfKey = normaliseLocaleUrl(url);
  const selfLocale = localeOfUrl(url, defaultLocale);
  const ownCodes = new Set(alternates.map((a) => a.hreflang).filter((c) => c !== "x-default"));

  for (const { hreflang, href } of alternates) {
    if (hreflang === "x-default") continue;
    const altKey = normaliseLocaleUrl(href);
    if (!altKey || altKey === selfKey) continue;

    const altHtml = lookup(href);
    if (altHtml == null) {
      failures.push(
        `${label}: hreflang "${hreflang}" (${href}) could not be fetched for reciprocity check`,
      );
      continue;
    }

    const back = extractAlternates(altHtml);
    if (back.length === 0) {
      failures.push(
        `${label}: hreflang "${hreflang}" (${href}) has no hreflang cluster — not reciprocal`,
      );
      continue;
    }

    const backToSelf = back.filter(
      (b) => normaliseLocaleUrl(b.href) === selfKey && b.hreflang !== "x-default",
    );
    if (backToSelf.length === 0) {
      failures.push(`${label}: hreflang "${hreflang}" (${href}) does not link back to ${url}`);
      continue;
    }
    if (!backToSelf.some((b) => b.hreflang === selfLocale)) {
      failures.push(
        `${label}: hreflang "${hreflang}" (${href}) links back with hreflang "${backToSelf
          .map((b) => b.hreflang)
          .join(", ")}" (expected "${selfLocale}")`,
      );
    }

    const backCodes = new Set(back.map((b) => b.hreflang).filter((c) => c !== "x-default"));
    const missing = [...ownCodes].filter((c) => !backCodes.has(c));
    const extra = [...backCodes].filter((c) => !ownCodes.has(c));
    if (missing.length > 0 || extra.length > 0) {
      failures.push(
        `${label}: hreflang "${hreflang}" (${href}) advertises a different cluster` +
          `${missing.length ? ` — missing ${missing.join(", ")}` : ""}` +
          `${extra.length ? ` — extra ${extra.join(", ")}` : ""}`,
      );
    }
  }

  return failures;
}

/* -------------------------------------------------------------- live run */

async function fetchWithRetry(url, init = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetch(url, { redirect: "follow", ...init });
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 750));
    }
  }
  throw new Error("unreachable");
}

async function collectSitemapUrls(baseUrl) {
  const res = await fetchWithRetry(`${baseUrl}/sitemap.xml`);
  if (res.status !== 200) throw new Error(`sitemap.xml returned HTTP ${res.status}`);
  const root = parseSitemap(await res.text());
  if (root.kind === "unknown")
    throw new Error("sitemap.xml is neither a <urlset> nor a <sitemapindex>");
  if (root.kind === "urlset") return root.locs;
  const urls = [];
  for (const child of root.locs) {
    const childRes = await fetchWithRetry(child);
    if (childRes.status !== 200)
      throw new Error(`child sitemap ${child} returned HTTP ${childRes.status}`);
    urls.push(...parseSitemap(await childRes.text()).locs);
  }
  return urls;
}

async function main() {
  const baseUrl = (
    process.env.HREFLANG_BASE_URL ||
    process.env.SITEMAP_BASE_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const sample = Number(process.env.HREFLANG_SAMPLE ?? "60");
  const origin = new URL(baseUrl).origin;

  const allUrls = await collectSitemapUrls(baseUrl);
  const sitemapUrls = new Set(allUrls.map(normaliseUrl).filter(Boolean));
  const targets = sample > 0 && allUrls.length > sample ? pickSample(allUrls, sample) : allUrls;

  console.log(`• sitemap URLs: ${allUrls.length}`);
  console.log(`• auditing hreflang + canonical on ${targets.length} URL(s) at ${baseUrl}`);

  const reciprocity = process.env.HREFLANG_RECIPROCITY !== "0";
  if (reciprocity) console.log("• reciprocity check: on (each alternate must link back)");

  /** Shared HTML cache so an alternate is only fetched once. */
  const htmlCache = new Map();
  async function getHtml(target) {
    const key = normaliseLocaleUrl(target) ?? target;
    if (htmlCache.has(key)) return htmlCache.get(key);
    let html = null;
    try {
      const res = await fetchWithRetry(target, { method: "GET" });
      if (res.status === 200) html = await res.text();
    } catch {
      html = null;
    }
    htmlCache.set(key, html);
    return html;
  }

  const failures = [];
  let cursor = 0;
  const concurrency = 8;
  async function worker() {
    while (cursor < targets.length) {
      const url = targets[cursor++];
      try {
        const res = await fetchWithRetry(url, { method: "GET" });
        if (res.status !== 200) {
          failures.push(`${new URL(url).pathname}: HTTP ${res.status}`);
          continue;
        }
        const html = await res.text();
        htmlCache.set(normaliseLocaleUrl(url) ?? url, html);
        failures.push(...checkPage({ url, html, origin, sitemapUrls }));

        if (reciprocity) {
          const selfKey = normaliseLocaleUrl(url);
          const alternateDocs = new Map();
          for (const { hreflang, href } of extractAlternates(html)) {
            if (hreflang === "x-default") continue;
            const key = normaliseLocaleUrl(href);
            if (!key || key === selfKey || alternateDocs.has(key)) continue;
            alternateDocs.set(key, await getHtml(href));
          }
          failures.push(...checkReciprocity({ url, html, alternateDocs }));
        }
      } catch (err) {
        failures.push(`${url} failed to fetch: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} hreflang/canonical mismatch(es):`);
    for (const f of failures.slice(0, 60)) console.error(`  - ${f}`);
    if (failures.length > 60) console.error(`  … and ${failures.length - 60} more`);
    process.exit(1);
  }
  console.log("\n✓ hreflang and canonical tags are consistent across the audited sitemap URLs.");
}

const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].endsWith("hreflang-canonical-check.mjs");

if (isDirectRun) {
  main().catch((err) => {
    console.error(`hreflang/canonical audit crashed: ${err.stack || err.message}`);
    process.exit(1);
  });
}
