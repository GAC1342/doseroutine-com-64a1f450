#!/usr/bin/env node
/**
 * Turn `lhci autorun` output into a PR-comment-ready markdown summary.
 *
 * Usage: node scripts/lighthouse-comment.mjs <lhci.log>
 *
 * Reads:
 *   - The log file (for the "Open report" URLs printed by
 *     temporary-public-storage uploads and the pass/fail assertion lines).
 *   - .lighthouseci/manifest.json (for per-URL accessibility scores).
 *
 * Writes markdown to stdout — the workflow pipes it into a sticky PR
 * comment so reviewers see a per-route score table plus every failing
 * assertion, and can click through to the hosted Lighthouse report.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const logPath = process.argv[2] || "lhci.log";
const log = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";

// Report URLs look like:
//   Open the report at https://storage.googleapis.com/...report.html
const reportUrls = [...log.matchAll(/Open the report at (\S+)/g)].map((m) => m[1]);

// Assertion failures printed by @lhci/cli look like:
//   ✘ 0.87  categories:accessibility  failure for minScore assertion
//        expected: >=0.95
//        found: 0.87
//        all values: [0.87]
const failLines = [...log.matchAll(/✘\s+([\d.]+)\s+(\S+)\s+failure for ([^\n]+)/g)].map((m) => ({
  actual: m[1],
  audit: m[2],
  reason: m[3].trim(),
}));

// Parsed run manifest gives us per-URL scores even when nothing failed.
const manifestPath = path.join(".lighthouseci", "manifest.json");
let manifest = [];
if (existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    /* ignore — fall back to log-only summary */
  }
}

const passed = failLines.length === 0;
const heading = passed
  ? "## 💡 Lighthouse accessibility — passed"
  : `## 💡 Lighthouse accessibility — ${failLines.length} failing assertion${failLines.length === 1 ? "" : "s"}`;

const lines = [heading, ""];

if (manifest.length) {
  const byUrl = new Map();
  for (const run of manifest) {
    if (!byUrl.has(run.url)) byUrl.set(run.url, []);
    let score = null;
    try {
      const summary = JSON.parse(readFileSync(run.jsonPath, "utf8"));
      score = summary?.categories?.accessibility?.score ?? null;
    } catch {
      /* ignore malformed run */
    }
    byUrl.get(run.url).push(score);
  }
  lines.push("| Route | Accessibility |");
  lines.push("| --- | --- |");
  for (const [url, scores] of byUrl) {
    const numeric = scores.filter((s) => typeof s === "number");
    const min = numeric.length ? Math.min(...numeric) : null;
    const emoji = min === null ? "⬜" : min >= 0.95 ? "🟩" : min >= 0.9 ? "🟨" : "🟥";
    const path = new URL(url).pathname || "/";
    lines.push(`| \`${path}\` | ${emoji} ${min === null ? "n/a" : (min * 100).toFixed(0)} |`);
  }
  lines.push("");
}

if (failLines.length) {
  lines.push("### Failing assertions");
  lines.push("");
  lines.push("| Audit | Actual | Reason |");
  lines.push("| --- | --- | --- |");
  for (const f of failLines) {
    lines.push(`| \`${f.audit}\` | ${f.actual} | ${escapePipe(f.reason)} |`);
  }
  lines.push("");
}

if (reportUrls.length) {
  lines.push("### Hosted reports");
  lines.push("");
  for (const u of reportUrls) lines.push(`- ${u}`);
  lines.push("");
}

if (passed && !manifest.length) {
  lines.push("_All Lighthouse assertions passed._");
}

lines.push(
  "<sub>Thresholds live in `lighthouserc.json`. Update them there if a bar changes.</sub>",
);

process.stdout.write(lines.join("\n") + "\n");

function escapePipe(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}
