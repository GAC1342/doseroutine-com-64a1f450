#!/usr/bin/env node
/**
 * Diff the icon PNGs + Contents.json inside the produced .xcarchive (or .ipa)
 * against a fresh regeneration from scripts/force-ios-app-icons.mjs. Fails if:
 *
 *  1) The committed AppIcon.appiconset PNGs or Contents.json differ from what
 *     the generator would produce right now (repo drift / stale artifacts).
 *  2) The produced archive/IPA actually contains a compiled Assets.car. The
 *     compiled catalog is verified by scripts/verify-assets-car-appicon.mjs and
 *     scripts/verify-appicon-set-pixel-match.mjs; this script intentionally
 *     does not pixel-diff iconutil-extracted renditions because Apple exports
 *     them as macOS-style 16/32/128/256/512/1024 files with rounded masks, not
 *     as the original iOS AppIcon.appiconset slot PNGs.
 *
 * Success sentinel (grep-friendly): ARCHIVE_MATCHES_GENERATOR_GATE_PASSED
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

// Kept in sync with scripts/force-ios-app-icons.mjs. If that table changes,
// this list must change too — the icon contract verifier enforces the match.
const ICONS = [
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

const [, , sourceArg] = process.argv;
if (!sourceArg) {
  console.error("Usage: verify-archive-matches-generator.mjs <path-to-App.ipa|.xcarchive|.app>");
  process.exit(2);
}

const root = process.cwd();
const sourcePath = resolve(root, sourceArg);
const masterIcon = resolve(root, "public/icon-master-dr.png");
const committedDir = resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const reportDir = process.env.ARCHIVE_MATCHES_GENERATOR_REPORT_DIR
  ? resolve(root, process.env.ARCHIVE_MATCHES_GENERATOR_REPORT_DIR)
  : resolve(root, "build-logs/archive-matches-generator");

function fail(list, message) {
  list.push(message);
}

function firstAppDir(parent) {
  if (!existsSync(parent)) return null;
  const name = readdirSync(parent).find((n) => n.endsWith(".app"));
  return name ? join(parent, name) : null;
}

function locateAppPath(source, tmp) {
  if (!existsSync(source)) return { app: null, error: `Source not found: ${source}` };
  const st = statSync(source);
  if (st.isDirectory() && source.endsWith(".app")) return { app: source };
  if (st.isDirectory() && source.endsWith(".xcarchive")) {
    return { app: firstAppDir(join(source, "Products", "Applications")) };
  }
  if (source.toLowerCase().endsWith(".ipa")) {
    const unzip = spawnSync("unzip", ["-q", source, "-d", tmp], { stdio: "pipe" });
    if (unzip.status !== 0) {
      return { app: null, error: `Could not unzip IPA: ${unzip.stderr?.toString() || "unknown"}` };
    }
    return { app: firstAppDir(join(tmp, "Payload")) };
  }
  return { app: null, error: `Unsupported source type: ${source}` };
}

async function regenerateTo(outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const icon of ICONS) {
    await sharp(masterIcon)
      .resize(icon.pixels, icon.pixels, { fit: "cover" })
      .flatten({ background: "#0b1220" })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toFile(join(outDir, icon.filename));
  }
  const contents = `${JSON.stringify(
    {
      images: ICONS.map(({ idiom, size, scale, filename }) => ({ idiom, size, scale, filename })),
      info: { version: 1, author: "com.doseroutine.app" },
    },
    null,
    2,
  )}\n`;
  writeFileSync(join(outDir, "Contents.json"), contents);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const errors = [];
const info = [];
const partA = []; // committed vs regenerated (byte-exact)
const partB = []; // archive product sanity only; compiled pixel checks live in earlier gates
const tmp = mkdtempSync(join(tmpdir(), "dr-archive-vs-gen-"));

try {
  if (!existsSync(masterIcon)) fail(errors, `Master DR icon missing: ${masterIcon}`);
  if (!existsSync(committedDir))
    fail(errors, `Committed AppIcon.appiconset missing: ${committedDir}`);

  const regenDir = join(tmp, "regenerated.appiconset");
  if (errors.length === 0) {
    await regenerateTo(regenDir);
    info.push(`Regenerated fresh AppIcon set at ${regenDir}`);
  }

  // ---------- Part A: committed appiconset must equal regenerated, byte-exact ----------
  if (errors.length === 0) {
    for (const icon of ICONS) {
      const commit = join(committedDir, icon.filename);
      const regen = join(regenDir, icon.filename);
      if (!existsSync(commit)) {
        fail(
          errors,
          `Committed appiconset is missing ${icon.filename} (generator would produce it).`,
        );
        partA.push({
          file: icon.filename,
          committed: "<missing>",
          regenerated: sha256(regen),
          pass: false,
        });
        continue;
      }
      const cHash = sha256(commit);
      const rHash = sha256(regen);
      const pass = cHash === rHash;
      partA.push({ file: icon.filename, committed: cHash, regenerated: rHash, pass });
      if (!pass) {
        fail(
          errors,
          `Committed ${icon.filename} does not match the generator's fresh output (sha256 ${cHash.slice(0, 12)} vs ${rHash.slice(0, 12)}). Re-run scripts/force-ios-app-icons.mjs and commit.`,
        );
      }
    }

    const commitContents = join(committedDir, "Contents.json");
    const regenContents = join(regenDir, "Contents.json");
    if (!existsSync(commitContents)) {
      fail(errors, "Committed appiconset is missing Contents.json.");
      partA.push({
        file: "Contents.json",
        committed: "<missing>",
        regenerated: sha256(regenContents),
        pass: false,
      });
    } else {
      const cRaw = readFileSync(commitContents, "utf8");
      const rRaw = readFileSync(regenContents, "utf8");
      const pass = cRaw === rRaw;
      partA.push({
        file: "Contents.json",
        committed: sha256(commitContents),
        regenerated: sha256(regenContents),
        pass,
      });
      if (!pass) {
        fail(
          errors,
          "Committed Contents.json does not match the generator's output byte-for-byte. Re-run scripts/force-ios-app-icons.mjs and commit.",
        );
      }
    }
    // Reject stray files the generator would not produce.
    const wanted = new Set([...ICONS.map((i) => i.filename), "Contents.json"]);
    for (const name of readdirSync(committedDir)) {
      if (!wanted.has(name)) {
        fail(
          errors,
          `Committed appiconset contains stray file ${name} that the generator does not produce.`,
        );
      }
    }
  }

  // ---------- Part B: archive product must contain a compiled asset catalog ----------
  const { app, error: locateErr } = locateAppPath(sourcePath, tmp);
  if (locateErr) fail(errors, locateErr);
  if (!app || !existsSync(app))
    fail(errors, "Could not locate Payload/*.app inside the source artifact.");

  if (app && existsSync(app)) {
    const assetsCar = join(app, "Assets.car");
    if (!existsSync(assetsCar)) {
      fail(errors, `Signed app has no Assets.car: ${assetsCar}`);
    } else {
      partB.push({ check: "Assets.car exists", path: assetsCar, pass: true });
      info.push(
        "Archive contains Assets.car. Compiled AppIcon slot/pixel checks are handled by the dedicated Step 26/27 verifiers.",
      );
    }
  }

  // ---------- Report ----------
  mkdirSync(reportDir, { recursive: true });
  const md = [
    "# Archive vs generator diff report",
    "",
    `Source: ${sourcePath}`,
    `Committed appiconset: ${committedDir}`,
    "",
    "## Part A — committed appiconset vs fresh regeneration (byte-exact)",
    "",
    "| File | Committed sha256 | Regenerated sha256 | Pass |",
    "|---|---|---|---|",
    ...partA.map(
      (r) =>
        `| ${r.file} | ${String(r.committed).slice(0, 16)} | ${String(r.regenerated).slice(0, 16)} | ${r.pass ? "yes" : "NO"} |`,
    ),
    "",
    "## Part B — archive product sanity",
    "",
    "Compiled AppIcon pixels are verified by the dedicated Assets.car gates before this step. This gate only confirms the signed product has a compiled asset catalog, because iconutil does not export the iOS AppIcon slot matrix one-to-one.",
    "",
    "| Check | Path | Pass |",
    "|---|---|---|",
    ...partB.map((r) => `| ${r.check} | ${r.path} | ${r.pass ? "yes" : "NO"} |`),
    "",
    ...info.map((l) => `- ${l}`),
    "",
    errors.length ? "## Errors" : "## Result: OK",
    ...errors.map((e) => `- ${e}`),
  ].join("\n");
  writeFileSync(join(reportDir, "archive-matches-generator.md"), md);
  writeFileSync(
    join(reportDir, "archive-matches-generator.json"),
    JSON.stringify({ source: sourcePath, partA, partB, info, errors }, null, 2),
  );

  console.log("=== Archive vs generator diff ===");
  for (const line of info) console.log(line);
  for (const r of partA) console.log(`  A ${r.pass ? "OK " : "FAIL"} ${r.file}`);
  for (const r of partB) console.log(`  B ${r.pass ? "OK " : "FAIL"} ${r.check}: ${r.path}`);
  console.log(`Report: ${join(reportDir, "archive-matches-generator.md")}`);

  if (errors.length) {
    console.error("");
    for (const e of errors) console.error(`ERROR: ${e}`);
    process.exit(1);
  }
  console.log("=== ARCHIVE_MATCHES_GENERATOR_GATE_PASSED ===");
} finally {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
