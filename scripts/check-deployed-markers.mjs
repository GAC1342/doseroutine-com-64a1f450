#!/usr/bin/env node
/**
 * check-deployed-markers.mjs — production check that the deployed compound
 * pages actually serve the required UI markers (and none of the retired ones).
 *
 * Page set: discovered from the live /sitemap.xml (every single-segment
 * /library/<slug> compound URL), not a hand-picked sample. If the sitemap is
 * unreachable the contract's fallback sample is used so the check still runs.
 *
 * Decompression: bodies are fetched as raw bytes and inflated in-process when
 * they are (or look) compressed, so the scan never runs against compressed
 * bytes — the failure mode that makes a healthy deploy look broken.
 *
 * Usage:
 *   node scripts/check-deployed-markers.mjs
 *   node scripts/check-deployed-markers.mjs --base https://doseroutine.com
 *   node scripts/check-deployed-markers.mjs --max 50      # sample a subset
 *   BASE_URL=https://staging.example node scripts/check-deployed-markers.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, inflateSync, brotliDecompressSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  discoverCompoundPaths,
  fetchTextDecompressed,
  mapWithConcurrency,
} from "./lib/sitemap-paths.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(readFileSync(resolve(HERE, "deployed-markers.json"), "utf8"));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const BASE = (arg("base") || process.env["BASE_URL"] || "https://doseroutine.com").replace(
  /\/+$/,
  "",
);
const MAX_PAGES = Number(arg("max") || process.env["MARKER_MAX_PAGES"] || 0) || 0;
const CONCURRENCY =
  Number(process.env["MARKER_CONCURRENCY"] || 0) || contract.discovery?.concurrency || 8;

/** Decompress a raw body buffer when it is (or looks) compressed. */
export function decompressBuffer(buf, contentEncoding = "") {
  const enc = contentEncoding.toLowerCase();
  const gzipMagic = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  try {
    if (gzipMagic || enc.includes("gzip")) return gunzipSync(buf);
    if (enc.includes("br")) return brotliDecompressSync(buf);
    if (enc.includes("deflate")) return inflateSync(buf);
  } catch {
    // Already-decoded body: fall through and use it verbatim.
  }
  return buf;
}

const toRegExp = (m) => new RegExp(m.pattern, m.flags || "");

/** Audit one page's plain-text HTML against the marker contract. */
export function auditMarkers(html) {
  return {
    missing: contract.required.filter((m) => !toRegExp(m).test(html)).map((m) => m.label),
    forbidden: contract.forbidden.filter((m) => toRegExp(m).test(html)).map((m) => m.label),
  };
}

async function main() {
  console.log(`▶ deployed marker check → ${BASE}`);

  const discovered = await discoverCompoundPaths(BASE);
  let paths = discovered.paths;
  console.log(`  page set: ${discovered.source} (${discovered.reason})`);
  if (MAX_PAGES > 0 && paths.length > MAX_PAGES) {
    paths = paths.slice(0, MAX_PAGES);
    console.log(`  capped to first ${MAX_PAGES} pages`);
  }
  console.log(`  probing ${paths.length} compound pages (concurrency ${CONCURRENCY})\n`);

  const failures = [];
  let checked = 0;

  await mapWithConcurrency(paths, CONCURRENCY, async (path) => {
    const url = `${BASE}${path}`;
    let page;
    try {
      page = await fetchTextDecompressed(url);
    } catch (err) {
      failures.push({ path, reasons: [`fetch failed: ${err.message}`] });
      return;
    }

    if (page.status !== 200) {
      failures.push({ path, reasons: [`HTTP ${page.status}`] });
      return;
    }
    if (!/text\/html/i.test(page.contentType)) {
      failures.push({ path, reasons: [`content-type ${page.contentType || "(none)"}`] });
      return;
    }

    const { missing, forbidden } = auditMarkers(page.text);
    if (missing.length || forbidden.length) {
      failures.push({
        path,
        reasons: [
          ...missing.map((l) => `missing: ${l}`),
          ...forbidden.map((l) => `still present: ${l}`),
        ],
      });
      return;
    }
    checked++;
    if (checked % 25 === 0) console.log(`  …${checked} pages OK`);
  });

  // Machine-readable report so consecutive runs can be diffed.
  const reportPath = arg("json") || process.env["MARKER_REPORT"];
  if (reportPath) {
    failures.sort((a, b) => a.path.localeCompare(b.path));
    const report = {
      base: BASE,
      generatedAt: new Date().toISOString(),
      pageSet: { source: discovered.source, reason: discovered.reason },
      totals: {
        checked: paths.length,
        passed: paths.length - failures.length,
        failed: failures.length,
      },
      paths: paths.slice().sort(),
      failures: failures.map((f) => ({ path: f.path, reasons: f.reasons.slice().sort() })),
    };
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  report written → ${reportPath}`);
  }

  if (failures.length > 0) {
    failures.sort((a, b) => a.path.localeCompare(b.path));
    for (const f of failures) {
      console.error(`  ❌ ${f.path}`);
      for (const r of f.reasons) console.error(`     ${r}`);
    }
    console.error(`\n❌ deployed marker check failed on ${failures.length}/${paths.length} pages`);
    process.exit(1);
  }
  console.log(`\n✅ all ${paths.length} compound pages serve the expected markers`);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("check-deployed-markers.mjs");
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
