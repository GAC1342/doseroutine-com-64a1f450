#!/usr/bin/env node
/**
 * Prints a markdown table of every /blog post's SEO score (title, meta
 * description, H1/H2 structure, keyword in the first 100 words).
 *
 * Used by .github/workflows/blog-seo-score.yml to write a job summary:
 *   node scripts/blog-seo-score-report.mjs >> "$GITHUB_STEP_SUMMARY"
 *
 * Exits 1 when any post is below the passing score, so it can also gate
 * a deploy on its own.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadModules() {
  const outfile = path.join(ROOT, "node_modules", ".cache", "blog-seo-score.mjs");
  await build({
    entryPoints: [path.join(ROOT, "scripts", "blog-seo-score.entry.ts")],
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

const { BLOG_POSTS, failingPosts, loadSeoScoreConfig, scoreAllBlogPosts } = await loadModules();
// Thresholds come from seo-score.config.json (SEO_SCORE_CONFIG / SEO_SCORE_PASSING_SCORE).
const config = loadSeoScoreConfig(ROOT, process.env);
const results = scoreAllBlogPosts(BLOG_POSTS, config).sort((a, b) => a.score - b.score);
const failing = failingPosts(results, config);
const PASSING_SCORE = config.passingScore;

console.log("## Blog SEO score\n");
console.log(
  `Threshold: **${PASSING_SCORE}/100** — ${results.length} posts scored · blocking checks: ${config.blockingChecks.join(", ")}\n`,
);
console.log("| Post | Score | Failed checks |");
console.log("| --- | --- | --- |");
for (const r of results) {
  const failed = r.failed.length
    ? r.failed.map((f) => `${f.id} (${f.detail})`).join("<br>")
    : "—";
  console.log(`| \`${r.slug}\` | ${failing.includes(r) ? "❌ " : "✅ "}${r.score} | ${failed} |`);
}

if (failing.length > 0) {
  console.log(`\n**${failing.length} post(s) failing the configured gate.**`);
  process.exitCode = 1;
}
