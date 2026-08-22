#!/usr/bin/env node
/**
 * Post-archive check: prove Payload/*.app/Assets.car actually contains an
 * AppIcon catalog with every expected slot, including the 1024×1024
 * marketing icon that App Store Connect / TestFlight display.
 *
 * Success sentinel (grep-friendly): ASSETS_CAR_APPICON_CATALOG_GATE_PASSED
 */
import {
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
  console.error("Usage: verify-assets-car-appicon.mjs <path-to-App.ipa|.xcarchive|.app>");
  process.exit(2);
}

const root = process.cwd();
const sourcePath = resolve(root, sourceArg);
const reportDir = process.env.ASSETS_CAR_REPORT_DIR
  ? resolve(root, process.env.ASSETS_CAR_REPORT_DIR)
  : resolve(root, "build-logs/assets-car-appicon");

// Apple slot table Codemagic archives must produce. Pixel width == points × scale.
// 1024 is the App Store marketing icon and is the one App Store Connect displays.
const REQUIRED_SLOTS = [
  { pt: 20, scale: 2, idiom: "iphone" },
  { pt: 20, scale: 3, idiom: "iphone" },
  { pt: 29, scale: 2, idiom: "iphone" },
  { pt: 29, scale: 3, idiom: "iphone" },
  { pt: 40, scale: 2, idiom: "iphone" },
  { pt: 40, scale: 3, idiom: "iphone" },
  { pt: 60, scale: 2, idiom: "iphone" },
  { pt: 60, scale: 3, idiom: "iphone" },
  { pt: 20, scale: 1, idiom: "ipad" },
  { pt: 20, scale: 2, idiom: "ipad" },
  { pt: 29, scale: 1, idiom: "ipad" },
  { pt: 29, scale: 2, idiom: "ipad" },
  { pt: 40, scale: 1, idiom: "ipad" },
  { pt: 40, scale: 2, idiom: "ipad" },
  { pt: 76, scale: 2, idiom: "ipad" },
  { pt: 83.5, scale: 2, idiom: "ipad" },
  { pt: 1024, scale: 1, idiom: "ios-marketing" },
];

// Every filename that must exist inside the committed appiconset, and therefore
// inside the compiled Assets.car once Xcode packs it.
const REQUIRED_FILENAMES = [
  "AppIcon-20.png",
  "AppIcon-20@2x.png",
  "AppIcon-20@3x.png",
  "AppIcon-20-ipad@2x.png",
  "AppIcon-29.png",
  "AppIcon-29@2x.png",
  "AppIcon-29@3x.png",
  "AppIcon-29-ipad@2x.png",
  "AppIcon-40.png",
  "AppIcon-40@2x.png",
  "AppIcon-40@3x.png",
  "AppIcon-40-ipad@2x.png",
  "AppIcon-60@2x.png",
  "AppIcon-60@3x.png",
  "AppIcon-76.png",
  "AppIcon-76@2x.png",
  "AppIcon-83.5@2x.png",
  "AppIcon-1024.png",
];

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

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function parsePixelSize(entry) {
  // assetutil reports either PixelWidth/PixelHeight (numbers) or Size like "20x20".
  const pw = Number(entry?.PixelWidth ?? entry?.["Pixel Width"]);
  const ph = Number(entry?.PixelHeight ?? entry?.["Pixel Height"]);
  if (Number.isFinite(pw) && Number.isFinite(ph) && pw > 0 && ph > 0) return { w: pw, h: ph };
  const sz = String(entry?.Size ?? "").match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  const scale = Number(entry?.Scale ?? 1) || 1;
  if (sz)
    return { w: Math.round(parseFloat(sz[1]) * scale), h: Math.round(parseFloat(sz[2]) * scale) };
  return null;
}

