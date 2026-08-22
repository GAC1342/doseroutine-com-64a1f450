#!/usr/bin/env node
/**
 * Runs the iOS + Android device smoke specs and writes a compact summary that
 * /admin/device-smoke renders, so hardware verification starts from the last
 * real run instead of hand-maintained prose.
 *
 * Usage: node scripts/collect-device-smoke.mjs [--from <playwright-json>]
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SPECS = [
  "e2e/ios-keyboard-device-smoke.spec.ts",
  "e2e/android-keyboard-device-smoke.spec.ts",
];
const RAW = path.join("test-results", "device-smoke.json");
const OUT = path.join("src", "data", "device-smoke-results.json");

function platformFor(file) {
  return /android/i.test(file) ? "android" : "ios";
}

/** "iPad docked (landscape): …" → the device profile in the parentheses. */
function profileFor(title) {
  const m = /^([^:]+):/.exec(title);
  return (m ? m[1] : "general").trim();
}

function flatten(suite, file, out) {
  for (const spec of suite.specs ?? []) {
    const result = spec.tests?.[0]?.results?.[0];
    const failing = (result?.errors ?? [])[0];
    out.push({
      platform: platformFor(file),
      profile: profileFor(spec.title),
      title: spec.title,
      ok: Boolean(spec.ok),
      status: result?.status ?? "unknown",
      durationMs: result?.duration ?? 0,
      file,
      line: spec.line ?? 0,
      error: failing?.message ? String(failing.message).split("\n").slice(0, 4).join("\n") : null,
    });
  }
  for (const child of suite.suites ?? []) flatten(child, child.file ?? file, out);
}

function run() {
  const fromIndex = process.argv.indexOf("--from");
  let raw;
  if (fromIndex !== -1) {
    raw = JSON.parse(readFileSync(process.argv[fromIndex + 1], "utf8"));
  } else {
    mkdirSync("test-results", { recursive: true });
    try {
      execFileSync("npx", ["playwright", "test", ...SPECS, "--reporter=json"], {
        stdio: ["ignore", "pipe", "inherit"],
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: RAW },
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      // A failing run is still a run — we want the failures in the report.
    }
    raw = JSON.parse(readFileSync(RAW, "utf8"));
  }

  const assertions = [];
  for (const suite of raw.suites ?? []) flatten(suite, suite.file ?? "", assertions);

  const summary = {
    generatedAt: new Date().toISOString(),
    total: assertions.length,
    passed: assertions.filter((a) => a.ok).length,
    failed: assertions.filter((a) => !a.ok).length,
    assertions,
  };

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`device smoke: ${summary.passed}/${summary.total} passing → ${OUT}`);
  return summary.failed === 0 ? 0 : 1;
}

process.exit(run());
