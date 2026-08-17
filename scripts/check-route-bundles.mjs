/**
 * Per-route JS bundle-size regression check.
 *
 * Reads the TanStack Start server manifest emitted by `vite build`, resolves the
 * full set of client JS chunks each route downloads on first paint (root chunks +
 * every ancestor layout + the route itself), and measures raw + gzip bytes from
 * dist/client.
 *
 * Fails when a route grows past its recorded baseline (tolerance in
 * route-bundle-budgets.json) or past the hard per-route ceiling.
 *
 * Usage:
 *   node scripts/check-route-bundles.mjs            # assert
 *   node scripts/check-route-bundles.mjs --update   # rewrite baselines
 *   node scripts/check-route-bundles.mjs --json     # machine-readable report
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, "dist", "client");
const SERVER_DIR = path.join(ROOT, "dist", "server");
const BUDGETS_PATH = path.join(ROOT, "route-bundle-budgets.json");
const BASELINES_PATH = path.join(ROOT, "route-bundle-baselines.json");

const args = new Set(process.argv.slice(2));
const UPDATE = args.has("--update") || args.has("--update-baselines");
const JSON_OUT = args.has("--json");

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function findManifest() {
  if (!existsSync(SERVER_DIR)) return null;
  const hit = readdirSync(SERVER_DIR).find(
    (f) => f.startsWith("_tanstack-start-manifest") && f.endsWith(".mjs"),
  );
  return hit ? path.join(SERVER_DIR, hit) : null;
}

export function collectRouteAssets(routes, routeId) {
  // parent map from the children lists
  const parentOf = new Map();
  for (const [id, node] of Object.entries(routes)) {
    for (const child of node.children ?? []) parentOf.set(child, id);
  }
  const chain = [];
  let cursor = routeId;
  while (cursor) {
    chain.unshift(cursor);
    cursor = parentOf.get(cursor);
  }
  if (!chain.includes("__root__")) chain.unshift("__root__");

  const assets = new Set();
  for (const id of chain) {
    const node = routes[id];
    if (!node) continue;
    for (const p of node.preloads ?? []) if (p.endsWith(".js")) assets.add(p);
    for (const s of node.scripts ?? []) {
      const src = s?.attrs?.src;
      if (src && src.endsWith(".js")) assets.add(src);
    }
  }
  return [...assets].sort();
}

function measure(assets) {
  let raw = 0;
  let gzip = 0;
  const missing = [];
  for (const asset of assets) {
    const file = path.join(CLIENT_DIR, asset.replace(/^\//, ""));
    if (!existsSync(file) || !statSync(file).isFile()) {
      missing.push(asset);
      continue;
    }
    const buf = readFileSync(file);
    raw += buf.byteLength;
    gzip += gzipSync(buf, { level: 9 }).byteLength;
  }
  return { raw, gzip, missing, count: assets.length };
}

export function evaluate({ gzip, baseline, tolerancePct, slackBytes, hardMaxGzip }) {
  const problems = [];
  if (hardMaxGzip && gzip > hardMaxGzip) {
    problems.push(`over hard ceiling: ${kb(gzip)} > ${kb(hardMaxGzip)} gzip`);
  }
  if (typeof baseline === "number") {
    const allowed = Math.round(baseline * (1 + tolerancePct / 100)) + slackBytes;
    if (gzip > allowed) {
      problems.push(
        `regressed: ${kb(gzip)} > ${kb(allowed)} allowed (baseline ${kb(baseline)} +${tolerancePct}% +${kb(slackBytes)})`,
      );
    }
  }
  return problems;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function main() {
  if (!existsSync(CLIENT_DIR)) fail("dist/client missing — run `npm run build` first.");
  const manifestPath = findManifest();
  if (!manifestPath) fail("dist/server manifest missing — run `npm run build` first.");

  const budgets = readJson(BUDGETS_PATH);
  const baselines = existsSync(BASELINES_PATH) ? readJson(BASELINES_PATH) : { routes: {} };

  return import(pathToFileURL(manifestPath).href).then((mod) => {
    const routes = mod.tsrStartManifest().routes;
    const tracked = budgets.routes;
    const report = [];
    const failures = [];

    for (const [routeId, cfg] of Object.entries(tracked)) {
      if (!routes[routeId]) {
        failures.push(`${routeId}: not present in the build manifest (route removed or renamed?)`);
        continue;
      }
      const assets = collectRouteAssets(routes, routeId);
      const { raw, gzip, missing, count } = measure(assets);
      if (missing.length) {
        failures.push(`${routeId}: ${missing.length} chunk(s) referenced but not emitted`);
      }
      const baseline = baselines.routes?.[routeId]?.gzip;
      const tolerancePct = cfg.tolerancePct ?? budgets.defaults.tolerancePct;
      const slackBytes = cfg.slackBytes ?? budgets.defaults.slackBytes;
      const hardMaxGzip = cfg.maxGzipBytes ?? budgets.defaults.maxGzipBytes;

      const problems = UPDATE
        ? []
        : evaluate({ gzip, baseline, tolerancePct, slackBytes, hardMaxGzip });
      for (const p of problems) failures.push(`${routeId}: ${p}`);

      report.push({ routeId, label: cfg.label ?? routeId, chunks: count, raw, gzip, baseline });
    }

    report.sort((a, b) => b.gzip - a.gzip);

    if (JSON_OUT) {
      console.log(JSON.stringify({ routes: report, failures }, null, 2));
    } else {
      console.log("Per-route first-load JS (gzip):\n");
      for (const r of report) {
        const delta =
          typeof r.baseline === "number"
            ? ` (baseline ${kb(r.baseline)}, ${r.gzip - r.baseline >= 0 ? "+" : ""}${((r.gzip - r.baseline) / 1024).toFixed(1)} KB)`
            : "";
        console.log(
          `  ${r.label.padEnd(34)} ${kb(r.gzip).padStart(10)}  ${String(r.chunks).padStart(3)} chunks${delta}`,
        );
      }
      console.log("");
    }

    if (UPDATE) {
      const next = {
        "//": "Generated by `npm run bundles:baseline`. Per-route first-load JS in bytes. Lowering is free; raising needs a deliberate PR.",
        generatedAt: new Date().toISOString().slice(0, 10),
        routes: Object.fromEntries(
          report
            .slice()
            .sort((a, b) => a.routeId.localeCompare(b.routeId))
            .map((r) => [r.routeId, { gzip: r.gzip, raw: r.raw, chunks: r.chunks }]),
        ),
      };
      writeFileSync(BASELINES_PATH, `${JSON.stringify(next, null, 2)}\n`);
      console.log(`✔ Baselines written to route-bundle-baselines.json (${report.length} routes).`);
      return;
    }

    if (failures.length) {
      console.error("Bundle-size regressions:\n");
      for (const f of failures) console.error(`  ✖ ${f}`);
      console.error(
        "\nFix the route's imports (lazy-load heavy widgets), or run `npm run bundles:baseline` if the growth is intentional.",
      );
      process.exit(1);
    }
    console.log("✔ All tracked routes are within their bundle budgets.");
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => fail(err?.stack || String(err)));
}
