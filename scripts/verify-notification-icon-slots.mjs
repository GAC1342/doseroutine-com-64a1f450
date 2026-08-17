#!/usr/bin/env node
/**
 * CI guard for iOS Notification / Settings / Spotlight / Home Screen icon slots.
 *
 * Apple requires the following small-size slots inside AppIcon.appiconset,
 * separate from the 1024 marketing icon — if any of these is missing or its
 * PNG doesn't exist at the correct pixel size, iOS silently substitutes a
 * placeholder for notifications, Settings, and Spotlight. This gate fails
 * the build before upload if any of them are missing, mis-sized, or
 * transparent.
 *
 *   Notification icons  20pt @2x (40 px)   iphone
 *                       20pt @3x (60 px)   iphone
 *                       20pt @1x (20 px)   ipad
 *                       20pt @2x (40 px)   ipad
 *   Settings icons      29pt @2x (58 px)   iphone
 *                       29pt @3x (87 px)   iphone
 *                       29pt @1x (29 px)   ipad
 *                       29pt @2x (58 px)   ipad
 *   Spotlight icons     40pt @2x (80 px)   iphone
 *                       40pt @3x (120 px)  iphone
 *                       40pt @1x (40 px)   ipad
 *                       40pt @2x (80 px)   ipad
 *   Home Screen icons   60pt @2x (120 px)  iphone
 *                       60pt @3x (180 px)  iphone
 *
 * Additionally, if ios/App/App/Assets.xcassets/NotificationIcon.appiconset
 * (standalone notification icon set used by some Capacitor / notification
 * service extensions) exists, its Contents.json is validated the same way.
 *
 * Success sentinel (grep-friendly): NOTIFICATION_ICON_SLOTS_GATE_PASSED
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const APPICON_DIR = resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const NOTIFICATION_ICON_DIR = resolve(
  root,
  "ios/App/App/Assets.xcassets/NotificationIcon.appiconset",
);

// Minimum small-size slots — the ones surfaced by notifications, Settings,
// Spotlight, and the Home Screen. Marketing 1024 is validated elsewhere.
const REQUIRED_APPICON_SLOTS = [
  // Notifications
  { role: "Notification (iPhone @2x)", idiom: "iphone", size: "20x20", scale: "2x", pxWidth: 40 },
  { role: "Notification (iPhone @3x)", idiom: "iphone", size: "20x20", scale: "3x", pxWidth: 60 },
  { role: "Notification (iPad @1x)", idiom: "ipad", size: "20x20", scale: "1x", pxWidth: 20 },
  { role: "Notification (iPad @2x)", idiom: "ipad", size: "20x20", scale: "2x", pxWidth: 40 },
  // Settings
  { role: "Settings (iPhone @2x)", idiom: "iphone", size: "29x29", scale: "2x", pxWidth: 58 },
  { role: "Settings (iPhone @3x)", idiom: "iphone", size: "29x29", scale: "3x", pxWidth: 87 },
  { role: "Settings (iPad @1x)", idiom: "ipad", size: "29x29", scale: "1x", pxWidth: 29 },
  { role: "Settings (iPad @2x)", idiom: "ipad", size: "29x29", scale: "2x", pxWidth: 58 },
  // Spotlight
  { role: "Spotlight (iPhone @2x)", idiom: "iphone", size: "40x40", scale: "2x", pxWidth: 80 },
  { role: "Spotlight (iPhone @3x)", idiom: "iphone", size: "40x40", scale: "3x", pxWidth: 120 },
  { role: "Spotlight (iPad @1x)", idiom: "ipad", size: "40x40", scale: "1x", pxWidth: 40 },
  { role: "Spotlight (iPad @2x)", idiom: "ipad", size: "40x40", scale: "2x", pxWidth: 80 },
  // Home screen
  { role: "Home Screen (iPhone @2x)", idiom: "iphone", size: "60x60", scale: "2x", pxWidth: 120 },
  { role: "Home Screen (iPhone @3x)", idiom: "iphone", size: "60x60", scale: "3x", pxWidth: 180 },
];

// Slots a standalone NotificationIcon.appiconset must ship if it exists.
// Standalone notification icons are always 20pt.
const REQUIRED_NOTIFICATION_ICONSET_SLOTS = [
  { role: "Notification (iPhone @2x)", idiom: "iphone", size: "20x20", scale: "2x", pxWidth: 40 },
  { role: "Notification (iPhone @3x)", idiom: "iphone", size: "20x20", scale: "3x", pxWidth: 60 },
  { role: "Notification (iPad @1x)", idiom: "ipad", size: "20x20", scale: "1x", pxWidth: 20 },
  { role: "Notification (iPad @2x)", idiom: "ipad", size: "20x20", scale: "2x", pxWidth: 40 },
];

// PNG header parser — dims (bytes 16..24) + IHDR color type (byte 25).
// Color types with alpha: 4 (grayscale+A) and 6 (RGBA). We flag those as
// potentially transparent so Apple doesn't reject notification icons.
function readPngHeader(path) {
  const buf = readFileSync(path);
  if (buf.length < 33 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    return { error: "not a PNG file" };
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  return { width, height, colorType, hasAlphaChannel: colorType === 4 || colorType === 6 };
}

const errors = [];
const info = [];

function checkIconset(label, dir, required) {
  const contentsPath = join(dir, "Contents.json");
  if (!existsSync(contentsPath)) {
    errors.push(`${label}: Contents.json missing at ${contentsPath}.`);
    return;
  }
  let json;
  try {
    json = JSON.parse(readFileSync(contentsPath, "utf8"));
  } catch (e) {
    errors.push(`${label}: Contents.json is not valid JSON: ${e.message}`);
    return;
  }
  const images = Array.isArray(json?.images) ? json.images : [];
  const bySlot = new Map(images.map((i) => [`${i?.idiom}|${i?.size}|${i?.scale}`, i]));

  // Duplicate slot detection — Xcode picks non-deterministically.
  const seen = new Set();
  for (const i of images) {
    const key = `${i?.idiom}|${i?.size}|${i?.scale}`;
    if (seen.has(key)) errors.push(`${label}: duplicate slot declaration ${key}.`);
    seen.add(key);
  }

  let okCount = 0;
  for (const slot of required) {
    const key = `${slot.idiom}|${slot.size}|${slot.scale}`;
    const entry = bySlot.get(key);
    if (!entry) {
      errors.push(
        `${label}: ${slot.role} slot missing (${key}, expected PNG ${slot.pxWidth}×${slot.pxWidth}).`,
      );
      continue;
    }
    if (!entry.filename) {
      errors.push(
        `${label}: ${slot.role} slot ${key} declared but has no filename — Xcode treats it as unfilled and iOS falls back to a placeholder.`,
      );
      continue;
    }
    const pngPath = join(dir, entry.filename);
    if (!existsSync(pngPath) || !statSync(pngPath).isFile()) {
      errors.push(
        `${label}: ${slot.role} slot ${key} references ${entry.filename} but that PNG is not on disk in ${dir}.`,
      );
      continue;
    }
    const header = readPngHeader(pngPath);
    if (header.error) {
      errors.push(`${label}: ${slot.role} (${entry.filename}) ${header.error}.`);
      continue;
    }
    if (header.width !== slot.pxWidth || header.height !== slot.pxWidth) {
      errors.push(
        `${label}: ${slot.role} (${entry.filename}) is ${header.width}×${header.height}; must be ${slot.pxWidth}×${slot.pxWidth}. iOS will reject the notification icon.`,
      );
      continue;
    }
    if (header.hasAlphaChannel) {
      errors.push(
        `${label}: ${slot.role} (${entry.filename}) PNG color type ${header.colorType} carries an alpha channel. Apple rejects transparent notification / Settings / Spotlight icons — flatten onto brand background and re-export.`,
      );
      continue;
    }
    okCount += 1;
  }

  info.push(
    `${label}: ${okCount}/${required.length} required small-size slots verified (${images.length} total declared).`,
  );
}

if (!existsSync(APPICON_DIR)) {
  errors.push(`AppIcon.appiconset missing at ${APPICON_DIR}`);
} else {
  checkIconset("AppIcon.appiconset", APPICON_DIR, REQUIRED_APPICON_SLOTS);
}

if (existsSync(NOTIFICATION_ICON_DIR)) {
  checkIconset(
    "NotificationIcon.appiconset",
    NOTIFICATION_ICON_DIR,
    REQUIRED_NOTIFICATION_ICONSET_SLOTS,
  );
} else {
  info.push(
    "NotificationIcon.appiconset not present — relying on AppIcon 20pt slots for notification rendering (default Capacitor setup).",
  );
}

console.log("=== Notification / Settings / Spotlight icon slot check ===");
for (const line of info) console.log(`  ${line}`);

if (errors.length) {
  console.error("");
  console.error("FAIL — notification icon slots incomplete:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error("");
  console.error(
    "FIX: run `node scripts/force-ios-app-icons.mjs` to regenerate the full slot matrix and commit the updated AppIcon.appiconset (and NotificationIcon.appiconset if present).",
  );
  process.exit(1);
}

console.log("");
console.log(
  "OK — every required notification / Settings / Spotlight / Home Screen slot is declared, sized correctly, and opaque.",
);
console.log("NOTIFICATION_ICON_SLOTS_GATE_PASSED");
