#!/usr/bin/env node
/**
 * One command to re-record screenshot baselines after an *intentional*
 * rendering change.
 *
 * Discovers every e2e spec that takes screenshots (`toHaveScreenshot(` or the
 * `expectVisualSnapshot(` wrapper), re-runs them with `--update-snapshots`, and
 * reports exactly which baseline PNGs were added or changed so you can review
 * the diff before committing.
 *
 * Usage:
 *   node scripts/update-visual-baselines.mjs                  # every spec, default projects
 *   node scripts/update-visual-baselines.mjs --spec mint      # substring filter on spec name
 *   node scripts/update-visual-baselines.mjs --project chromium
 *   node scripts/update-visual-baselines.mjs --docker         # CI-identical image (matches CI pixels)
 *   node scripts/update-visual-baselines.mjs --dry-run        # show the plan, change nothing
 *
 * Safety: refuses to run under CI unless ALLOW_BASELINE_UPDATE=1, so a CI job
 * can never silently rewrite baselines and turn a real regression green.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const E2E_DIR = "e2e";
const OUT_JSON = "test-results/visual-baseline-update.json";
const DEFAULT_PROJECTS = ["chromium", "firefox", "webkit"];
const SCREENSHOT_RE = /\b(toHaveScreenshot|expectVisualSnapshot)\s*\(/;

function parseArgs(argv) {
  const opts = {
    specs: [],
    projects: [],
    docker: false,
    dryRun: false,
    help: false,
    passthrough: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const take = (inline) => (inline !== undefined ? inline : argv[++i]);
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--docker") opts.docker = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--spec"))
      opts.specs.push(
        ...String(take(arg.split("=")[1]) ?? "")
          .split(",")
          .filter(Boolean),
      );
    else if (arg.startsWith("--project"))
      opts.projects.push(
        ...String(take(arg.split("=")[1]) ?? "")
          .split(",")
          .filter(Boolean),
      );
    else if (arg.startsWith("-")) opts.passthrough.push(arg);
    else opts.specs.push(arg);
  }
  return opts;
}

function usage() {
  console.log(
    [
      "Update Playwright screenshot baselines after an intentional rendering change.",
      "",
      "  node scripts/update-visual-baselines.mjs [--spec <name>] [--project <name>]",
      "                                          [--docker] [--dry-run]",
      "",
      "  --spec <name>     substring match on the spec filename (repeatable, comma-separated)",
      "  --project <name>  Playwright project (default: chromium,firefox,webkit)",
      "  --docker          run inside the CI-identical Docker image",
      "  --dry-run         print what would be re-recorded, change nothing",
    ].join("\n"),
  );
}

/** Every e2e spec that actually compares screenshots. */
function discoverVisualSpecs() {
  return readdirSync(E2E_DIR)
    .filter((f) => f.endsWith(".spec.ts"))
    .filter((f) => SCREENSHOT_RE.test(readFileSync(join(E2E_DIR, f), "utf8")))
    .map((f) => join(E2E_DIR, f))
    .sort();
}

/** All committed baseline PNGs, keyed by path -> sha1. */
function snapshotBaselines() {
  const map = new Map();
  if (!existsSync(E2E_DIR)) return map;
  const dirs = readdirSync(E2E_DIR).filter(
    (d) => d.endsWith("-snapshots") && statSync(join(E2E_DIR, d)).isDirectory(),
  );
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".png")) {
        map.set(relative(".", full), createHash("sha1").update(readFileSync(full)).digest("hex"));
      }
    }
  };
  for (const d of dirs) walk(join(E2E_DIR, d));
  return map;
}

