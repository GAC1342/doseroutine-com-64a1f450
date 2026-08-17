#!/usr/bin/env node
/**
 * verify-testflight-build.mjs
 *
 * Pre-submission check that talks to the App Store Connect API and confirms:
 *   1. A build with the expected CFBundleShortVersionString + CFBundleVersion
 *      exists for the DoseRoutine app.
 *   2. Its processingState is VALID (not PROCESSING, INVALID, or FAILED).
 *   3. Export compliance is answered (usesNonExemptEncryption populated).
 *   4. It is the newest build for that marketing version (nothing shadowing it).
 *   5. App Store Connect exposes the app icons Apple extracted from the binary.
 *
 * Usage:
 *   node scripts/verify-testflight-build.mjs <version> <build>
 *   node scripts/verify-testflight-build.mjs 1.0.0 42
 *
 * Required env (same secrets Codemagic uses for TestFlight upload):
 *   APP_STORE_CONNECT_ISSUER_ID   – ASC API issuer UUID
 *   APP_STORE_CONNECT_KEY_ID      – 10-char key id (e.g. ABC123DEF4)
 *   APP_STORE_CONNECT_PRIVATE_KEY – contents of the AuthKey_XXXX.p8 (PEM)
 *   ASC_APP_ID                    – numeric App Store Connect app id
 *                                   (found in ASC → App → App Information → Apple ID)
 *
 * Exit codes:
 *   0  match + processed + compliant
 *   1  drift / not processed / compliance missing
 *   2  auth or config error
 */

import { createSign } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const [, , argVersion, argBuild] = process.argv;
if (!argVersion || !argBuild) {
  console.error("Usage: verify-testflight-build.mjs <version> <build>");
  process.exit(2);
}

const {
  APP_STORE_CONNECT_ISSUER_ID: ISSUER,
  APP_STORE_CONNECT_KEY_ID: KEY_ID,
  APP_STORE_CONNECT_PRIVATE_KEY: PRIVATE_KEY,
  ASC_APP_ID: APP_ID,
} = process.env;

for (const [name, val] of Object.entries({
  APP_STORE_CONNECT_ISSUER_ID: ISSUER,
  APP_STORE_CONNECT_KEY_ID: KEY_ID,
  APP_STORE_CONNECT_PRIVATE_KEY: PRIVATE_KEY,
  ASC_APP_ID: APP_ID,
})) {
  if (!val) {
    console.error(`❌ Missing env var: ${name}`);
    process.exit(2);
  }
}

// --- Mint an ES256 JWT for the ASC API --------------------------------------
function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function mintJwt() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER,
    iat: now,
    exp: now + 15 * 60, // ASC caps JWTs at 20 min
    aud: "appstoreconnect-v1",
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  const der = signer.sign({ key: PRIVATE_KEY, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(der)}`;
}

const token = mintJwt();
const root = process.cwd();
const masterIconPath = resolve(root, "public/icon-master-dr.png");
const appleIconExportDir = process.env.DR_APPLE_ICON_EXPORT_DIR
  ? resolve(root, process.env.DR_APPLE_ICON_EXPORT_DIR)
  : "";

// Apple may resize/compress/mask the icon it exposes through App Store
// Connect. These limits are loose enough for Apple's processing, but tight
// enough to catch the old blue Capacitor placeholder/listing icon.
const APPLE_MAX_HASH_DISTANCE = 18;
const APPLE_MAX_AVG_COLOR_DISTANCE = 90;
const APPLE_MAX_MEAN_ABS_DELTA = 35;
const APPLE_MAX_RMS_DELTA = 70;

async function ascGet(path) {
  const url = path.startsWith("http") ? path : `https://api.appstoreconnect.apple.com${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ASC ${res.status} ${path}: ${body}`);
  }
  return res.json();
}

function describeIconAsset(asset) {
  if (!asset || typeof asset !== "object") return "<missing iconAsset>";
  const parts = [];
  if (asset.width || asset.height) parts.push(`${asset.width ?? "?"}×${asset.height ?? "?"}`);
  if (asset.templateUrl) parts.push(`templateUrl=${asset.templateUrl}`);
  if (asset.url) parts.push(`url=${asset.url}`);
  if (asset.checksum) parts.push(`checksum=${asset.checksum}`);
  if (!parts.length) parts.push(JSON.stringify(asset));
  return parts.join(", ");
}

