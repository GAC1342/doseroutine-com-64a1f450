#!/usr/bin/env node
/**
 * Pre-build verification: confirms native iOS/Android icons were generated
 * from the DoseRoutine "DR" master and are NOT the Capacitor blue placeholder
 * or legacy Stackwise "S" branding.
 *
 * Fails the build (exit 1) if:
 *   - master DR icon is missing
 *   - iOS AppIcon.appiconset is missing or empty
 *   - iOS 1024×1024 marketing icon perceptually differs from the master
 *   - iOS 1024 icon average color matches known Capacitor placeholder blue
 *   - any native config mentions Stackwise / My Stack Wise
 *
 * Runs after `npm run icons` in codemagic.yaml.
 */
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, relative, dirname } from "node:path";

import sharp from "sharp";

const root = process.cwd();
const MASTER = resolve(root, "public/icon-master-dr.png");
const ASSETS_DIR = resolve(root, "assets");
const IOS_APPICON_DIR = resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const IOS_PBXPROJ = resolve(root, "ios/App/App.xcodeproj/project.pbxproj");
const IOS_INFO_PLIST = resolve(root, "ios/App/App/Info.plist");
const ANDROID_RES = resolve(root, "android/app/src/main/res");
const TARGET_PLATFORM = process.env.TARGET_PLATFORM ?? "both";

// Capacitor default placeholder is a blue-ish gradient (~#4B7BEC / #3880ff).
// If the average R,G,B of the 1024 marketing icon lands in this cone, the
// build is shipping the placeholder.
const CAP_PLACEHOLDER_RGB = { r: 60, g: 120, b: 240 };
const MAX_MEAN_ABS_DELTA = 4;
const MAX_RMS_DELTA = 10;
const IOS_REQUIRED_APPICONS = [
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
const warns = [];
const info = [];

function avgColor(buf, w, h) {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < buf.length; i += 3) {
    r += buf[i];
    g += buf[i + 1];
    b += buf[i + 2];
    n++;
  }
  return { r: r / n, g: g / n, b: b / n };
}

