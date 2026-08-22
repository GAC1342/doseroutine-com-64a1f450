import { test, expect, dismissFirstRunOverlays, dismissPaywall, signIn } from "./utils";
import {
  assertClean,
  deviceShape,
  emulateNativeShell,
  expectNoFatalUi,
  launchViaDeepLink,
  watchLaunch,
} from "./native-signals";

/**
 * iOS / Android launch smoke.
 *
 * Reproduces what the store reviewer does on a cold device: open the app
 * shell, land on the first authenticated screen (/today) and confirm it
 * actually renders instead of aborting. Build 95 shipped a SIGABRT launch
 * crash nobody caught because every existing e2e ran on a desktop viewport
 * with no fatal-error assertion.
 *
 * What counts as a fatal launch failure here:
 *   - the global error boundary fallback ("Something went wrong")
 *   - the runtime error recovery banner
 *   - any uncaught error / unhandled promise rejection on the page
 *   - a page crash, a 5xx on a document/script request
 *   - /today rendering none of its expected shell landmarks
 *
 * Runs under the `mobile-safari` project (iOS/WebKit) and, via `test.use`,
 * a Pixel-7 Chromium context for Android. Auto-skipped without
 * TEST_USER_EMAIL / TEST_USER_PASSWORD.
 */

/**
 * Cold launch: install the native shim, sign in, land on /today and assert the
 * authenticated shell rendered with no fatal signal. Then relaunch from a
 * warm session (what happens when the user reopens the app) — the persisted
 * session path is a separate crash surface.
 */
function launchSuite(label: string, platform: "ios" | "android"): void {
  test(`${label}: cold launch renders the first authenticated screen`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    const signals = watchLaunch(page);

    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    // Onboarding is a valid first screen for a brand-new account.
    if (/\/onboarding/.test(page.url())) {
      await expect(page.locator("main, body")).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/today/);
      // Shell landmarks: the bottom tab bar plus the Today heading. Copy-
      // tolerant so a wording change doesn't turn this into a false crash.
      await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("heading", { name: /today/i }).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible({
        timeout: 20_000,
      });
    }

    await expectNoFatalUi(page);
    assertClean(signals);
  });

  test(`${label}: warm relaunch restores the session without a fatal error`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    await signIn(page);
    await dismissFirstRunOverlays(page);

    // Second launch of the same install: full document reload, session read
    // back from storage, protected data refetched with the restored bearer.
    // Let the post-sign-in redirect settle first, otherwise the reload races
    // the router's own navigation and Playwright reports an interrupted goto.
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

    const signals = watchLaunch(page);
    await expect(async () => {
      await page.goto("/today", { waitUntil: "domcontentloaded" });
    }).toPass({ timeout: 45_000 });
    await dismissPaywall(page);

    await expect(page).toHaveURL(/\/today|\/onboarding/);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
    await expectNoFatalUi(page);
    assertClean(signals);
  });
}

test.describe("Launch smoke — iOS (WebKit)", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "iOS launch runs on WebKit only");
  test.setTimeout(120_000);
  test.use(deviceShape("iPhone 13"));
  launchSuite("iOS", "ios");
});

test.describe("Launch smoke — Android (Chromium)", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Android launch runs on Chromium only",
  );
  test.setTimeout(120_000);
  test.use(deviceShape("Pixel 7"));
  launchSuite("Android", "android");
});

/**
 * Deep-link launch: the OS opens the app from a universal link / App Link
 * pointing at /today. The first screen the user sees must be Today itself —
 * not the marketing home, not a blank shell, not the crash boundary.
 */
function deepLinkSuite(label: string, platform: "ios" | "android"): void {
  test(`${label}: deep link to /today opens the Today screen`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    // Brand-new accounts land in onboarding; deep-link routing is only
    // meaningful once the account is past it.
    test.skip(/\/onboarding/.test(page.url()), "account is still in onboarding");

    const signals = watchLaunch(page);
    await launchViaDeepLink(page, "/today");
    await dismissPaywall(page);

    await expect(page).toHaveURL(/\/today/);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /today/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible({
      timeout: 20_000,
    });

    await expectNoFatalUi(page);
    assertClean(signals, "deep-link launch");
  });

  test(`${label}: deep link keeps its query string on /today`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    test.skip(/\/onboarding/.test(page.url()), "account is still in onboarding");

    const signals = watchLaunch(page);
    // Reminder deep link (/today?taken=<id>) with an id that does not exist:
    // the screen must still render, not crash on the unknown event.
    await launchViaDeepLink(page, "/today?taken=00000000-0000-0000-0000-000000000000");
    await dismissPaywall(page);

    await expect(page).toHaveURL(/\/today/);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
    await expectNoFatalUi(page);
    assertClean(signals, "deep-link launch with query");
  });
}

test.describe("Deep-link launch — iOS (WebKit)", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "iOS launch runs on WebKit only");
  test.setTimeout(120_000);
  test.use(deviceShape("iPhone 13"));
  deepLinkSuite("iOS", "ios");
});

test.describe("Deep-link launch — Android (Chromium)", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Android launch runs on Chromium only",
  );
  test.setTimeout(120_000);
  test.use(deviceShape("Pixel 7"));
  deepLinkSuite("Android", "android");
});
