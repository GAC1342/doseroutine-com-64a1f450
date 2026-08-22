import type { Page } from "@playwright/test";
import { test, expect, dismissFirstRunOverlays, dismissPaywall, signIn } from "./utils";
import {
  assertClean,
  collectUncaught,
  deviceShape,
  emulateNativeShell,
  expectNoFatalUi,
  expectNoUncaught,
  expectNotBlank,
  watchLaunch,
  type NativePlatform,
} from "./native-signals";

/**
 * Offline / poor-connectivity cold starts.
 *
 * A native install carries its own bundle, so "offline" means the UI still
 * boots while every backend call fails. That is exactly the state App Review
 * puts the app in (airplane mode on first open), and the failure mode we must
 * never ship is a white screen or a crash boundary instead of the app shell.
 *
 * The document and static assets keep loading (they ship inside the binary);
 * only backend traffic is cut, which mirrors the device losing signal.
 */

/** Any request leaving the app origin is backend traffic. */
function isBackendRequest(url: string, appOrigin: string): boolean {
  try {
    return new URL(url).origin !== appOrigin;
  } catch {
    return false;
  }
}

/** Cuts backend traffic. Returns a function that restores connectivity. */
async function goOffline(page: Page, appOrigin: string): Promise<() => Promise<void>> {
  await page.route("**/*", async (route) => {
    if (isBackendRequest(route.request().url(), appOrigin)) {
      return route.abort("internetdisconnected");
    }
    return route.continue();
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
  });

  return async () => {
    await page.unroute("**/*");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
      window.dispatchEvent(new Event("online"));
    });
  };
}

/** Slow, flaky signal: every backend call takes ~2.5s before it answers. */
async function goSlow(page: Page, appOrigin: string): Promise<void> {
  await page.route("**/*", async (route) => {
    if (isBackendRequest(route.request().url(), appOrigin)) {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
    }
    return route.continue();
  });
}

async function visit(page: Page, path: string): Promise<void> {
  await expect(async () => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
  }).toPass({ timeout: 60_000 });
  await dismissPaywall(page).catch(() => undefined);
}

function offlineSuite(label: string, platform: NativePlatform): void {
  test(`${label}: cold start with no connection renders the app, not a white screen`, async ({
    page,
    baseURL,
  }) => {
    const origin = new URL(baseURL ?? "http://localhost:8080").origin;

    await emulateNativeShell(page, platform);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    await collectUncaught(page);

    const restore = await goOffline(page, origin);
    const signals = watchLaunch(page);

    await visit(page, "/today");

    // Correct route, real content, no crash screen — the three things a
    // reviewer sees before anything else.
    await expect(page).toHaveURL(/\/today|\/auth|\/onboarding/, { timeout: 30_000 });
    await expectNotBlank(page);
    await expectNoFatalUi(page);
    await expectNoUncaught(page, "offline cold start");

    // Recovery: signal returns and the same screen loads its data.
    await restore();
    const retry = page.getByTestId("network-recovery-retry").first();
    if (await retry.count()) {
      await retry.click().catch(() => undefined);
    }
    await visit(page, "/today");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expectNoFatalUi(page);
    assertClean(signals, "offline cold start + recovery");
  });

  test(`${label}: losing the connection mid-session keeps the screen usable`, async ({
    page,
    baseURL,
  }) => {
    const origin = new URL(baseURL ?? "http://localhost:8080").origin;

    await emulateNativeShell(page, platform);
    await collectUncaught(page);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    await visit(page, "/today");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });

    const signals = watchLaunch(page);
    const restore = await goOffline(page, origin);

    // Navigating while offline must not blank the app or trip the boundary.
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link").first().click();
    await page.waitForTimeout(1_500);
    await expectNotBlank(page);
    await expectNoFatalUi(page);

    await restore();
    await visit(page, "/today");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });
    await expectNoFatalUi(page);
    await expectNoUncaught(page, "connection lost mid-session");
    assertClean(signals, "connection lost mid-session");
  });

  test(`${label}: a slow connection shows progress, never a blank shell`, async ({
    page,
    baseURL,
  }) => {
    const origin = new URL(baseURL ?? "http://localhost:8080").origin;

    await emulateNativeShell(page, platform);
    await collectUncaught(page);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    const signals = watchLaunch(page);
    await goSlow(page, origin);
    await visit(page, "/today");

    // Immediately after the document lands the shell must already be painted
    // even though the data is still in flight.
    await expectNotBlank(page);
    await expect(page).toHaveURL(/\/today|\/auth|\/onboarding/, { timeout: 40_000 });
    await expect(page.locator("main").first()).toBeVisible({ timeout: 40_000 });
    await expectNoFatalUi(page);
    await expectNoUncaught(page, "slow connection cold start");
    assertClean(signals, "slow connection cold start");
  });
}

test.describe("Offline cold start — iOS (WebKit)", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "iOS offline runs on WebKit only");
  test.setTimeout(180_000);
  test.use(deviceShape("iPhone 13"));
  offlineSuite("iOS", "ios");
});

test.describe("Offline cold start — Android (Chromium)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Android offline runs on Chromium");
  test.setTimeout(180_000);
  test.use(deviceShape("Pixel 7"));
  offlineSuite("Android", "android");
});