function colorDist(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

// aHash: 8x8 grayscale, bits above mean = 1. Hamming distance measures similarity.
async function aHash(path) {
  const { data } = await sharp(path)
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  let bits = 0n;
  for (let i = 0; i < 64; i++) bits = (bits << 1n) | (data[i] > mean ? 1n : 0n);
  return bits;
}

function hamming(a, b) {
  let x = a ^ b,
    c = 0;
  while (x) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
}

function shouldCheck(platform) {
  return TARGET_PLATFORM === "both" || TARGET_PLATFORM === platform;
}

async function assertMatchesMaster(label, path, maxDistance = 12) {
  if (!existsSync(path)) {
    errors.push(`${label} missing: ${path}`);
    return;
  }
  if (!existsSync(MASTER)) return;
  const meta = await sharp(path).metadata();
  if (!meta.width || !meta.height) {
    errors.push(`${label} has unreadable dimensions.`);
    return;
  }
  const [hMaster, hCandidate] = await Promise.all([aHash(MASTER), aHash(path)]);
  const dist = hamming(hMaster, hCandidate);
  info.push(`${label} perceptual distance from DR master: ${dist} / 64`);
  if (dist > maxDistance) {
    errors.push(`${label} does NOT match the DoseRoutine DR master (distance ${dist}/64).`);
  }

  const delta = await pixelDeltaAgainstMaster(path, meta.width, meta.height);
  info.push(
    `${label} exact pixel delta from DR resize: meanAbs=${delta.meanAbs.toFixed(2)}, rms=${delta.rms.toFixed(2)}`,
  );
  if (delta.meanAbs > MAX_MEAN_ABS_DELTA || delta.rms > MAX_RMS_DELTA) {
    errors.push(
      `${label} pixels do NOT match the DoseRoutine DR master resize (meanAbs ${delta.meanAbs.toFixed(2)}, rms ${delta.rms.toFixed(2)}).`,
    );
  }
}

async function assertVisibleOpaquePng(label, path) {
  const meta = await sharp(path)
    .metadata()
    .catch(() => null);
  if (!meta?.width || !meta?.height) {
    errors.push(`${label} has unreadable PNG dimensions.`);
    return;
  }
  if (meta.hasAlpha || (meta.channels ?? 0) > 3) {
    errors.push(
      `${label} is alpha-capable (channels=${meta.channels ?? "unknown"}, hasAlpha=${meta.hasAlpha ? "yes" : "no"}). iOS app icons must be RGB/no alpha, not RGBA with fully opaque pixels.`,
    );
  }

  const raw = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);
  if (!raw) {
    errors.push(`${label} alpha channel could not be inspected.`);
    return;
  }
  let alphaMin = 255;
  let alphaMax = 0;
  for (let i = 3; i < raw.data.length; i += 4) {
    const value = raw.data[i];
    if (value < alphaMin) alphaMin = value;
    if (value > alphaMax) alphaMax = value;
  }
  info.push(`${label} alpha range: ${alphaMin}-${alphaMax}`);
  if (alphaMin < 255 || alphaMax < 255) {
    errors.push(
      `${label} is not fully opaque (alpha ${alphaMin}-${alphaMax}); Apple can render transparent icons as a default placeholder.`,
    );
  }

  const { data } = await sharp(path)
    .removeAlpha()
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  info.push(`${label} avg RGB after alpha removal: (${r}, ${g}, ${b})`);
  if (r < 2 && g < 2 && b < 2) {
    errors.push(`${label} appears visually blank after alpha removal (avg RGB ${r},${g},${b}).`);
  }

  const cornerProbeSize = Math.max(1, Math.round(meta.width * 0.035));
  const corner = await sharp(path)
    .removeAlpha()
    .extract({ left: 0, top: 0, width: cornerProbeSize, height: cornerProbeSize })
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);
  if (corner) {
    const [cr, cg, cb] = corner.data;
    info.push(`${label} corner RGB: (${cr}, ${cg}, ${cb})`);
    if (cr > 235 && cg > 235 && cb > 235) {
      errors.push(
        `${label} has white/rounded-looking corners. Apple app icons must be full-square artwork; iOS applies the corner mask itself.`,
      );
    }
  }

  const edgeLimit = Math.max(1, Math.round(meta.width * 0.095));
  let brightEdgePixels = 0;
  for (let y = 0; y < meta.height; y += 1) {
    for (let x = 0; x < meta.width; x += 1) {
      const edge = Math.min(x, y, meta.width - 1 - x, meta.height - 1 - y);
      if (edge > edgeLimit) continue;
      const idx = (y * meta.width + x) * 4;
      const er = raw.data[idx];
      const eg = raw.data[idx + 1];
      const eb = raw.data[idx + 2];
      if (er > 85 && eg > 155 && eb > 155) brightEdgePixels += 1;
    }
  }
  info.push(`${label} bright rounded-edge artifact pixels: ${brightEdgePixels}`);
  if (brightEdgePixels > 0) {
    errors.push(
      `${label} has ${brightEdgePixels} bright pixels in the outer edge area, which looks like a baked iOS rounded-corner mask/ring. The icon must be clean full-square artwork.`,
    );
  }
}

