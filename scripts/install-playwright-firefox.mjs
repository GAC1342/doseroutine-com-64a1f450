#!/usr/bin/env node
/**
 * Installs and pins a Firefox build that matches THIS Playwright version, so
 * the Firefox keyboard and visual suites can run (and record baselines)
 * locally.
 *
 * Two separate problems have to be solved, and both look identical from a test
 * log ("browserType.launch failed"):
 *
 *  1. Version drift. The image may ship an older Firefox from a previous
 *     Playwright release. Its juggler protocol then rejects standard context
 *     options with `Found property "<root>.viewport.isMobile" ... not
 *     described in this scheme`. Fix: download the exact revision named in
 *     playwright-core/browsers.json.
 *
 *  2. Missing system libraries. On Nix-based dev images the downloaded build
 *     cannot find libgtk-3 and dies with `XPCOMGlueLoad error ... Couldn't
 *     load XPCOM`. The Nix-packaged Playwright Firefox next door *does* have
 *     working libraries — its ELF RPATHs point at the right /nix/store dirs.
 *     Fix: harvest those RPATHs and launch the correct-revision binary with
 *     them on LD_LIBRARY_PATH, via a small wrapper script.
 *
 * The wrapper is written to a cache dir (not the repo) and its path is what
 * playwright.config.ts and scripts/check-playwright-browsers.mjs pick up
 * automatically, so no environment variable is required after running this
 * once. PLAYWRIGHT_FIREFOX_PATH still wins if it is set.
 *
 * Usage:
 *   node scripts/install-playwright-firefox.mjs          # install + pin
 *   node scripts/install-playwright-firefox.mjs --print  # just print the path
 */
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export const FIREFOX_PIN_DIR = join(ROOT, "node_modules", ".cache", "playwright-firefox");
export const FIREFOX_WRAPPER = join(FIREFOX_PIN_DIR, "firefox");
const PIN_JSON = join(FIREFOX_PIN_DIR, "pin.json");

/** Revision this Playwright build expects (e.g. "1532"). */
export function expectedFirefoxRevision() {
  // browsers.json is not in playwright-core's `exports` map, so resolve it
  // through the package root rather than importing the subpath directly.
  const coreRoot = dirname(require.resolve("playwright-core/package.json"));
  const browsers = JSON.parse(readFileSync(join(coreRoot, "browsers.json"), "utf8"));
  const entry = browsers.browsers.find((b) => b.name === "firefox");
  return entry ? String(entry.revision) : null;
}

/** Where `playwright install` puts browsers on this machine. */
function browsersRoot() {
  return process.env.PLAYWRIGHT_BROWSERS_PATH || join(process.env.HOME ?? "/root", ".cache", "ms-playwright");
}

function installedFirefoxBinary(revision) {
  const dir = join(browsersRoot(), `firefox-${revision}`, "firefox", "firefox");
  return existsSync(dir) ? dir : null;
}

/** Does this binary start at all (no protocol involved)? */
function canRun(binary, env = {}) {
  const result = spawnSync(binary, ["--version"], {
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 60_000,
  });
  return result.status === 0 && /Firefox/i.test(result.stdout ?? "");
}

function findPatchelf() {
  const local = spawnSync("bash", ["-lc", "command -v patchelf"], { encoding: "utf8" });
  if (local.status === 0 && local.stdout.trim()) return local.stdout.trim();
  try {
    const hit = readdirSync("/nix/store").find(
      (d) => /-patchelf-[\d.]+$/.test(d) && existsSync(`/nix/store/${d}/bin/patchelf`),
    );
    return hit ? `/nix/store/${hit}/bin/patchelf` : null;
  } catch {
    return null;
  }
}

/**
 * Library search path taken from the Nix-packaged Playwright Firefox, which is
 * patchelf'd against the store's gtk3/pipewire/etc. Returns "" when this is
 * not a Nix image (nothing to fix, nothing to add).
 */
