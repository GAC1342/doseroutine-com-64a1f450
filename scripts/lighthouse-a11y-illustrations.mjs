#!/usr/bin/env node
/**
 * Lighthouse accessibility audit of the workout-type illustration controls.
 *
 * The controls live behind auth inside a sheet, so a plain `lighthouse <url>`
 * run can never see them: it navigates fresh and lands on /auth. This script
 * therefore:
 *   1. launches Chrome with a debugging port,
 *   2. drives the real flow with Playwright (sign in -> /fitness -> log a
 *      workout -> Yoga) so the illustration thumbnail is on screen,
 *   3. runs Lighthouse in *snapshot* mode against that live page, which audits
 *      the DOM as it currently stands instead of reloading it,
 *   4. repeats the snapshot with the full-size modal open, because the dialog
 *      is a different DOM that never exists during a normal page load.
 *
 * Output: JSON + a console summary of every failing accessibility audit, with
 * the offending selectors. Exits non-zero if any audit fails.
 *
 * Usage: node scripts/lighthouse-a11y-illustrations.mjs [--url http://localhost:8080]
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import puppeteer from "puppeteer-core";
import { startFlow } from "lighthouse";

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = argOf("--url", process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080");
// Prefer an explicit path, then a system Chromium (sandboxes ship one), then
// Playwright's bundled build (what CI installs).
const CHROME =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  (existsSync("/bin/chromium") ? "/bin/chromium" : "") ||
  chromium.executablePath?.() ||
  "/bin/chromium";
const PORT = Number(argOf("--port", "9222"));
const OUT_DIR = join("test-results", "lighthouse-a11y");
const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("TEST_USER_EMAIL / TEST_USER_PASSWORD are required (the controls are auth-gated).");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchChrome() {
  const proc = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--user-data-dir=/tmp/lh-a11y-profile",
      "--window-size=390,844",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return { proc, ws: (await res.json()).webSocketDebuggerUrl };
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error("Chrome did not expose a debugging port");
}

/** Signs in and opens the workout sheet with Yoga selected. */
async function reachIllustrationControls(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
  await page
    .evaluate(() => {
      localStorage.setItem("doseroutine:cookie-consent:v1", "accepted");
      localStorage.setItem("doseroutine_welcome_tour_v1", new Date().toISOString());
    })
    .catch(() => {});
  await page.reload({ waitUntil: "domcontentloaded" });

  const submit = page.locator('form button[type="submit"]').first();
  const toggle = page.locator('p:has-text("Already have an account?") button').first();
  // The form is server-rendered, so clicks before hydration are no-ops and a
  // pre-hydration submit does a native POST back to /auth. Retry the whole
  // sequence until the URL actually changes.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    for (let i = 0; i < 20; i += 1) {
      await toggle.click({ timeout: 5_000 }).catch(() => {});
      if (/^sign in$/i.test(((await submit.innerText().catch(() => "")) ?? "").trim())) break;
      await sleep(500);
    }
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await submit.click().catch(() => {});
    const ok = await page
      .waitForURL(/\/today|\/onboarding/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (ok) break;
    if (attempt === 5) {
      throw new Error(
        `sign-in failed; still at ${page.url()} (submit="${await submit.innerText().catch(() => "?")}")`,
      );
    }
    await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
    await sleep(1_500);
  }

  await page.goto(`${BASE}/fitness`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  // Paywall sheet intercepts pointer events on gated accounts.
  await page
    .locator("div.fixed.inset-0.z-50")
    .filter({ has: page.getByRole("button", { name: /^Close\b/ }) })
    .first()
    .getByRole("button", { name: /^Close\b/ })
    .click({ timeout: 3_000 })
    .catch(() => {});

  const fab = page.getByRole("button", { name: "Log a workout" }).first();
  await fab.waitFor({ state: "visible", timeout: 30_000 });
  await fab.click({ force: true });

  const yoga = page.getByRole("button", { name: "Yoga", exact: true }).first();
  if (!(await yoga.isVisible().catch(() => false))) {
    // Yoga sits inside a collapsed category group on some layouts.
    for (const category of ["Mind & body", "Flexibility", "Classes", "Other"]) {
      const group = page.getByRole("button", { name: category }).first();
      if (!(await group.isVisible().catch(() => false))) continue;
      await group.click().catch(() => {});
      await sleep(300);
      if (await yoga.isVisible().catch(() => false)) break;
    }
  }
  await yoga.click({ timeout: 15_000 });
  await page
    .getByRole("group", { name: /yoga illustration reference/i })
    .waitFor({ state: "visible", timeout: 15_000 });
}

/** Failing/manual-review accessibility audits, with their offending nodes. */
function summarise(lhr) {
  const cat = lhr.categories.accessibility;
  const failures = [];
  for (const ref of cat.auditRefs) {
    const audit = lhr.audits[ref.id];
    if (!audit || audit.scoreDisplayMode === "notApplicable") continue;
    if (audit.score === null || audit.score === 1) continue;
    failures.push({
      id: audit.id,
      title: audit.title,
      impact: ref.group ?? "",
      selectors: (audit.details?.items ?? [])
        .map((item) => item.node?.selector ?? item.node?.snippet ?? "")
        .filter(Boolean)
        .slice(0, 8),
    });
  }
  return { score: Math.round((cat.score ?? 0) * 100), failures };
}

const main = async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const { proc } = await launchChrome();
  let exitCode = 0;

  try {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());

    await reachIllustrationControls(page);

    // Lighthouse needs the puppeteer handle for the *same* tab.
    const pptr = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${PORT}`,
      defaultViewport: null,
    });
    const targets = await pptr.pages();
    const lhPage = targets.find((p) => p.url().includes("/fitness")) ?? targets[0];

    const flow = await startFlow(lhPage, {
      name: "Workout illustration controls",
      config: {
        extends: "lighthouse:default",
        settings: {
          onlyCategories: ["accessibility"],
          formFactor: "mobile",
          screenEmulation: { disabled: true },
        },
      },
    });

    // Snapshot 1: the thumbnail trigger inside the workout sheet.
    await flow.snapshot({ name: "Workout sheet with illustration thumbnail" });

    // Snapshot 2: the full-size modal, a DOM that only exists after activation.
    const thumb = page.getByRole("button", { name: /^Enlarge Yoga illustration/ }).first();
    await thumb.click();
    await page
      .locator('[role="dialog"][data-art-dialog="Yoga"]')
      .waitFor({ state: "visible", timeout: 10_000 });
    await sleep(300);
    await flow.snapshot({ name: "Full-size illustration modal" });

    const result = await flow.createFlowResult();
    writeFileSync(join(OUT_DIR, "flow.json"), JSON.stringify(result, null, 2));
    writeFileSync(join(OUT_DIR, "report.html"), await flow.generateReport());

    for (const step of result.steps) {
      const { score, failures } = summarise(step.lhr);
      console.log(`\n=== ${step.name} — accessibility ${score}/100 ===`);
      if (!failures.length) {
        console.log("  no failing audits");
        continue;
      }
      exitCode = 1;
      for (const f of failures) {
        console.log(`  FAIL ${f.id}: ${f.title}`);
        for (const sel of f.selectors) console.log(`       ${sel}`);
      }
    }
    console.log(`\nReports: ${join(OUT_DIR, "report.html")}`);

    await pptr.disconnect();
    await browser.close();
  } finally {
    proc.kill("SIGKILL");
  }

  process.exit(exitCode);
};

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
