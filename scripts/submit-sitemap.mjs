#!/usr/bin/env node
/**
 * submit-sitemap.mjs — after publishing new articles, tell Google and Bing.
 *
 * What it actually does (no fiction):
 *   1. Google Search Console: PUT /sitemaps/{sitemapUrl} on the verified
 *      property, through the Lovable connector gateway. This is the supported
 *      "re-read my sitemap now" call. Google has no public "request indexing"
 *      API, so per-URL indexing requests are not attempted.
 *   2. Bing (+ Yandex, Seznam, Naver): IndexNow push with every URL in the
 *      sitemap, batched.
 *
 * The deployed app already implements both in /api/public/hooks/reindex, so by
 * default this script calls that endpoint (needs CRON_SECRET). Use --direct to
 * run the two submissions from this machine instead (needs LOVABLE_API_KEY +
 * GOOGLE_SEARCH_CONSOLE_API_KEY for the Google half; IndexNow needs no key).
 *
 * Usage:
 *   CRON_SECRET=xxx node scripts/submit-sitemap.mjs
 *   node scripts/submit-sitemap.mjs --direct --base https://doseroutine.com
 *   node scripts/submit-sitemap.mjs --direct --only indexnow
 *   node scripts/submit-sitemap.mjs --dry-run
 *
 * Exit codes: 0 all requested submissions succeeded, 1 otherwise.
 */

const args = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = args[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

const BASE = String(flag("base", process.env.BASE_URL || "https://doseroutine.com")).replace(
  /\/+$/,
  "",
);
const SITEMAP_URL = String(flag("sitemap", `${BASE}/sitemap.xml`));
const DIRECT = Boolean(flag("direct", false));
const DRY_RUN = Boolean(flag("dry-run", false));
const ONLY = String(flag("only", "all")); // all | google | indexnow
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "ff78cf5b72e80ee9f44cbdc91300d780";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const TIMEOUT_MS = 20_000;

function log(...parts) {
  console.log("[submit-sitemap]", ...parts);
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readSitemapUrls() {
  const res = await fetchWithTimeout(SITEMAP_URL, { headers: { accept: "application/xml" } });
  if (!res.ok) throw new Error(`sitemap fetch failed [${res.status}] ${SITEMAP_URL}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  return [...new Set(urls)];
}

/** Path A: let the deployed app do the work (same code path as the cron hook). */
async function viaHook() {
  const secret = process.env.CRON_SECRET || process.env.SEO_MONITOR_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET (or SEO_MONITOR_SECRET) is required without --direct");
  }
  const url = `${BASE}/api/public/hooks/reindex`;
  if (DRY_RUN) return log("dry-run: would POST", url);
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "x-cron-secret": secret },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`reindex hook failed [${res.status}]: ${body}`);
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`reindex hook returned non-JSON: ${body.slice(0, 300)}`);
  }
  log("google sitemap submit:", parsed.sitemapSubmitOk ? "ok" : `FAILED ${parsed.sitemapError}`);
  log(
    "indexnow:",
    parsed.indexnowOk ? `ok (${parsed.indexnowSubmitted} urls)` : `FAILED ${parsed.indexnowError}`,
  );
  if (!parsed.sitemapSubmitOk || !parsed.indexnowOk) throw new Error("submission incomplete");
}

/** Resolve the verified Search Console property that covers BASE. */
async function resolveSiteUrl(headers) {
  const res = await fetchWithTimeout(`${GATEWAY}/webmasters/v3/sites`, { headers });
  if (!res.ok) throw new Error(`could not list properties [${res.status}]: ${await res.text()}`);
  const { siteEntry = [] } = await res.json();
  const target = new URL(BASE + "/");
  const matches = siteEntry.filter((entry) => {
    if (entry.permissionLevel === "siteUnverifiedUser") return false;
    if (entry.siteUrl.startsWith("sc-domain:")) {
      const domain = entry.siteUrl.slice("sc-domain:".length).toLowerCase();
      const host = target.hostname.toLowerCase();
      return host === domain || host.endsWith(`.${domain}`);
    }
    try {
      return target.href.startsWith(new URL(entry.siteUrl).href);
    } catch {
      return false;
    }
  });
  if (matches.length === 0) throw new Error(`no verified Search Console property covers ${BASE}`);
  if (matches.length > 1 && !process.env.GSC_SITE_URL) {
    throw new Error(
      `multiple verified properties match: ${matches
        .map((m) => m.siteUrl)
        .join(", ")} — set GSC_SITE_URL to the one to use`,
    );
  }
  const chosen = process.env.GSC_SITE_URL
    ? matches.find((m) => m.siteUrl === process.env.GSC_SITE_URL)
    : matches[0];
  if (!chosen) throw new Error("GSC_SITE_URL is not a verified property for this site");
  return chosen.siteUrl;
}

async function submitGoogleDirect() {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const connectionApiKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableApiKey || !connectionApiKey) {
    throw new Error(
      "LOVABLE_API_KEY and GOOGLE_SEARCH_CONSOLE_API_KEY are required for --direct google",
    );
  }
  const headers = {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": connectionApiKey,
  };
  const siteUrl = await resolveSiteUrl(headers);
  const path = `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
  if (DRY_RUN) return log("dry-run: would PUT", path);
  const res = await fetchWithTimeout(path, { method: "PUT", headers });
  if (!res.ok) throw new Error(`google sitemap submit failed [${res.status}]: ${await res.text()}`);
  log(`google sitemap submit: ok (${siteUrl})`);
}

async function submitIndexNowDirect(urls) {
  const host = new URL(BASE).hostname;
  const batches = [];
  for (let i = 0; i < urls.length; i += 1000) batches.push(urls.slice(i, i + 1000));
  if (DRY_RUN) {
    return log(
      `dry-run: would push ${urls.length} urls to IndexNow in ${batches.length} batch(es)`,
    );
  }
  for (const [index, batch] of batches.entries()) {
    const res = await fetchWithTimeout("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
        urlList: batch,
      }),
    });
    if (!res.ok) {
      throw new Error(`indexnow batch ${index + 1} failed [${res.status}]: ${await res.text()}`);
    }
    log(`indexnow batch ${index + 1}/${batches.length}: ok (${batch.length} urls)`);
  }
}

async function main() {
  log(`base=${BASE} sitemap=${SITEMAP_URL} mode=${DIRECT ? "direct" : "hook"} only=${ONLY}`);
  if (!DIRECT) {
    await viaHook();
    log("done");
    return;
  }
  const urls = await readSitemapUrls();
  log(`sitemap contains ${urls.length} urls`);
  if (ONLY === "all" || ONLY === "google") await submitGoogleDirect();
  if (ONLY === "all" || ONLY === "indexnow") await submitIndexNowDirect(urls);
  log("done");
}

main().catch((error) => {
  console.error("[submit-sitemap] FAILED:", error.message);
  process.exit(1);
});
