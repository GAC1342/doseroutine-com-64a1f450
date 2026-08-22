#!/usr/bin/env node
/**
 * Fail when the installed node_modules tree has drifted from package-lock.json.
 *
 * `npm ci` guarantees a tree that matches the lockfile exactly, but a developer
 * (or a partially-cached CI job) can end up with node_modules that no longer
 * matches — the classic "works on my machine" failure. This check compares the
 * version actually on disk for every locked dependency against the version the
 * lockfile pins, and prints the exact install command to repair the drift.
 *
 * Usage:
 *   node scripts/check-node-modules-sync.mjs            # fail on drift
 *   node scripts/check-node-modules-sync.mjs --warn     # report only, exit 0
 *   node scripts/check-node-modules-sync.mjs --json out.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const argv = process.argv.slice(2);
const warnOnly = argv.includes("--warn");
const jsonIndex = argv.indexOf("--json");
const jsonFile = jsonIndex >= 0 ? argv[jsonIndex + 1] : null;

/** The one repair command we tell everyone to run. Keep this single-sourced. */
export const INSTALL_COMMAND = "npm ci";

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** npm's os/cpu fields allow negation ("!win32"); mirror that matching. */
export function matchesConstraint(list, value) {
  const negated = list.filter((v) => v.startsWith("!"));
  if (negated.length) return !negated.some((v) => v.slice(1) === value);
  return list.includes(value);
}

/**
 * Compare a lockfile's `packages` map against installed package.json files.
 * `readInstalled(dir)` returns the parsed package.json at a lock path, or null.
 */
export function compare(lock, readInstalled, env = {}) {
  const problems = [];
  const packages = lock?.packages ?? {};
  const platform = env.platform ?? process.platform;
  const arch = env.arch ?? process.arch;
  let checked = 0;

  for (const [lockPath, entry] of Object.entries(packages)) {
    // "" is the root project itself; it has no installed copy to compare.
    if (!lockPath.startsWith("node_modules/")) continue;
    // Link entries point elsewhere in the workspace and carry no version.
    if (entry.link) continue;
    if (!entry.version) continue;
    // Optional deps (and platform-specific binaries such as @esbuild/darwin-x64)
    // are legitimately absent on this machine — npm skips them by design.
    if (entry.optional) continue;
    if (Array.isArray(entry.os) && !matchesConstraint(entry.os, platform)) continue;
    if (Array.isArray(entry.cpu) && !matchesConstraint(entry.cpu, arch)) continue;

    checked += 1;
    let installed = readInstalled(lockPath);
    if (!installed && lockPath.lastIndexOf("node_modules/") > 0) {
      // npm may hoist a nested dependency to the top level; the tree is still
      // equivalent as long as the hoisted copy is the locked version.
      const name = lockPath.slice(lockPath.lastIndexOf("node_modules/"));
      const hoisted = readInstalled(name);
      if (hoisted?.version === entry.version) continue;
    }
    if (!installed) {
      problems.push({ name: lockPath, kind: "missing", expected: entry.version, actual: null });
      continue;
    }
    if (installed.version !== entry.version) {
      problems.push({
        name: lockPath,
        kind: "version-mismatch",
        expected: entry.version,
        actual: installed.version ?? null,
      });
    }
  }

  return { checked, problems };
}

function main() {
  const lockPath = path.join(root, "package-lock.json");
  const lock = readJson(lockPath);
  if (!lock) {
    console.error(
      "❌ package-lock.json is missing or unreadable — run `npm install` and commit it.",
    );
    process.exit(warnOnly ? 0 : 1);
  }
  if (!fs.existsSync(path.join(root, "node_modules"))) {
    console.error(`❌ node_modules is missing. Run \`${INSTALL_COMMAND}\`.`);
    process.exit(warnOnly ? 0 : 1);
  }

  const { checked, problems } = compare(lock, (lockPath) =>
    readJson(path.join(root, lockPath, "package.json")),
  );

  const missing = problems.filter((p) => p.kind === "missing");
  const mismatched = problems.filter((p) => p.kind === "version-mismatch");

  const lines = [];
  lines.push("## node_modules vs package-lock.json", "");
  if (problems.length === 0) {
    lines.push(`✅ All ${checked} locked packages are installed at the pinned version.`);
  } else {
    lines.push(
      `❌ ${problems.length} of ${checked} locked packages are out of sync ` +
        `(${missing.length} missing, ${mismatched.length} wrong version).`,
      "",
      "| Package | Locked | Installed |",
      "|---|---|---|",
    );
    for (const p of problems.slice(0, 40)) {
      lines.push(
        `| \`${p.name.replace(/^node_modules\//, "")}\` | ${p.expected} | ${p.actual ?? "_missing_"} |`,
      );
    }
    if (problems.length > 40) lines.push(`| _…and ${problems.length - 40} more_ | | |`);
    lines.push(
      "",
      "Fix with the same install command CI uses:",
      "",
      "```sh",
      INSTALL_COMMAND,
      "```",
    );
  }

  const report = lines.join("\n");
  console.log(report);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `in_sync=${problems.length ? "false" : "true"}\ninstall_command=${INSTALL_COMMAND}\n`,
    );
  }
  if (jsonFile) {
    fs.writeFileSync(
      path.resolve(root, jsonFile),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), checked, problems, installCommand: INSTALL_COMMAND }, null, 2)}\n`,
    );
  }

  process.exit(problems.length && !warnOnly ? 1 : 0);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
