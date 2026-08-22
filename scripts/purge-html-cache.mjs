#!/usr/bin/env node
/**
 * purge-html-cache.mjs — post-deploy edge/CDN cache purge for HTML routes.
 *
 * Lovable hosting does not expose a public purge API, so the default strategy
 * is a *revalidation sweep*: request every important HTML route with
 * `Cache-Control: no-cache` + `Pragma: no-cache`, which forces the edge to go
 * back to origin and replace any stale entry. Combined with the short
 * `s-maxage=300` on HTML this bounds crawler staleness to ~5 minutes.
 *
 * If a real purge API is available it is used first:
 *   CLOUDFLARE_ZONE_ID + CLOUDFLARE_API_TOKEN  -> Cloudflare purge_cache
 *   CDN_PURGE_URL (+ optional CDN_PURGE_TOKEN) -> generic POST { urls: [...] }
 *
 * Usage: node scripts/purge-html-cache.mjs [--base https://doseroutine.com]
 */

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = flag("base", process.env.BASE_URL || "https://doseroutine.com").replace(/\/+$/, "");

/** Routes whose HTML must never be served stale after a deploy. */
const STATIC_PATHS = ["/", "/library", "/blog", "/interactions", "/calculator", "/sources"];

async function sitemapPaths() {
  try {
    const res = await fetch(`${BASE}/sitemap.xml`, { headers: { accept: "application/xml" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    return locs
      .filter((u) => u.startsWith(BASE))
      .map((u) => new URL(u).pathname)
      .filter((p) => p.startsWith("/library") || p.startsWith("/blog"));
  } catch {
    return [];
  }
}

async function cloudflarePurge(urls) {
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!zone || !token) return false;
  // Cloudflare accepts at most 30 URLs per call.
  for (let i = 0; i < urls.length; i += 30) {
    const chunk = urls.slice(i, i + 30);
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ files: chunk }),
    });
    if (!res.ok) {
      console.error(`❌ Cloudflare purge failed (${res.status}): ${await res.text()}`);
      return false;
    }
  }
  console.log(`✅ Cloudflare purge: ${urls.length} URL(s)`);
  return true;
}

async function genericPurge(urls) {
  const endpoint = process.env.CDN_PURGE_URL;
  if (!endpoint) return false;
  const headers = { "content-type": "application/json" };
  if (process.env.CDN_PURGE_TOKEN) headers.authorization = `Bearer ${process.env.CDN_PURGE_TOKEN}`;
  const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ urls }) });
  if (!res.ok) {
    console.error(`❌ CDN purge failed (${res.status}): ${await res.text()}`);
    return false;
  }
  console.log(`✅ CDN purge: ${urls.length} URL(s)`);
  return true;
}

async function revalidationSweep(urls) {
  let ok = 0;
  let failed = 0;
  const queue = [...urls];
  const workers = Array.from({ length: 6 }, async () => {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      try {
        const res = await fetch(url, {
          headers: {
            "cache-control": "no-cache",
            pragma: "no-cache",
            "user-agent": "DoseRoutineDeployPurge/1.0 (+https://doseroutine.com)",
          },
        });
        if (res.ok) ok += 1;
        else {
          failed += 1;
          console.warn(`  ⚠ ${res.status} ${url}`);
        }
      } catch (error) {
        failed += 1;
        console.warn(`  ⚠ ${url}: ${String(error)}`);
      }
    }
  });
  await Promise.all(workers);
  console.log(`✅ revalidation sweep: ${ok} refreshed, ${failed} failed`);
  return failed === 0;
}

const paths = [...new Set([...STATIC_PATHS, ...(await sitemapPaths())])];
const urls = paths.map((p) => `${BASE}${p}`);
console.log(`▶ purging ${urls.length} HTML route(s) on ${BASE}`);

const purged = (await cloudflarePurge(urls)) || (await genericPurge(urls));
const swept = await revalidationSweep(urls);

if (!purged) {
  console.log("ℹ️  no purge API configured — relied on the revalidation sweep");
}
process.exit(swept ? 0 : 1);
