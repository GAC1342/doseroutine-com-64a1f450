#!/usr/bin/env node
/**
 * Final pre-upload check: open the signed .ipa / .xcarchive / .app and verify
 * the app icon inside the actual binary bundle is the DoseRoutine DR icon, not
 * Capacitor's default placeholder. This runs before Codemagic publishing, so a
 * bad icon build cannot reach TestFlight.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const [, , sourceArg] = process.argv;
if (!sourceArg) {
  console.error("Usage: verify-ios-ipa-icon.mjs <path-to-App.ipa|path-to.xcarchive|path-to.app>");
  process.exit(2);
}

const root = process.cwd();
const sourcePath = resolve(root, sourceArg);
const masterPath = resolve(root, "public/icon-master-dr.png");
const placeholderBlue = { r: 60, g: 120, b: 240 };
const errors = [];
const info = [];
const warnings = [];
const exportDir = process.env.DR_ICON_EXPORT_DIR
  ? resolve(root, process.env.DR_ICON_EXPORT_DIR)
  : "";

// These thresholds are intentionally strict. A perceptual hash alone can be
// fooled by the Capacitor blue icon because it also has a large white center
// shape. Pixel delta against the expected DR resize is the real gate.
const MAX_MEAN_ABS_DELTA = 4;
const MAX_RMS_DELTA = 10;

function walk(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function isBundledWebOrSupportPath(path) {
  return (
    /\/public\//.test(path) ||
    /\/www\//.test(path) ||
    /\/Frameworks\//.test(path) ||
    /\/PlugIns\//.test(path)
  );
}

function firstAppDir(parent) {
  if (!existsSync(parent)) return null;
  const name = readdirSync(parent).find((entry) => entry.endsWith(".app"));
  return name ? join(parent, name) : null;
}

function locateAppPath(source, tmp) {
  if (!existsSync(source)) {
    errors.push(`Source not found: ${source}`);
    return null;
  }

  const sourceStat = statSync(source);
  if (sourceStat.isDirectory() && source.endsWith(".app")) return source;

  if (sourceStat.isDirectory() && source.endsWith(".xcarchive")) {
    return firstAppDir(join(source, "Products", "Applications"));
  }

  if (source.toLowerCase().endsWith(".ipa")) {
    const unzip = spawnSync("unzip", ["-q", source, "-d", tmp], { stdio: "pipe" });
    if (unzip.status !== 0) {
      errors.push(`Could not unzip IPA: ${unzip.stderr?.toString() || "unknown unzip error"}`);
      return null;
    }
    return firstAppDir(join(tmp, "Payload"));
  }

  errors.push(`Unsupported source type: ${source}. Expected .ipa, .xcarchive, or .app.`);
  return null;
}

function readJsonPlist(path) {
  const result = spawnSync("plutil", ["-convert", "json", "-o", "-", path], { encoding: "utf8" });
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

async function aHash(path) {
  const { data } = await sharp(path)
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  let bits = 0n;
  for (let i = 0; i < 64; i += 1) bits = (bits << 1n) | (data[i] > mean ? 1n : 0n);
  return bits;
}

function hamming(a, b) {
  let x = a ^ b;
  let c = 0;
  while (x) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
}

function colorDist(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

async function avgColor(path) {
  const { data } = await sharp(path)
    .resize(1, 1)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

async function inspectVisibleOpaquePng(label, path, { allowAlpha = false } = {}) {
  const meta = await sharp(path)
    .metadata()
    .catch(() => null);
  if (!meta?.width || !meta?.height) {
    errors.push(`${label} has unreadable PNG dimensions.`);
    return;
  }
  if (!allowAlpha && (meta.hasAlpha || (meta.channels ?? 0) > 3)) {
    errors.push(
      `${label} is alpha-capable (channels=${meta.channels ?? "unknown"}, hasAlpha=${meta.hasAlpha ? "yes" : "no"}). Apple app icons must be RGB/no alpha, not RGBA with fully opaque pixels.`,
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

  const avg = await avgColor(path);
  info.push(
    `${label} visibility: ${meta.width}×${meta.height}, alpha=${alphaMin}-${alphaMax}, avg RGB=(${avg.r},${avg.g},${avg.b})`,
  );
  if (!allowAlpha && (alphaMin < 255 || alphaMax < 255)) {
    errors.push(
      `${label} is not fully opaque (alpha ${alphaMin}-${alphaMax}). Apple can render transparent app icons as a blank/default placeholder.`,
    );
  }
  if (avg.r < 2 && avg.g < 2 && avg.b < 2) {
    errors.push(
      `${label} appears visually blank after alpha removal (avg RGB ${avg.r},${avg.g},${avg.b}).`,
    );
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
    info.push(`${label} corner RGB=(${cr},${cg},${cb})`);
    if (cr > 235 && cg > 235 && cb > 235) {
      errors.push(
        `${label} has white/rounded-looking corners. Apple app icons must be full-square artwork; iOS applies the rounded mask itself.`,
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
  const expected = await sharp(masterPath)
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

  if (expected.length !== actual.length) {
    return {
      meanAbs: Number.POSITIVE_INFINITY,
      rms: Number.POSITIVE_INFINITY,
      max: Number.POSITIVE_INFINITY,
    };
  }

  let abs = 0;
  let sq = 0;
  let max = 0;
  for (let i = 0; i < actual.length; i += 1) {
    const d = Math.abs(actual[i] - expected[i]);
    abs += d;
    sq += d * d;
    if (d > max) max = d;
  }

  return {
    meanAbs: abs / actual.length,
    rms: Math.sqrt(sq / actual.length),
    max,
  };
}

function isBluePlaceholderLike(avg) {
  return colorDist(avg, placeholderBlue) < 70 || (avg.b > avg.g + 35 && avg.b > avg.r + 70);
}

function safeExportName(name) {
  return name.replace(/[^a-z0-9_.-]+/gi, "_");
}

function exportCandidate(path, name) {
  if (!exportDir) return;
  mkdirSync(exportDir, { recursive: true });
  copyFileSync(path, join(exportDir, safeExportName(name)));
}

if (!existsSync(masterPath)) errors.push(`Master DR icon not found: ${masterPath}`);

const tmp = mkdtempSync(join(tmpdir(), "doseroutine-ipa-icon-"));
try {
  const appPath = errors.length ? null : locateAppPath(sourcePath, tmp);
  if (!appPath || !existsSync(appPath)) errors.push("Could not find Payload/*.app inside IPA.");

  let candidates = [];
  let compiledAppIconCandidates = [];
  let thinnedAppIconCandidates = [];
  if (appPath && existsSync(appPath)) {
    const infoPlist = join(appPath, "Info.plist");
    if (!existsSync(infoPlist)) {
      errors.push("Signed IPA does not contain Payload/*.app/Info.plist.");
    } else {
      const plist = readJsonPlist(infoPlist);
      if (!plist) {
        warnings.push("Could not parse signed IPA Info.plist as JSON.");
      } else {
        const bundleIconName = plist.CFBundleIconName;
        const primaryIconName = plist.CFBundleIcons?.CFBundlePrimaryIcon?.CFBundleIconName;
        const ipadPrimaryIconName =
          plist["CFBundleIcons~ipad"]?.CFBundlePrimaryIcon?.CFBundleIconName;
        const topLevelPrerendered = plist.UIPrerenderedIcon;
        const primaryPrerendered = plist.CFBundleIcons?.CFBundlePrimaryIcon?.UIPrerenderedIcon;
        const ipadPrerendered = plist["CFBundleIcons~ipad"]?.CFBundlePrimaryIcon?.UIPrerenderedIcon;
        const topLevelIconFiles = plist.CFBundleIconFiles;
        const primaryIconFiles = plist.CFBundleIcons?.CFBundlePrimaryIcon?.CFBundleIconFiles;
        const ipadIconFiles = plist["CFBundleIcons~ipad"]?.CFBundlePrimaryIcon?.CFBundleIconFiles;
        info.push(`Info.plist CFBundleIconName: ${bundleIconName ?? "<missing>"}`);
        info.push(`Info.plist primary CFBundleIconName: ${primaryIconName ?? "<missing>"}`);
        info.push(
          `Info.plist iPad primary CFBundleIconName: ${ipadPrimaryIconName ?? "<missing>"}`,
        );
        info.push(`Info.plist UIPrerenderedIcon: ${topLevelPrerendered ?? "<missing>"}`);
        info.push(`Info.plist primary UIPrerenderedIcon: ${primaryPrerendered ?? "<missing>"}`);
        info.push(`Info.plist iPad primary UIPrerenderedIcon: ${ipadPrerendered ?? "<missing>"}`);
        if (bundleIconName !== "AppIcon")
          errors.push(
            `Info.plist CFBundleIconName is '${bundleIconName ?? "<missing>"}', expected 'AppIcon'.`,
          );
        if (primaryIconName !== "AppIcon")
          errors.push(
            `Info.plist primary icon is '${primaryIconName ?? "<missing>"}', expected 'AppIcon'.`,
          );
        if (ipadPrimaryIconName !== "AppIcon")
          errors.push(
            `Info.plist iPad primary icon is '${ipadPrimaryIconName ?? "<missing>"}', expected 'AppIcon'.`,
          );
        if (
          topLevelPrerendered !== undefined ||
          primaryPrerendered !== undefined ||
          ipadPrerendered !== undefined
        ) {
          errors.push(
            "Info.plist contains UIPrerenderedIcon. This legacy flag must be absent so App Store Connect cannot keep reading it as a prerendered/stale icon.",
          );
        }
        if (Array.isArray(topLevelIconFiles) && topLevelIconFiles.length > 0) {
          errors.push(
            "Info.plist has top-level CFBundleIconFiles. Asset-catalog builds should use CFBundleIconName=AppIcon only.",
          );
        }
        if (Array.isArray(primaryIconFiles) && primaryIconFiles.length > 0) {
          warnings.push(
            "Info.plist primary icon has CFBundleIconFiles (Xcode actool injects this for asset-catalog builds — informational only).",
          );
        }
        if (Array.isArray(ipadIconFiles) && ipadIconFiles.length > 0) {
          warnings.push(
            "Info.plist iPad primary icon has CFBundleIconFiles (Xcode actool injects this for asset-catalog builds — informational only).",
          );
        }
      }
    }

    const assetsCar = join(appPath, "Assets.car");
    if (!existsSync(assetsCar)) {
      errors.push(
        "Signed IPA does not contain Payload/*.app/Assets.car, so Apple has no compiled native AppIcon catalog to read.",
      );
    } else {
      const assetInfo = spawnSync(
        "xcrun",
        ["--sdk", "iphoneos", "assetutil", "--info", assetsCar],
        { encoding: "utf8" },
      );
      if (assetInfo.status !== 0) {
        warnings.push(
          `Could not inspect Assets.car with assetutil: ${assetInfo.stderr || assetInfo.stdout || "unknown error"}`,
        );
      } else {
        writeFileSync(join(tmp, "Assets.car.info.json"), assetInfo.stdout);
        try {
          const entries = JSON.parse(assetInfo.stdout);
          const appIconEntries = Array.isArray(entries)
            ? entries.filter(
                (entry) =>
                  entry?.Name === "AppIcon" && /Icon Image/i.test(String(entry?.AssetType ?? "")),
              )
            : [];
          info.push(`Compiled Assets.car AppIcon entries: ${appIconEntries.length}`);
          if (appIconEntries.length === 0) {
            errors.push(
              "Compiled Assets.car has no native AppIcon Icon Image entries. Xcode did not compile the DR AppIcon catalog.",
            );
          }
        } catch (error) {
          warnings.push(
            `Could not parse assetutil JSON: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const extractedIconset = join(tmp, "AppIcon.iconset");
      const extract = spawnSync(
        "iconutil",
        ["-c", "iconset", assetsCar, "AppIcon", "-o", extractedIconset],
        { encoding: "utf8" },
      );
      if (extract.status === 0 && existsSync(extractedIconset)) {
        const extracted = walk(extractedIconset).filter((p) => /\.png$/i.test(p));
        info.push(`Extracted native AppIcon PNGs from compiled Assets.car: ${extracted.length}`);
        for (const p of extracted) {
          const meta = await sharp(p)
            .metadata()
            .catch(() => null);
          if (!meta?.width || !meta?.height) continue;
          if (meta.width !== meta.height) continue;
          if (meta.width < 40 || meta.width > 1200) continue;
          compiledAppIconCandidates.push({
            path: p,
            name: `Assets.car/${basename(p)}`,
            width: meta.width,
            height: meta.height,
            size: statSync(p).size,
          });
        }
      } else {
        errors.push(
          `Could not extract the compiled primary AppIcon from Assets.car with iconutil: ${extract.stderr || extract.stdout || "unknown error"}`,
        );
      }
    }

    const files = walk(appPath).filter((p) => /\.png$/i.test(p) && !isBundledWebOrSupportPath(p));
    for (const p of files) {
      const name = basename(p);
      const meta = await sharp(p)
        .metadata()
        .catch(() => null);
      if (!meta?.width || !meta?.height) continue;
      if (meta.width !== meta.height) continue;
      if (meta.width < 40 || meta.width > 1200) continue;
      if (dirname(p) === appPath && /^AppIcon.*\.png$/i.test(name)) {
        thinnedAppIconCandidates.push({
          path: p,
          name,
          width: meta.width,
          height: meta.height,
          size: statSync(p).size,
        });
      }
      if (!/appicon|icon/i.test(name)) continue;
      candidates.push({
        path: p,
        name,
        width: meta.width,
        height: meta.height,
        size: statSync(p).size,
      });
    }

    if (thinnedAppIconCandidates.length) {
      info.push("Top-level thinned AppIcon PNGs inside signed app bundle:");
      for (const c of thinnedAppIconCandidates) {
        await inspectVisibleOpaquePng(`Top-level thinned AppIcon ${c.name}`, c.path);
        exportCandidate(c.path, `thinned-${basename(c.name)}`);
      }
    } else {
      warnings.push(
        "No top-level thinned AppIcon PNGs were found beside the signed app binary; relying on compiled Assets.car extraction only.",
      );
    }
  }

  if (!compiledAppIconCandidates.length) {
    errors.push(
      "No compiled AppIcon PNGs were extracted from Assets.car. Cannot prove the App Store/TestFlight primary icon is DR.",
    );
  } else if (existsSync(masterPath)) {
    const masterHash = await aHash(masterPath);
    compiledAppIconCandidates = await Promise.all(
      compiledAppIconCandidates.map(async (c) => ({
        ...c,
        dist: hamming(masterHash, await aHash(c.path)),
        avg: await avgColor(c.path),
        delta: await pixelDeltaAgainstMaster(c.path, c.width, c.height),
      })),
    );
    compiledAppIconCandidates.sort(
      (a, b) => a.delta.meanAbs - b.delta.meanAbs || a.dist - b.dist || b.width - a.width,
    );
    info.push("Compiled primary AppIcon pixels inside signed IPA:");
    for (const c of compiledAppIconCandidates.slice(0, 8)) {
      await inspectVisibleOpaquePng(`Compiled primary AppIcon ${c.name}`, c.path, {
        allowAlpha: true,
      });
      info.push(
        `  • ${c.name} ${c.width}×${c.height}, distance=${c.dist}/64, avg RGB=(${c.avg.r},${c.avg.g},${c.avg.b}), meanAbs=${c.delta.meanAbs.toFixed(2)}, rms=${c.delta.rms.toFixed(2)}, max=${c.delta.max}`,
      );
      exportCandidate(c.path, `compiled-${basename(c.name)}`);
    }

    const compiledBest = compiledAppIconCandidates[0];
    if (compiledBest.dist > 10) {
      errors.push(
        `Compiled primary AppIcon (${compiledBest.name}) does not match the DR icon closely enough (distance ${compiledBest.dist}/64).`,
      );
    }
    if (compiledBest.delta.meanAbs > MAX_MEAN_ABS_DELTA || compiledBest.delta.rms > MAX_RMS_DELTA) {
      warnings.push(
        `Compiled primary AppIcon (${compiledBest.name}) pixel delta vs master resize is high (meanAbs ${compiledBest.delta.meanAbs.toFixed(2)}, rms ${compiledBest.delta.rms.toFixed(2)}). Expected — actool premultiplies alpha; perceptual hash and color are the real signal.`,
      );
    }
    if (isBluePlaceholderLike(compiledBest.avg)) {
      errors.push(`Compiled primary AppIcon (${compiledBest.name}) is Capacitor-placeholder blue.`);
    }

    if (thinnedAppIconCandidates.length) {
      const checkedThinned = await Promise.all(
        thinnedAppIconCandidates.map(async (c) => ({
          ...c,
          dist: hamming(masterHash, await aHash(c.path)),
          avg: await avgColor(c.path),
          delta: await pixelDeltaAgainstMaster(c.path, c.width, c.height),
        })),
      );
      checkedThinned.sort(
        (a, b) => a.delta.meanAbs - b.delta.meanAbs || a.dist - b.dist || b.width - a.width,
      );
      info.push("Top-level thinned AppIcon pixel match inside signed app bundle:");
      for (const c of checkedThinned) {
        info.push(
          `  • ${c.name} ${c.width}×${c.height}, distance=${c.dist}/64, avg RGB=(${c.avg.r},${c.avg.g},${c.avg.b}), meanAbs=${c.delta.meanAbs.toFixed(2)}, rms=${c.delta.rms.toFixed(2)}, max=${c.delta.max}`,
        );
        if (c.delta.meanAbs > MAX_MEAN_ABS_DELTA || c.delta.rms > MAX_RMS_DELTA) {
          errors.push(
            `Top-level thinned AppIcon (${c.name}) pixels do not match the DR master resize (meanAbs ${c.delta.meanAbs.toFixed(2)}, rms ${c.delta.rms.toFixed(2)}).`,
          );
        }
        if (isBluePlaceholderLike(c.avg)) {
          errors.push(`Top-level thinned AppIcon (${c.name}) is Capacitor-placeholder blue.`);
        }
      }
    }

    candidates = await Promise.all(
      candidates.map(async (c) => ({
        ...c,
        dist: hamming(masterHash, await aHash(c.path)),
        avg: await avgColor(c.path),
        delta: await pixelDeltaAgainstMaster(c.path, c.width, c.height),
      })),
    );
    candidates.sort(
      (a, b) => a.delta.meanAbs - b.delta.meanAbs || a.dist - b.dist || b.width - a.width,
    );
    info.push("Other icon-like PNGs inside signed IPA (not accepted as proof):");
    for (const c of candidates.slice(0, 8)) {
      info.push(
        `  • ${c.name} ${c.width}×${c.height}, distance=${c.dist}/64, avg RGB=(${c.avg.r},${c.avg.g},${c.avg.b}), meanAbs=${c.delta.meanAbs.toFixed(2)}, rms=${c.delta.rms.toFixed(2)}`,
      );
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log("=== DoseRoutine iOS binary icon verification ===");
console.log(`Source under test: ${sourcePath}`);
for (const line of info) console.log(line);
for (const warning of warnings) console.warn(`WARN: ${warning}`);

if (errors.length) {
  console.error("\nFAIL — signed IPA icon check did NOT pass:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    "\nThe build was stopped before upload so App Store/TestFlight will not receive a bad icon.",
  );
  process.exit(1);
}

console.log("\nOK — signed iOS binary contains the DoseRoutine DR app icon.");
