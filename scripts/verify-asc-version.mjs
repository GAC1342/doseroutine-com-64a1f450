#!/usr/bin/env node
/**
 * Pre-upload App Store Connect version/build validator.
 *
 * Reads CFBundleShortVersionString + CFBundleVersion from the signed .ipa
 * (falling back to ios/App/App/Info.plist) and fails fast if the values
 * would be rejected by App Store Connect at upload time.
 *
 * Rules enforced (mirrors ASC's own validation):
 *   - CFBundleShortVersionString: 1 to 3 dot-separated non-negative integers,
 *     first component >= 1, each component 0-9 digits, no leading zeros
 *     beyond "0" itself, max value per component 9999.
 *   - CFBundleVersion: 1 to 3 dot-separated non-negative integers,
 *     each component 0-9 digits, no leading zeros beyond "0" itself,
 *     max value per component 99999999 (Apple's documented cap).
 *   - Neither may be empty or contain whitespace, letters, or "-"/"+".
 *
 * Usage:
 *   node scripts/verify-asc-version.mjs                  # checks Info.plist
 *   node scripts/verify-asc-version.mjs path/to/App.ipa  # checks .ipa
 */
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const errors = [];
const info = [];

function fail() {
  console.error("FAIL — App Store Connect version/build pre-upload check:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error("");
  console.error("Fix the values in ios/App/App/Info.plist (or the agvtool step in codemagic.yaml)");
  console.error(
    "before uploading. See https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleversion",
  );
  process.exit(1);
}

function readPlistFromIpa(ipaPath) {
  const dir = mkdtempSync(join(tmpdir(), "asc-ver-"));
  try {
    const unzip = spawnSync("unzip", ["-oq", ipaPath, "Payload/*/Info.plist", "-d", dir], {
      encoding: "utf8",
    });
    if (unzip.status !== 0) {
      errors.push(`unzip failed on ${ipaPath}: ${unzip.stderr || unzip.stdout}`);
      return null;
    }
    const find = spawnSync(
      "bash",
      ["-c", `ls ${JSON.stringify(dir)}/Payload/*.app/Info.plist | head -1`],
      { encoding: "utf8" },
    );
    const plistPath = find.stdout.trim();
    if (!plistPath || !existsSync(plistPath)) {
      errors.push(`Info.plist not found inside ${ipaPath}`);
      return null;
    }
    // Convert to xml1 in place so we can regex it.
    spawnSync("plutil", ["-convert", "xml1", plistPath]);
    return readFileSync(plistPath, "utf8");
  } finally {
    // Keep tmp for debugging via CM logs; will be cleaned by runner.
    void dir;
  }
}

function extract(plist, key) {
  const m = plist.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return m ? m[1] : null;
}

function validateComponent(value, { max, allowLeadingZeroSolo }) {
  if (!/^\d+$/.test(value)) return `"${value}" is not a non-negative integer`;
  if (value.length > 1 && value.startsWith("0")) return `"${value}" has a leading zero`;
  if (!allowLeadingZeroSolo && value === "0") return `"${value}" component may not be zero`;
  const n = Number(value);
  if (n > max) return `"${value}" exceeds max ${max}`;
  return null;
}

function validateShortVersion(v) {
  if (!v) return "CFBundleShortVersionString is missing/empty";
  if (/\s/.test(v)) return "CFBundleShortVersionString contains whitespace";
  const parts = v.split(".");
  if (parts.length < 1 || parts.length > 3)
    return `CFBundleShortVersionString "${v}" must have 1-3 dot-separated components`;
  for (let i = 0; i < parts.length; i++) {
    const err = validateComponent(parts[i], { max: 9999, allowLeadingZeroSolo: i > 0 });
    if (err) return `CFBundleShortVersionString "${v}" component ${i + 1}: ${err}`;
  }
  if (parts[0] === "0")
    return `CFBundleShortVersionString "${v}" first component must be >= 1 (App Store Connect rejects 0.x.y)`;
  return null;
}

function validateBuildVersion(v) {
  if (!v) return "CFBundleVersion is missing/empty";
  if (/\s/.test(v)) return "CFBundleVersion contains whitespace";
  const parts = v.split(".");
  if (parts.length < 1 || parts.length > 3)
    return `CFBundleVersion "${v}" must have 1-3 dot-separated components`;
  for (let i = 0; i < parts.length; i++) {
    const err = validateComponent(parts[i], { max: 99999999, allowLeadingZeroSolo: true });
    if (err) return `CFBundleVersion "${v}" component ${i + 1}: ${err}`;
  }
  return null;
}

const ipaArg = process.argv[2];
let plist = null;
let source = "";

if (ipaArg) {
  if (!existsSync(ipaArg)) {
    errors.push(`IPA not found at ${ipaArg}`);
    fail();
  }
  source = ipaArg;
  plist = readPlistFromIpa(ipaArg);
} else {
  source = resolve(process.cwd(), "ios/App/App/Info.plist");
  if (!existsSync(source)) {
    errors.push(`${source} not found`);
    fail();
  }
  plist = readFileSync(source, "utf8");
}

if (!plist) fail();

const shortVersion = extract(plist, "CFBundleShortVersionString");
const buildVersion = extract(plist, "CFBundleVersion");

info.push(`Source:                       ${source}`);
info.push(`CFBundleShortVersionString:   ${shortVersion ?? "(missing)"}`);
info.push(`CFBundleVersion:              ${buildVersion ?? "(missing)"}`);

const sErr = validateShortVersion(shortVersion);
if (sErr) errors.push(sErr);
const bErr = validateBuildVersion(buildVersion);
if (bErr) errors.push(bErr);

console.log("=== ASC version/build pre-upload check ===");
for (const line of info) console.log(line);

if (errors.length) fail();

console.log(
  `OK — CFBundleShortVersionString="${shortVersion}" and CFBundleVersion="${buildVersion}" satisfy App Store Connect format rules.`,
);
console.log(
  "Note: monotonic-build-number enforcement (new build > latest ASC build for this version) is handled by app-store-connect publish at upload time.",
);
