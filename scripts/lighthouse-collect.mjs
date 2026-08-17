#!/usr/bin/env node
/**
 * Collects Lighthouse runs for the key routes in perf-routes.json.
 *
 * Runs one or both device profiles:
 *   PERF_PROFILE=desktop|mobile|both   (default: desktop)
 * Mobile uses Lighthouse's slow-4G + 4x CPU throttling so we catch regressions
 * that a fast desktop profile hides.
 *
 * Reports land in .lighthouseci-<profile>/ so both profiles can coexist.
 *
 * The base URL is configurable so the same job can audit the live site
 * (default) or a locally served build:
 *   PERF_BASE_URL=https://doseroutine.com node scripts/lighthouse-collect.mjs
 *
 * Chrome is resolved from CHROME_PATH when set (CI runners and sandboxes that
 * only ship Playwright's Chromium), otherwise Lighthouse auto-detects.
 */
import { readFileSync, rmSync, renameSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.PERF_BASE_URL ?? "https://doseroutine.com").replace(/\/+$/, "");
const RUNS = process.env.PERF_RUNS ?? "2";

const CONFIGS = {
  desktop: "lighthouserc.perf.json",
  mobile: "lighthouserc.perf.mobile.json",
};

const requested = (process.env.PERF_PROFILE ?? "desktop").toLowerCase();
const profiles = requested === "both" ? ["desktop", "mobile"] : [requested];
for (const p of profiles) {
  if (!CONFIGS[p]) {
    console.error(`Unknown PERF_PROFILE "${p}" — use desktop, mobile, or both.`);
    process.exit(2);
  }
}

const allRoutes = JSON.parse(readFileSync(path.join(ROOT, "perf-routes.json"), "utf8")).routes;
// PERF_ROUTES=/,/library  narrows the run to a subset (prefix match) for fast re-checks.
const filter = (process.env.PERF_ROUTES ?? "")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);
const routes = filter.length
  ? allRoutes.filter((r) => filter.some((f) => (f === "/" ? r === "/" : r.startsWith(f))))
  : allRoutes;
if (!Array.isArray(routes) || routes.length === 0) {
  console.error("perf-routes.json has no routes.");
  process.exit(2);
}

for (const profile of profiles) {
  const outDir = path.join(ROOT, `.lighthouseci-${profile}`);
  rmSync(path.join(ROOT, ".lighthouseci"), { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });

  const args = [
    "--yes",
    "@lhci/cli@0.14.x",
    "collect",
    `--config=${path.join(ROOT, CONFIGS[profile])}`,
    `--numberOfRuns=${RUNS}`,
    ...routes.map((r) => `--url=${BASE}${r === "/" ? "/" : r}`),
  ];

  console.log(`\n[${profile}] Auditing ${routes.length} route(s) on ${BASE} (${RUNS} run(s) each)`);
  const res = spawnSync("npx", args, { stdio: "inherit", cwd: ROOT, env: process.env });
  if (existsSync(path.join(ROOT, ".lighthouseci"))) {
    renameSync(path.join(ROOT, ".lighthouseci"), outDir);
    console.log(`[${profile}] reports -> ${path.relative(ROOT, outDir)}/`);
  }
  if (res.status !== 0) process.exit(res.status ?? 1);
}
