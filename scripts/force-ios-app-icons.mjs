#!/usr/bin/env node
/**
 * Hard overwrite the native iOS AppIcon asset catalog from the DoseRoutine DR
 * master icon. This avoids a false pass where the PWA/web icons are correct
 * but Xcode still compiles Capacitor's default blue placeholder into the IPA.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const masterIcon = resolve(root, "public/icon-master-dr.png");
const iosAppDir = resolve(root, "ios/App/App");
const appIconDir = resolve(iosAppDir, "Assets.xcassets/AppIcon.appiconset");
const pbxprojPath = resolve(root, "ios/App/App.xcodeproj/project.pbxproj");
const infoPlistPath = resolve(iosAppDir, "Info.plist");

const icons = [
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

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

async function assertOpaquePng(path, label, expectedPixels) {
  const meta = await sharp(path).metadata();
  if (!meta.width || !meta.height) {
    fail(`${label} has unreadable PNG dimensions.`);
  }
  if (meta.width !== expectedPixels || meta.height !== expectedPixels) {
    fail(
      `${label} has wrong dimensions: ${meta.width}×${meta.height}, expected ${expectedPixels}×${expectedPixels}.`,
    );
  }
  if (meta.hasAlpha || (meta.channels ?? 0) > 3) {
    fail(
      `${label} is alpha-capable (channels=${meta.channels ?? "unknown"}, hasAlpha=${meta.hasAlpha ? "yes" : "no"}). Apple app icons must be RGB/no alpha, not RGBA with fully opaque alpha.`,
    );
  }

  const { data } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let alphaMin = 255;
  let alphaMax = 0;
  for (let i = 3; i < data.length; i += 4) {
    const value = data[i];
    if (value < alphaMin) alphaMin = value;
    if (value > alphaMax) alphaMax = value;
  }
  if (alphaMin < 255 || alphaMax < 255) {
    fail(
      `${label} is not fully opaque (alpha ${alphaMin}-${alphaMax}). Apple can render this as a blank/default icon.`,
    );
  }

  const rgb = await sharp(path)
    .removeAlpha()
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = rgb.data;
  if (r < 2 && g < 2 && b < 2) {
    fail(`${label} appears visually blank after generation (average RGB ${r},${g},${b}).`);
  }

  const cornerProbeSize = Math.max(1, Math.round(expectedPixels * 0.035));
  const cornerSamples = await sharp(path)
    .removeAlpha()
    .extract({ left: 0, top: 0, width: cornerProbeSize, height: cornerProbeSize })
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [cr, cg, cb] = cornerSamples.data;
  if (cr > 235 && cg > 235 && cb > 235) {
    fail(
      `${label} has a white/rounded-looking corner. Apple app icons must be full-square artwork with no baked-in rounded corners.`,
    );
  }

  const edgeLimit = Math.max(1, Math.round(expectedPixels * 0.095));
  let brightEdgePixels = 0;
  for (let y = 0; y < meta.height; y += 1) {
    for (let x = 0; x < meta.width; x += 1) {
      const edge = Math.min(x, y, meta.width - 1 - x, meta.height - 1 - y);
      if (edge > edgeLimit) continue;
      const idx = (y * meta.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r > 85 && g > 155 && b > 155) brightEdgePixels += 1;
    }
  }
  if (brightEdgePixels > 0) {
    fail(
      `${label} has ${brightEdgePixels} bright pixels in the outer edge area, which looks like a baked iOS rounded-corner mask/ring. The icon must be clean full-square artwork.`,
    );
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertBuildSetting(source, key, value) {
  const escapedKey = escapeRegExp(key);
  const settingLinePattern = new RegExp(
    `(^\\s*)${escapedKey}(?:\\[[^\\]]+\\])?\\s*=\\s*[^;]+;`,
    "gm",
  );
  const normalized = source.replace(settingLinePattern, `$1${key} = ${value};`);
  const blockPattern = /buildSettings = \{\n[\s\S]*?\n\t\t\t\};/g;
  return normalized.replace(blockPattern, (block) => {
    const settingInBlock = new RegExp(`^\\s*${escapedKey}(?:\\[[^\\]]+\\])?\\s*=`, "m");
    if (settingInBlock.test(block)) return block;
    return block.replace(/buildSettings = \{\n/, `buildSettings = {\n\t\t\t\t${key} = ${value};\n`);
  });
}

function removeBuildSetting(source, key) {
  const escapedKey = escapeRegExp(key);
  return source.replace(
    new RegExp(`^\\s*${escapedKey}(?:\\[[^\\]]+\\])?\\s*=\\s*[^;]+;\\n`, "gm"),
    "",
  );
}

function createPbxId(source, seed) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const id = createHash("sha1")
      .update(`${seed}:${attempt}`)
      .digest("hex")
      .slice(0, 24)
      .toUpperCase();
    if (!source.includes(id)) return id;
  }
  fail(`Could not allocate a unique Xcode project id for ${seed}.`);
}

function ensureAppTargetBuildsAssetsCatalog(source) {
  const assetFileRefMatch = source.match(
    /([A-F0-9]{24}) \/\* Assets\.xcassets \*\/ = \{isa = PBXFileReference;[^}]*lastKnownFileType = folder\.assetcatalog;[^}]*path = Assets\.xcassets;[^}]*\};/,
  );
  if (!assetFileRefMatch) {
    fail(
      "Xcode project is missing the Assets.xcassets file reference; AppIcon cannot be compiled into Assets.car.",
    );
  }
  const assetFileRefId = assetFileRefMatch[1];

  const appTargetMatch = [
    ...source.matchAll(
      /([A-F0-9]{24}) \/\* App \*\/ = \{\n\s*isa = PBXNativeTarget;[\s\S]*?\n\t\t\};/g,
    ),
  ].find(
    (match) =>
      /name = App;/.test(match[0]) &&
      /productType = "com\.apple\.product-type\.application";/.test(match[0]),
  );
  if (!appTargetMatch) {
    fail(
      "Xcode project is missing the App native target; cannot verify the asset catalog build phase.",
    );
  }

  const resourcesPhaseMatch = appTargetMatch[0].match(/([A-F0-9]{24}) \/\* Resources \*\//);
  if (!resourcesPhaseMatch) {
    fail("The App target has no Copy Bundle Resources phase; Assets.xcassets cannot be archived.");
  }
  const resourcesPhaseId = resourcesPhaseMatch[1];

  const resourcesBlockPattern = new RegExp(
    `(\\n\\t\\t${resourcesPhaseId} \\/\\* Resources \\*\\/ = \\{[\\s\\S]*?files = \\(\\n)([\\s\\S]*?)(\\n\\t\\t\\t\\);[\\s\\S]*?\\n\\t\\t\\};)`,
  );
  const resourcesBlockMatch = source.match(resourcesBlockPattern);
  if (!resourcesBlockMatch) {
    fail("Could not read the App target Copy Bundle Resources files list from project.pbxproj.");
  }

  const existingBuildFileMatch = [
    ...source.matchAll(
      /([A-F0-9]{24}) \/\* Assets\.xcassets in Resources \*\/ = \{isa = PBXBuildFile; fileRef = ([A-F0-9]{24}) \/\* Assets\.xcassets \*\/; \};/g,
    ),
  ].find((match) => match[2] === assetFileRefId);
  const resourceFiles = resourcesBlockMatch[2];
  if (existingBuildFileMatch && resourceFiles.includes(existingBuildFileMatch[1])) {
    return source;
  }

  let next = source;
  const buildFileId =
    existingBuildFileMatch?.[1] ?? createPbxId(next, "Assets.xcassets in Resources");
  if (!existingBuildFileMatch) {
    const buildFileLine = `\t\t${buildFileId} /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = ${assetFileRefId} /* Assets.xcassets */; };\n`;
    if (!next.includes("/* End PBXBuildFile section */")) {
      fail(
        "Could not find PBXBuildFile section in project.pbxproj to add Assets.xcassets to Copy Bundle Resources.",
      );
    }
    next = next.replace(
      "/* End PBXBuildFile section */",
      `${buildFileLine}/* End PBXBuildFile section */`,
    );
  }

  const updatedResourcesBlockMatch = next.match(resourcesBlockPattern);
  if (!updatedResourcesBlockMatch) {
    fail("Could not reopen Copy Bundle Resources after preparing the Assets.xcassets build file.");
  }
  if (updatedResourcesBlockMatch[2].includes(buildFileId)) return next;

  return next.replace(
    resourcesBlockPattern,
    `$1$2\t\t\t\t${buildFileId} /* Assets.xcassets in Resources */,\n$3`,
  );
}

function pinInfoPlistToAppIcon(path) {
  const result = spawnSync("python3", ["-", path], {
    encoding: "utf8",
    input: String.raw`
