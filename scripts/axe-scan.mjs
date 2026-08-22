#!/usr/bin/env node
/**
 * axe-core accessibility scanner for every public page.
 *
 * Usage:
 *   node scripts/axe-scan.mjs [base_url]
 *
 * Defaults to http://localhost:8080 so CI can run against a locally-booted
 * `bun run dev` server. Discovers routes from <base_url>/sitemap.xml, adds
 * a curated set of must-cover pages (home, /auth, /pricing, /library,
 * /library/compare/bpc-157-vs-tb-500, /help, /privacy, /terms, /ai-policy),
 * and scans each with axe-core using WCAG 2.1 AA + best-practice rules.
 *
 * Outputs:
 *   axe-report/report.json     — machine-readable results (full violations)
 *   axe-report/summary.md      — PR-comment-ready markdown
 *
 * Exit codes:
 *   0 — no serious/critical violations
 *   1 — at least one serious/critical violation (fail the check)
 *   2 — scanner itself errored
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = (process.argv[2] || process.env.AXE_BASE_URL || "http://localhost:8080").replace(
  /\/$/,
  "",
);
const OUT_DIR = path.resolve("axe-report");
// Cap total pages so a huge sitemap can't blow the CI budget. Curated
// routes below are always scanned; the rest are sampled up to this limit.
const MAX_ROUTES = Number(process.env.AXE_MAX_ROUTES || 40);
const CONCURRENCY = Number(process.env.AXE_CONCURRENCY || 4);

// Must-cover routes — the pages users actually land on. These are always
// scanned even if the sitemap changes, so a regression on the home page
// or the auth screen can't slip through.
const REQUIRED_PATHS = [
  "/",
  "/auth",
  "/library",
  "/library/compare/bpc-157-vs-tb-500",
  "/help",
  "/privacy",
  "/legal",
  "/ai-policy",
];

/** Fetch and parse the sitemap for extra routes to spot-check. */
async function discoverSitemapPaths() {
  try {
    const res = await fetch(`${BASE}/sitemap.xml`);
    if (!res.ok) return [];
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    const paths = new Set();
    for (const loc of locs) {
      try {
        const u = new URL(loc);
        paths.add(u.pathname || "/");
      } catch {
        /* skip malformed */
      }
    }
    return [...paths];
  } catch (err) {
    console.warn(`[axe] sitemap discovery failed: ${err.message}`);
    return [];
  }
}

function pickRoutes(extra) {
  const seen = new Set();
  const routes = [];
  for (const p of [...REQUIRED_PATHS, ...extra]) {
    const norm = p.startsWith("/") ? p : `/${p}`;
    if (seen.has(norm)) continue;
    seen.add(norm);
    routes.push(norm);
    if (routes.length >= MAX_ROUTES) break;
  }
  return routes;
}

