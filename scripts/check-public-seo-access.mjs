#!/usr/bin/env node
/**
 * Live check: are our SEO pages reachable by an anonymous visitor?
 *
 * Fetches /robots.txt and /sitemap.xml from a running site (no cookies, no
 * session), then probes a sample of sitemap URLs and fails when any one is:
 *   - blocked by robots.txt
 *   - not HTTP 200
 *   - redirected to a sign-in page
 *   - marked noindex via X-Robots-Tag or <meta name="robots">
 *
 * Usage:
 *   node scripts/check-public-seo-access.mjs [--base https://doseroutine.com] [--limit 40] [--all]
 */

import { classifyLiveProbe, robotsBlocks } from "../src/lib/public-seo-access.ts";

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}

const BASE = flag("base", process.env.SEO_ACCESS_BASE_URL ?? "https://doseroutine.com").replace(
  /\/+$/,
  "",
);
const ALL = args.includes("--all");
const LIMIT = ALL ? Infinity : Number(flag("limit", "40"));
const UA = "DoseRoutine-SEO-Access-Check (+https://doseroutine.com)";

// Pages that must always be checked, whatever the sample size.
const ALWAYS = [
  "/",
  "/manual",
  "/booty-workout",
  "/library",
  "/blog",
  "/help",
  "/faq",
  "/interactions",
  "/calculators",
  "/library/retatrutide-dosage",
];

async function get(path, { body = true } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "follow",
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
  });
  return {
    status: res.status,
    finalUrl: res.url || `${BASE}${path}`,
    xRobotsTag: res.headers.get("x-robots-tag"),
    html: body ? await res.text() : "",
  };
}

function sitemapPaths(xml) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => m[1].trim())
    .map((loc) => {
      try {
        return new URL(loc).pathname;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function main() {
  console.log(`Checking public SEO access on ${BASE}`);

  const robotsRes = await fetch(`${BASE}/robots.txt`, { headers: { "user-agent": UA } });
  if (!robotsRes.ok) {
    console.error(`FAIL robots.txt returned HTTP ${robotsRes.status}`);
    process.exit(1);
  }
  const robotsTxt = await robotsRes.text();

  const sitemapRes = await fetch(`${BASE}/sitemap.xml`, { headers: { "user-agent": UA } });
  if (!sitemapRes.ok) {
    console.error(`FAIL sitemap.xml returned HTTP ${sitemapRes.status}`);
    process.exit(1);
  }
  const all = sitemapPaths(await sitemapRes.text());
  console.log(`sitemap.xml: ${all.length} URLs`);

  const picked = [];
  const seen = new Set();
  for (const p of [...ALWAYS.filter((p) => all.includes(p) || ALWAYS.includes(p)), ...all]) {
    if (seen.has(p)) continue;
    seen.add(p);
    picked.push(p);
    if (picked.length >= LIMIT) break;
  }

  const failures = [];
  for (const path of picked) {
    let probe;
    try {
      const res = await get(path);
      probe = classifyLiveProbe({
        path,
        status: res.status,
        finalUrl: res.finalUrl,
        xRobotsTag: res.xRobotsTag,
        html: res.html,
        robotsBlocked: robotsBlocks(robotsTxt, path),
      });
    } catch (err) {
      probe = { path, ok: false, reasons: [`request failed: ${err.message}`] };
    }
    if (probe.ok) {
      console.log(`ok   ${path}`);
    } else {
      console.log(`FAIL ${path} — ${probe.reasons.join("; ")}`);
      failures.push(probe);
    }
  }

  console.log(`\n${picked.length - failures.length}/${picked.length} pages publicly crawlable`);
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
