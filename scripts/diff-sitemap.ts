/**
 * diff-sitemap.ts — compare the current sitemap against the last saved
 * snapshot and fail when article URLs or <image:image> entries disappeared.
 *
 * Usage (bun):
 *   bun run scripts/diff-sitemap.ts                       # live vs. saved snapshot
 *   bun run scripts/diff-sitemap.ts --save                # accept the new sitemap
 *   bun run scripts/diff-sitemap.ts --base http://localhost:8080
 *   bun run scripts/diff-sitemap.ts --previous a.xml --next b.xml
 *
 * Exit codes: 0 no regressions, 1 regressions found, 2 could not run.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { diffSitemaps, formatSitemapDiff, parseSitemap } from "../src/lib/sitemap-diff";

const args = process.argv.slice(2);
function flag(name: string): string | boolean | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const next = args[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

const SNAPSHOT_PATH = String(flag("snapshot") ?? ".sitemap-snapshot/sitemap.xml");
const BASE = String(flag("base") ?? process.env["BASE_URL"] ?? "https://doseroutine.com").replace(
  /\/+$/,
  "",
);
const SAVE = Boolean(flag("save"));

function log(...parts: unknown[]) {
  console.log("[diff-sitemap]", ...parts);
}

async function readSitemap(source: string): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source, { headers: { accept: "application/xml" } });
    if (!res.ok) throw new Error(`sitemap fetch failed [${res.status}] ${source}`);
    return res.text();
  }
  return readFileSync(source, "utf8");
}

async function main() {
  const nextSource = String(flag("next") ?? `${BASE}/sitemap.xml`);
  const nextXml = await readSitemap(nextSource);
  const next = parseSitemap(nextXml);
  log(
    `current sitemap: ${next.urlCount} URLs, ${next.articleCount} /articles, ${next.imageCount} images (${nextSource})`,
  );
  if (next.urlCount === 0) {
    log("refusing to continue: the new sitemap has no <url> entries");
    process.exit(2);
  }

  const previousSource = flag("previous") ? String(flag("previous")) : SNAPSHOT_PATH;
  if (!existsSync(previousSource) && !/^https?:\/\//i.test(previousSource)) {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, nextXml);
    log(`no previous snapshot — saved the current sitemap to ${SNAPSHOT_PATH}`);
    return;
  }

  const previousXml = await readSitemap(previousSource);
  const diff = diffSitemaps(previousXml, nextXml);
  console.log(formatSitemapDiff(diff));

  if (diff.regressions.length > 0) {
    log(`${diff.regressions.length} regression(s) — snapshot NOT updated`);
    if (!SAVE) process.exit(1);
  }
  if (SAVE || diff.regressions.length === 0) {
    if (diff.changed) {
      mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
      writeFileSync(SNAPSHOT_PATH, nextXml);
      log(`snapshot updated: ${SNAPSHOT_PATH}`);
    } else {
      log("no changes");
    }
  }
}

main().catch((err) => {
  console.error("[diff-sitemap] failed:", err instanceof Error ? err.message : err);
  process.exit(2);
});