function nixLibraryPath() {
  let donor;
  try {
    const hit = readdirSync("/nix/store").find((d) => d.endsWith("-playwright-firefox"));
    donor = hit ? `/nix/store/${hit}/firefox` : null;
  } catch {
    donor = null;
  }
  if (!donor || !existsSync(donor)) return "";

  const patchelf = findPatchelf();
  if (!patchelf) return "";

  const dirs = new Set();
  for (const file of readdirSync(donor)) {
    if (!file.endsWith(".so") && file !== "firefox" && file !== "firefox-bin") continue;
    try {
      const rpath = execFileSync(patchelf, ["--print-rpath", join(donor, file)], {
        encoding: "utf8",
        timeout: 20_000,
      });
      for (const p of rpath.trim().split(":")) if (p.startsWith("/nix/store/")) dirs.add(p);
    } catch {
      /* not an ELF we can read; skip */
    }
  }
  return [...dirs].sort().join(":");
}

function writeWrapper(binary, libraryPath) {
  mkdirSync(FIREFOX_PIN_DIR, { recursive: true });
  const script = `#!/usr/bin/env bash
# Generated by scripts/install-playwright-firefox.mjs — do not edit.
# Pins the Playwright-matching Firefox build and the library path it needs.
${libraryPath ? `export LD_LIBRARY_PATH="${libraryPath}\${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"\n` : ""}exec "${binary}" "$@"
`;
  writeFileSync(FIREFOX_WRAPPER, script);
  chmodSync(FIREFOX_WRAPPER, 0o755);
  writeFileSync(
    PIN_JSON,
    `${JSON.stringify({ binary, libraryPath, pinnedAt: new Date().toISOString() }, null, 2)}\n`,
  );
}

/** The pinned wrapper, if a previous run created one that still resolves. */
export function pinnedFirefoxPath() {
  if (process.env.PLAYWRIGHT_FIREFOX_PATH) return process.env.PLAYWRIGHT_FIREFOX_PATH;
  if (!existsSync(FIREFOX_WRAPPER) || !existsSync(PIN_JSON)) return "";
  try {
    const pin = JSON.parse(readFileSync(PIN_JSON, "utf8"));
    // A Playwright upgrade invalidates the pin: the binary path carries the
    // revision, so compare against what this version now expects.
    const revision = expectedFirefoxRevision();
    if (revision && !String(pin.binary).includes(`firefox-${revision}`)) return "";
    return existsSync(pin.binary) ? FIREFOX_WRAPPER : "";
  } catch {
    return "";
  }
}

function main() {
  const printOnly = process.argv.includes("--print");
  if (printOnly) {
    process.stdout.write(`${pinnedFirefoxPath()}\n`);
    return;
  }

  const revision = expectedFirefoxRevision();
  if (!revision) {
    console.error("Could not read the expected Firefox revision from playwright-core.");
    process.exit(1);
  }
  console.log(`Playwright ${JSON.parse(readFileSync(require.resolve("playwright-core/package.json"), "utf8")).version} wants firefox-${revision}.`);

  let binary = installedFirefoxBinary(revision);
  if (!binary) {
    console.log("Downloading the matching Firefox build…");
    const install = spawnSync("npx", ["playwright", "install", "firefox"], {
      stdio: "inherit",
      env: process.env,
    });
    if (install.status !== 0) {
      console.error("`playwright install firefox` failed.");
      process.exit(install.status ?? 1);
    }
    binary = installedFirefoxBinary(revision);
  } else {
    console.log(`Already installed: ${binary}`);
  }

  if (!binary) {
    console.error(`firefox-${revision} is still missing under ${browsersRoot()}.`);
    process.exit(1);
  }

  let libraryPath = "";
  if (!canRun(binary)) {
    console.log("Binary cannot start unaided (missing system libs); resolving them…");
    libraryPath = nixLibraryPath();
    if (!libraryPath || !canRun(binary, { LD_LIBRARY_PATH: libraryPath })) {
      console.error(
        "Firefox will not start on this machine. Install its OS dependencies " +
          "(`npx playwright install-deps firefox`) or set PLAYWRIGHT_FIREFOX_PATH " +
          "to a working build.",
      );
      process.exit(1);
    }
    console.log(`Resolved ${libraryPath.split(":").length} library directories.`);
  }

  writeWrapper(binary, libraryPath);
  console.log(`Pinned: ${FIREFOX_WRAPPER}`);
  console.log("playwright.config.ts picks this up automatically — no env var needed.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
