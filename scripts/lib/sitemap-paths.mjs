/**
 * sitemap-paths.mjs — discovers the full set of deployed compound pages by
 * reading the live /sitemap.xml instead of relying on a hand-maintained sample.
 *
 * A "compound page" is a single-segment /library/<slug> URL rendered by
 * src/routes/library.$slug.tsx. The sitemap also lists hand-written /library
 * pages (guides, comparisons, hubs); those live under deeper segments or in the
 * explicit exclude list below and are filtered out because they do not follow
 * the compound marker contract.
 */

import { readFileSync } from "node:fs";
import { gunzipSync, inflateSync, brotliDecompressSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(
  readFileSync(resolve(HERE, "..", "deployed-markers.json"), "utf8"),
);

/** Single-segment /library/<slug> pages that are NOT compound pages. */
export const NON_COMPOUND_LIBRARY_SLUGS = new Set(
  contract.discovery?.excludeSlugs ?? [],
);

function decompress(buf, contentEncoding = "") {
  const enc = contentEncoding.toLowerCase();
  const gzipMagic = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  try {
    if (gzipMagic || enc.includes("gzip")) return gunzipSync(buf);
    if (enc.includes("br")) return brotliDecompressSync(buf);
    if (enc.includes("deflate")) return inflateSync(buf);
  } catch {
    // already-decoded body
  }
  return buf;
}

/** Fetch text with guaranteed decompression. */
export async function fetchTextDecompressed(url, timeoutMs = 30_000) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { accept: "text/html,application/xml,*/*", "accept-encoding": "gzip, br, deflate" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "",
    text: decompress(raw, res.headers.get("content-encoding") ?? "").toString("utf8"),
  };
}

/** Extract every <loc> value from a sitemap XML document. */
export function parseSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
}

/** Keep only single-segment /library/<slug> compound paths. */
export function filterCompoundPaths(locs) {
  const paths = new Set();
  for (const loc of locs) {
    let pathname;
    try {
      pathname = new URL(loc).pathname;
    } catch {
      pathname = loc;
    }
    pathname = pathname.replace(/\/+$/, "");
    const match = /^\/library\/([^/]+)$/.exec(pathname);
    if (!match) continue;
    const slug = match[1];
    if (NON_COMPOUND_LIBRARY_SLUGS.has(slug)) continue;
    paths.add(`/library/${slug}`);
  }
  return [...paths].sort();
}

/**
 * Discover every compound page URL from the deployed sitemap.
 * Falls back to the contract's sample paths when the sitemap is unreachable.
 */
export async function discoverCompoundPaths(base, { fallback = contract.paths } = {}) {
  const sitemapUrl = `${base.replace(/\/+$/, "")}/sitemap.xml`;
  try {
    const res = await fetchTextDecompressed(sitemapUrl);
    if (res.status !== 200) {
      return { paths: fallback, source: "fallback", reason: `sitemap HTTP ${res.status}` };
    }
    const paths = filterCompoundPaths(parseSitemapLocs(res.text));
    if (paths.length === 0) {
      return { paths: fallback, source: "fallback", reason: "sitemap listed no compound URLs" };
    }
    return { paths, source: "sitemap", reason: `${paths.length} compound URLs in sitemap` };
  } catch (err) {
    return {
      paths: fallback,
      source: "fallback",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Run an async worker over items with bounded concurrency, preserving order. */
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
