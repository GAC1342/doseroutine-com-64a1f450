#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const failures = [];
const warnings = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function note(message) {
  notes.push(message);
}

function read(path) {
  if (!existsSync(path)) {
    fail(`Missing required file: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function sectionAfter(source, marker) {
  const index = source.indexOf(marker);
  if (index === -1) return "";
  return source.slice(index);
}

const yaml = read("codemagic.yaml");
const pkgRaw = read("package.json");
const capacitor = read("capacitor.config.ts");
const buildsDoc = existsSync("docs/codemagic-builds.md")
  ? readFileSync("docs/codemagic-builds.md", "utf8")
  : "";
const checklistDoc = existsSync("docs/preflight-checklist.md")
  ? readFileSync("docs/preflight-checklist.md", "utf8")
  : "";

let pkg = {};
try {
  pkg = JSON.parse(pkgRaw);
} catch (error) {
  fail(`package.json is not valid JSON: ${error.message}`);
}

const androidWorkflow = sectionAfter(yaml, "  android-play:");
const androidWorkflowWithoutComments = androidWorkflow
  .split("\n")
  .filter((line) => !line.trim().startsWith("#"))
  .join("\n");
if (!androidWorkflow) {
  fail("codemagic.yaml is missing the android-play workflow.");
} else {
  if (/instance_type\s*:/.test(androidWorkflowWithoutComments)) {
    fail(
      "android-play still pins instance_type. Remove it so Codemagic uses the plan-allowed default Linux machine.",
    );
  } else {
    note("android-play does not pin a paid instance type.");
  }

  if (
    /Tag guard|must be started from a git tag|android-vX\.Y\.Z/.test(androidWorkflowWithoutComments)
  ) {
    fail("android-play still contains tag-guard logic. Branch/commit builds should be allowed.");
  } else {
    note("android-play has no tag guard.");
  }

  if (/triggering:\s*[\s\S]*tag_patterns/.test(androidWorkflowWithoutComments)) {
    fail("android-play still has tag-only triggering configured.");
  } else {
    note("android-play is not restricted to tag-only triggering.");
  }

  if (/doseroutine_env/.test(androidWorkflowWithoutComments)) {
    fail("android-play still references the iOS-only doseroutine_env variable group.");
  } else {
    note("android-play does not reference the iOS-only variable group.");
  }

  if (!/groups:\s*[\s\S]*-\s*google_play/.test(androidWorkflowWithoutComments)) {
    fail(
      "android-play must attach the google_play environment group for Play publishing credentials.",
    );
  }

  if (!/android_signing:\s*[\s\S]*-\s*doseroutine_keystore/.test(androidWorkflowWithoutComments)) {
    fail("android-play must reference the uploaded Android keystore as doseroutine_keystore.");
  }

  if (!/PACKAGE_NAME:\s*["']com\.doseroutine\.app["']/.test(androidWorkflowWithoutComments)) {
    fail("android-play must set PACKAGE_NAME to com.doseroutine.app.");
  }

  for (const required of [
    "Android signing preflight",
    "*env_preflight",
    "*build_web",
    "*cap_preflight",
    "*cap_sync",
    "Set versionName & versionCode",
    "Build signed release AAB",
    "Verify built Android artifact applicationId",
    "google_play:",
    "track: internal",
  ]) {
    if (!androidWorkflowWithoutComments.includes(required)) {
      fail(`android-play is missing expected step/config: ${required}`);
    }
  }
}

if (!/appId:\s*["']com\.doseroutine\.app["']/.test(capacitor)) {
  fail("capacitor.config.ts appId must be com.doseroutine.app.");
}

if (!/appName:\s*["']DoseRoutine["']/.test(capacitor)) {
  fail("capacitor.config.ts appName must be DoseRoutine.");
}

const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
for (const dependency of [
  "@capacitor/android",
  "@capacitor/cli",
  "@capacitor/core",
  "@capacitor/assets",
]) {
  if (!deps[dependency]) {
    fail(`Missing Android build dependency in package.json: ${dependency}`);
  }
}

if (!existsSync("public/icon-master-dr.png")) {
  fail("Missing public/icon-master-dr.png, which the Android icon generator requires.");
}

if (/Stackwise|StackWise|My Stack Wise|my-stack-wise/.test(capacitor)) {
  fail("capacitor.config.ts contains old Stackwise branding.");
}

if (
  /Both native builds are \*\*triggered by git tags\*\*|Tag guard|must be started from a git tag matching 'android-vX\.Y\.Z'/.test(
    buildsDoc,
  )
) {
  fail(
    "docs/codemagic-builds.md still tells you Android requires tags; update it to match the branch/commit workflow.",
  );
}

if (/Tag guard \(ios-v\*\)\s+Tag guard \(android-v\*\)|android-vX\.Y\.Z/.test(checklistDoc)) {
  fail("docs/preflight-checklist.md still documents an Android tag guard that no longer exists.");
}

if (!existsSync("android/app/build.gradle")) {
  fail(
    "android/ native project is missing. Commit it so Codemagic builds a stable Android project instead of regenerating defaults in CI.",
  );
} else {
  note("android/ native project is committed.");
}

console.log("=== DoseRoutine Android Codemagic audit ===");
for (const message of notes) console.log(`OK   ${message}`);
for (const message of warnings) console.log(`WARN ${message}`);

if (failures.length > 0) {
  console.log("");
  console.log("FAILURES:");
  failures.forEach((message, index) => console.log(`${index + 1}. ${message}`));
  process.exit(1);
}

console.log("");
console.log("PASS: Android Codemagic workflow has no known pre-run blockers.");
console.log(
  "Next: start android-play from Branch/commit in Codemagic after this commit is synced.",
);