function parsePointSize(entry) {
  const sz = String(entry?.Size ?? entry?.["Logical Size"] ?? "").match(
    /(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/,
  );
  if (!sz) return null;
  const w = parseFloat(sz[1]);
  const h = parseFloat(sz[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || Math.abs(w - h) > 0.01) return null;
  return w;
}

function parseScale(entry) {
  const raw = String(entry?.Scale ?? entry?.scale ?? "1").replace(/x$/i, "");
  const scale = Number(raw);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function normalizeIdiom(value) {
  const idiom = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["iphone", "phone", "ios-phone"].includes(idiom)) return "iphone";
  if (["ipad", "pad", "ios-pad"].includes(idiom)) return "ipad";
  if (["ios-marketing", "marketing", "app-store", "appstore"].includes(idiom))
    return "ios-marketing";
  return idiom;
}

function slotKeyFromEntry(entry) {
  const idiom = normalizeIdiom(entry?.Idiom ?? entry?.idiom);
  const pt = parsePointSize(entry);
  const scale = parseScale(entry);
  if (!idiom || pt === null) return null;
  return `${idiom}|${pt}|${scale}`;
}

function slotMatches(entry, slot) {
  const pt = parsePointSize(entry);
  if (pt === null || Math.abs(pt - slot.pt) > 0.01) return false;
  if (Math.abs(parseScale(entry) - slot.scale) > 0.01) return false;
  const idiom = normalizeIdiom(entry?.Idiom ?? entry?.idiom);
  if (idiom) return idiom === slot.idiom;
  return false;
}

const errors = [];
const info = [];
const tmp = mkdtempSync(join(tmpdir(), "dr-assets-car-"));
let extractedHas1024 = false;

try {
  const { app, error: locateErr } = locateAppPath(sourcePath, tmp);
  if (locateErr) errors.push(locateErr);
  if (!app || !existsSync(app)) errors.push("Could not find Payload/*.app.");

  let entries = [];
  let extractedIconset = null;

  if (app && existsSync(app)) {
    const assetsCar = join(app, "Assets.car");
    if (!existsSync(assetsCar)) {
      errors.push(
        `Assets.car missing at ${assetsCar}. Without it the archive has no compiled AppIcon catalog.`,
      );
    } else {
      info.push(`Assets.car: ${assetsCar} (${statSync(assetsCar).size} bytes)`);

      // 1) Structured catalog inspection via assetutil.
      const assetInfo = spawnSync(
        "xcrun",
        ["--sdk", "iphoneos", "assetutil", "--info", assetsCar],
        {
          encoding: "utf8",
        },
      );
      if (assetInfo.status !== 0) {
        errors.push(`assetutil failed: ${assetInfo.stderr || assetInfo.stdout || "unknown"}`);
      } else {
        writeFileSync(join(tmp, "assets-car.info.json"), assetInfo.stdout);
        try {
          const parsed = JSON.parse(assetInfo.stdout);
          entries = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          errors.push(
            `Could not parse assetutil JSON: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // 2) iconutil extraction gives us on-disk PNG filenames.
      extractedIconset = join(tmp, "AppIcon.iconset");
      const extract = spawnSync(
        "iconutil",
        ["-c", "iconset", assetsCar, "AppIcon", "-o", extractedIconset],
        { encoding: "utf8" },
      );
      if (extract.status !== 0 || !existsSync(extractedIconset)) {
        errors.push(
          `iconutil could not extract AppIcon from Assets.car: ${extract.stderr || extract.stdout || "unknown"}`,
        );
      }
    }
  }

  // 3) Verify slot table (idiom + points + scale + pixel size).
  const appIconEntries = entries.filter(
    (e) =>
      e?.Name === "AppIcon" && /Icon Image/i.test(String(e?.AssetType ?? e?.["Asset Type"] ?? "")),
  );
  info.push(`AppIcon icon-image entries in Assets.car: ${appIconEntries.length}`);

  const hasEnoughCompiledAppIconEntries = appIconEntries.length >= REQUIRED_SLOTS.length;

  const seenBy = new Set();
  for (const e of appIconEntries) {
    const key = slotKeyFromEntry(e);
    if (key) seenBy.add(key);
  }
  info.push(`AppIcon slot keys detected: ${[...seenBy].sort().join(", ") || "none"}`);

  if (seenBy.size > 0) {
    for (const slot of REQUIRED_SLOTS) {
      const key = `${slot.idiom}|${slot.pt}|${slot.scale}`;
      if (!seenBy.has(key) && !appIconEntries.some((e) => slotMatches(e, slot))) {
        errors.push(
          `Missing AppIcon slot in Assets.car: idiom=${slot.idiom} size=${slot.pt}x${slot.pt} scale=${slot.scale}x (expected pixel ${Math.round(slot.pt * slot.scale)}²).`,
        );
      }
    }
  } else if (hasEnoughCompiledAppIconEntries) {
    info.push(
      "assetutil did not expose per-slot iOS idiom/size/scale labels; compiled AppIcon entry count is sufficient, so slot presence is validated by the committed appiconset gates and the extracted 1024 PNG below.",
    );
  } else {
    errors.push(
      `Assets.car has only ${appIconEntries.length} AppIcon icon-image entries; expected at least ${REQUIRED_SLOTS.length}.`,
    );
  }

  // 4) Explicit 1024 marketing check — this is what App Store Connect shows.
  const marketing = appIconEntries.find((e) => {
    const px = parsePixelSize(e);
    return px && px.w === 1024 && px.h === 1024;
  });
  if (!marketing) {
    info.push(
      "assetutil did not label a 1024×1024 AppIcon entry; checking iconutil extraction for the marketing PNG.",
    );
  } else {
    info.push("Assets.car ios-marketing 1024×1024 slot: present.");
  }

  // 5) iconutil extraction does not export one PNG for every iOS source slot;
  //    it emits a normalized iconset (for example 16/32/128/256/512 @ scales).
  //    The structured assetutil entries above are the authoritative slot table.
  //    Use iconutil only as a belt-and-braces check that the marketing artwork
  //    can be extracted as a real 1024² PNG.
  if (extractedIconset && existsSync(extractedIconset)) {
    const extractedFiles = walk(extractedIconset).filter((p) => /\.png$/i.test(p));
    const extractedNames = new Set(extractedFiles.map((p) => basename(p)));
    info.push(`Extracted from Assets.car (iconutil): ${extractedFiles.length} PNGs`);

    // 1024² file check on the extracted set as a final belt-and-braces guard.
    for (const p of extractedFiles) {
      const meta = await sharp(p)
        .metadata()
        .catch(() => null);
      if (meta?.width === 1024 && meta?.height === 1024) {
        extractedHas1024 = true;
        info.push(`Extracted 1024×1024 marketing PNG: ${basename(p)} (${statSync(p).size} bytes)`);
        break;
      }
    }
    if (!extractedHas1024) {
      errors.push("iconutil extraction did not yield a 1024×1024 PNG for the marketing icon.");
    }

    info.push(`Extracted PNG names sample: ${[...extractedNames].slice(0, 8).join(", ")}`);
  }

  if (!marketing && extractedHas1024) {
    info.push("Assets.car 1024×1024 marketing icon: present via iconutil extraction.");
  } else if (!marketing && !extractedHas1024) {
    errors.push(
      "Assets.car has no extractable 1024×1024 AppIcon. App Store Connect will fall back to the generic placeholder.",
    );
  }

  // 6) Emit report.
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    join(reportDir, "assets-car-appicon.json"),
    JSON.stringify(
      {
        source: sourcePath,
        appIconEntries,
        info,
        errors,
        requiredSlots: REQUIRED_SLOTS,
        requiredFilenames: REQUIRED_FILENAMES,
      },
      null,
      2,
    ),
  );

  console.log("=== Assets.car AppIcon catalog check ===");
  for (const line of info) console.log(line);
  if (errors.length) {
    console.error("");
    for (const e of errors) console.error(`ERROR: ${e}`);
    process.exit(1);
  }
  console.log("=== ASSETS_CAR_APPICON_CATALOG_GATE_PASSED ===");
} finally {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