async function pixelDeltaAgainstMaster(path, width, height) {
  const expected = await sharp(MASTER)
    .resize(width, height, { fit: "cover" })
    .flatten({ background: "#0b1220" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const actual = await sharp(path)
    .resize(width, height, { fit: "fill" })
    .flatten({ background: "#0b1220" })
    .removeAlpha()
    .raw()
    .toBuffer();

  if (expected.length !== actual.length) return { meanAbs: Infinity, rms: Infinity };
  let abs = 0;
  let sq = 0;
  for (let i = 0; i < actual.length; i += 1) {
    const d = Math.abs(actual[i] - expected[i]);
    abs += d;
    sq += d * d;
  }
  return { meanAbs: abs / actual.length, rms: Math.sqrt(sq / actual.length) };
}

// 1. Master
if (!existsSync(MASTER)) {
  errors.push(`Master DR icon missing: ${MASTER}`);
} else {
  const meta = await sharp(MASTER).metadata();
  info.push(`Master DR icon: ${meta.width}×${meta.height} ${meta.format}`);
  if (meta.width !== 1024 || meta.height !== 1024) {
    errors.push(`Master DR icon must be 1024×1024, got ${meta.width}×${meta.height}`);
  }
  await assertVisibleOpaquePng("Master DR icon", MASTER);
}

// 1b. Source files read by @capacitor/assets. If any one of these is stale,
// it can override the correct DR icon later in the generation process.
if (existsSync(ASSETS_DIR)) {
  for (const rel of [
    "logo.png",
    "icon.png",
    "icon-only.png",
    "icon-foreground.png",
    "ios/icon.png",
    "android/icon.png",
    "android/icon-foreground.png",
  ]) {
    await assertMatchesMaster(`assets/${rel}`, resolve(ASSETS_DIR, rel));
  }
} else {
  warns.push("assets/ source folder not found yet — it should be created by npm run icons.");
}

// 2. iOS icons
if (!shouldCheck("ios")) {
  info.push(`Skipping iOS icon folder check for TARGET_PLATFORM=${TARGET_PLATFORM}`);
} else if (!existsSync(IOS_APPICON_DIR)) {
  errors.push(
    `iOS AppIcon.appiconset not found at ${IOS_APPICON_DIR} — cap_assets step did not run.`,
  );
} else {
  const contentsPath = join(IOS_APPICON_DIR, "Contents.json");
  let contentImages = [];
  if (!existsSync(contentsPath)) {
    errors.push(`iOS AppIcon Contents.json missing: ${contentsPath}`);
  } else {
    try {
      const parsed = JSON.parse(readFileSync(contentsPath, "utf8"));
      contentImages = Array.isArray(parsed.images) ? parsed.images : [];
      info.push(`iOS AppIcon Contents.json image entries: ${contentImages.length}`);
      if (contentImages.length === 0)
        errors.push("iOS AppIcon Contents.json has no image entries.");
    } catch (error) {
      errors.push(
        `iOS AppIcon Contents.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const files = readdirSync(IOS_APPICON_DIR).filter((f) => f.endsWith(".png"));
  info.push(`iOS AppIcon.appiconset contains ${files.length} PNG(s):`);
  for (const f of files.sort()) {
    const p = join(IOS_APPICON_DIR, f);
    const size = statSync(p).size;
    info.push(`   • ${f}  (${size} bytes)`);
    if (size < 200)
      errors.push(`iOS icon ${f} is suspiciously small (${size} B) — likely empty placeholder.`);
    await assertVisibleOpaquePng(`iOS AppIcon ${f}`, p);
  }
  if (files.length === 0) errors.push("iOS AppIcon.appiconset is empty.");

  const entryByFingerprint = new Map();
  for (const entry of contentImages) {
    entryByFingerprint.set(`${entry?.idiom}|${entry?.size}|${entry?.scale}`, entry);
  }

  for (const required of IOS_REQUIRED_APPICONS) {
    const fingerprint = `${required.idiom}|${required.size}|${required.scale}`;
    const entry = entryByFingerprint.get(fingerprint);
    if (!entry) {
      errors.push(
        `iOS AppIcon Contents.json missing required Apple slot: ${required.idiom} ${required.size} ${required.scale}.`,
      );
      continue;
    }
    if (entry.filename !== required.filename) {
      errors.push(
        `iOS AppIcon ${required.idiom} ${required.size} ${required.scale} points to '${entry.filename}', expected '${required.filename}'.`,
      );
      continue;
    }
    const p = join(IOS_APPICON_DIR, required.filename);
    if (!existsSync(p)) {
      errors.push(`Required iOS AppIcon file is missing: ${required.filename}.`);
      continue;
    }
    const meta = await sharp(p)
      .metadata()
      .catch(() => null);
    if (!meta?.width || !meta?.height) {
      errors.push(`Required iOS AppIcon ${required.filename} has unreadable dimensions.`);
    } else if (meta.width !== required.pixels || meta.height !== required.pixels) {
      errors.push(
        `Required iOS AppIcon ${required.filename} is ${meta.width}×${meta.height}; expected ${required.pixels}×${required.pixels}.`,
      );
    }
  }

  for (const entry of contentImages) {
    if (!entry?.filename) {
      errors.push(
        `iOS AppIcon Contents.json entry missing filename for ${entry?.idiom ?? "unknown"} ${entry?.size ?? "unknown"} ${entry?.scale ?? "unknown"}`,
      );
      continue;
    }
    const p = join(IOS_APPICON_DIR, entry.filename);
    if (!existsSync(p))
      errors.push(`iOS AppIcon Contents.json references missing file: ${entry.filename}`);
  }

  // Perceptual + color check on the 1024 marketing icon
  const marketingEntry = contentImages.find(
    (entry) => entry?.idiom === "ios-marketing" || entry?.size === "1024x1024",
  );
  const candidates = [
    marketingEntry?.filename,
    "AppIcon-1024.png",
    "AppIcon-512@2x.png",
    "icon.png",
  ].filter(Boolean);
  const marketing = candidates.map((n) => join(IOS_APPICON_DIR, n)).find(existsSync);
  if (!marketing) {
    errors.push(
      `Could not locate required 1024×1024 iOS marketing icon in ${IOS_APPICON_DIR} (looked for ${candidates.join(", ")}).`,
    );
  } else if (existsSync(MASTER)) {
    const [hMaster, hIos] = await Promise.all([aHash(MASTER), aHash(marketing)]);
    const dist = hamming(hMaster, hIos);
    info.push(`iOS marketing icon perceptual distance from DR master: ${dist} / 64`);
    if (dist > 12) {
      errors.push(
        `iOS marketing icon does NOT match DR master (aHash distance ${dist}/64). Placeholder or wrong source likely shipped.`,
      );
    }

    const marketingMeta = await sharp(marketing).metadata();
    if (marketingMeta.width && marketingMeta.height) {
      const delta = await pixelDeltaAgainstMaster(
        marketing,
        marketingMeta.width,
        marketingMeta.height,
      );
      info.push(
        `iOS marketing icon exact pixel delta from DR resize: meanAbs=${delta.meanAbs.toFixed(2)}, rms=${delta.rms.toFixed(2)}`,
      );
      if (delta.meanAbs > MAX_MEAN_ABS_DELTA || delta.rms > MAX_RMS_DELTA) {
        errors.push(
          `iOS marketing icon pixels do NOT match DR master resize (meanAbs ${delta.meanAbs.toFixed(2)}, rms ${delta.rms.toFixed(2)}). Placeholder or wrong source likely shipped.`,
        );
      }
    }

    const { data, info: meta } = await sharp(marketing)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const avg = avgColor(data, meta.width, meta.height);
    info.push(
      `iOS marketing icon avg RGB: (${avg.r.toFixed(0)}, ${avg.g.toFixed(0)}, ${avg.b.toFixed(0)})`,
    );
    if (colorDist(avg, CAP_PLACEHOLDER_RGB) < 40) {
      errors.push(
        `iOS marketing icon avg color matches Capacitor placeholder blue — DR icon was NOT applied.`,
      );
    }
  }

  if (existsSync(IOS_PBXPROJ)) {
    const pbx = readFileSync(IOS_PBXPROJ, "utf8");
    const buildSettingsBlocks = pbx.match(/buildSettings = \{\n[\s\S]*?\n\t\t\t\};/g) ?? [];
    const iconNames = [...pbx.matchAll(/ASSETCATALOG_COMPILER_APPICON_NAME = ([^;]+);/g)].map(
      (match) => match[1].replace(/["']/g, "").trim(),
    );
    const includeAllIconAssets = [
      ...pbx.matchAll(/ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS = ([^;]+);/g),
    ].map((match) => match[1].replace(/["']/g, "").trim());
    const plistIconNames = [...pbx.matchAll(/INFOPLIST_KEY_CFBundleIconName = ([^;]+);/g)].map(
      (match) => match[1].replace(/["']/g, "").trim(),
    );
    if (iconNames.length === 0) {
      errors.push(
        "Xcode project has no ASSETCATALOG_COMPILER_APPICON_NAME setting; Apple may compile the default placeholder.",
      );
    } else {
      info.push(
        `Xcode ASSETCATALOG_COMPILER_APPICON_NAME values: ${[...new Set(iconNames)].join(", ")}`,
      );
      if (buildSettingsBlocks.length > 0 && iconNames.length !== buildSettingsBlocks.length) {
        errors.push(
          `Xcode has ${buildSettingsBlocks.length} build settings blocks but only ${iconNames.length} ASSETCATALOG_COMPILER_APPICON_NAME entries. Every build configuration must pin AppIcon.`,
        );
      }
      for (const name of iconNames) {
        if (name !== "AppIcon")
          errors.push(`Xcode app icon source is '${name}', expected 'AppIcon'.`);
      }
    }
    if (includeAllIconAssets.length > 0) {
      info.push(
        `Xcode ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS values: ${[...new Set(includeAllIconAssets)].join(", ")}`,
      );
      for (const value of includeAllIconAssets) {
        if (value !== "YES")
          errors.push(`Xcode INCLUDE_ALL_APPICON_ASSETS is '${value}', expected 'YES'.`);
      }
    }
    if (plistIconNames.length > 0) {
      info.push(
        `Xcode INFOPLIST_KEY_CFBundleIconName values: ${[...new Set(plistIconNames)].join(", ")}`,
      );
      for (const name of plistIconNames) {
        if (name !== "AppIcon")
          errors.push(`Xcode Info.plist icon name is '${name}', expected 'AppIcon'.`);
      }
    }
  }

  if (existsSync(IOS_INFO_PLIST)) {
    const infoPlist = readFileSync(IOS_INFO_PLIST, "utf8");
    const match = infoPlist.match(/<key>CFBundleIconName<\/key>\s*<string>([^<]+)<\/string>/);
    if (match) {
      info.push(`Info.plist CFBundleIconName: ${match[1]}`);
      if (match[1] !== "AppIcon")
        errors.push(`Info.plist CFBundleIconName is '${match[1]}', expected 'AppIcon'.`);
    } else {
      errors.push("Info.plist is missing CFBundleIconName. It must be present and set to AppIcon.");
    }
    const primaryIconNames = [
      ...infoPlist.matchAll(
        /<key>CFBundlePrimaryIcon<\/key>\s*<dict>[\s\S]*?<key>CFBundleIconName<\/key>\s*<string>([^<]+)<\/string>[\s\S]*?<\/dict>/g,
      ),
    ].map((entry) => entry[1]);
    if (primaryIconNames.length === 0) {
      errors.push(
        "Info.plist is missing CFBundlePrimaryIcon/CFBundleIconName entries for the primary app icon.",
      );
    }
    for (const name of primaryIconNames) {
      info.push(`Info.plist primary icon name: ${name}`);
      if (name !== "AppIcon")
        errors.push(`Info.plist primary icon name is '${name}', expected 'AppIcon'.`);
    }
    if (/<key>CFBundleIconFiles<\/key>/.test(infoPlist)) {
      errors.push(
        "Info.plist still contains CFBundleIconFiles legacy icon lists. Remove them so Apple uses the AppIcon asset catalog.",
      );
    }
    if (/<key>UIPrerenderedIcon<\/key>/.test(infoPlist)) {
      errors.push(
        "Info.plist still contains UIPrerenderedIcon. It must be absent, not true or false.",
      );
    }
  } else {
    errors.push(`Info.plist missing: ${IOS_INFO_PLIST}`);
  }
}

// 3. Android launcher icons
if (!shouldCheck("android")) {
  info.push(`Skipping Android icon folder check for TARGET_PLATFORM=${TARGET_PLATFORM}`);
} else if (existsSync(ANDROID_RES)) {
  const launchers = [];
  const launcherPaths = [];
  const primaryLauncherPaths = [];
  for (const dir of readdirSync(ANDROID_RES)) {
    if (!dir.startsWith("mipmap")) continue;
    const d = join(ANDROID_RES, dir);
    for (const f of readdirSync(d)) {
      if (f.startsWith("ic_launcher") && f.endsWith(".png")) {
        launchers.push(join(dir, f));
        launcherPaths.push(join(ANDROID_RES, dir, f));
        if (f === "ic_launcher.png" || f === "ic_launcher_round.png") {
          primaryLauncherPaths.push(join(ANDROID_RES, dir, f));
        }
      }
    }
  }
  info.push(`Android launcher icons: ${launchers.length} PNG(s) across mipmap-* folders`);
  if (launchers.length === 0)
    errors.push("Android launcher icons missing — cap_assets step did not run.");
  if (primaryLauncherPaths.length === 0)
    errors.push(
      "Android primary launcher icons missing — expected ic_launcher.png or ic_launcher_round.png.",
    );
  const largest = primaryLauncherPaths
    .map((p) => ({ p, size: statSync(p).size }))
    .sort((a, b) => b.size - a.size)[0];
  if (largest) await assertMatchesMaster("largest Android launcher icon", largest.p, 18);
} else {
  errors.push(`Android res folder not found (${ANDROID_RES}) — cap_assets step did not run.`);
}

// 4. Legacy branding scan
const legacy = /stackwise|my[\s-]?stack[\s-]?wise/i;
const nativeConfigs = [
  "capacitor.config.ts",
  "ios/App/App/Info.plist",
  "android/app/src/main/AndroidManifest.xml",
  "android/app/src/main/res/values/strings.xml",
];
for (const rel of nativeConfigs) {
  const p = resolve(root, rel);
  if (!existsSync(p)) continue;
  const txt = readFileSync(p, "utf8");
  if (legacy.test(txt)) errors.push(`Legacy Stackwise branding found in ${rel}`);
}

// Report
console.log("=== DoseRoutine native icon verification ===");
for (const line of info) console.log(line);
for (const w of warns) console.warn("WARN: " + w);
if (errors.length) {
  console.error("\nFAIL — native branding check did NOT pass:");
  for (const e of errors) console.error("  ✗ " + e);

  await writeFailureReport({ errors, warns, info });

  console.error("\nRegenerate icons: `npm run icons` (source: public/icon-master-dr.png).");
  process.exit(1);
}
console.log("\nOK — DR branding confirmed in native icon assets.");

// ---------- failure report ----------
async function collectFileStats(absPath) {
  const stat = { path: relative(root, absPath), exists: existsSync(absPath) };
  if (!stat.exists) return stat;
  try {
    stat.bytes = statSync(absPath).size;
    const meta = await sharp(absPath)
      .metadata()
      .catch(() => null);
    if (meta) {
      stat.width = meta.width ?? null;
      stat.height = meta.height ?? null;
      stat.format = meta.format ?? null;
      stat.hasAlpha = meta.hasAlpha ?? null;
    }
    const raw = await sharp(absPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .catch(() => null);
    if (raw) {
      let aMin = 255,
        aMax = 0,
        aSum = 0,
        opaquePx = 0,
        transPx = 0,
        total = 0;
      let r = 0,
        g = 0,
        b = 0;
      for (let i = 0; i < raw.data.length; i += 4) {
        const av = raw.data[i + 3];
        if (av < aMin) aMin = av;
        if (av > aMax) aMax = av;
        aSum += av;
        if (av === 255) opaquePx += 1;
        if (av === 0) transPx += 1;
        r += raw.data[i];
        g += raw.data[i + 1];
        b += raw.data[i + 2];
        total += 1;
      }
      stat.alphaMin = aMin;
      stat.alphaMax = aMax;
      stat.alphaMean = +(aSum / total).toFixed(2);
      stat.opaquePixelPct = +((opaquePx / total) * 100).toFixed(2);
      stat.transparentPixelPct = +((transPx / total) * 100).toFixed(2);
      stat.avgRGB = {
        r: Math.round(r / total),
        g: Math.round(g / total),
        b: Math.round(b / total),
      };
    }
  } catch (err) {
    stat.error = err instanceof Error ? err.message : String(err);
  }
  return stat;
}

function extractFailingPaths(errorLines) {
  const set = new Set();
  const knownDirs = [MASTER, ASSETS_DIR, IOS_APPICON_DIR, ANDROID_RES];
  for (const line of errorLines) {
    // absolute-ish paths
    for (const m of line.matchAll(/[\/\w][\w./@\-]*\.png/g)) {
      const token = m[0];
      const abs = token.startsWith("/") ? token : null;
      if (abs && existsSync(abs)) {
        set.add(abs);
        continue;
      }
      // try under known dirs
      for (const dir of knownDirs) {
        if (!dir) continue;
        const candidate =
          existsSync(dir) && statSync(dir).isDirectory() ? join(dir, token.split("/").pop()) : null;
        if (candidate && existsSync(candidate)) set.add(candidate);
      }
      // try assets/rel path
      const assetCandidate = resolve(root, token.replace(/^\/+/, ""));
      if (existsSync(assetCandidate)) set.add(assetCandidate);
    }
  }
  return [...set];
}

async function writeFailureReport({ errors, warns, info }) {
  const failingPaths = extractFailingPaths(errors);

  // Always include the master + every iOS AppIcon PNG so context is complete.
  const contextPaths = new Set(failingPaths);
  if (existsSync(MASTER)) contextPaths.add(MASTER);
  if (existsSync(IOS_APPICON_DIR)) {
    for (const f of readdirSync(IOS_APPICON_DIR).filter((n) => n.endsWith(".png"))) {
      contextPaths.add(join(IOS_APPICON_DIR, f));
    }
  }

  const stats = [];
  for (const p of [...contextPaths].sort()) stats.push(await collectFileStats(p));

  const report = {
    generatedAt: new Date().toISOString(),
    targetPlatform: TARGET_PLATFORM,
    errorCount: errors.length,
    errors,
    warnings: warns,
    info,
    failingFiles: failingPaths.map((p) => relative(root, p)),
    fileStats: stats,
  };

  const outDir = resolve(root, "docs");
  const jsonPath = resolve(outDir, "icon-verification-failure.json");
  const mdPath = resolve(outDir, "icon-verification-failure.md");
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    writeFileSync(mdPath, renderMarkdown(report));
  } catch (err) {
    console.error(
      `Could not write failure report: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  console.error("\n=== ICON VERIFICATION FAILURE REPORT ===");
  console.error(`Target platform: ${report.targetPlatform}`);
  console.error(`Errors: ${report.errorCount}`);
  if (report.failingFiles.length) {
    console.error(`\nDirectly-referenced failing files (${report.failingFiles.length}):`);
    for (const f of report.failingFiles) console.error(`  - ${f}`);
  } else {
    console.error(
      "\n(No file paths could be parsed from error messages; showing full icon-set context below.)",
    );
  }
  console.error("\nFile stats (dimensions / opacity / avg RGB):");
  const header =
    "  FILE                                                       WxH        BYTES     α min/max/mean   opaque%   trans%   avgRGB";
  console.error(header);
  console.error("  " + "-".repeat(header.length - 2));
  for (const s of stats) {
    const wh = s.width && s.height ? `${s.width}x${s.height}` : "?";
    const alpha = s.alphaMin !== undefined ? `${s.alphaMin}/${s.alphaMax}/${s.alphaMean}` : "n/a";
    const opq = s.opaquePixelPct !== undefined ? `${s.opaquePixelPct}%` : "n/a";
    const trn = s.transparentPixelPct !== undefined ? `${s.transparentPixelPct}%` : "n/a";
    const rgb = s.avgRGB ? `(${s.avgRGB.r},${s.avgRGB.g},${s.avgRGB.b})` : "n/a";
    const bytes = s.bytes !== undefined ? String(s.bytes) : "missing";
    console.error(
      `  ${s.path.padEnd(58).slice(0, 58)} ${wh.padEnd(10)} ${bytes.padEnd(9)} ${alpha.padEnd(16)} ${opq.padEnd(9)} ${trn.padEnd(8)} ${rgb}`,
    );
  }
  console.error(
    `\nFull report written to:\n  - ${relative(root, mdPath)}\n  - ${relative(root, jsonPath)}`,
  );
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# Icon verification failure report`);
  lines.push("");
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Target platform: \`${report.targetPlatform}\``);
  lines.push(`- Errors: **${report.errorCount}**`);
  lines.push("");
  lines.push(`## Errors`);
  for (const e of report.errors) lines.push(`- ✗ ${e}`);
  if (report.warnings.length) {
    lines.push("");
    lines.push(`## Warnings`);
    for (const w of report.warnings) lines.push(`- ${w}`);
  }
  lines.push("");
  lines.push(`## Failing files referenced in errors`);
  if (report.failingFiles.length === 0) lines.push(`_None parsed — see full file stats below._`);
  else for (const f of report.failingFiles) lines.push(`- \`${f}\``);
  lines.push("");
  lines.push(`## File stats`);
  lines.push("");
  lines.push(`| File | WxH | Bytes | α min/max/mean | Opaque % | Transparent % | Avg RGB |`);
  lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
  for (const s of report.fileStats) {
    const wh = s.width && s.height ? `${s.width}×${s.height}` : "?";
    const alpha = s.alphaMin !== undefined ? `${s.alphaMin}/${s.alphaMax}/${s.alphaMean}` : "n/a";
    const opq = s.opaquePixelPct !== undefined ? `${s.opaquePixelPct}%` : "n/a";
    const trn = s.transparentPixelPct !== undefined ? `${s.transparentPixelPct}%` : "n/a";
    const rgb = s.avgRGB ? `(${s.avgRGB.r}, ${s.avgRGB.g}, ${s.avgRGB.b})` : "n/a";
    const bytes = s.bytes !== undefined ? s.bytes : s.exists ? "?" : "missing";
    lines.push(`| \`${s.path}\` | ${wh} | ${bytes} | ${alpha} | ${opq} | ${trn} | ${rgb} |`);
  }
  lines.push("");
  lines.push(`## Info log`);
  lines.push("```");
  for (const l of report.info) lines.push(l);
  lines.push("```");
  return lines.join("\n") + "\n";
}
