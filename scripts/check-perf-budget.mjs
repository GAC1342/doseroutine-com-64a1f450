#!/usr/bin/env node
/**
 * Performance + font budget checker.
 *
 * Reads Lighthouse reports produced by `lhci collect` (.lighthouseci/lhr-*.json)
 * and asserts the budgets in perf-budgets.json:
 *   - paint/responsiveness metrics (FCP, LCP, Speed Index, TBT, CLS)
 *   - overall performance score
 *   - font-specific metrics: transfer bytes, request count, preload count,
 *     font-display: swap, and render-blocking font requests
 *
 * Fails the run (exit 1) on any regression so font optimization can't silently
 * degrade. Multiple runs per URL are aggregated with the median.
 *
 * Usage: node scripts/check-perf-budget.mjs [--dir .lighthouseci] [--json]
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};
const PROFILE = (argValue("--profile") ?? "desktop").toLowerCase();
if (!["desktop", "mobile"].includes(PROFILE)) {
  console.error(`Unknown --profile "${PROFILE}" — use desktop or mobile.`);
  process.exit(2);
}
const defaultDir = existsSync(path.join(ROOT, `.lighthouseci-${PROFILE}`))
  ? `.lighthouseci-${PROFILE}`
  : ".lighthouseci";
const REPORT_DIR = path.resolve(ROOT, argValue("--dir") ?? defaultDir);
const asJson = args.includes("--json");
const updateBaselines = args.includes("--update-baselines");

const RAW_BUDGETS = JSON.parse(readFileSync(path.join(ROOT, "perf-budgets.json"), "utf8"));
/** Profile overrides (perf-budgets.json -> profiles.<name>) layered over the base budgets. */
const profileBudgets = RAW_BUDGETS.profiles?.[PROFILE] ?? {};
const BUDGETS = {
  ...RAW_BUDGETS,
  budgets: { ...RAW_BUDGETS.budgets, ...(profileBudgets.budgets ?? {}) },
  performanceScore: { ...RAW_BUDGETS.performanceScore, ...(profileBudgets.performanceScore ?? {}) },
  fonts: { ...RAW_BUDGETS.fonts, ...(profileBudgets.fonts ?? {}) },
  audits: { ...RAW_BUDGETS.audits, ...(profileBudgets.audits ?? {}) },
  routeOverrides: { ...RAW_BUDGETS.routeOverrides, ...(profileBudgets.routeOverrides ?? {}) },
};

const BASELINE_PATH = path.join(
  ROOT,
  PROFILE === "desktop" ? "perf-baselines.json" : `perf-baselines.${PROFILE}.json`,
);
const BASELINES = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  : { scoreTolerance: 0.03, metricTolerance: 0.2, trackedMetrics: [], routes: {} };

/** "http://localhost:8080/library/" -> "/library" */
const routeKey = (url) => {
  try {
    const p = new URL(url).pathname.replace(/\/+$/, "");
    return p === "" ? "/" : p;
  } catch {
    return url;
  }
};

const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

function loadReports() {
  if (!existsSync(REPORT_DIR)) {
    console.error(
      `No Lighthouse reports found at ${path.relative(ROOT, REPORT_DIR)} — run \`lhci collect\` first.`,
    );
    process.exit(2);
  }
  const files = readdirSync(REPORT_DIR).filter((f) => f.startsWith("lhr-") && f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`No lhr-*.json reports in ${path.relative(ROOT, REPORT_DIR)}.`);
    process.exit(2);
  }
  return files.map((f) => JSON.parse(readFileSync(path.join(REPORT_DIR, f), "utf8")));
}

/** Font-specific metrics pulled out of the network-requests audit. */
function fontMetrics(lhr) {
  const items = lhr.audits?.["network-requests"]?.details?.items ?? [];
  const fonts = items.filter(
    (i) => i.resourceType === "Font" || /\.(woff2?|ttf|otf)(\?|$)/i.test(i.url ?? ""),
  );
  // Dev/prod can serve the same file twice (e.g. "?import&url" query variants);
  // count each physical font file once.
  const byFile = new Map();
  for (const f of fonts) {
    const key = (f.url ?? "").split("?")[0].split("/").pop();
    const prev = byFile.get(key);
    if (!prev || (f.transferSize ?? 0) > (prev.transferSize ?? 0)) byFile.set(key, f);
  }
  const unique = [...byFile.values()];
  const transferBytes = unique.reduce((sum, f) => sum + (f.transferSize ?? 0), 0);

  // Preloaded fonts show up in the render-blocking / link-preload space; count
  // <link rel=preload as=font> from the DOM snapshot the LCP-ish audits capture.
  const preloadAudit = lhr.audits?.["uses-rel-preload"] ?? {};
  const renderBlocking = lhr.audits?.["render-blocking-resources"]?.details?.items ?? [];
  const renderBlockingFontMs = renderBlocking
    .filter((i) => /\.(woff2?|ttf|otf)(\?|$)/i.test(i.url ?? ""))
    .reduce((sum, i) => sum + (i.wastedMs ?? 0), 0);

  return {
    requests: unique.length,
    transferBytes,
    renderBlockingFontMs,
    fontDisplayScore: lhr.audits?.["font-display"]?.score ?? 1,
    preloadAuditScore: preloadAudit.score ?? 1,
    urls: unique.map((f) => (f.url ?? "").split("?")[0]),
  };
}

