#!/usr/bin/env node
/**
 * Pre-upload gate: decode the signed .ipa's Info.plist and confirm
 * CFBundleShortVersionString and CFBundleVersion match the exact values
 * the CodeMagic workflow set via agvtool (BUILD_VERSION + BUILD_NUMBER_IOS
 * / BUILD_NUMBER). Fails loudly if the .ipa carries different numbers than
 * the gate expects — that would silently upload a mis-versioned build.
 *
 * Usage:
 *   EXPECTED_SHORT_VERSION=1.0.0 EXPECTED_BUILD_VERSION=123 \
 *     node scripts/verify-ipa-version-matches.mjs path/to/App.ipa
 *
 * In CodeMagic these fall back to BUILD_VERSION and BUILD_NUMBER_IOS/BUILD_NUMBER.
 *
 * Success sentinel: IPA_VERSION_MATCHES_GATE_PASSED
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const ipaArg = process.argv[2];
if (!ipaArg) {
  console.error("Usage: verify-ipa-version-matches.mjs <path-to-App.ipa>");
  process.exit(2);
}
const ipaPath = resolve(process.cwd(), ipaArg);
if (!existsSync(ipaPath)) {
  console.error(`FAIL — IPA not found: ${ipaPath}`);
  process.exit(1);
}

const expectedShort = process.env.EXPECTED_SHORT_VERSION ?? process.env.BUILD_VERSION ?? "";
const expectedBuild =
  process.env.EXPECTED_BUILD_VERSION ??
  process.env.BUILD_NUMBER_IOS ??
  process.env.BUILD_NUMBER ??
  "";

if (!expectedShort || !expectedBuild) {
  console.error("FAIL — expected version/build not provided.");
  console.error(
    "Set EXPECTED_SHORT_VERSION + EXPECTED_BUILD_VERSION, or CodeMagic BUILD_VERSION + BUILD_NUMBER_IOS/BUILD_NUMBER.",
  );
  process.exit(1);
}

// ---- Extract Info.plist from the .ipa --------------------------------------
const workDir = mkdtempSync(join(tmpdir(), "ipa-ver-"));
let plistText = "";
try {
  const unzip = spawnSync("unzip", ["-oq", ipaPath, "Payload/*/Info.plist", "-d", workDir], {
    encoding: "utf8",
  });
  if (unzip.status !== 0) {
    console.error(`FAIL — unzip Info.plist from ${ipaPath}: ${unzip.stderr || unzip.stdout}`);
    process.exit(1);
  }
  const find = spawnSync(
    "bash",
    ["-lc", `ls ${JSON.stringify(workDir)}/Payload/*.app/Info.plist | head -1`],
    { encoding: "utf8" },
  );
  const plistPath = find.stdout.trim();
  if (!plistPath || !existsSync(plistPath)) {
    console.error(`FAIL — Info.plist not found inside ${ipaPath}`);
    process.exit(1);
  }
  // plutil is available on macOS runners; on Linux fall back to raw read.
  const plutil = spawnSync("plutil", ["-convert", "xml1", plistPath], { encoding: "utf8" });
  if (plutil.status !== 0 && !readFileSync(plistPath, "utf8").startsWith("<?xml")) {
    console.error("FAIL — Info.plist is binary and plutil is unavailable to convert it.");
    process.exit(1);
  }
  plistText = readFileSync(plistPath, "utf8");
} finally {
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {}
}

function extract(key) {
  const m = plistText.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return m ? m[1] : null;
}
const actualShort = extract("CFBundleShortVersionString");
const actualBuild = extract("CFBundleVersion");

console.log("=== .ipa version/build match check ===");
console.log(`IPA:                          ${ipaPath}`);
console.log(`Expected CFBundleShortVersionString: ${expectedShort}`);
console.log(`Actual   CFBundleShortVersionString: ${actualShort ?? "(missing)"}`);
console.log(`Expected CFBundleVersion:            ${expectedBuild}`);
console.log(`Actual   CFBundleVersion:            ${actualBuild ?? "(missing)"}`);

const errors = [];
if (actualShort == null) errors.push("CFBundleShortVersionString missing from .ipa Info.plist");
else if (actualShort !== expectedShort)
  errors.push(
    `CFBundleShortVersionString mismatch: .ipa="${actualShort}" vs expected="${expectedShort}". The signed archive was built with a different marketing version than CodeMagic set.`,
  );

if (actualBuild == null) errors.push("CFBundleVersion missing from .ipa Info.plist");
else if (actualBuild !== expectedBuild)
  errors.push(
    `CFBundleVersion mismatch: .ipa="${actualBuild}" vs expected="${expectedBuild}". The signed archive was built with a different build number than CodeMagic set.`,
  );

if (errors.length) {
  console.error("\nFAIL — decoded .ipa does not match the values the gate expects:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    "\nMost common cause: agvtool ran after xcodebuild archive, or DerivedData was reused from a previous version. Re-archive with the correct BUILD_VERSION / BUILD_NUMBER_IOS.",
  );
  process.exit(1);
}

console.log(
  "\nOK — .ipa CFBundleShortVersionString and CFBundleVersion match the pre-upload gate values.",
);
console.log("IPA_VERSION_MATCHES_GATE_PASSED");
