#!/usr/bin/env node
/**
 * Post-`cap sync` gate: every PNG in the generated iOS AppIcon.appiconset must
 * be RGB (no alpha channel) and AppIcon-1024.png must be exactly 1024×1024.
 * Apple silently replaces transparent or mis-sized marketing icons with the
 * generic blue placeholder, so this must fail the build, not warn.
 *
 * Success sentinel: APPICON_PNG_MODE_GATE_PASSED
 */
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const dir = resolve(process.cwd(), "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const files = readdirSync(dir)
  .filter((file) => file.endsWith(".png"))
  .sort();

if (files.length === 0) {
  console.error(`ERROR: no PNGs found in ${dir} — icon generation did not run.`);
  process.exit(1);
}

let failed = false;
for (const file of files) {
  const meta = await sharp(join(dir, file)).metadata();
  console.log(
    `ICON ${file}: ${meta.width}x${meta.height} channels=${meta.channels ?? "unknown"} hasAlpha=${meta.hasAlpha ? "yes" : "no"}`,
  );
  if (file === "AppIcon-1024.png" && (meta.width !== 1024 || meta.height !== 1024)) {
    console.error(`ERROR: AppIcon-1024.png is ${meta.width}x${meta.height}, expected 1024x1024.`);
    failed = true;
  }
  if (meta.hasAlpha || (meta.channels ?? 0) > 3) {
    console.error(
      `ERROR: ${file} has an alpha-capable channel layout. iOS app icons must be RGB/no alpha.`,
    );
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("OK: generated iOS AppIcon PNGs are RGB/no-alpha and AppIcon-1024.png is 1024x1024.");
console.log("APPICON_PNG_MODE_GATE_PASSED");