import plistlib
import sys

path = sys.argv[1]
with open(path, "rb") as f:
    plist = plistlib.load(f)

def primary_icon_dict(existing=None):
    primary = existing if isinstance(existing, dict) else {}
    # Asset-catalog based apps should point Apple at AppIcon by name. Remove
    # legacy file lists that can make App Store Connect resolve stale icons.
    primary.pop("CFBundleIconFiles", None)
    # Do not write UIPrerenderedIcon at all. App Store Connect has shown this
    # as "Prerendered Icon Flag: Yes" when the key survives as a generated
    # build-setting string, even when the intended value was false. Omitted is
    # Apple's default false/no-shine behavior.
    primary.pop("UIPrerenderedIcon", None)
    primary["CFBundleIconName"] = "AppIcon"
    return primary

plist["CFBundleIconName"] = "AppIcon"
plist.pop("UIPrerenderedIcon", None)
plist.pop("CFBundleIconFiles", None)

icons = plist.get("CFBundleIcons")
if not isinstance(icons, dict):
    icons = {}
icons["CFBundlePrimaryIcon"] = primary_icon_dict(icons.get("CFBundlePrimaryIcon"))
plist["CFBundleIcons"] = icons

# Universal iPhone+iPad builds can expose iPad-specific icon metadata. Pin it
# too so Apple never falls back to a stale or generated Capacitor placeholder.
ipad_icons = plist.get("CFBundleIcons~ipad")
if not isinstance(ipad_icons, dict):
    ipad_icons = {}
