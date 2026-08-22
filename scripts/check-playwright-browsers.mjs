#!/usr/bin/env node
/**
 * Playwright browser doctor.
 *
 * Answers one question per engine: "can this machine actually launch it and
 * open a page?" — not "is a binary on disk". Those differ constantly:
 *
 *   - the sandbox/dev image ships browsers for a different Playwright build,
 *     so Firefox launches but its juggler protocol rejects the context
 *     ("Found property <root>.viewport.isMobile ... not described in this
 *     scheme"),
 *   - a distro Chromium is present but Playwright's bundled one is missing,
 *   - system libraries (libgtk-3, libglib) are absent, so the process exits
 *     127 before the protocol handshake.
 *
 * Every one of those looks like a mysterious test failure hours into a visual
 * run. Probing takes ~2s and turns it into an actionable message up front.
 *
 * Usage:
 *   node scripts/check-playwright-browsers.mjs                # human report
 *   node scripts/check-playwright-browsers.mjs --json         # machine output
 *   node scripts/check-playwright-browsers.mjs --require=firefox,webkit
 *
 * Exit code is 0 unless a --require'd engine is unusable, so it is safe to run
 * as an informational preflight step.
 */
import { chromium, firefox, webkit } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { pinnedFirefoxPath } from "./install-playwright-firefox.mjs";

const ENGINES = { chromium, firefox, webkit };

/**
 * Same executablePath overrides the Playwright config applies, plus the
 * system Chromium that dev sandboxes ship (Playwright's own download is often
 * unusable there for missing OS libraries).
 */
const EXECUTABLE_OVERRIDE = {
  chromium:
    process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync("/bin/chromium") ? "/bin/chromium" : ""),
  // Prefer the revision-matched build pinned by
  // scripts/install-playwright-firefox.mjs; the Nix build is only a fallback
  // so the probe can still report *why* things fail on an unprepared machine.
  firefox: pinnedFirefoxPath() || detectNixFirefox(),
  webkit: process.env.PLAYWRIGHT_WEBKIT_PATH,
};

/**
 * Nix-based dev images expose Playwright's Firefox through an FHS path whose
 * libgtk is not visible, while the underlying store path links correctly.
 * Prefer the store path so the probe reports the real problem (build/protocol
 * mismatch) instead of a misleading "missing libraries".
 */
function detectNixFirefox() {
  try {
    const hit = readdirSync("/nix/store").find((d) => d.endsWith("-playwright-firefox"));
    if (!hit) return "";
    const bin = `/nix/store/${hit}/firefox/firefox`;
    return existsSync(bin) ? bin : "";
  } catch {
    return "";
  }
}

const INSTALL_HINT = {
  chromium: "npx playwright install --with-deps chromium (or set PLAYWRIGHT_CHROMIUM_PATH)",
  firefox: "npm run e2e:install:firefox (installs the matching build and pins it)",
  webkit: "npx playwright install --with-deps webkit (or set PLAYWRIGHT_WEBKIT_PATH)",
};

/**
 * Launch, open a context and a page. The context step is the important one:
 * a protocol/version mismatch only surfaces when Playwright negotiates
 * context options, which is exactly what every spec does first.
 */
async function probe(name) {
  const executablePath = EXECUTABLE_OVERRIDE[name] || undefined;
  const started = Date.now();
  let browser;
  try {
    browser = await ENGINES[name].launch(executablePath ? { executablePath } : {});
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.setContent("<title>probe</title><p>ok</p>");
    await page.title();
    await context.close();
    return {
      engine: name,
      ok: true,
      version: browser.version(),
      executablePath: executablePath ?? null,
      ms: Date.now() - started,
    };
  } catch (error) {
    const full = String(error?.message ?? error);
    // The headline is generic ("Failed to launch the browser process"); the
    // browser's own stderr line underneath is the diagnosis.
    const stderrLine = full
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /\[err\]|not described in this scheme|Executable doesn't exist/.test(l));
    const message = (stderrLine ?? full.split("\n")[0]).slice(0, 300);
    return {
      engine: name,
      ok: false,
      reason: classify(full),
      message,
      executablePath: executablePath ?? null,
      hint: INSTALL_HINT[name],
      ms: Date.now() - started,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

/** Turns the raw failure into something a human can act on. */
function classify(message) {
  if (/not described in this scheme|Protocol error|juggler/i.test(message)) {
    return "version-mismatch: the installed browser build does not match this Playwright version";
  }
  if (/Executable doesn't exist|ENOENT/i.test(message)) return "missing: browser is not installed";
  if (/cannot open shared object file|libgtk|libglib|XPCOMGlueLoad/i.test(message)) {
    return "missing-system-libs: install OS dependencies (--with-deps)";
  }
  if (/exitCode=127/.test(message)) return "missing-system-libs: dynamic linker could not start it";
  return "unusable";
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const requireArg = args.find((a) => a.startsWith("--require="));
  const required = requireArg
    ? requireArg
        .slice("--require=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const only = args.find((a) => a.startsWith("--engines="));
  const engines = only
    ? only
        .slice("--engines=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : Object.keys(ENGINES);

  const results = [];
  for (const engine of engines) {
    if (!ENGINES[engine]) {
      results.push({ engine, ok: false, reason: "unknown engine", message: "unknown engine" });
      continue;
    }
    results.push(await probe(engine));
  }

  if (json) {
    console.log(JSON.stringify({ results }, null, 2));
  } else {
    console.log("\nPlaywright browser availability\n");
    for (const r of results) {
      const label = r.ok ? "OK  " : "FAIL";
      const detail = r.ok
        ? `${r.version}${r.executablePath ? ` (${r.executablePath})` : ""}`
        : r.reason;
      console.log(`  ${label} ${r.engine.padEnd(9)} ${detail}`);
      if (!r.ok) {
        console.log(`       ${r.message}`);
        if (r.hint) console.log(`       fix: ${r.hint}`);
      }
    }
    console.log("");
  }

  const missingRequired = required.filter((e) => !results.find((r) => r.engine === e && r.ok));
  if (missingRequired.length > 0) {
    console.error(`Required browsers unusable: ${missingRequired.join(", ")}`);
    process.exit(1);
  }
}

await main();
