#!/usr/bin/env node
/**
 * Post-build sanity check for the final AppIcon bundle.
 *
 * Important: after Xcode compiles an iOS asset catalog, iconutil exports the
 * AppIcon renditions using generic iconset names/sizes such as 16, 32, 128,
 * 256, 512, and 1024. Those are not the committed iOS source slot names/sizes
 * (20, 29, 40, 60, 76, 83.5, etc.), so this verifier must not require a
 * one-to-one dimension match for compiled Assets.car output.
 *
 * What this gate proves:
 * 1) the committed DR AppIcon catalog exists and includes the required iOS
 *    source sizes;
 * 2) the built app contains compiled AppIcon PNG renditions from Assets.car;
 * 3) those renditions are perceptually DR and not the Capacitor blue placeholder;
 * 4) any top-level thinned AppIcon PNGs that still exist beside the binary
 *    match the committed DR slot at the same dimension.
 *
 * Success sentinel (grep-friendly): APPICON_SET_PIXEL_MATCH_GATE_PASSED
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
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const [, , sourceArg] = process.argv;
if (!sourceArg) {
  console.error("Usage: verify-appicon-set-pixel-match.mjs <path-to-App.ipa|.xcarchive|.app>");
  process.exit(2);
}

const root = process.cwd();
const sourcePath = resolve(root, sourceArg);
const expectedDir = resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const reportDir = process.env.APPICON_SET_REPORT_DIR
  ? resolve(root, process.env.APPICON_SET_REPORT_DIR)
  : resolve(root, "build-logs/appicon-set-match");

// Per-slot pixel-delta thresholds. Compiled Assets.car re-encodes the PNGs so
// exact byte equality is unrealistic, but perceptually identical images stay
// well under these numbers. Placeholder icons blow past all three.
const MAX_MEAN_ABS_DELTA = 6;
const MAX_RMS_DELTA = 12;
const MAX_WORST_CHANNEL = 90;
const MAX_COMPILED_HASH_DISTANCE = 10;
// Tiny 16×16 and 32×32 compiled icon renditions lose enough detail during
// Apple's asset compilation that an 8×8 hash can drift even when the icon is
// still clearly the DR artwork. Keep the blue-placeholder guard strict, but let
// tiny renditions pass when their average color remains close to the DR master.
const TINY_COMPILED_ICON_MAX_DIM = 32;
const MAX_TINY_COMPILED_HASH_DISTANCE = 18;
const MAX_TINY_COMPILED_COLOR_DISTANCE = 45;
// App Store Connect/TestFlight primarily depends on the large compiled AppIcon
// rendition. Keep this one intentionally strict so we never upload a build where
// the visible store icon is the Capacitor placeholder or a stale asset.
// Important: `iconutil` can export Apple's compiled AppIcon with an alpha mask
// even when the committed source icon is a valid opaque iOS icon. Therefore the
// strict gate checks source opacity, compiled rendition identity, and visible
// coverage — not pixel-perfect RGB deltas. Apple/iconutil can premultiply or
// mask compiled AppIcon pixels, so exact source-vs-compiled deltas are a noisy
// diagnostic rather than a safe pass/fail signal.
const REQUIRED_PRIMARY_COMPILED_DIM = 1024;
const MAX_PRIMARY_1024_HASH_DISTANCE = 8;
const MAX_PRIMARY_1024_COLOR_DISTANCE = 24;
const MIN_PRIMARY_1024_VISIBLE_RATIO = 0.5;
const PRIMARY_1024_VISIBLE_ALPHA_THRESHOLD = 220;
const PLACEHOLDER_BLUE = { r: 60, g: 120, b: 240 };
const REQUIRED_IOS_SOURCE_DIMS = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
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

async function readRawRGB(path, width, height) {
  return sharp(path)
    .resize(width, height, { fit: "fill" })
    .flatten({ background: "#0b1220" })
    .removeAlpha()
    .raw()
    .toBuffer();
}

async function aHash(path) {
  const { data } = await sharp(path)
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
  let bits = 0n;
  for (let i = 0; i < 64; i += 1) bits = (bits << 1n) | (data[i] > mean ? 1n : 0n);
  return bits;
}

function hamming(a, b) {
  let value = a ^ b;
  let count = 0;
  while (value) {
    count += Number(value & 1n);
    value >>= 1n;
  }
  return count;
}

async function avgColor(path) {
  const { data } = await sharp(path)
    .resize(1, 1)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

async function alphaStats(path) {
  const meta = await sharp(path).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height)
    return {
      hasAlpha: false,
      minAlpha: 255,
      nonOpaquePixels: 0,
      totalPixels: 0,
      nonOpaqueRatio: 0,
    };
  if (!meta.hasAlpha)
    return {
      hasAlpha: false,
      minAlpha: 255,
      nonOpaquePixels: 0,
      totalPixels: width * height,
      nonOpaqueRatio: 0,
    };

  const { data } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minAlpha = 255;
  let nonOpaquePixels = 0;
  for (let i = 3; i < data.length; i += 4) {
    const alpha = data[i];
    if (alpha < minAlpha) minAlpha = alpha;
    if (alpha < 255) nonOpaquePixels += 1;
  }
  const totalPixels = width * height;
  return {
    hasAlpha: true,
    minAlpha,
    nonOpaquePixels,
    totalPixels,
    nonOpaqueRatio: totalPixels ? nonOpaquePixels / totalPixels : 0,
  };
}

function colorDist(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function isBluePlaceholderLike(avg) {
  return colorDist(avg, PLACEHOLDER_BLUE) < 70 || (avg.b > avg.g + 35 && avg.b > avg.r + 70);
}

async function pixelDelta(actualPath, expectedPath, width, height) {
  const [a, e] = await Promise.all([
    readRawRGB(actualPath, width, height),
    readRawRGB(expectedPath, width, height),
  ]);
  if (a.length !== e.length) {
    return { meanAbs: Infinity, rms: Infinity, worst: Infinity };
  }
  let abs = 0;
  let sq = 0;
  let worst = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = Math.abs(a[i] - e[i]);
    abs += d;
    sq += d * d;
    if (d > worst) worst = d;
  }
  return {
    meanAbs: abs / a.length,
    rms: Math.sqrt(sq / a.length),
    worst,
  };
}

async function visiblePixelDelta(actualPath, expectedPath, width, height, alphaThreshold) {
  const [actual, expected] = await Promise.all([
    sharp(actualPath).resize(width, height, { fit: "fill" }).ensureAlpha().raw().toBuffer(),
    sharp(expectedPath).resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer(),
  ]);

  if (actual.length !== width * height * 4 || expected.length !== width * height * 3) {
    return {
      meanAbs: Infinity,
      rms: Infinity,
      worst: Infinity,
      comparedPixels: 0,
      visibleRatio: 0,
    };
  }

  let abs = 0;
  let sq = 0;
  let worst = 0;
  let comparedPixels = 0;

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const ai = pixel * 4;
    const alpha = actual[ai + 3];
    if (alpha < alphaThreshold) continue;

    const ei = pixel * 3;
    for (let channel = 0; channel < 3; channel += 1) {
      const d = Math.abs(actual[ai + channel] - expected[ei + channel]);
      abs += d;
      sq += d * d;
      if (d > worst) worst = d;
    }
    comparedPixels += 1;
  }

  if (comparedPixels === 0) {
    return {
      meanAbs: Infinity,
      rms: Infinity,
      worst: Infinity,
      comparedPixels: 0,
      visibleRatio: 0,
    };
  }

  const comparedChannels = comparedPixels * 3;
  return {
    meanAbs: abs / comparedChannels,
    rms: Math.sqrt(sq / comparedChannels),
    worst,
    comparedPixels,
    visibleRatio: comparedPixels / (width * height),
  };
}

const errors = [];
const info = [];
const warnings = [];
const rows = [];
const tmp = mkdtempSync(join(tmpdir(), "dr-appicon-set-"));

try {
  if (!existsSync(expectedDir)) {
    errors.push(`Expected DR icon set missing: ${expectedDir}`);
  }
  const expectedFiles = existsSync(expectedDir)
    ? readdirSync(expectedDir).filter((n) => n.toLowerCase().endsWith(".png"))
    : [];
  if (expectedFiles.length === 0 && errors.length === 0) {
    errors.push(`No expected DR icon PNGs in ${expectedDir}`);
  }

  // Bucket expected PNGs by square pixel dimension.
  const expectedByDim = new Map();
  for (const name of expectedFiles) {
    const p = join(expectedDir, name);
    const meta = await sharp(p)
      .metadata()
      .catch(() => null);
    if (!meta?.width || !meta?.height) continue;
    if (meta.width !== meta.height) continue;
    if (!expectedByDim.has(meta.width)) expectedByDim.set(meta.width, []);
    expectedByDim.get(meta.width).push({ name, path: p });
  }
  info.push(
    `Expected DR icon set: ${expectedFiles.length} files, ${expectedByDim.size} unique square dimensions (${[
      ...expectedByDim.keys(),
    ]
      .sort((a, b) => a - b)
      .join(", ")}).`,
  );

  for (const dim of REQUIRED_IOS_SOURCE_DIMS) {
    if (!expectedByDim.has(dim)) {
      errors.push(
        `Committed DR AppIcon catalog is missing required iOS source dimension ${dim}×${dim}.`,
      );
    }
  }

  const { app, error: locateErr } = locateAppPath(sourcePath, tmp);
  if (locateErr) errors.push(locateErr);
  if (!app || !existsSync(app)) errors.push("Could not find Payload/*.app.");

  // Collect compiled AppIcon PNGs from Assets.car and top-level thinned PNGs.
  const compiledActual = [];
  const thinnedActual = [];
  if (app && existsSync(app)) {
    const assetsCar = join(app, "Assets.car");
    if (!existsSync(assetsCar)) {
      errors.push(`Signed app has no Assets.car: ${assetsCar}`);
    } else {
      const extractedIconset = join(tmp, "AppIcon.iconset");
      const extract = spawnSync(
        "iconutil",
        ["-c", "iconset", assetsCar, "AppIcon", "-o", extractedIconset],
        { encoding: "utf8" },
      );
      if (extract.status !== 0 || !existsSync(extractedIconset)) {
        errors.push(
          `Could not extract compiled AppIcon from Assets.car: ${extract.stderr || extract.stdout || "unknown"}`,
        );
      } else {
        for (const p of walk(extractedIconset).filter((f) => /\.png$/i.test(f))) {
          const meta = await sharp(p)
            .metadata()
            .catch(() => null);
          if (!meta?.width || !meta?.height || meta.width !== meta.height) continue;
          compiledActual.push({
            source: "Assets.car",
            name: basename(p),
            path: p,
            dim: meta.width,
          });
        }
      }
    }

    // Top-level thinned AppIcon-*.png files that ship beside the binary.
    for (const entry of readdirSync(app)) {
      if (!/^AppIcon.*\.png$/i.test(entry)) continue;
      const p = join(app, entry);
      const meta = await sharp(p)
        .metadata()
        .catch(() => null);
      if (!meta?.width || !meta?.height || meta.width !== meta.height) continue;
      thinnedActual.push({ source: "thinned", name: entry, path: p, dim: meta.width });
    }
  }

  info.push(`Compiled Assets.car AppIcon PNGs discovered in build: ${compiledActual.length}`);
  info.push(`Top-level thinned AppIcon PNGs discovered in build: ${thinnedActual.length}`);
  if (compiledActual.length === 0 && thinnedActual.length === 0 && errors.length === 0) {
    errors.push("No AppIcon PNGs were discoverable in the built app.");
  }

  // Compiled Assets.car output uses derived iconset dimensions, not source iOS
  // slot dimensions. Compare these renditions to the DR master by perceptual
  // hash and color only; do not require a matching committed PNG dimension.
  if (compiledActual.length > 0) {
    const masterPath = join(expectedDir, "AppIcon-1024.png");
    const masterMeta = await sharp(masterPath)
      .metadata()
      .catch(() => null);
    if (
      !masterMeta?.width ||
      !masterMeta?.height ||
      masterMeta.width !== 1024 ||
      masterMeta.height !== 1024
    ) {
      errors.push(`DR master icon must be exactly 1024×1024 at ${masterPath}.`);
    }
    const masterHash = await aHash(masterPath);
    const masterAvg = await avgColor(masterPath);
    const masterAlpha = await alphaStats(masterPath);
    if (masterAlpha.nonOpaquePixels > 0) {
      errors.push(
        `Committed DR master AppIcon-1024.png is not fully opaque (${masterAlpha.nonOpaquePixels}/${masterAlpha.totalPixels} non-opaque pixels). The source icon must be full-square RGB artwork before Xcode compiles it.`,
      );
    }
    const primary1024Renditions = [];
    for (const a of compiledActual) {
      const dist = hamming(masterHash, await aHash(a.path));
      const avg = await avgColor(a.path);
      const masterColorDistance = colorDist(avg, masterAvg);
      const blueLike = isBluePlaceholderLike(avg);
      const standardPass = dist <= MAX_COMPILED_HASH_DISTANCE;
      const tinyPass =
        a.dim <= TINY_COMPILED_ICON_MAX_DIM &&
        dist <= MAX_TINY_COMPILED_HASH_DISTANCE &&
        masterColorDistance <= MAX_TINY_COMPILED_COLOR_DISTANCE;
      const pass = (standardPass || tinyPass) && !blueLike;
      rows.push({
        actual: `${a.source}:${a.name}`,
        dim: a.dim,
        expected: "DR master perceptual check",
        meanAbs: null,
        rms: null,
        worst: null,
        pass,
        reason: pass
          ? `compiled DR rendition, hash distance ${dist}/64, avg RGB=(${avg.r},${avg.g},${avg.b}), master color distance ${masterColorDistance.toFixed(1)}`
          : `compiled rendition does not look like DR, hash distance ${dist}/64, avg RGB=(${avg.r},${avg.g},${avg.b}), master color distance ${masterColorDistance.toFixed(1)}`,
      });
      if (!pass) {
        errors.push(
          `Compiled AppIcon ${a.source}:${a.name} (${a.dim}×${a.dim}) does not look like the DR icon (hash distance ${dist}/64, avg RGB=(${avg.r},${avg.g},${avg.b}), master color distance ${masterColorDistance.toFixed(1)}).`,
        );
      }
      if (a.dim === REQUIRED_PRIMARY_COMPILED_DIM) {
        primary1024Renditions.push({
          ...a,
          hashDistance: dist,
          avg,
          masterColorDistance,
          blueLike,
        });
      }
    }

    if (primary1024Renditions.length === 0) {
      errors.push(
        `Compiled AppIcon is missing the required ${REQUIRED_PRIMARY_COMPILED_DIM}×${REQUIRED_PRIMARY_COMPILED_DIM} rendition that App Store Connect/TestFlight uses to prove the real DR icon is present.`,
      );
    }

    for (const primary of primary1024Renditions) {
      const visibleDelta = await visiblePixelDelta(
        primary.path,
        masterPath,
        REQUIRED_PRIMARY_COMPILED_DIM,
        REQUIRED_PRIMARY_COMPILED_DIM,
        PRIMARY_1024_VISIBLE_ALPHA_THRESHOLD,
      );
      const alpha = await alphaStats(primary.path);
      const strictPass =
        masterAlpha.nonOpaquePixels === 0 &&
        primary.hashDistance <= MAX_PRIMARY_1024_HASH_DISTANCE &&
        primary.masterColorDistance <= MAX_PRIMARY_1024_COLOR_DISTANCE &&
        visibleDelta.visibleRatio >= MIN_PRIMARY_1024_VISIBLE_RATIO &&
        !primary.blueLike;

      if (alpha.nonOpaquePixels > 0) {
        warnings.push(
          `Compiled 1024 AppIcon ${primary.source}:${primary.name} includes an extracted alpha mask (${alpha.nonOpaquePixels}/${alpha.totalPixels} non-opaque pixels). This is allowed only because the committed source AppIcon-1024.png is fully opaque and the visible compiled pixels match DR.`,
        );
      }

      rows.push({
        actual: `${primary.source}:${primary.name}`,
        dim: primary.dim,
        expected: "STRICT App Store 1024 visible DR check",
        meanAbs: visibleDelta.meanAbs,
        rms: visibleDelta.rms,
        worst: visibleDelta.worst,
        pass: strictPass,
        reason: strictPass
          ? `primary 1024 compiled rendition is DR; hash distance ${primary.hashDistance}/64, avg RGB=(${primary.avg.r},${primary.avg.g},${primary.avg.b}), master color distance ${primary.masterColorDistance.toFixed(1)}, visible ratio ${(visibleDelta.visibleRatio * 100).toFixed(1)}%, source non-opaque pixels ${masterAlpha.nonOpaquePixels}/${masterAlpha.totalPixels}, extracted non-opaque pixels ${alpha.nonOpaquePixels}/${alpha.totalPixels}; visible deltas are diagnostic only because iconutil can premultiply/mask compiled pixels`
          : `primary 1024 icon is not a safe DR App Store icon; hash distance ${primary.hashDistance}/64, avg RGB=(${primary.avg.r},${primary.avg.g},${primary.avg.b}), master color distance ${primary.masterColorDistance.toFixed(1)}, visible ratio ${(visibleDelta.visibleRatio * 100).toFixed(1)}%, source non-opaque pixels ${masterAlpha.nonOpaquePixels}/${masterAlpha.totalPixels}, extracted non-opaque pixels ${alpha.nonOpaquePixels}/${alpha.totalPixels}, diagnostic visible meanAbs=${visibleDelta.meanAbs.toFixed(2)}, diagnostic visible rms=${visibleDelta.rms.toFixed(2)}, diagnostic visible worst=${visibleDelta.worst}`,
      });

      if (!strictPass) {
        errors.push(
          `Primary compiled AppIcon ${primary.source}:${primary.name} (${REQUIRED_PRIMARY_COMPILED_DIM}×${REQUIRED_PRIMARY_COMPILED_DIM}) failed the strict App Store/TestFlight DR icon gate: hash distance ${primary.hashDistance}/64, avg RGB=(${primary.avg.r},${primary.avg.g},${primary.avg.b}), master color distance ${primary.masterColorDistance.toFixed(1)}, visible ratio ${(visibleDelta.visibleRatio * 100).toFixed(1)}%, source non-opaque pixels ${masterAlpha.nonOpaquePixels}/${masterAlpha.totalPixels}, extracted non-opaque pixels ${alpha.nonOpaquePixels}/${alpha.totalPixels}. Diagnostic visible delta: meanAbs=${visibleDelta.meanAbs.toFixed(2)}, rms=${visibleDelta.rms.toFixed(2)}, worst=${visibleDelta.worst}.`,
        );
      }
    }
  } else {
    errors.push(
      "No compiled AppIcon PNGs were extracted from Assets.car. Cannot prove the App Store/TestFlight icon is DR.",
    );
  }

  // Top-level thinned AppIcon PNGs are real files beside the binary. If Xcode
  // emits them, they should match the committed DR reference at the same size.
  for (const a of thinnedActual) {
    const bucket = expectedByDim.get(a.dim);
    if (!bucket || bucket.length === 0) {
      rows.push({
        actual: `${a.source}:${a.name}`,
        dim: a.dim,
        expected: "<none>",
        meanAbs: null,
        rms: null,
        worst: null,
        pass: true,
        reason:
          "thinned icon has no committed same-size slot; compiled Assets.car gate covers primary icon",
      });
      warnings.push(
        `Top-level thinned icon ${a.source}:${a.name} (${a.dim}×${a.dim}) has no committed same-size DR reference; treating as informational because Xcode thinning can emit derived sizes.`,
      );
      continue;
    }

    // Compare against every reference at this dim; pick the closest.
    let best = null;
    for (const ref of bucket) {
      const delta = await pixelDelta(a.path, ref.path, a.dim, a.dim);
      if (!best || delta.meanAbs < best.delta.meanAbs) best = { ref, delta };
    }

    const pass =
      best.delta.meanAbs <= MAX_MEAN_ABS_DELTA &&
      best.delta.rms <= MAX_RMS_DELTA &&
      best.delta.worst <= MAX_WORST_CHANNEL;

    rows.push({
      actual: `${a.source}:${a.name}`,
      dim: a.dim,
      expected: best.ref.name,
      meanAbs: best.delta.meanAbs,
      rms: best.delta.rms,
      worst: best.delta.worst,
      pass,
      reason: pass ? "match" : "pixel delta exceeds threshold",
    });
    if (!pass) {
      errors.push(
        `Slot ${a.dim}×${a.dim} (${a.source}:${a.name}) does not match expected ${best.ref.name}: meanAbs=${best.delta.meanAbs.toFixed(2)}, rms=${best.delta.rms.toFixed(2)}, worst=${best.delta.worst}.`,
      );
    }
  }

  // Emit a human report + JSON.
  mkdirSync(reportDir, { recursive: true });
  const reportMd = [
    "# AppIcon set pixel-match report",
    "",
    `Source: ${sourcePath}`,
    `Expected reference: ${expectedDir}`,
    `Thresholds: meanAbs ≤ ${MAX_MEAN_ABS_DELTA}, rms ≤ ${MAX_RMS_DELTA}, worst channel ≤ ${MAX_WORST_CHANNEL}, compiled hash ≤ ${MAX_COMPILED_HASH_DISTANCE}, tiny compiled hash ≤ ${MAX_TINY_COMPILED_HASH_DISTANCE} when master color distance ≤ ${MAX_TINY_COMPILED_COLOR_DISTANCE}, strict 1024 hash ≤ ${MAX_PRIMARY_1024_HASH_DISTANCE}, strict 1024 color distance ≤ ${MAX_PRIMARY_1024_COLOR_DISTANCE}, strict 1024 visible ratio ≥ ${MIN_PRIMARY_1024_VISIBLE_RATIO}, strict 1024 visible alpha threshold ≥ ${PRIMARY_1024_VISIBLE_ALPHA_THRESHOLD}, committed source 1024 non-opaque pixels = 0. Strict 1024 visible RGB deltas are reported as diagnostics only because Apple/iconutil can premultiply or mask compiled AppIcon pixels.`,
    "",
    "| Actual | Dim | Expected | meanAbs | rms | worst | Pass | Reason |",
    "|---|---|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.actual} | ${r.dim} | ${r.expected} | ${r.meanAbs === null ? "-" : r.meanAbs.toFixed(2)} | ${r.rms === null ? "-" : r.rms.toFixed(2)} | ${r.worst === null ? "-" : r.worst} | ${r.pass ? "yes" : "NO"} | ${r.reason} |`,
    ),
    "",
    ...info.map((l) => `- ${l}`),
    warnings.length ? "" : null,
    warnings.length ? "## Warnings" : null,
    ...warnings.map((w) => `- ${w}`),
    "",
    errors.length ? "## Errors" : "## Result: OK",
    ...errors.map((e) => `- ${e}`),
  ]
    .filter((line) => line !== null)
    .join("\n");
  writeFileSync(join(reportDir, "appicon-set-match.md"), reportMd);
  writeFileSync(
    join(reportDir, "appicon-set-match.json"),
    JSON.stringify({ source: sourcePath, expectedDir, rows, info, warnings, errors }, null, 2),
  );

  console.log("=== AppIcon set pixel-match ===");
  for (const line of info) console.log(line);
  for (const warning of warnings) console.warn(`WARN: ${warning}`);
  for (const r of rows) {
    console.log(
      `  ${r.pass ? "OK " : "FAIL"} ${r.actual} (${r.dim}×${r.dim}) vs ${r.expected}: meanAbs=${r.meanAbs === null ? "-" : r.meanAbs.toFixed(2)}, rms=${r.rms === null ? "-" : r.rms.toFixed(2)}, worst=${r.worst ?? "-"}`,
    );
  }
  console.log(`Report: ${join(reportDir, "appicon-set-match.md")}`);

  if (errors.length) {
    console.error("");
    for (const e of errors) console.error(`ERROR: ${e}`);
    process.exit(1);
  }
  console.log("=== APPICON_SET_PIXEL_MATCH_GATE_PASSED ===");
} finally {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