ipad_icons["CFBundlePrimaryIcon"] = primary_icon_dict(ipad_icons.get("CFBundlePrimaryIcon"))
plist["CFBundleIcons~ipad"] = ipad_icons

with open(path, "wb") as f:
    plistlib.dump(plist, f, sort_keys=False)
`,
  });
  if (result.status !== 0) {
    fail(
      `Could not pin Info.plist to AppIcon: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }
}

if (!existsSync(iosAppDir)) {
  fail(
    "iOS native project is missing. Refusing to run `npx cap add ios` because that recreates Capacitor's default blue AppIcon. Commit ios/App/App before running this script.",
  );
}

if (!existsSync(masterIcon)) fail("Missing public/icon-master-dr.png");

const masterMeta = await sharp(masterIcon).metadata();
if (masterMeta.width !== 1024 || masterMeta.height !== 1024) {
  fail(
    `public/icon-master-dr.png must be 1024×1024. Got ${masterMeta.width}×${masterMeta.height}.`,
  );
}

mkdirSync(appIconDir, { recursive: true });

const wanted = new Set([...icons.map((icon) => icon.filename), "Contents.json"]);
for (const existing of readdirSync(appIconDir)) {
  if (!wanted.has(existing)) rmSync(join(appIconDir, existing), { recursive: true, force: true });
}

for (const icon of icons) {
  const outputPath = join(appIconDir, icon.filename);
  await sharp(masterIcon)
    .resize(icon.pixels, icon.pixels, { fit: "cover" })
    .flatten({ background: "#0b1220" })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  await assertOpaquePng(outputPath, `Generated iOS AppIcon ${icon.filename}`, icon.pixels);
}

writeFileSync(
  join(appIconDir, "Contents.json"),
  `${JSON.stringify(
    {
      images: icons.map(({ idiom, size, scale, filename }) => ({ idiom, size, scale, filename })),
      info: { version: 1, author: "com.doseroutine.app" },
    },
    null,
    2,
  )}\n`,
);

if (existsSync(pbxprojPath)) {
  const original = readFileSync(pbxprojPath, "utf8");
  let next = upsertBuildSetting(original, "ASSETCATALOG_COMPILER_APPICON_NAME", "AppIcon");
  next = upsertBuildSetting(next, "ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS", "YES");
  next = upsertBuildSetting(next, "INFOPLIST_KEY_CFBundleIconName", "AppIcon");
  next = ensureAppTargetBuildsAssetsCatalog(next);
  // Remove this generated Info.plist key entirely. A string build setting like
  // NO can still surface in App Store Connect as Prerendered Icon Flag: Yes.
  next = removeBuildSetting(next, "INFOPLIST_KEY_UIPrerenderedIcon");
  if (next !== original) writeFileSync(pbxprojPath, next);
}

if (existsSync(infoPlistPath)) {
  pinInfoPlistToAppIcon(infoPlistPath);
}

console.log(
  `Forced iOS AppIcon.appiconset to DoseRoutine DR (${icons.length} PNGs + Contents.json), pinned iPhone/iPad icon metadata to AppIcon, and removed the legacy UIPrerenderedIcon flag entirely.`,
);