function specKey(specPath) {
  return specPath.replace(/^e2e\//, "").replace(/\.spec\.ts$/, "");
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  usage();
  process.exit(0);
}

if (process.env.CI && process.env.ALLOW_BASELINE_UPDATE !== "1") {
  console.error(
    "[visual-update] refusing to rewrite baselines under CI.\n" +
      "                Baseline updates are a deliberate local action — a CI rewrite would\n" +
      "                turn a real visual regression green. Set ALLOW_BASELINE_UPDATE=1 to override.",
  );
  process.exit(1);
}

const allSpecs = discoverVisualSpecs();
if (allSpecs.length === 0) {
  console.error("[visual-update] no e2e specs take screenshots — nothing to update.");
  process.exit(1);
}

const specs =
  opts.specs.length === 0
    ? allSpecs
    : allSpecs.filter((s) => opts.specs.some((f) => s.includes(f)));

if (specs.length === 0) {
  console.error(
    `[visual-update] no visual spec matches ${opts.specs.join(", ")}.\n` +
      `                available: ${allSpecs.map(specKey).join(", ")}`,
  );
  process.exit(1);
}

const projects = opts.projects.length > 0 ? opts.projects : DEFAULT_PROJECTS;

console.log("[visual-update] specs:    " + specs.map(specKey).join(", "));
console.log("[visual-update] projects: " + projects.join(", "));
console.log("[visual-update] runner:   " + (opts.docker ? "docker (CI-identical image)" : "local"));

if (opts.dryRun) {
  console.log("[visual-update] dry run — no baselines were touched.");
  process.exit(0);
}

const before = snapshotBaselines();

let result;
if (opts.docker) {
  const args = [
    "scripts/docker-e2e.sh",
    "--update-snapshots",
    "--reporter=list",
    ...specs,
    ...projects.map((p) => `--project=${p}`),
    ...opts.passthrough,
  ];
  console.log(`[visual-update] bash ${args.join(" ")}`);
  result = spawnSync("bash", args, { stdio: "inherit", env: process.env });
} else {
  const args = [
    "scripts/run-e2e.mjs",
    ...specs,
    `--projects=${projects.join(",")}`,
    "--update-snapshots",
    ...opts.passthrough,
  ];
  console.log(`[visual-update] node ${args.join(" ")}`);
  result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
}

const runStatus = result.status ?? 1;

const after = snapshotBaselines();
const added = [...after.keys()].filter((p) => !before.has(p)).sort();
const changed = [...after.keys()]
  .filter((p) => before.has(p) && before.get(p) !== after.get(p))
  .sort();
const removed = [...before.keys()].filter((p) => !after.has(p)).sort();
const unchanged = after.size - added.length - changed.length;

// A requested spec that produced no baselines at all almost always means it
// never ran (missing browser, filtered out, skipped) — that's a silent no-op.
const emptySpecs = specs.filter((s) => {
  const dir = `${s}-snapshots`;
  return ![...after.keys()].some((p) => p.startsWith(dir));
});

console.log("");
console.log("[visual-update] baseline summary");
console.log(`  added:     ${added.length}`);
console.log(`  changed:   ${changed.length}`);
console.log(`  removed:   ${removed.length}`);
console.log(`  unchanged: ${unchanged}`);
for (const p of added) console.log(`  + ${p}`);
for (const p of changed) console.log(`  ~ ${p}`);
for (const p of removed) console.log(`  - ${p}`);
if (added.length + changed.length > 0) {
  console.log("\n  Review the images above, then commit them alongside the rendering change.");
} else {
  console.log(
    "\n  No baseline pixels moved — the rendering change may not affect these snapshots.",
  );
}

mkdirSync("test-results", { recursive: true });
writeFileSync(
  OUT_JSON,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      runner: opts.docker ? "docker" : "local",
      specs: specs.map(specKey),
      projects,
      playwrightExitCode: runStatus,
      added,
      changed,
      removed,
      unchanged,
      specsWithoutBaselines: emptySpecs.map(specKey),
    },
    null,
    2,
  )}\n`,
);
console.log(`\n[visual-update] wrote ${OUT_JSON}`);

if (emptySpecs.length > 0) {
  console.error(
    `\n[visual-update] these specs produced no baselines — they probably never ran: ${emptySpecs
      .map(specKey)
      .join(", ")}`,
  );
  process.exit(1);
}

process.exit(runStatus === 0 ? 0 : runStatus);