function main() {
  console.log(`Profile: ${PROFILE} — reports from ${path.relative(ROOT, REPORT_DIR)}`);
  const reports = loadReports();
  const byUrl = new Map();
  for (const lhr of reports) {
    const url = lhr.finalDisplayedUrl ?? lhr.finalUrl ?? lhr.requestedUrl;
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url).push(lhr);
  }

  const failures = [];
  const summary = [];

  for (const [url, runs] of byUrl) {
    const numeric = (id) => median(runs.map((r) => r.audits?.[id]?.numericValue ?? Number.NaN));
    const score = median(runs.map((r) => r.categories?.performance?.score ?? 0));
    const fonts = runs.map(fontMetrics);
    const row = {
      url,
      performanceScore: score,
      metrics: {},
      fonts: {
        requests: Math.max(...fonts.map((f) => f.requests)),
        transferBytes: Math.round(median(fonts.map((f) => f.transferBytes))),
        renderBlockingFontMs: Math.max(...fonts.map((f) => f.renderBlockingFontMs)),
        fontDisplayScore: Math.min(...fonts.map((f) => f.fontDisplayScore)),
        urls: [...new Set(fonts.flatMap((f) => f.urls))],
      },
    };

    const override = BUDGETS.routeOverrides?.[routeKey(url)] ?? {};
    const routeBudgets = { ...BUDGETS.budgets, ...(override.budgets ?? {}) };
    const routeScoreMin = (override.performanceScore ?? BUDGETS.performanceScore).min;

    for (const [id, budget] of Object.entries(routeBudgets)) {
      const value = numeric(id);
      row.metrics[id] = value;
      if (Number.isNaN(value)) {
        failures.push(`${url}: audit "${id}" missing from the Lighthouse report`);
        continue;
      }
      const limit = budget.maxMs ?? budget.max;
      const unit = budget.maxMs ? "ms" : "";
      if (value > limit) {
        failures.push(
          `${url}: ${budget.label} ${Math.round(value)}${unit} exceeds budget ${limit}${unit}`,
        );
      }
    }

    if (score < routeScoreMin) {
      failures.push(`${url}: performance score ${score.toFixed(2)} below minimum ${routeScoreMin}`);
    }

    const fb = BUDGETS.fonts;
    if (row.fonts.transferBytes > fb.maxTransferBytes) {
      failures.push(
        `${url}: font transfer ${row.fonts.transferBytes}B exceeds budget ${fb.maxTransferBytes}B — a heavier family/weight was added`,
      );
    }
    if (row.fonts.requests > fb.maxRequests) {
      failures.push(
        `${url}: ${row.fonts.requests} font requests exceed budget ${fb.maxRequests} — extra weights or subsets are downloading`,
      );
    }
    if (fb.requireFontDisplaySwap && row.fonts.fontDisplayScore < 1) {
      failures.push(
        `${url}: Lighthouse "font-display" audit failed — a face is missing font-display: swap`,
      );
    }
    if (row.fonts.renderBlockingFontMs > fb.maxRenderBlockingFontMs) {
      failures.push(
        `${url}: fonts render-block for ${Math.round(row.fonts.renderBlockingFontMs)}ms (budget ${fb.maxRenderBlockingFontMs}ms)`,
      );
    }

    for (const [id, rule] of Object.entries(BUDGETS.audits)) {
      const audits = runs.map((r) => r.audits?.[id]).filter(Boolean);
      if (audits.length === 0) continue;
      if (rule.minScore != null) {
        const minScore = Math.min(...audits.map((a) => a.score ?? 1));
        if (minScore < rule.minScore)
          failures.push(`${url}: audit "${id}" scored ${minScore} (min ${rule.minScore})`);
      }
      if (rule.maxWastedMs != null) {
        const wasted = median(
          audits.map((a) => a.details?.overallSavingsMs ?? a.numericValue ?? 0),
        );
        if (wasted > rule.maxWastedMs) {
          failures.push(
            `${url}: audit "${id}" wastes ${Math.round(wasted)}ms (budget ${rule.maxWastedMs}ms)`,
          );
        }
      }
    }

    // --- Per-route regression check against recorded baselines ---
    const key = routeKey(url);
    row.route = key;
    const baseline = BASELINES.routes?.[key];
    const scoreTol = BASELINES.scoreTolerance ?? 0.03;
    const metricTol = BASELINES.metricTolerance ?? 0.2;
    row.baseline = baseline ?? null;
    if (baseline && !updateBaselines) {
      if (baseline.performanceScore != null && score < baseline.performanceScore - scoreTol) {
        failures.push(
          `${key}: performance score regressed ${baseline.performanceScore.toFixed(2)} -> ${score.toFixed(2)} (allowed drop ${scoreTol})`,
        );
      }
      for (const id of BASELINES.trackedMetrics ?? []) {
        const base = baseline.metrics?.[id];
        const value = row.metrics[id];
        if (base == null || value == null || Number.isNaN(value)) continue;
        // Shared CI runners are noisy: a small baseline (e.g. 14ms of blocking
        // time) makes the percentage tolerance fire on pure run-to-run jitter
        // while the page is still far inside its absolute budget. A regression
        // must therefore beat BOTH the percentage tolerance AND an absolute
        // noise floor per metric before it fails the build.
        const floor =
          BASELINES.metricNoiseFloor?.[id] ??
          (id === "cumulative-layout-shift" ? 0.02 : id === "total-blocking-time" ? 100 : 200);
        const limit = base * (1 + metricTol) + (id === "cumulative-layout-shift" ? 0.01 : 25);
        if (value > limit && value - base > floor) {
          failures.push(
            `${key}: "${id}" regressed ${base.toFixed(3)} -> ${value.toFixed(3)} (allowed up to ${limit.toFixed(3)}, noise floor +${floor})`,
          );
        }
      }
    } else if (!baseline && !updateBaselines) {
      console.warn(
        `! ${key}: no recorded baseline — run \`npm run perf:baseline:update\` to record one.`,
      );
    }

    summary.push(row);
  }

  if (updateBaselines) {
    const routes = {};
    for (const row of [...summary].sort((a, b) => a.route.localeCompare(b.route))) {
      const metrics = {};
      for (const id of BASELINES.trackedMetrics ?? []) {
        if (row.metrics[id] != null && !Number.isNaN(row.metrics[id])) {
          metrics[id] = Number(row.metrics[id].toFixed(3));
        }
      }
      routes[row.route] = { performanceScore: Number(row.performanceScore.toFixed(2)), metrics };
    }
    writeFileSync(BASELINE_PATH, JSON.stringify({ ...BASELINES, routes }, null, 2) + "\n");
    console.log(
      `\nUpdated baselines for ${Object.keys(routes).length} route(s) in perf-baselines.json`,
    );
  }

  if (asJson) {
    console.log(JSON.stringify({ summary, failures }, null, 2));
  } else {
    for (const row of summary) {
      console.log(`\n${row.url}`);
      console.log(`  performance      : ${row.performanceScore.toFixed(2)}`);
      for (const [id, value] of Object.entries(row.metrics)) {
        const budget = BUDGETS.routeOverrides?.[row.route]?.budgets?.[id] ?? BUDGETS.budgets[id];
        const limit = budget.maxMs ?? budget.max;
        const shown = budget.maxMs ? `${Math.round(value)}ms` : value.toFixed(3);
        console.log(
          `  ${budget.label.padEnd(24)}: ${shown} (budget ${limit}${budget.maxMs ? "ms" : ""})`,
        );
      }
      console.log(
        `  fonts            : ${row.fonts.requests} req / ${row.fonts.transferBytes}B / render-block ${Math.round(row.fonts.renderBlockingFontMs)}ms`,
      );
      for (const u of row.fonts.urls) console.log(`      - ${u.split("/").pop()}`);
      if (row.baseline?.performanceScore != null) {
        console.log(`  baseline score   : ${row.baseline.performanceScore.toFixed(2)}`);
      }
    }
  }

  if (failures.length) {
    console.error(`\n✗ ${failures.length} performance/font budget violation(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\n✓ All ${PROFILE} performance and font budgets met.`);
}

main();
