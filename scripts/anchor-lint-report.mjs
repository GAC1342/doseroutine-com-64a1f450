#!/usr/bin/env node
/**
 * anchor-lint-report.mjs — crawl the sitemap and write a CI artifact listing
 * every internal anchor-text / link-accessibility violation, grouped by page,
 * with the offending link text and destination URL.
 *
 * Usage:
 *   node scripts/anchor-lint-report.mjs [--base https://doseroutine.com]
 *                                       [--max 120] [--out-dir artifacts/anchor-lint]
 *
 * Outputs (in --out-dir):
 *   anchor-lint.json  — machine-readable report (totals, per-page violations)
 *   anchor-lint.md    — markdown summary (also appended to $GITHUB_STEP_SUMMARY)
 *   anchor-lint.csv   — one row per violation (page, code, text, destination)
 *
 * Exit code: 1 when any violation is found (or the site is unreachable and
 * --require-server is set), otherwise 0.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const BASE = flag("base", process.env["ANCHOR_LINT_BASE_URL"] ?? "https://doseroutine.com").replace(
  /\/+$/,
  "",
);
const MAX = Number(flag("max", process.env["ANCHOR_LINT_MAX_PAGES"] ?? "120")) || 120;
const OUT_DIR = path.resolve(ROOT, flag("out-dir", "artifacts/anchor-lint"));
const REQUIRE_SERVER = has("require-server") || process.env["ANCHOR_LINT_REQUIRE_SERVER"] === "1";
const CONCURRENCY = 6;

async function loadModules() {
  const outfile = path.join(ROOT, "node_modules", ".cache", "anchor-lint-report.mjs");
  await build({
    entryPoints: [path.join(ROOT, "scripts", "anchor-lint-report.entry.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile,
    logLevel: "silent",
    alias: { "@": path.join(ROOT, "src") },
  });
  return import(pathToFileURL(outfile).href);
}

const { lintAnchorText, crawlSitemap, crawlCacheStats } = await loadModules();

const generatedAt = new Date().toISOString();
// Shared crawl: reuses any page the SEO test suite already fetched this run.
const crawl = await crawlSitemap({ baseUrl: BASE, max: MAX, concurrency: CONCURRENCY });

/** @type {{ path: string; url: string; linksChecked: number; violations: any[] }[]} */
let pages = [];
let reachable = crawl.reachable;

if (reachable) {
  pages = crawl.pages.map((page) => {
    const result = lintAnchorText(page.html, { siteOrigin: BASE });
    return {
      path: page.path,
      url: page.url,
      linksChecked: result.links.length,
      violations: result.issues.map((issue) => ({
        code: issue.code,
        text: issue.text,
        destination: issue.href,
        detail: issue.detail,
      })),
    };
  });
  const stats = crawlCacheStats();
  console.log(
    `[anchor-lint] crawl cache: ${stats.downloads} downloaded, ${stats.diskHits} disk hits, ` +
      `${stats.revalidated} revalidated, ${stats.memoryHits} in-memory reuses`,
  );
}

const failing = pages.filter((p) => p.violations.length > 0);
const violationCount = failing.reduce((n, p) => n + p.violations.length, 0);
const byCode = {};
for (const page of failing) {
  for (const v of page.violations) byCode[v.code] = (byCode[v.code] ?? 0) + 1;
}

const report = {
  generatedAt,
  base: BASE,
  reachable,
  totals: {
    pagesCrawled: pages.length,
    pagesWithViolations: failing.length,
    linksChecked: pages.reduce((n, p) => n + p.linksChecked, 0),
    violations: violationCount,
    byCode,
  },
  pages: failing.sort((a, b) => b.violations.length - a.violations.length),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "anchor-lint.json"), `${JSON.stringify(report, null, 2)}\n`);

// ---- CSV: one row per violation -------------------------------------------
const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const csv = [
  "page,code,link_text,destination,detail",
  ...failing.flatMap((page) =>
    page.violations.map((v) =>
      [page.path, v.code, v.text, v.destination, v.detail].map(csvCell).join(","),
    ),
  ),
].join("\n");
fs.writeFileSync(path.join(OUT_DIR, "anchor-lint.csv"), `${csv}\n`);

// ---- Markdown summary ------------------------------------------------------
const md = ["## Internal anchor-text lint", ""];
md.push(`Target: \`${BASE}\` · ${generatedAt}`);
md.push("");

if (!reachable) {
  md.push(`⚠️ Could not reach \`${BASE}/sitemap.xml\` — no pages were crawled.`);
} else if (violationCount === 0) {
  md.push(
    `✅ No violations across **${report.totals.pagesCrawled}** pages (${report.totals.linksChecked} internal links checked).`,
  );
} else {
  md.push(
    `❌ **${violationCount}** violation(s) on **${failing.length}** of ${report.totals.pagesCrawled} pages (${report.totals.linksChecked} internal links checked).`,
  );
  md.push("");
  md.push("| Rule | Count |");
  md.push("| --- | --- |");
  for (const [code, count] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) {
    md.push(`| \`${code}\` | ${count} |`);
  }
  md.push("");
  for (const page of failing) {
    md.push(`### \`${page.path}\` — ${page.violations.length} violation(s)`);
    md.push("");
    md.push("| Rule | Link text | Destination | Why |");
    md.push("| --- | --- | --- | --- |");
    for (const v of page.violations) {
      const text = v.text ? `\`${v.text.replace(/\|/g, "\\|")}\`` : "_(empty)_";
      md.push(
        `| \`${v.code}\` | ${text} | \`${v.destination.replace(/\|/g, "\\|")}\` | ${v.detail.replace(/\|/g, "\\|")} |`,
      );
    }
    md.push("");
  }
}

const markdown = `${md.join("\n")}\n`;
fs.writeFileSync(path.join(OUT_DIR, "anchor-lint.md"), markdown);
process.stdout.write(markdown);

const summaryFile = process.env["GITHUB_STEP_SUMMARY"];
if (summaryFile) fs.appendFileSync(summaryFile, markdown);

if (!reachable && REQUIRE_SERVER) process.exitCode = 1;
else if (violationCount > 0) process.exitCode = 1;
