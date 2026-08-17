#!/usr/bin/env node
/**
 * Runs `xcodebuild -showBuildSettings` for every build configuration of the
 * App target and fails if the *resolved* ASSETCATALOG_COMPILER_APPICON_NAME
 * is not "AppIcon". This catches xcconfig overrides, per-configuration
 * changes, and stale project state that a static pbxproj grep would miss.
 *
 * Skips (with a warning, exit 0) when Xcode is unavailable — e.g. Linux CI
 * boxes or the Lovable sandbox. The GitHub Actions workflow runs on macOS,
 * so the gate fires there.
 *
 * Success sentinel: XCODEBUILD_APPICON_NAME_GATE_PASSED
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const projectPath = resolve(process.cwd(), "ios/App/App.xcodeproj");
const target = "App";
const configurations = ["Debug", "Release"];
const expected = "AppIcon";

function warnSkip(reason) {
  console.warn(`SKIP — xcodebuild AppIcon-name gate: ${reason}`);
  console.log("XCODEBUILD_APPICON_NAME_GATE_SKIPPED");
  process.exit(0);
}

if (platform() !== "darwin") warnSkip(`not running on macOS (platform=${platform()})`);
if (!existsSync(projectPath)) warnSkip(`${projectPath} not found`);
const which = spawnSync("xcodebuild", ["-version"], { encoding: "utf8" });
if (which.status !== 0) warnSkip("xcodebuild not available in PATH");

const errors = [];
const info = [`Xcode: ${which.stdout.trim().split("\n").join(" | ")}`];

for (const configuration of configurations) {
  const args = [
    "-project",
    projectPath,
    "-target",
    target,
    "-configuration",
    configuration,
    "-showBuildSettings",
    "-json",
  ];
  const result = spawnSync("xcodebuild", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    errors.push(
      `xcodebuild -showBuildSettings failed for ${configuration}: ${result.stderr.trim().slice(-500)}`,
    );
    continue;
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (e) {
    const jsonStart = result.stdout.indexOf("[");
    const jsonEnd = result.stdout.lastIndexOf("]");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      try {
        parsed = JSON.parse(result.stdout.slice(jsonStart, jsonEnd + 1));
      } catch (inner) {
        errors.push(`Could not parse xcodebuild JSON for ${configuration}: ${inner.message}`);
        continue;
      }
    } else {
      errors.push(`Could not parse xcodebuild JSON for ${configuration}: ${e.message}`);
      continue;
    }
  }
  const entries = Array.isArray(parsed) ? parsed : [];
  if (entries.length === 0) {
    errors.push(`xcodebuild returned no build-settings entries for ${configuration}.`);
    continue;
  }
  for (const entry of entries) {
    const targetName = entry.target ?? "(unknown)";
    const settings = entry.buildSettings ?? {};
    const actual = settings.ASSETCATALOG_COMPILER_APPICON_NAME;
    if (actual === undefined) {
      errors.push(
        `${configuration}/${targetName}: ASSETCATALOG_COMPILER_APPICON_NAME is unset (must be "${expected}").`,
      );
      continue;
    }
    if (actual !== expected) {
      errors.push(
        `${configuration}/${targetName}: ASSETCATALOG_COMPILER_APPICON_NAME="${actual}"; expected "${expected}".`,
      );
      continue;
    }
    info.push(`${configuration}/${targetName}: ASSETCATALOG_COMPILER_APPICON_NAME=${actual} ✓`);
  }
}

console.log("=== xcodebuild AppIcon-name gate ===");
for (const line of info) console.log(line);

if (errors.length) {
  console.error(
    "\nFAIL — resolved ASSETCATALOG_COMPILER_APPICON_NAME is wrong for at least one configuration:",
  );
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    "\nFix in Xcode: Target App → Build Settings → Asset Catalog Compiler - Options → Primary App Icon Set Name = AppIcon (All Configurations). Also check any .xcconfig overrides.",
  );
  process.exit(1);
}

console.log(
  `OK — every configuration resolves ASSETCATALOG_COMPILER_APPICON_NAME to "${expected}".`,
);
console.log("XCODEBUILD_APPICON_NAME_GATE_PASSED");
