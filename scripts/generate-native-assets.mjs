#!/usr/bin/env node
/**
 * Regenerate every iOS + Android icon and splash from a single 1024×1024
 * source using @capacitor/assets.
 *
 * Source expectations are enforced by this script before generation:
 *   assets/icon.png / logo.png / icon-only.png — copied from the DR master
 *   assets/splash.png                         — generated branded splash
 *   assets/icon-foreground.png                — copied from the DR master
 *
 * Usage:
 *   bun run icons
 *
 * Requires `ios/` and `android/` folders (created by `npx cap add ios|android`).
 */
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetsDir = resolve(root, "assets");
mkdirSync(assetsDir, { recursive: true });

const masterIcon = resolve(root, "public/icon-master-dr.png");
if (!existsSync(masterIcon)) {
  console.error("Missing required DoseRoutine DR master icon: public/icon-master-dr.png");
  process.exit(1);
}

const masterMeta = await sharp(masterIcon).metadata();
if (masterMeta.width !== 1024 || masterMeta.height !== 1024) {
  console.error(
    `public/icon-master-dr.png must be 1024×1024. Got ${masterMeta.width}×${masterMeta.height}.`,
  );
  process.exit(1);
}

function copyMaster(rel) {
  const dest = resolve(assetsDir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(masterIcon, dest);
  console.log(`Wrote assets/${rel} from public/icon-master-dr.png`);
}

async function forceAndroidLauncherIcons() {
  const densities = [
    ["mipmap-ldpi", 36],
    ["mipmap-mdpi", 48],
    ["mipmap-hdpi", 72],
    ["mipmap-xhdpi", 96],
    ["mipmap-xxhdpi", 144],
    ["mipmap-xxxhdpi", 192],
  ];

  for (const [folder, size] of densities) {
    const dir = resolve(root, "android/app/src/main/res", folder);
    if (!existsSync(dir)) continue;

    const png = await sharp(masterIcon).resize(size, size).png().toBuffer();
    for (const file of ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]) {
      const dest = resolve(dir, file);
      await sharp(png).toFile(dest);
      console.log(`Force-wrote Android ${folder}/${file} from DR master.`);
    }
  }
}

// Force every filename @capacitor/assets may read to the DR icon. A stale
// icon-only.png, logo.png, or platform-specific icon can override icon.png and
// silently bring back Capacitor's blue placeholder.
for (const stale of ["icon-fg.png", "doseroutine-app-icon.png"]) {
  rmSync(resolve(assetsDir, stale), { force: true });
}

for (const rel of [
  "logo.png",
  "logo-dark.png",
  "icon.png",
  "icon-only.png",
  "icon-foreground.png",
  "ios/icon.png",
  "android/icon.png",
  "android/icon-foreground.png",
]) {
  copyMaster(rel);
}

// Branded splash source: dark DoseRoutine background with the DR icon centered.
await sharp({
  create: {
    width: 2732,
    height: 2732,
    channels: 4,
    background: "#0b1220",
  },
})
  .composite([
    {
      input: await sharp(masterIcon).resize(860, 860).png().toBuffer(),
      gravity: "center",
    },
  ])
  .png()
  .toFile(resolve(assetsDir, "splash.png"));
copyFileSync(resolve(assetsDir, "splash.png"), resolve(assetsDir, "splash-dark.png"));
console.log("Wrote branded 2732×2732 splash sources.");

// Platform selection: default is both. `--android-only` / `--ios-only` let the
// CI workflows regenerate just the platform they are building (the Android
// workflow has no reason to touch — or require — the iOS catalog).
const argv = process.argv.slice(2);
const androidOnly = argv.includes("--android-only");
const iosOnly = argv.includes("--ios-only");
const platformFlags = androidOnly ? ["--android"] : iosOnly ? ["--ios"] : ["--ios", "--android"];
console.log(`Generating native assets for: ${platformFlags.join(" ")}`);

const result = spawnSync(
  "npx",
  [
    "capacitor-assets",
    "generate",
    ...platformFlags,
    "--iconBackgroundColor",
    "#0b1220",
    "--iconBackgroundColorDark",
    "#0b1220",
    "--splashBackgroundColor",
    "#0b1220",
    "--splashBackgroundColorDark",
    "#0b1220",
  ],
  { stdio: "inherit" },
);

if ((result.status ?? 0) !== 0) {
  process.exit(result.status ?? 1);
}

if (!iosOnly) {
  await forceAndroidLauncherIcons();
}

if (androidOnly) {
  console.log("Android launcher icons + splash regenerated from public/icon-master-dr.png.");
  process.exit(0);
}

// @capacitor/assets is the normal generator, but Apple/TestFlight reads the
// compiled iOS AppIcon catalog from the signed IPA. Force-write that catalog
// after generation so no stale Capacitor placeholder can survive.
const forceIos = spawnSync(process.execPath, [resolve(root, "scripts/force-ios-app-icons.mjs")], {
  stdio: "inherit",
});
process.exit(forceIos.status ?? 0);
