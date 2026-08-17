#!/usr/bin/env node
/**
 * Focused CI guard: AppIcon.appiconset/Contents.json must declare every Apple
 * slot DoseRoutine ships, including the 1024×1024 ios-marketing icon and all
 * 20/29/40/60/76/83.5 idiom+scale variants. Fails loudly if any slot is
 * missing, unfilled, or points at the wrong filename.
 *
 * Success sentinel: APPICON_CONTENTS_SLOTS_GATE_PASSED
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const contentsPath = resolve(
  process.cwd(),
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json",
);

// Full Apple slot matrix required for App Store submission.
// Keep in lockstep with scripts/force-ios-app-icons.mjs.
const REQUIRED = [
  // iPhone notification / settings / spotlight / app
  { idiom: "iphone", size: "20x20", scale: "2x", filename: "AppIcon-20@2x.png" },
  { idiom: "iphone", size: "20x20", scale: "3x", filename: "AppIcon-20@3x.png" },
  { idiom: "iphone", size: "29x29", scale: "2x", filename: "AppIcon-29@2x.png" },
  { idiom: "iphone", size: "29x29", scale: "3x", filename: "AppIcon-29@3x.png" },
  { idiom: "iphone", size: "40x40", scale: "2x", filename: "AppIcon-40@2x.png" },
  { idiom: "iphone", size: "40x40", scale: "3x", filename: "AppIcon-40@3x.png" },
  { idiom: "iphone", size: "60x60", scale: "2x", filename: "AppIcon-60@2x.png" },
  { idiom: "iphone", size: "60x60", scale: "3x", filename: "AppIcon-60@3x.png" },
  // iPad notification / settings / spotlight / app / pro
  { idiom: "ipad", size: "20x20", scale: "1x", filename: "AppIcon-20.png" },
  { idiom: "ipad", size: "20x20", scale: "2x", filename: "AppIcon-20-ipad@2x.png" },
  { idiom: "ipad", size: "29x29", scale: "1x", filename: "AppIcon-29.png" },
  { idiom: "ipad", size: "29x29", scale: "2x", filename: "AppIcon-29-ipad@2x.png" },
  { idiom: "ipad", size: "40x40", scale: "1x", filename: "AppIcon-40.png" },
  { idiom: "ipad", size: "40x40", scale: "2x", filename: "AppIcon-40-ipad@2x.png" },
  { idiom: "ipad", size: "76x76", scale: "1x", filename: "AppIcon-76.png" },
  { idiom: "ipad", size: "76x76", scale: "2x", filename: "AppIcon-76@2x.png" },
  { idiom: "ipad", size: "83.5x83.5", scale: "2x", filename: "AppIcon-83.5@2x.png" },
  // App Store marketing — the icon App Store Connect / TestFlight display
  { idiom: "ios-marketing", size: "1024x1024", scale: "1x", filename: "AppIcon-1024.png" },
];

const errors = [];

if (!existsSync(contentsPath)) {
  errors.push(`${contentsPath} is missing.`);
} else {
  let json;
  try {
    json = JSON.parse(readFileSync(contentsPath, "utf8"));
  } catch (e) {
    errors.push(`Contents.json is not valid JSON: ${e.message}`);
  }

  if (json) {
    const images = Array.isArray(json.images) ? json.images : [];
    const bySlot = new Map(images.map((i) => [`${i?.idiom}|${i?.size}|${i?.scale}`, i]));

    for (const slot of REQUIRED) {
      const key = `${slot.idiom}|${slot.size}|${slot.scale}`;
      const entry = bySlot.get(key);
      if (!entry) {
        errors.push(`Missing slot ${key} (expected filename ${slot.filename}).`);
        continue;
      }
      if (!entry.filename) {
        errors.push(
          `Slot ${key} is present but has no filename — Xcode will treat it as unfilled.`,
        );
        continue;
      }
      if (entry.filename !== slot.filename) {
        errors.push(`Slot ${key} points to ${entry.filename}; expected ${slot.filename}.`);
      }
    }

    // Extra guardrails on the ios-marketing 1024 slot specifically, since that
    // is the one App Store Connect surfaces and the one Apple silently swaps
    // for a placeholder when it's missing or transparent.
    const marketing = bySlot.get("ios-marketing|1024x1024|1x");
    if (!marketing) {
      errors.push("Required App Store 1024×1024 ios-marketing slot is missing.");
    } else if (marketing.filename !== "AppIcon-1024.png") {
      errors.push(
        `ios-marketing 1024×1024 slot filename is "${marketing.filename}"; must be "AppIcon-1024.png".`,
      );
    }

    // Detect duplicate slot declarations that would make Xcode pick one
    // non-deterministically.
    const seen = new Set();
    for (const i of images) {
      const key = `${i?.idiom}|${i?.size}|${i?.scale}`;
      if (seen.has(key)) errors.push(`Duplicate slot declaration: ${key}.`);
      seen.add(key);
    }

    console.log(
      `AppIcon Contents.json declares ${images.length} images across ${bySlot.size} unique slots (required: ${REQUIRED.length}).`,
    );
  }
}

if (errors.length) {
  console.error("FAIL — AppIcon Contents.json slot check:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error("");
  console.error("Regenerate with `node scripts/force-ios-app-icons.mjs` and re-run.");
  process.exit(1);
}

console.log("OK — every required AppIcon slot is declared with the expected filename.");
console.log("APPICON_CONTENTS_SLOTS_GATE_PASSED");
