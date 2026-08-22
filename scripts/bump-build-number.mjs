#!/usr/bin/env node
/**
 * Bump the native build number on both platforms.
 *
 * Low finding #1 from the App Store pre-submission audit: the checked-in
 * `CURRENT_PROJECT_VERSION` (iOS) and `versionCode` (Android) stay at 1, so a
 * local Xcode / Gradle upload collides with a build number App Store Connect
 * has already seen ("The bundle version must be higher than the previously
 * uploaded version"). CI bumps from the tag; this script gives the same bump
 * to anyone archiving locally.
 *
 * Usage:
 *   node scripts/bump-build-number.mjs            # +1 on both platforms
 *   node scripts/bump-build-number.mjs 42         # set both to 42
 *   node scripts/bump-build-number.mjs --check    # print current values only
 */
import { readFileSync, writeFileSync } from "node:fs";

const PBXPROJ = "ios/App/App.xcodeproj/project.pbxproj";
const GRADLE = "android/app/build.gradle";

const arg = process.argv[2];
const checkOnly = arg === "--check";
const explicit = arg && !checkOnly ? Number.parseInt(arg, 10) : null;

if (explicit !== null && (!Number.isInteger(explicit) || explicit < 1)) {
  console.error(`Invalid build number: ${arg}`);
  process.exit(2);
}

const pbx = readFileSync(PBXPROJ, "utf8");
const gradle = readFileSync(GRADLE, "utf8");

const iosCurrent = Math.max(
  ...[...pbx.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((m) => Number(m[1])),
);
const androidMatch = gradle.match(/versionCode (\d+)/);
const androidCurrent = androidMatch ? Number(androidMatch[1]) : 1;

const next = explicit ?? Math.max(iosCurrent, androidCurrent) + 1;

console.log(`iOS   CURRENT_PROJECT_VERSION : ${iosCurrent}`);
console.log(`Android versionCode           : ${androidCurrent}`);

if (checkOnly) {
  if (iosCurrent !== androidCurrent) {
    console.error("⚠️  Build numbers are out of sync between platforms.");
    process.exit(1);
  }
  process.exit(0);
}

writeFileSync(
  PBXPROJ,
  pbx.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${next};`),
);
writeFileSync(GRADLE, gradle.replace(/versionCode \d+/, `versionCode ${next}`));

console.log(`\n✅ Bumped both platforms to build ${next}. Commit the change before archiving.`);
