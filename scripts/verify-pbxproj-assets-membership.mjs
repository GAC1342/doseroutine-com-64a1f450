#!/usr/bin/env node
/**
 * Dedicated CI guard: fails if any iOS target (main app, app extensions,
 * WatchKit extension, App Clip, Messages extension, sticker pack, share/
 * intents/notification/widget extensions) is missing an asset catalog from
 * its Copy Bundle Resources build phase.
 *
 * Extra strict for the main App target: it must specifically include
 * ios/App/App/Assets.xcassets (the DoseRoutine AppIcon catalog). Extension
 * targets may ship their own catalog — we require *some* folder.assetcatalog
 * in their Resources phase.
 *
 * Prints a per-PBXNativeTarget report showing target ID, name, product type,
 * the resolved Copy Bundle Resources phase ID (or the phase that is wrong /
 * missing), which asset catalogs are included, and the specific failure
 * reason when a target is misconfigured.
 *
 * Success sentinel: PBXPROJ_ASSETS_MEMBERSHIP_GATE_PASSED
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const pbxprojPath = resolve(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj");

// Every iOS product type that ships an app icon or needs bundled resources.
const RELEVANT_PRODUCT_TYPES = new Set([
  "com.apple.product-type.application",
  "com.apple.product-type.app-extension",
  "com.apple.product-type.watchkit2-extension",
  "com.apple.product-type.watchkit-extension",
  "com.apple.product-type.application.watchapp2",
  "com.apple.product-type.application.watchapp",
  "com.apple.product-type.application.on-demand-install-capable", // App Clip
  "com.apple.product-type.messages-extension",
  "com.apple.product-type.messages-application",
  "com.apple.product-type.messages-application.stickers",
  "com.apple.product-type.tv-app-extension",
]);

const APP_TARGET_NAME = "App";
const APP_CATALOG_PATH = "Assets.xcassets";

const reports = []; // per-target structured report
const globalErrors = [];

function pad(s, n) {
  s = String(s ?? "");
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function printReport() {
  console.log("=== pbxproj Assets.xcassets membership check ===");
  console.log(
    `${pad("STATUS", 8)} ${pad("TARGET ID", 26)} ${pad("NAME", 22)} ${pad("PRODUCT TYPE", 46)} ${pad("RESOURCES PHASE", 26)} CATALOGS`,
  );
  for (const r of reports) {
    console.log(
      `${pad(r.status, 8)} ${pad(r.targetId, 26)} ${pad(r.targetName, 22)} ${pad(r.productType, 46)} ${pad(r.phase, 26)} ${
        r.catalogs.length ? r.catalogs.join(", ") : "(none)"
      }`,
    );
    if (r.reason) console.log(`         ↳ ${r.reason}`);
  }
  if (globalErrors.length) {
    console.log("\nGlobal errors:");
    for (const e of globalErrors) console.log(`  ✗ ${e}`);
  }
}

function fail() {
  printReport();
  console.error("\nFAIL — pbxproj Assets.xcassets membership check.");
  const failing = reports.filter((r) => r.status !== "OK" && r.status !== "SKIP");
  if (failing.length) {
    console.error(`Failing targets (${failing.length}):`);
    for (const r of failing) {
      console.error(
        `  ✗ ${r.targetName} [${r.targetId}] (${r.productType}) — ${r.reason ?? "misconfigured"}`,
      );
    }
  }
  process.exit(1);
}

if (!existsSync(pbxprojPath)) {
  globalErrors.push(`${pbxprojPath} is missing.`);
  fail();
}
const pbx = readFileSync(pbxprojPath, "utf8");

// -- Index every folder.assetcatalog PBXFileReference in the project. --------
const catalogRefs = new Map(); // id -> { path, name }
for (const m of pbx.matchAll(
  /([A-F0-9]{24}) \/\* ([^*]+?)\.xcassets \*\/ = \{isa = PBXFileReference;([^}]*)\};/g,
)) {
  const [, id, baseName, body] = m;
  if (!/lastKnownFileType = folder\.assetcatalog;/.test(body)) continue;
  const pathMatch = body.match(/path = ([^;]+);/);
  const p = pathMatch ? pathMatch[1].replace(/["']/g, "") : `${baseName}.xcassets`;
  catalogRefs.set(id, { path: p, name: `${baseName}.xcassets` });
}
if (catalogRefs.size === 0) {
  globalErrors.push(
    "No folder.assetcatalog PBXFileReference of any kind was found in project.pbxproj.",
  );
  fail();
}
console.log(
  `Catalog file references indexed: ${[...catalogRefs.values()].map((c) => c.path).join(", ")}`,
);

// -- Index every PBXBuildFile that wraps a catalog fileRef. ------------------
const catalogBuildFiles = new Map(); // buildFileId -> fileRefId
for (const m of pbx.matchAll(
  /([A-F0-9]{24}) \/\* [^*]+?\.xcassets in Resources \*\/ = \{isa = PBXBuildFile; fileRef = ([A-F0-9]{24}) \/\*[^*]+?\*\/; \};/g,
)) {
  const [, buildFileId, fileRefId] = m;
  if (catalogRefs.has(fileRefId)) catalogBuildFiles.set(buildFileId, fileRefId);
}

// -- Enumerate every PBXNativeTarget. ---------------------------------------
const targets = [
  ...pbx.matchAll(
    /([A-F0-9]{24}) \/\* ([^*]+?) \*\/ = \{\n\s*isa = PBXNativeTarget;[\s\S]*?\n\t\t\};/g,
  ),
];
if (targets.length === 0) {
  globalErrors.push("No PBXNativeTarget blocks in project.pbxproj.");
  fail();
}

let sawAppTarget = false;

for (const t of targets) {
  const [block, targetId, targetName] = t;
  const productMatch = block.match(/productType = "([^"]+)";/);
  const productType = productMatch?.[1] ?? "(unknown)";

  const rec = {
    targetId,
    targetName,
    productType,
    status: "OK",
    phase: "-",
    catalogs: [],
    reason: null,
  };
  reports.push(rec);

  if (!RELEVANT_PRODUCT_TYPES.has(productType)) {
    rec.status = "SKIP";
    rec.reason = "product type does not bundle iOS resources";
    continue;
  }

  const isMainApp =
    targetName === APP_TARGET_NAME && productType === "com.apple.product-type.application";
  if (isMainApp) sawAppTarget = true;

  // Find *all* build phases attached to this target, so we can point at
  // which phase is present/missing when the Resources phase is wrong.
  const phaseMatches = [...block.matchAll(/([A-F0-9]{24}) \/\* ([^*]+?) \*\/,/g)];
  const resourcesPhase = phaseMatches.find(([, , label]) => label === "Resources");

  if (!resourcesPhase) {
    rec.status = "FAIL";
    rec.phase = "(missing)";
    rec.reason = `no PBXResourcesBuildPhase attached to this target. Attached phases: [${
      phaseMatches.map(([, id, label]) => `${label}#${id.slice(-6)}`).join(", ") || "none"
    }]. Add a "Copy Bundle Resources" phase in Xcode → Build Phases.`;
    continue;
  }

  const phaseId = resourcesPhase[1];
  rec.phase = phaseId;

  const phaseBlock = pbx.match(
    new RegExp(
      `\\n\\t\\t${phaseId} \\/\\* Resources \\*\\/ = \\{[\\s\\S]*?files = \\(\\n([\\s\\S]*?)\\n\\t\\t\\t\\);[\\s\\S]*?\\n\\t\\t\\};`,
    ),
  );
  if (!phaseBlock) {
    rec.status = "FAIL";
    rec.reason = `could not parse Resources phase body for phase ${phaseId}. project.pbxproj may be malformed.`;
    continue;
  }
  const filesList = phaseBlock[1];

  const includedCatalogFileRefs = [];
  for (const [buildFileId, fileRefId] of catalogBuildFiles.entries()) {
    if (filesList.includes(buildFileId)) includedCatalogFileRefs.push(fileRefId);
  }
  rec.catalogs = includedCatalogFileRefs.map((id) => catalogRefs.get(id).path);

  if (includedCatalogFileRefs.length === 0) {
    rec.status = "FAIL";
    rec.reason =
      `Copy Bundle Resources phase ${phaseId} has no Assets.xcassets entry. ` +
      `Available catalog refs in project: [${[...catalogRefs.values()].map((c) => c.path).join(", ")}]. ` +
      `In Xcode: select target "${targetName}" → Build Phases → Copy Bundle Resources → + → add the asset catalog.`;
    continue;
  }

  if (isMainApp) {
    const mainCatalogIncluded = includedCatalogFileRefs.some(
      (id) => catalogRefs.get(id).path === APP_CATALOG_PATH,
    );
    if (!mainCatalogIncluded) {
      rec.status = "FAIL";
      rec.reason =
        `main App target's Resources phase ${phaseId} includes catalogs [${rec.catalogs.join(", ")}] ` +
        `but not the required "${APP_CATALOG_PATH}" that carries the DoseRoutine AppIcon.`;
      continue;
    }
  }
}

if (!sawAppTarget) {
  globalErrors.push(
    `No main App PBXNativeTarget (name="${APP_TARGET_NAME}", productType=application) was found.`,
  );
}

const hasFailure = globalErrors.length > 0 || reports.some((r) => r.status === "FAIL");
if (hasFailure) fail();

printReport();
console.log(
  "\nOK — every relevant iOS target includes an Assets.xcassets in its Copy Bundle Resources phase.",
);
console.log("PBXPROJ_ASSETS_MEMBERSHIP_GATE_PASSED");
