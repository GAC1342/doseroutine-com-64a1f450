import { test, expect, type ConsoleMessage } from "@playwright/test";
import { dismissFirstRunOverlays, dismissPaywall, signIn } from "./utils";
import {
  IGNORED_CONSOLE_PATTERNS,
  deviceShape,
  emulateNativeShell,
  expectNoFatalUi,
  readUncaught,
  collectUncaught,
  isBenignError,
  watchLaunch,
} from "./native-signals";

/**
 * Final pre-submission smoke: on-device (iOS/Android shells), logging
 * disabled, crash-free.
 *
 * "Logging disabled" means the app runs with no debug switch on:
 *   - no `?debug=1` in the URL and no `doseroutine_debug` localStorage flag
 *   - the query-cache debug panel and admin attribution panel must not render
 *   - the app must emit no console chatter at all (log/info/warn/debug/error)
 *     beyond the browser/tooling noise allowlist
 *
 * "Crash-free" reuses the launch signal collectors: uncaught errors,
 * unhandled rejections, renderer crashes, 5xx documents/scripts, the global
 * error-boundary fallback and the runtime recovery banner.
 *
 * Point it at a production build with PLAYWRIGHT_BASE_URL (see
 * `npm run test:e2e:prod-smoke`), which is the build where dev-only overlays
 * and React dev warnings are compiled out.
 */

/** Public routes a reviewer can reach without an account. */
const PUBLIC_ROUTES = ["/", "/peptide-calculator", "/peptides", "/articles", "/manual", "/faq"];

/** Signed-in surfaces exercised on device. */
const PRIVATE_ROUTES = ["/today", "/stack", "/progress", "/food", "/calendar", "/more"];

type ConsoleEntry = { type: string; text: string };

/** Records every console message the app emits, minus tooling noise. */
function watchConsole(page: import("@playwright/test").Page): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    const text = msg.text();
    if (IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text)) || isBenignError(text)) return;
    entries.push({ type: msg.type(), text });
  });
  return entries;
}

/** Fails on any debug affordance that should never ship to a reviewer. */
async function expectNoDebugUi(page: import("@playwright/test").Page): Promise<void> {
  await expect(page.getByLabel("Query cache debug panel")).toHaveCount(0);
  await expect(page.getByText(/attribution debug/i)).toHaveCount(0);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await expect(page.getByText(/\bdebug mode\b/i)).toHaveCount(0);
  await expectNoFatalUi(page);
}

/**
 * The pre-hydration boot script appends a `robots: noindex` meta to <head>
 * on any host that is NOT doseroutine.com — i.e. exactly when this suite runs
 * against a local production worker. React sees the extra head node and logs a
 * recoverable hydration error (#418) that cannot happen on the real domain,
 * where the branch never executes. Everything else still fails the run.
 */
function isLocalHostArtifact(text: string): boolean {
  return (
    /Minified React error #418/.test(text) ||
    // The emulated shell reports "native" but ships no real Capacitor Sentry
    // plugin, so the SDK logs a fallback notice. Never happens on a device.
    /Native (Sentry SDK failed to initialize|Client is not available)/.test(text)
  );
}

/**
 * Visits one route and asserts it landed clean, naming the route in every
 * failure message — a sweep-wide assertion tells you a page broke but not
 * which one, which is useless when the run is the last gate before submit.
 */

async function visitClean(
  page: import("@playwright/test").Page,
  route: string,
  signals: ReturnType<typeof watchLaunch>,
  consoleEntries: ConsoleEntry[],
): Promise<void> {
  const before = {
    pageErrors: signals.pageErrors.length,
    consoleErrors: signals.consoleErrors.length,
    serverErrors: signals.serverErrors.length,
    console: consoleEntries.length,
  };

  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${route} document status`).toBeLessThan(400);
  await expect(page.locator("main, body").first()).toBeVisible({ timeout: 20_000 });
  // Hydration errors surface a tick after the document is interactive.
  await page.waitForTimeout(1200);
  await expectNoDebugUi(page);

  expect(signals.crashed, `renderer crashed on ${route}`).toBe(false);
  expect(
    signals.pageErrors.slice(before.pageErrors).filter((t) => !isLocalHostArtifact(t)),
    `uncaught errors on ${route}`,
  ).toEqual([]);

  expect(signals.serverErrors.slice(before.serverErrors), `5xx responses on ${route}`).toEqual([]);
  expect(
    signals.consoleErrors.slice(before.consoleErrors).filter((t) => !isLocalHostArtifact(t)),
    `console errors on ${route}`,
  ).toEqual([]);
  expect(
    consoleEntries.slice(before.console).filter((e) => !isLocalHostArtifact(e.text)),
    `console output on ${route}`,
  ).toEqual([]);
}

function smokeSuite(label: string, platform: "ios" | "android"): void {
  test(`${label}: public routes render clean with logging disabled`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    await collectUncaught(page);
    const signals = watchLaunch(page);
    const consoleEntries = watchConsole(page);

    for (const route of PUBLIC_ROUTES) {
      await visitClean(page, route, signals, consoleEntries);
      // The debug flag must stay unset — nothing may turn logging on for us.
      const flag = await page.evaluate(() => window.localStorage.getItem("doseroutine_debug"));
      expect(flag, `debug flag set on ${route}`).toBeNull();
    }

    expect(signals.crashed, "renderer crashed during public route sweep").toBe(false);
    expect(
      (await readUncaught(page)).filter((t) => !isLocalHostArtifact(t)),
      "uncaught errors / rejections during public route sweep",
    ).toEqual([]);
    expect(
      consoleEntries.filter((e) => !isLocalHostArtifact(e.text)),
      "console output with logging disabled",
    ).toEqual([]);
  });

  test(`${label}: signed-in surfaces render clean with logging disabled`, async ({ page }) => {
    test.skip(
      !process.env["TEST_USER_EMAIL"] || !process.env["TEST_USER_PASSWORD"],
      "requires TEST_USER_EMAIL / TEST_USER_PASSWORD",
    );
    test.setTimeout(180_000);

    await emulateNativeShell(page, platform);
    await collectUncaught(page);
    const signals = watchLaunch(page);
    const consoleEntries = watchConsole(page);

    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    for (const route of PRIVATE_ROUTES) {
      await visitClean(page, route, signals, consoleEntries);
    }

    expect(signals.crashed, "renderer crashed during authenticated sweep").toBe(false);
    expect(
      (await readUncaught(page)).filter((t) => !isLocalHostArtifact(t)),
      "uncaught errors / rejections during authenticated route sweep",
    ).toEqual([]);
    expect(
      consoleEntries.filter((e) => !isLocalHostArtifact(e.text)),
      "console output with logging disabled",
    ).toEqual([]);
  });
}

test.describe("iOS shell", () => {
  test.use(deviceShape("iPhone 13"));
  smokeSuite("ios", "ios");
});

test.describe("Android shell", () => {
  test.use(deviceShape("Pixel 7"));
  smokeSuite("android", "android");
});