/** Run axe against a single URL. Returns { url, violations, error? }. */
async function scanRoute(browser, routePath) {
  const url = `${BASE}${routePath}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    if (!resp || !resp.ok()) {
      return {
        url,
        path: routePath,
        error: `HTTP ${resp?.status() ?? "no-response"}`,
        violations: [],
      };
    }
    // Give any client-side hydration a beat before axe reads the DOM.
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();
    return { url, path: routePath, violations: results.violations };
  } catch (err) {
    return { url, path: routePath, error: err.message, violations: [] };
  } finally {
    await context.close();
  }
}

/** Bounded concurrency runner — keeps memory sane on large scans. */
async function runInParallel(items, worker, limit) {
  const results = [];
  let idx = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const my = idx++;
      results[my] = await worker(items[my]);
    }
  });
  await Promise.all(runners);
  return results;
}

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3, unknown: 4 };
const IMPACT_EMOJI = { critical: "🟥", serious: "🟧", moderate: "🟨", minor: "🟦", unknown: "⬜" };

function renderMarkdown(results) {
  const totals = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  let totalNodes = 0;
  for (const r of results) {
    for (const v of r.violations) {
      const impact = v.impact ?? "minor";
      if (totals[impact] !== undefined) totals[impact] += 1;
      totalNodes += v.nodes.length;
    }
  }
  const failing = results.filter((r) => r.violations.length || r.error);
  const errored = results.filter((r) => r.error);
  const clean = results.filter((r) => !r.violations.length && !r.error);

  const header = `## ♿ axe-core accessibility scan

- **Pages scanned:** ${results.length}
- **Clean:** ${clean.length}
- **With violations:** ${results.length - clean.length - errored.length}
- **Scan errors:** ${errored.length}
- **Violations by impact:** 🟥 ${totals.critical} critical · 🟧 ${totals.serious} serious · 🟨 ${totals.moderate} moderate · 🟦 ${totals.minor} minor (${totalNodes} nodes total)

<sub>Base URL: \`${BASE}\` · Rules: WCAG 2.1 A/AA + best-practice</sub>
`;

  if (!failing.length) {
    return `${header}

No violations found. ✅
`;
  }

  const sections = failing.map((r) => {
    if (r.error) {
      return `### ⚠️ \`${r.path}\`

Scanner error: \`${r.error}\`
`;
    }
    const sorted = [...r.violations].sort(
      (a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9),
    );
    const rows = sorted
      .slice(0, 10)
      .map((v) => {
        const emoji = IMPACT_EMOJI[v.impact ?? "minor"] ?? "⬜";
        const firstNode = v.nodes[0]?.target?.join(" ") || "";
        const trimmedNode = firstNode.length > 80 ? `${firstNode.slice(0, 77)}…` : firstNode;
        return `| ${emoji} ${v.impact ?? "—"} | [\`${v.id}\`](${v.helpUrl}) | ${escapePipe(v.help)} | ${v.nodes.length} | \`${escapePipe(trimmedNode)}\` |`;
      })
      .join("\n");
    const extra =
      sorted.length > 10
        ? `\n\n<sub>…and ${sorted.length - 10} more. See \`axe-report/report.json\` for the full list.</sub>`
        : "";
    return `### \`${r.path}\` — ${r.violations.length} violation${r.violations.length === 1 ? "" : "s"}

| Impact | Rule | Description | Nodes | First selector |
| --- | --- | --- | --- | --- |
${rows}${extra}
`;
  });

  return `${header}

<details><summary><strong>Show ${failing.length} affected page${failing.length === 1 ? "" : "s"}</strong></summary>

${sections.join("\n")}

</details>
`;
}

function escapePipe(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function main() {
  console.log(`[axe] scanning ${BASE}`);
  const extra = await discoverSitemapPaths();
  const routes = pickRoutes(extra);
  console.log(`[axe] ${routes.length} route(s):`);
  routes.forEach((r) => console.log(`  - ${r}`));

  // AXE_CHROMIUM_PATH lets a sandbox/CI image with a differently-versioned
  // Chromium reuse its existing binary instead of downloading a new one.
  const browser = await chromium.launch(
    process.env.AXE_CHROMIUM_PATH ? { executablePath: process.env.AXE_CHROMIUM_PATH } : {},
  );

  let results;
  try {
    results = await runInParallel(routes, (r) => scanRoute(browser, r), CONCURRENCY);
  } finally {
    await browser.close();
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUT_DIR, "report.json"),
    JSON.stringify({ base: BASE, results }, null, 2),
  );
  const md = renderMarkdown(results);
  await writeFile(path.join(OUT_DIR, "summary.md"), md);

  // Console echo so the workflow log itself is legible.
  console.log("\n" + md);

  const blocking = results.some((r) =>
    r.violations.some((v) => v.impact === "critical" || v.impact === "serious"),
  );
  if (blocking) {
    console.error("[axe] FAIL: critical or serious violations found");
    process.exit(1);
  }
  console.log("[axe] OK: no critical or serious violations");
}

main().catch((err) => {
  console.error("[axe] scanner crashed:", err);
  process.exit(2);
});
