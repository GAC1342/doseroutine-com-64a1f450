#!/usr/bin/env node
/**
 * Local reproducer for CodeMagic's post-build icon gates.
 *
 * Runs against one or more user-supplied .xcarchive / .ipa / .app targets
 * the same three checks CI runs before uploading to TestFlight:
 *
 *   1) ARCHIVE_MATCHES_GENERATOR_GATE_PASSED   — archive icons vs a fresh
 *      regeneration from scripts/force-ios-app-icons.mjs
 *   2) APPICON_SET_PIXEL_MATCH_GATE_PASSED     — per-slot pixel diff vs the
 *      committed AppIcon.appiconset
 *   3) ASSETS_CAR_APPICON_CATALOG_GATE_PASSED  — Assets.car contains every
 *      Apple slot including the 1024×1024 marketing icon
 *
 * Usage:
 *   npm run verify:archive -- path/to/App.xcarchive
 *   npm run verify:archive -- build/ios/ipa/App.ipa
 *   npm run verify:archive -- App.xcarchive build/ios/ipa/App.ipa other.app
 *   npm run verify:archive -- --report=my-report.json App.xcarchive
 *
 * Exits 0 only if every gate passes against every target. Requires macOS
 * for iconutil/assetutil (same as CodeMagic).
 *
 * On completion (pass or fail) writes a combined JSON report at
 *   ./verify-archive-report.json      (default)
 * or the path given via `--report=<path>`. The report lists every gate's
 * per-slot pixel/diff results so mismatched icon slots are pinpointable
 * without re-parsing stdout.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const rawArgs = process.argv.slice(2);
const flagArgs = rawArgs.filter((a) => a.startsWith("-"));
const positional = rawArgs.filter((a) => !a.startsWith("-"));

let reportPath = resolve(process.cwd(), "verify-archive-report.json");
let failFast = false;
for (const f of flagArgs) {
  if (f === "--help" || f === "-h") {
    console.log(
      "Usage: npm run verify:archive -- [--report=<path>] [--fail-fast] <target> [additional targets...]\n" +
        "  target: .xcarchive | .ipa | .app\n" +
        "  --fail-fast, -x   stop after the first failing gate/slot (skip remaining gates and targets)",
    );
    process.exit(0);
  }
  if (f === "--fail-fast" || f === "-x") {
    failFast = true;
    continue;
  }
  const m = f.match(/^--report(?:=(.+))?$/);
  if (m) {
    if (!m[1]) {
      console.error("FAIL — --report requires a path (e.g. --report=out.json).");
      process.exit(2);
    }
    reportPath = resolve(process.cwd(), m[1]);
    continue;
  }
  console.error(`FAIL — unknown flag: ${f}`);
  process.exit(2);
}

if (positional.length === 0) {
  console.error(
    "Usage: npm run verify:archive -- [--report=<path>] <target.xcarchive|.ipa|.app> [more...]",
  );
  process.exit(2);
}

function classify(p) {
  return p.endsWith(".xcarchive")
    ? ".xcarchive"
    : p.endsWith(".ipa")
      ? ".ipa"
      : p.endsWith(".app")
        ? ".app"
        : null;
}

// Resolve + validate every target up-front so we fail fast on bad input
// before spending time running gates against valid ones.
const targets = [];
const inputErrors = [];
for (const arg of positional) {
  const abs = resolve(process.cwd(), arg);
  if (!existsSync(abs)) {
    inputErrors.push(`  ✗ not found: ${arg}`);
    continue;
  }
  const kind = classify(abs);
  if (!kind) {
    inputErrors.push(`  ✗ must end in .xcarchive/.ipa/.app: ${arg}`);
    continue;
  }
  try {
    const st = statSync(abs);
    if (kind === ".ipa" ? !st.isFile() : !st.isDirectory()) {
      inputErrors.push(`  ✗ ${arg} is not a ${kind === ".ipa" ? "file" : "directory"}`);
      continue;
    }
  } catch (e) {
    inputErrors.push(`  ✗ cannot stat ${arg}: ${e.message}`);
    continue;
  }
  targets.push({ display: arg, path: abs, kind });
}

if (inputErrors.length) {
  console.error("FAIL — invalid target(s):");
  for (const e of inputErrors) console.error(e);
  process.exit(1);
}

if (platform() !== "darwin") {
  console.warn(
    "WARNING: not running on macOS — iconutil/assetutil are unavailable, so ASSETS_CAR and Assets.car-extraction checks will fail. Run this on the same macOS environment CodeMagic uses.",
  );
}

// Each gate writes its own JSON alongside stdout. We give each (target, gate)
// pair a unique report dir under a tmp scratch space and load the JSON back
// after the process exits, then aggregate.
const scratch = mkdtempSync(join(tmpdir(), "dr-verify-archive-"));

const gates = [
  {
    key: "archive_matches_generator",
    label: "1/3 ARCHIVE_MATCHES_GENERATOR_GATE",
    script: "scripts/verify-archive-matches-generator.mjs",
    envVar: "ARCHIVE_MATCHES_GENERATOR_REPORT_DIR",
    jsonName: "archive-matches-generator.json",
  },
  {
    key: "appicon_set_pixel_match",
    label: "2/3 APPICON_SET_PIXEL_MATCH_GATE",
    script: "scripts/verify-appicon-set-pixel-match.mjs",
    envVar: "APPICON_SET_REPORT_DIR",
    jsonName: "appicon-set-match.json",
  },
  {
    key: "assets_car_appicon",
    label: "3/3 ASSETS_CAR_APPICON_CATALOG_GATE",
    script: "scripts/verify-assets-car-appicon.mjs",
    envVar: "ASSETS_CAR_REPORT_DIR",
    jsonName: "assets-car-appicon.json",
  },
];

console.log(`=== DoseRoutine local archive gate reproducer ===`);
console.log(`Targets (${targets.length}):`);
for (const t of targets) console.log(`  • ${t.display}  [${t.kind}]`);
console.log(`Combined JSON report will be written to: ${reportPath}`);
if (failFast) console.log(`Fail-fast mode: will stop after the first failing gate/slot.`);

function safeSlug(s) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}
function loadJson(p) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    return { _loadError: e.message };
  }
}

const runStartedAt = new Date().toISOString();
const perTarget = [];
let aborted = false;
let abortReason = null;

outer: for (const target of targets) {
  console.log(`\n────────────────────────────────────────────────────────`);
  console.log(`▶ Target: ${target.display}`);
  console.log(`────────────────────────────────────────────────────────`);

  const targetSlug = safeSlug(basename(target.path));
  const gateResults = [];

  for (const gate of gates) {
    const gateDir = join(scratch, targetSlug, gate.key);
    mkdirSync(gateDir, { recursive: true });
    console.log(`\n  ▶ ${gate.label} — ${gate.script}`);
    const env = {
      ...process.env,
      [gate.envVar]: gateDir,
      // Child gates that support it should stop at the first failing slot.
      VERIFY_FAIL_FAST: failFast ? "1" : "",
    };
    const r = spawnSync("node", [gate.script, target.path], {
      stdio: "inherit",
      env,
    });
    const ok = r.status === 0;
    const jsonPath = join(gateDir, gate.jsonName);
    const json = existsSync(jsonPath) ? loadJson(jsonPath) : null;
    gateResults.push({
      key: gate.key,
      label: gate.label,
      script: gate.script,
      exitCode: r.status,
      passed: ok,
      jsonReportPath: existsSync(jsonPath) ? jsonPath : null,
      details: json,
    });
    if (ok) {
      console.log(`  ✓ ${gate.label} passed for ${target.display}.`);
    } else {
      console.error(`  ✗ ${gate.label} FAILED for ${target.display} (exit ${r.status}).`);
      if (failFast) {
        aborted = true;
        abortReason = `${gate.label} failed for ${target.display} (exit ${r.status})`;
        perTarget.push({
          target: target.display,
          absolutePath: target.path,
          kind: target.kind,
          passed: false,
          gates: gateResults,
          aborted: true,
        });
        console.error(`\n⏹  Fail-fast: aborting remaining gates and targets. ${abortReason}`);
        break outer;
      }
    }
  }

  perTarget.push({
    target: target.display,
    absolutePath: target.path,
    kind: target.kind,
    passed: gateResults.every((g) => g.passed),
    gates: gateResults,
  });
}

const skippedTargets = targets.length - perTarget.length;

// ---- Combined summary + JSON report ---------------------------------------
console.log("\n=== Combined result summary ===");
const width = Math.max(...targets.map((t) => t.display.length), 6);
for (const t of perTarget) {
  const failed = t.gates.filter((g) => !g.passed);
  const suffix = t.aborted ? " [ABORTED]" : "";
  const status =
    failed.length === 0 ? "PASS" : `FAIL (${failed.length}/${t.gates.length})${suffix}`;
  console.log(`  ${t.target.padEnd(width)}  ${status}`);
  for (const f of failed) {
    console.log(`      ✗ ${f.label} (exit ${f.exitCode})`);
    const rows = Array.isArray(f.details?.rows) ? f.details.rows : [];
    let printedSlots = 0;
    for (const r of rows) {
      if (r.pass === false) {
        const dim = r.dim ? `${r.dim}×${r.dim}` : "";
        const numbers =
          r.meanAbs != null
            ? ` meanAbs=${Number(r.meanAbs).toFixed(2)} rms=${Number(r.rms).toFixed(2)} worst=${r.worst}`
            : "";
        console.log(
          `          · slot ${dim} ${r.actual || r.file || ""} vs ${r.expected || "?"}${numbers} — ${r.reason || "mismatch"}`,
        );
        printedSlots++;
        if (failFast) break; // only show the first failing slot in fail-fast mode
      }
    }
    for (const err of f.details?.errors || []) {
      console.log(`          · ${err}`);
      if (failFast) break;
    }
    if (failFast && printedSlots === 0 && !f.details?.errors?.length) {
      // nothing structured — fall through
    }
  }
}
if (skippedTargets > 0) {
  console.log(
    `  (${skippedTargets} target${skippedTargets === 1 ? "" : "s"} skipped due to --fail-fast)`,
  );
}

const totalGateRuns = perTarget.reduce((n, t) => n + t.gates.length, 0);
const totalFailed = perTarget.reduce((n, t) => n + t.gates.filter((g) => !g.passed).length, 0);

const combined = {
  tool: "verify-archive-local",
  version: 2,
  startedAt: runStartedAt,
  finishedAt: new Date().toISOString(),
  cwd: process.cwd(),
  platform: platform(),
  failFast,
  aborted,
  abortReason,
  skippedTargets,
  overallPassed: totalFailed === 0 && !aborted,
  totalTargets: targets.length,
  totalGateRuns,
  totalFailedGateRuns: totalFailed,
  reportPath,
  targets: perTarget,
};

try {
  mkdirSync(resolve(reportPath, ".."), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(combined, null, 2));
  console.log(`\nCombined JSON report written: ${reportPath}`);
} catch (e) {
  console.error(`WARNING: could not write combined report to ${reportPath}: ${e.message}`);
}

// Keep the per-gate scratch dir around when anything failed so the user can
// inspect raw per-gate JSON/Markdown; delete it on full success.
if (totalFailed === 0) {
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
} else {
  console.log(`Per-gate raw reports preserved under: ${scratch}`);
}

console.log("");
if (totalFailed) {
  console.error(
    `FAIL — ${totalFailed} of ${totalGateRuns} gate runs failed across ${perTarget.length} target(s)` +
      (aborted ? ` (aborted early via --fail-fast; ${skippedTargets} target(s) skipped)` : "") +
      `. Inspect ${reportPath} (targets[].gates[].details.rows / .errors) to pinpoint mismatched icon slots.`,
  );
  process.exit(1);
}

console.log(
  `OK — all ${totalGateRuns} gate runs (${gates.length} gates × ${targets.length} target${targets.length === 1 ? "" : "s"}) passed.`,
);
console.log("Matches the CodeMagic pre-upload sequence; safe to trigger a build.");
