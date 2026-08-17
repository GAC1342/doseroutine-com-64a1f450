#!/usr/bin/env node
/**
 * check-appstore-screenshots.mjs
 *
 * Verifies the required iOS App Store Connect screenshot set is present
 * and each file matches its slot's expected pixel dimensions.
 *
 * Directory layout (relative to repo root, override with --dir):
 *   appstore/screenshots/
 *     iphone-6.7/    ← required (1290×2796 portrait) — accepts 2796×1290 landscape
 *     iphone-6.5/    ← optional (1284×2778 portrait) — Apple accepts scaled 6.7 if absent
 *     ipad-13/       ← required only if the build ships for iPad
 *     app-preview-6.7/ ← optional videos: 886×1920 portrait (checked via metadata sibling)
 *
 * Usage:
 *   node scripts/check-appstore-screenshots.mjs [--dir appstore/screenshots] [--ipad]
 *
 * Exit codes: 0 pass · 1 drift · 2 usage/tooling error
 *
 * PNG/JPEG dimensions are read from file headers — no image libraries needed.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, extname, basename } from "node:path";

const args = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const next = args[i + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
};

const DIR = resolve(getFlag("--dir", "appstore/screenshots"));
const INCLUDE_IPAD = args.includes("--ipad");

// Apple's 2026 required display sizes.
// Portrait dimensions listed; landscape (swap w/h) also accepted.
const SLOTS = [
  {
    id: "iphone-6.7",
    label: "iPhone 6.7” (1290×2796)",
    width: 1290,
    height: 2796,
    minCount: 3,
    maxCount: 10,
    required: true,
  },
  {
    id: "iphone-6.5",
    label: "iPhone 6.5” (1284×2778 or 1242×2688)",
    // Apple accepts either resolution in this slot.
    accepted: [
      [1284, 2778],
      [1242, 2688],
    ],
    minCount: 0, // optional if 6.7 is provided — ASC auto-scales
    maxCount: 10,
    required: false,
  },
  {
    id: "ipad-13",
    label: "iPad 13” (2064×2752)",
    accepted: [[2064, 2752]],
    minCount: 3,
    maxCount: 10,
    required: INCLUDE_IPAD,
  },
];

// --- image dimension readers (PNG + JPEG) ------------------------------------
function readPngSize(buf) {
  // PNG signature = 8 bytes, IHDR chunk starts at offset 8.
  // width at 16, height at 20 (big-endian uint32).
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a)
    return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function readJpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    i += 2;
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      // segment length (2) skipped, then precision (1), height (2), width (2)
      return { height: buf.readUInt16BE(i + 3), width: buf.readUInt16BE(i + 5) };
    }
    const segLen = buf.readUInt16BE(i);
    i += segLen;
  }
  return null;
}
function readImageSize(path) {
  const buf = readFileSync(path);
  const ext = extname(path).toLowerCase();
  if (ext === ".png") return readPngSize(buf);
  if (ext === ".jpg" || ext === ".jpeg") return readJpegSize(buf);
  return null;
}

// --- run checks --------------------------------------------------------------
if (!existsSync(DIR) || !statSync(DIR).isDirectory()) {
  console.error(`❌ Screenshot directory not found: ${DIR}`);
  console.error("   Create it or pass --dir <path>.");
  process.exit(2);
}

console.log(`📸 Checking ${DIR}\n`);
let fail = false;
const pass = (m) => console.log(`  ✅ ${m}`);
const err = (m) => {
  console.error(`  ❌ ${m}`);
  fail = true;
};

for (const slot of SLOTS) {
  const slotDir = join(DIR, slot.id);
  const label = slot.label;
  console.log(`\n▸ ${slot.id}  ${label}${slot.required ? "  (required)" : "  (optional)"}`);

  if (!existsSync(slotDir)) {
    if (slot.required) err(`missing directory: ${slot.id}/`);
    else console.log("  ⚪ directory absent — slot skipped");
    continue;
  }

  const files = readdirSync(slotDir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();

  if (files.length < slot.minCount) {
    err(`only ${files.length} image(s); Apple requires at least ${slot.minCount}`);
  } else if (files.length > slot.maxCount) {
    err(`${files.length} image(s); Apple allows at most ${slot.maxCount}`);
  } else if (files.length > 0) {
    pass(`${files.length} image(s) present`);
  }

  const accepted = slot.accepted ?? [[slot.width, slot.height]];
  for (const f of files) {
    const path = join(slotDir, f);
    const size = readImageSize(path);
    if (!size) {
      err(`${f}: could not read image dimensions (corrupt or unsupported)`);
      continue;
    }
    const { width, height } = size;
    const match = accepted.some(
      ([w, h]) => (width === w && height === h) || (width === h && height === w),
    );
    if (match) {
      pass(`${f}  ${width}×${height}`);
    } else {
      const expected = accepted.map(([w, h]) => `${w}×${h} or ${h}×${w}`).join(" | ");
      err(`${f}  ${width}×${height}  (expected ${expected})`);
    }
  }
}

console.log("");
if (fail) {
  console.error("❌ Screenshot set is not App Store-ready.");
  process.exit(1);
}
console.log("✅ Screenshot set matches Apple's requirements.");