function colorDist(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

async function aHashFromBuffer(buffer) {
  const { data } = await sharp(buffer)
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

async function avgColorFromBuffer(buffer) {
  const { data } = await sharp(buffer)
    .resize(1, 1)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

async function pixelDeltaAgainstMasterBuffer(buffer, width, height) {
  const expected = await sharp(masterIconPath)
    .resize(width, height, { fit: "cover" })
    .flatten({ background: "#0b1220" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const actual = await sharp(buffer)
    .resize(width, height, { fit: "fill" })
    .flatten({ background: "#0b1220" })
    .removeAlpha()
    .raw()
    .toBuffer();

  if (expected.length !== actual.length) {
    return { meanAbs: Number.POSITIVE_INFINITY, rms: Number.POSITIVE_INFINITY };
  }

  let abs = 0;
  let sq = 0;
  for (let i = 0; i < actual.length; i += 1) {
    const d = Math.abs(actual[i] - expected[i]);
    abs += d;
    sq += d * d;
  }
  return { meanAbs: abs / actual.length, rms: Math.sqrt(sq / actual.length) };
}

function materializeAppleIconUrl(asset) {
  if (!asset || typeof asset !== "object") return "";
  if (typeof asset.url === "string" && asset.url.startsWith("http")) return asset.url;
  if (typeof asset.templateUrl !== "string") return "";
  const width = Number(asset.width ?? 1024) || 1024;
  const height = Number(asset.height ?? width) || width;
  return asset.templateUrl
    .replaceAll("{w}", String(width))
    .replaceAll("{h}", String(height))
    .replaceAll("{f}", "png")
    .replaceAll("{c}", "bb");
}

async function downloadIconBuffer(url) {
  const res = await fetch(url, { headers: { Accept: "image/png,image/jpeg,image/*" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} while downloading ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function verifyAppleExtractedIcon(buildIcons) {
  if (!existsSync(masterIconPath)) {
    err(`Master DR icon missing at ${masterIconPath}; cannot compare Apple-extracted icon pixels`);
    return;
  }

  const downloadable = buildIcons
    .map((icon) => {
      const asset = icon.attributes?.iconAsset;
      const width = Number(asset?.width ?? 0);
      const height = Number(asset?.height ?? 0);
      return { icon, asset, width, height, url: materializeAppleIconUrl(asset) };
    })
    .filter((entry) => entry.url && entry.width >= 128 && entry.height >= 128)
    .sort((a, b) => b.width * b.height - a.width * a.height);

  if (!downloadable.length) {
    err(
      "App Store Connect exposed icon metadata, but no downloadable icon URL/template was available to verify pixels",
    );
    return;
  }

  const target = downloadable[0];
  let buffer;
  try {
    buffer = await downloadIconBuffer(target.url);
  } catch (error) {
    err(
      `Could not download Apple-extracted build icon for pixel verification: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  if (appleIconExportDir) {
    mkdirSync(appleIconExportDir, { recursive: true });
    writeFileSync(
      join(appleIconExportDir, `apple-build-icon-${target.width}x${target.height}.png`),
      buffer,
    );
  }

  const [masterHash, appleHash, masterAvg, appleAvg] = await Promise.all([
    aHashFromBuffer(await sharp(masterIconPath).png().toBuffer()),
    aHashFromBuffer(buffer),
    avgColorFromBuffer(await sharp(masterIconPath).png().toBuffer()),
    avgColorFromBuffer(buffer),
  ]);
  const hashDistance = hamming(masterHash, appleHash);
  const avgDistance = colorDist(masterAvg, appleAvg);
  const meta = await sharp(buffer).metadata();
  const compareWidth = meta.width || target.width;
  const compareHeight = meta.height || target.height;
  const delta = await pixelDeltaAgainstMasterBuffer(buffer, compareWidth, compareHeight);

  console.log("");
  console.log("🎯 Apple-extracted build icon pixel check");
  console.log(`   downloaded : ${target.width}×${target.height} from App Store Connect`);
  console.log(
    `   avg RGB    : Apple (${appleAvg.r},${appleAvg.g},${appleAvg.b}) vs DR (${masterAvg.r},${masterAvg.g},${masterAvg.b})`,
  );
  console.log(
    `   distances  : hash=${hashDistance}/64, avgColor=${avgDistance.toFixed(1)}, meanAbs=${delta.meanAbs.toFixed(2)}, rms=${delta.rms.toFixed(2)}`,
  );

  if (hashDistance > APPLE_MAX_HASH_DISTANCE) {
    err(
      `Apple-extracted build icon does not visually match DR closely enough (hash distance ${hashDistance}/64)`,
    );
  }
  if (avgDistance > APPLE_MAX_AVG_COLOR_DISTANCE) {
    err(
      `Apple-extracted build icon average color is too far from DR (distance ${avgDistance.toFixed(1)}) — this is usually the stale blue icon`,
    );
  }
  if (delta.meanAbs > APPLE_MAX_MEAN_ABS_DELTA || delta.rms > APPLE_MAX_RMS_DELTA) {
    err(
      `Apple-extracted build icon pixels differ too much from DR (meanAbs ${delta.meanAbs.toFixed(2)}, rms ${delta.rms.toFixed(2)})`,
    );
  }
  if (
    hashDistance <= APPLE_MAX_HASH_DISTANCE &&
    avgDistance <= APPLE_MAX_AVG_COLOR_DISTANCE &&
    delta.meanAbs <= APPLE_MAX_MEAN_ABS_DELTA &&
    delta.rms <= APPLE_MAX_RMS_DELTA
  ) {
    pass("Apple-extracted build icon pixels match the DR icon, not the old blue icon");
  }
}

// --- Fetch builds for the marketing version ---------------------------------
// Poll: a fresh upload may still be PROCESSING for 5-30 min.
const MAX_ATTEMPTS = 12;
const WAIT_MS = 30_000;

let build = null;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const params = new URLSearchParams({
    "filter[app]": APP_ID,
    "filter[preReleaseVersion.version]": argVersion,
    "filter[version]": argBuild,
    "fields[builds]": "version,processingState,uploadedDate,expired,usesNonExemptEncryption",
    limit: "5",
  });
  const data = await ascGet(`/v1/builds?${params}`);
  build = data.data?.[0] ?? null;

  if (build && build.attributes.processingState !== "PROCESSING") break;

  const state = build?.attributes.processingState ?? "NOT_FOUND";
  console.log(
    `⏳ attempt ${attempt}/${MAX_ATTEMPTS}: build ${argVersion} (${argBuild}) state=${state}`,
  );
  if (attempt < MAX_ATTEMPTS) await sleep(WAIT_MS);
}

if (!build) {
  console.error(
    `❌ No build ${argVersion} (${argBuild}) found for app ${APP_ID} in App Store Connect.`,
  );
  console.error("   Confirm Codemagic finished uploading and that ASC_APP_ID matches this app.");
  process.exit(1);
}

// --- Assertions --------------------------------------------------------------
const a = build.attributes;
const buildId = build.id;
let fail = false;
const pass = (m) => console.log(`  ✅ ${m}`);
const err = (m) => {
  console.error(`  ❌ ${m}`);
  fail = true;
};

console.log("");
console.log(`🔎 Build ${argVersion} (${argBuild})`);
console.log(`   uploaded : ${a.uploadedDate}`);
console.log(`   state    : ${a.processingState}`);
console.log(`   expired  : ${a.expired}`);
console.log(`   encrypt  : ${a.usesNonExemptEncryption}`);

a.version === argBuild
  ? pass("CFBundleVersion matches expected build number")
  : err(`CFBundleVersion ${a.version} != expected ${argBuild}`);

a.processingState === "VALID"
  ? pass("Build is fully processed (VALID)")
  : err(`processingState=${a.processingState} (expected VALID)`);

a.expired === false
  ? pass("Build is not expired")
  : err("Build is marked expired — upload a new one");

a.usesNonExemptEncryption === false || a.usesNonExemptEncryption === true
  ? pass("Export compliance answered")
  : err(
      "Export compliance is unanswered — open the build in ASC and answer 'Uses non-exempt encryption?' (No for standard HTTPS)",
    );

// --- Newer build shadowing? --------------------------------------------------
const newer = await ascGet(
  `/v1/builds?filter[app]=${APP_ID}&filter[preReleaseVersion.version]=${argVersion}` +
    `&sort=-uploadedDate&fields[builds]=version,uploadedDate&limit=1`,
);
const top = newer.data?.[0];
if (top && top.attributes.version !== argBuild) {
  err(
    `A newer build (${top.attributes.version}, uploaded ${top.attributes.uploadedDate}) exists for version ${argVersion} — submit that one or delete it first`,
  );
} else {
  pass("No newer build shadowing this version");
}

// --- Apple-extracted icon metadata ------------------------------------------
// This is the Apple-side proof point: these are the PNG icons App Store Connect
// says it extracted from the uploaded binary for TestFlight/App Store display.
const icons = await ascGet(
  `/v1/builds/${buildId}/icons?fields[buildIcons]=iconAsset,iconType,masked,name&limit=200`,
);
const buildIcons = Array.isArray(icons.data) ? icons.data : [];
console.log("");
console.log(`🧩 Apple-extracted build icons: ${buildIcons.length}`);
if (buildIcons.length === 0) {
  err(
    "App Store Connect returned zero build icons — Apple did not expose any extracted app icon metadata for this build",
  );
} else {
  for (const icon of buildIcons) {
    const attrs = icon.attributes ?? {};
    console.log(
      `   • ${attrs.name ?? icon.id} | type=${attrs.iconType ?? "unknown"} | masked=${attrs.masked ?? "unknown"} | ${describeIconAsset(attrs.iconAsset)}`,
    );
  }
  const hasLargeIcon = buildIcons.some((icon) => {
    const asset = icon.attributes?.iconAsset;
    return Number(asset?.width ?? 0) >= 512 && Number(asset?.height ?? 0) >= 512;
  });
  hasLargeIcon
    ? pass("Apple exposes at least one large extracted app icon for this build")
    : err("Apple did not expose a 512px+ extracted app icon for this build");

  await verifyAppleExtractedIcon(buildIcons);
}

console.log("");
if (fail) {
  console.error("❌ TestFlight submission NOT ready.");
  process.exit(1);
}
console.log("✅ Version/build match, processed, and ready to submit.");
