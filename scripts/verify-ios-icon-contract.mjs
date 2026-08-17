#!/usr/bin/env node
/**
 * Static iOS AppIcon contract check.
 *
 * This covers the exact failure modes that can make local icons look correct
 * while Codemagic/App Store Connect still receives Apple's blue placeholder:
 * committed asset catalog files, CI generation order, Info.plist wiring,
 * 1024×1024 marketing slot, opacity, and Xcode AppIcon build settings.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

import sharp from "sharp";

const root = process.cwd();
const appIconDir = resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const contentsPath = join(appIconDir, "Contents.json");
const infoPlistPath = resolve(root, "ios/App/App/Info.plist");
const pbxprojPath = resolve(root, "ios/App/App.xcodeproj/project.pbxproj");
const codemagicPath = resolve(root, "codemagic.yaml");
const packagePath = resolve(root, "package.json");

const required = [
  { idiom: "iphone", size: "20x20", scale: "2x", pixels: 40, filename: "AppIcon-20@2x.png" },
  { idiom: "iphone", size: "20x20", scale: "3x", pixels: 60, filename: "AppIcon-20@3x.png" },
  { idiom: "iphone", size: "29x29", scale: "2x", pixels: 58, filename: "AppIcon-29@2x.png" },
  { idiom: "iphone", size: "29x29", scale: "3x", pixels: 87, filename: "AppIcon-29@3x.png" },
  { idiom: "iphone", size: "40x40", scale: "2x", pixels: 80, filename: "AppIcon-40@2x.png" },
  { idiom: "iphone", size: "40x40", scale: "3x", pixels: 120, filename: "AppIcon-40@3x.png" },
  { idiom: "iphone", size: "60x60", scale: "2x", pixels: 120, filename: "AppIcon-60@2x.png" },
  { idiom: "iphone", size: "60x60", scale: "3x", pixels: 180, filename: "AppIcon-60@3x.png" },
  { idiom: "ipad", size: "20x20", scale: "1x", pixels: 20, filename: "AppIcon-20.png" },
  { idiom: "ipad", size: "20x20", scale: "2x", pixels: 40, filename: "AppIcon-20-ipad@2x.png" },
  { idiom: "ipad", size: "29x29", scale: "1x", pixels: 29, filename: "AppIcon-29.png" },
  { idiom: "ipad", size: "29x29", scale: "2x", pixels: 58, filename: "AppIcon-29-ipad@2x.png" },
  { idiom: "ipad", size: "40x40", scale: "1x", pixels: 40, filename: "AppIcon-40.png" },
  { idiom: "ipad", size: "40x40", scale: "2x", pixels: 80, filename: "AppIcon-40-ipad@2x.png" },
  { idiom: "ipad", size: "76x76", scale: "1x", pixels: 76, filename: "AppIcon-76.png" },
  { idiom: "ipad", size: "76x76", scale: "2x", pixels: 152, filename: "AppIcon-76@2x.png" },
  { idiom: "ipad", size: "83.5x83.5", scale: "2x", pixels: 167, filename: "AppIcon-83.5@2x.png" },
  {
    idiom: "ios-marketing",
    size: "1024x1024",
    scale: "1x",
    pixels: 1024,
    filename: "AppIcon-1024.png",
  },
];

const errors = [];
const info = [];

function run(command, args) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8" });
}

function gitAvailable() {
  return run("git", ["--version"]).status === 0;
}

function assertTracked(path) {
  if (!gitAvailable()) {
    info.push(`git unavailable; skipped tracked-file check for ${path}`);
    return;
  }
  const ignored = run("git", ["check-ignore", "-v", path]);
  if (ignored.status === 0) {
    errors.push(
      `${path} is ignored by git (${ignored.stdout.trim()}). CI/Codemagic may not receive it.`,
    );
  }
  const tracked = run("git", ["ls-files", "--error-unmatch", path]);
  if (tracked.status !== 0) {
    errors.push(
      `${path} is not tracked in git. Local builds can pass while GitHub/Codemagic builds use missing/default icons.`,
    );
  }
}

function assertPostRegenerationVerifyScript() {
  if (!existsSync(packagePath)) {
    errors.push(
      "package.json is missing, so CI cannot prove it regenerates icons before validating them.",
    );
    return;
  }
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  const script = pkg.scripts?.["verify:icons"];
  if (typeof script !== "string") {
    errors.push("package.json is missing scripts.verify:icons.");
    return;
  }
  const forceAt = script.indexOf("scripts/force-ios-app-icons.mjs");
  const nativeVerifyAt = script.indexOf("scripts/verify-native-icons.mjs");
  const contractAt = script.indexOf("scripts/verify-ios-icon-contract.mjs");
  if (
    forceAt < 0 ||
    nativeVerifyAt < 0 ||
    contractAt < 0 ||
    !(forceAt < nativeVerifyAt && nativeVerifyAt < contractAt)
  ) {
    errors.push(
      "scripts.verify:icons must regenerate the iOS AppIcon catalog first, then verify the regenerated output, then run this contract check.",
    );
    return;
  }
  info.push(`package.json verify:icons regenerates before validation: ${script}`);
}

function assertAppTargetBuildsAssetsCatalog(pbx) {
  const assetFileRefMatches = [
    ...pbx.matchAll(
      /([A-F0-9]{24}) \/\* Assets\.xcassets \*\/ = \{isa = PBXFileReference;([^}]*)\};/g,
    ),
  ];
  const assetFileRef = assetFileRefMatches.find(
    (match) =>
      /lastKnownFileType = folder\.assetcatalog;/.test(match[2]) &&
      /path = Assets\.xcassets;/.test(match[2]),
  );
  if (!assetFileRef) {
    errors.push(
      "Xcode project has no Assets.xcassets PBXFileReference with lastKnownFileType=folder.assetcatalog and path=Assets.xcassets.",
    );
    return;
  }
  const assetFileRefId = assetFileRef[1];

  const appTarget = [
    ...pbx.matchAll(
      /([A-F0-9]{24}) \/\* App \*\/ = \{\n\s*isa = PBXNativeTarget;[\s\S]*?\n\t\t\};/g,
    ),
  ].find(
    (match) =>
      /name = App;/.test(match[0]) &&
      /productType = "com\.apple\.product-type\.application";/.test(match[0]),
  );
  if (!appTarget) {
    errors.push("Xcode project has no App PBXNativeTarget for the iOS application.");
    return;
  }

  const resourcesPhase = appTarget[0].match(/([A-F0-9]{24}) \/\* Resources \*\//);
  if (!resourcesPhase) {
    errors.push(
      "The App target has no Copy Bundle Resources phase; the asset catalog would not be archived.",
    );
    return;
  }
  const resourcesPhaseId = resourcesPhase[1];

  const resourcesBlock = pbx.match(
    new RegExp(
      `\\n\\t\\t${resourcesPhaseId} \\/\\* Resources \\*\\/ = \\{[\\s\\S]*?files = \\(\\n([\\s\\S]*?)\\n\\t\\t\\t\\);[\\s\\S]*?\\n\\t\\t\\};`,
    ),
  );
  if (!resourcesBlock) {
    errors.push("Could not parse the App target Copy Bundle Resources files list.");
    return;
  }

  const buildFiles = [
    ...pbx.matchAll(
      /([A-F0-9]{24}) \/\* Assets\.xcassets in Resources \*\/ = \{isa = PBXBuildFile; fileRef = ([A-F0-9]{24}) \/\* Assets\.xcassets \*\/; \};/g,
    ),
  ]
    .filter((match) => match[2] === assetFileRefId)
    .map((match) => match[1]);
  if (buildFiles.length === 0) {
    errors.push(
      "Xcode project has no PBXBuildFile connecting Assets.xcassets to Copy Bundle Resources.",
    );
    return;
  }

  const includedBuildFile = buildFiles.find((id) => resourcesBlock[1].includes(id));
  if (!includedBuildFile) {
    errors.push(
      "Assets.xcassets exists in the project but is not listed inside the App target Copy Bundle Resources phase.",
    );
    return;
  }

  info.push(
    `App target Copy Bundle Resources includes Assets.xcassets via build file ${includedBuildFile}.`,
  );
}

async function assertPng(path, pixels) {
  if (!existsSync(path)) {
    errors.push(`${path} is missing.`);
    return;
  }
  const meta = await sharp(path)
    .metadata()
    .catch(() => null);
  if (!meta?.width || !meta?.height) {
    errors.push(`${path} has unreadable dimensions.`);
    return;
  }
  if (meta.width !== pixels || meta.height !== pixels) {
    errors.push(`${path} is ${meta.width}×${meta.height}; expected ${pixels}×${pixels}.`);
  }
  const raw = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let alphaMin = 255;
  let alphaMax = 0;
  for (let i = 3; i < raw.data.length; i += 4) {
    const alpha = raw.data[i];
    if (alpha < alphaMin) alphaMin = alpha;
    if (alpha > alphaMax) alphaMax = alpha;
  }
  info.push(`${path}: ${meta.width}×${meta.height}, alpha ${alphaMin}-${alphaMax}`);
  if (alphaMin !== 255 || alphaMax !== 255) {
    errors.push(
      `${path} is not fully opaque (alpha ${alphaMin}-${alphaMax}). Apple app icons must have no transparency.`,
    );
  }
}

assertPostRegenerationVerifyScript();

if (!existsSync(appIconDir)) {
  errors.push(`iOS AppIcon catalog missing at ${appIconDir}`);
} else {
  const pngs = readdirSync(appIconDir).filter((name) => name.endsWith(".png"));
  info.push(`Found ${pngs.length} PNGs in ios/App/App/Assets.xcassets/AppIcon.appiconset`);
  assertTracked("ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json");
}

let entries = [];
if (!existsSync(contentsPath)) {
  errors.push("AppIcon Contents.json is missing.");
} else {
  const contents = JSON.parse(readFileSync(contentsPath, "utf8"));
  entries = Array.isArray(contents.images) ? contents.images : [];
  if (entries.length !== required.length) {
    errors.push(
      `AppIcon Contents.json has ${entries.length} image entries; expected ${required.length}.`,
    );
  }
}

const bySlot = new Map(
  entries.map((entry) => [`${entry?.idiom}|${entry?.size}|${entry?.scale}`, entry]),
);
for (const icon of required) {
  const slot = `${icon.idiom}|${icon.size}|${icon.scale}`;
  const entry = bySlot.get(slot);
  if (!entry) {
    errors.push(`AppIcon Contents.json missing Apple slot ${slot}.`);
    continue;
  }
  if (entry.filename !== icon.filename) {
    errors.push(`AppIcon slot ${slot} points to ${entry.filename}; expected ${icon.filename}.`);
  }
  const rel = `ios/App/App/Assets.xcassets/AppIcon.appiconset/${icon.filename}`;
  assertTracked(rel);
  await assertPng(resolve(root, rel), icon.pixels);
}

const marketing = bySlot.get("ios-marketing|1024x1024|1x");
if (!marketing || marketing.filename !== "AppIcon-1024.png") {
  errors.push(
    "The required App Store 1024×1024 ios-marketing slot is not filled by AppIcon-1024.png.",
  );
}

if (!existsSync(infoPlistPath)) {
  errors.push("ios/App/App/Info.plist is missing.");
} else {
  const plist = readFileSync(infoPlistPath, "utf8");
  if (!/<key>CFBundleIconName<\/key>\s*<string>AppIcon<\/string>/.test(plist)) {
    errors.push("Info.plist must contain CFBundleIconName set to AppIcon.");
  }
  const primaryNames = [
    ...plist.matchAll(
      /<key>CFBundlePrimaryIcon<\/key>\s*<dict>[\s\S]*?<key>CFBundleIconName<\/key>\s*<string>([^<]+)<\/string>[\s\S]*?<\/dict>/g,
    ),
  ].map((match) => match[1]);
  if (primaryNames.length < 2) {
    errors.push("Info.plist must pin both iPhone and iPad primary icon dictionaries to AppIcon.");
  }
  for (const name of primaryNames) {
    if (name !== "AppIcon")
      errors.push(`Info.plist primary icon dictionary points to ${name}; expected AppIcon.`);
  }
  if (/<key>CFBundleIconFiles<\/key>|<key>UIPrerenderedIcon<\/key>/.test(plist)) {
    errors.push(
      "Info.plist contains legacy icon keys (CFBundleIconFiles/UIPrerenderedIcon) that can make Apple ignore the AppIcon catalog.",
    );
  }
}

if (!existsSync(pbxprojPath)) {
  errors.push("ios/App/App.xcodeproj/project.pbxproj is missing.");
} else {
  const pbx = readFileSync(pbxprojPath, "utf8");
  const buildBlocks = pbx.match(/buildSettings = \{\n[\s\S]*?\n\t\t\t\};/g) ?? [];
  const appIconNames = [...pbx.matchAll(/ASSETCATALOG_COMPILER_APPICON_NAME = ([^;]+);/g)].map(
    (match) => match[1].replace(/["']/g, "").trim(),
  );
  if (appIconNames.length !== buildBlocks.length) {
    errors.push(
      `Xcode has ${buildBlocks.length} build settings blocks but ${appIconNames.length} AppIcon compiler settings. Every configuration must set ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon.`,
    );
  }
  for (const name of appIconNames) {
    if (name !== "AppIcon")
      errors.push(`Xcode ASSETCATALOG_COMPILER_APPICON_NAME is ${name}; expected AppIcon.`);
  }
  assertAppTargetBuildsAssetsCatalog(pbx);
}

if (!existsSync(codemagicPath)) {
  errors.push("codemagic.yaml is missing.");
} else {
  const codemagic = readFileSync(codemagicPath, "utf8");
  const forceAt = codemagic.indexOf("scripts/force-ios-app-icons.mjs");
  const verifyAt = codemagic.indexOf("scripts/verify-native-icons.mjs");
  const buildAt = codemagic.indexOf("xcode-project build-ipa");
  if (forceAt < 0 || verifyAt < 0 || buildAt < 0 || !(forceAt < buildAt && verifyAt < buildAt)) {
    errors.push(
      "codemagic.yaml must generate and verify the iOS AppIcon catalog before xcode-project build-ipa runs.",
    );
  }
  for (const sentinel of [
    "DR_ICON_ARCHIVE_GATE_PASSED",
    "DR_ICON_PREUPLOAD_GATE_PASSED",
    "APPLE_EXTRACTED_ICON_GATE_PASSED",
  ]) {
    if (!codemagic.includes(sentinel)) errors.push(`codemagic.yaml is missing ${sentinel}.`);
  }
}

console.log("=== DoseRoutine iOS AppIcon contract check ===");
for (const line of info) console.log(line);
if (errors.length) {
  console.error("\nFAIL — iOS AppIcon contract is broken:");
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}
console.log(
  "OK — regenerated iOS AppIcon output is valid and the App target archives Assets.xcassets.",
);
