#!/usr/bin/env node
/**
 * Runs a Playwright spec across the engines that this machine can actually
 * drive, instead of hardcoding `--project=chromium --project=firefox
 * --project=webkit` and failing on whichever engine the local image lacks.
 *
 * Behaviour:
 *   - probes each requested engine (scripts/check-playwright-browsers.mjs),
 *   - drops unusable ones with a loud warning locally,
 *   - fails instead of dropping when CI=1 or E2E_STRICT_BROWSERS=1, because a
 *     silently skipped engine in CI is a false green.
 *
 * Usage:
 *   node scripts/run-e2e.mjs e2e/foo.spec.ts --projects=chromium,firefox,webkit [-- extra playwright args]
 *   node scripts/run-e2e.mjs e2e/foo.spec.ts --projects=all --update-snapshots
 */
import { spawnSync } from "node:child_process";

const DEFAULT_PROJECTS = ["chromium", "firefox", "webkit"];
/** Playwright projects that are not their own engine. */
const ENGINE_OF = {
  "mobile-safari": "webkit",
  chromium: "chromium",
  firefox: "firefox",
  webkit: "webkit",
};

const argv = process.argv.slice(2);
const specs = argv.filter((a) => !a.startsWith("-"));
const projectsArg = argv.find((a) => a.startsWith("--projects="));
const passthrough = argv.filter((a) => a.startsWith("-") && !a.startsWith("--projects="));

const requested =
  !projectsArg || projectsArg.endsWith("=all")
    ? DEFAULT_PROJECTS
    : projectsArg
        .slice("--projects=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

const strict = Boolean(process.env.CI || process.env.E2E_STRICT_BROWSERS);
const engines = [...new Set(requested.map((p) => ENGINE_OF[p] ?? p))];

const probe = spawnSync(
  process.execPath,
  ["scripts/check-playwright-browsers.mjs", "--json", `--engines=${engines.join(",")}`],
  { encoding: "utf8" },
);
let usable = new Set(engines);
try {
  const parsed = JSON.parse(probe.stdout);
  usable = new Set(parsed.results.filter((r) => r.ok).map((r) => r.engine));
  for (const r of parsed.results.filter((x) => !x.ok)) {
    console.warn(
      `[run-e2e] ${r.engine} unusable — ${r.reason}\n           fix: ${r.hint ?? "n/a"}`,
    );
  }
} catch {
  console.warn("[run-e2e] browser probe failed to report; running every requested project");
}

const runnable = requested.filter((p) => usable.has(ENGINE_OF[p] ?? p));
const skipped = requested.filter((p) => !runnable.includes(p));

if (skipped.length > 0) {
  if (strict) {
    console.error(
      `[run-e2e] refusing to skip ${skipped.join(", ")} (CI/E2E_STRICT_BROWSERS). ` +
        `Install them with: npx playwright install --with-deps ${skipped.join(" ")}`,
    );
    process.exit(1);
  }
  console.warn(`[run-e2e] skipping locally-unavailable projects: ${skipped.join(", ")}`);
}

if (runnable.length === 0) {
  console.error("[run-e2e] no usable browsers for this run");
  process.exit(1);
}

const args = [
  "playwright",
  "test",
  ...specs,
  ...runnable.map((p) => `--project=${p}`),
  "--reporter=list",
  ...passthrough,
];
console.log(`[run-e2e] npx ${args.join(" ")}`);
const result = spawnSync("npx", args, { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
