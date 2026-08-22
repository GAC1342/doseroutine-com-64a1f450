import type { Page } from "@playwright/test";
import { test, expect, dismissFirstRunOverlays, dismissPaywall, signIn } from "./utils";
import {
  assertClean,
  collectUncaught,
  deviceShape,
  emulateNativeShell,
  expectNoFatalUi,
  expectNoUncaught,
  watchLaunch,
  type NativePlatform,
} from "./native-signals";

/**
 * Native route policy smoke (App Store guideline 4.2 / 2.5.x).
 *
 * Inside the native shell the app must never show marketing/SEO pages or
 * internal tooling. Each restricted path has to land back on /today with the
 * app shell rendered — no blank screen, no external navigation, no dead end.
 */
const RESTRICTED_PATHS = [
  "/", // marketing home
  "/blog",
  "/articles",
  "/compare",
  "/for/trt-patients",
  "/promo-kit",
  "/install",
  "/admin",
  "/debug",
];

async function expectRedirectedHome(page: Page, path: string, appOrigin: string): Promise<void> {
  await expect(async () => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
  }).toPass({ timeout: 45_000 });
  await dismissPaywall(page);

  // The guard runs after hydration, so poll the URL rather than sampling once.
  await expect(page).toHaveURL(/\/today/, { timeout: 25_000 });
  // Never left the app origin (no in-app browser / external hand-off).
  expect(new URL(page.url()).origin).toBe(appOrigin);
  // Not a dead end: the shell and its navigation are usable.
  await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
  // The app shell's primary navigation (bottom tab bar / sidebar). The root
  // also renders a visually hidden "Skip navigation" landmark, so target the
  // real one by name instead of taking the first <nav> in the document.
  await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible({
    timeout: 20_000,
  });
  await expectNoFatalUi(page);
}

function restrictedSuite(label: string, platform: NativePlatform): void {
  test(`${label}: restricted routes redirect to /today`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    await collectUncaught(page);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    test.skip(/\/onboarding/.test(page.url()), "account is still in onboarding");

    const signals = watchLaunch(page);
    const appOrigin = new URL(page.url()).origin;
    for (const path of RESTRICTED_PATHS) {
      await expectRedirectedHome(page, path, appOrigin);
      await expectNoUncaught(page, `redirect from ${path}`);
    }
    assertClean(signals, "restricted route redirects");
  });

  test(`${label}: in-app routes are not redirected`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    test.skip(/\/onboarding/.test(page.url()), "account is still in onboarding");

    const signals = watchLaunch(page);
    for (const path of ["/more", "/legal", "/privacy"]) {
      await expect(async () => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
      }).toPass({ timeout: 45_000 });
      await dismissPaywall(page);
      await expect(page).toHaveURL(new RegExp(`${path}(\\?|$|/)`), { timeout: 20_000 });
      await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
      await expectNoFatalUi(page);
    }
    assertClean(signals, "allowed route navigation");
  });
}

test.describe("Native route policy — iOS (WebKit)", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "iOS policy runs on WebKit only");
  test.setTimeout(180_000);
  test.use(deviceShape("iPhone 13"));
  restrictedSuite("iOS", "ios");
});

test.describe("Native route policy — Android (Chromium)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Android policy runs on Chromium");
  test.setTimeout(180_000);
  test.use(deviceShape("Pixel 7"));
  restrictedSuite("Android", "android");
});
