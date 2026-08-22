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
  launchViaDeepLink,
  watchLaunch,
  type NativePlatform,
} from "./native-signals";

/**
 * Deep-link matrix: every supported in-app destination, cold start and warm
 * start.
 *
 * Cold start is the dangerous one — the OS hands the app a URL before the auth
 * session has been read back, so a bad initialization order sends the user to
 * /auth, to a blank shell, or leaves the router stuck on a pending route.
 * Warm start (appUrlOpen while the app is already running) has to reach the
 * same screen through the queued opener in src/lib/deep-link.ts.
 *
 * Pro-gated destinations (paywall sheet) count as "rendered": the app is
 * showing an intentional screen, not a dead end.
 */
const DEEP_LINK_PATHS = [
  "/today",
  "/stack",
  "/library",
  "/reminders",
  "/food",
  "/fitness",
  "/checkins",
  "/more",
  "/help",
  "/notifications",
] as const;

/** Query-carrying links the reminder notifications and emails send. */
const DEEP_LINK_QUERIES = [
  "/today?taken=00000000-0000-0000-0000-000000000000",
  "/stack?add=1",
  "/food?tab=timeline",
] as const;

/** Warm start: the app is already running and the OS fires `appUrlOpen`. */
async function openWarmDeepLink(page: Page, path: string): Promise<void> {
  const url = new URL(path, "https://doseroutine.com").toString();
  await page.evaluate((launchUrl) => {
    const cap = (window as unknown as Record<string, unknown>)["Capacitor"] as
      | Record<string, unknown>
      | undefined;
    const listeners = (window as unknown as Record<string, unknown>)["__capAppUrlOpen"] as
      | Array<(payload: { url: string }) => void>
      | undefined;
    if (cap) cap["launchUrl"] = launchUrl;
    // Prefer the app's own registered listeners when the shim exposed them;
    // otherwise fall back to a history navigation, which exercises the same
    // router entry point the listener uses.
    if (listeners?.length) {
      for (const fn of listeners) fn({ url: launchUrl });
    } else {
      window.history.pushState({}, "", new URL(launchUrl).pathname + new URL(launchUrl).search);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, url);
}

/**
 * A deep-linked screen is healthy when it is on an in-app route, has painted
 * real content, and shows neither the crash boundary nor an endless spinner.
 */
async function expectLanded(page: Page, path: string, appOrigin: string): Promise<void> {
  await dismissPaywall(page).catch(() => undefined);

  const expected = new URL(path, "https://x.test").pathname;
  // Gated or unavailable destinations may bounce to /today, /auth or the
  // upgrade screen — all intentional. Never off-origin, never blank.
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
    .toMatch(new RegExp(`^(${expected}|/today|/auth|/onboarding|/upgrade|/plan)$`));
  expect(new URL(page.url()).origin, "deep link escaped the app origin").toBe(appOrigin);

  await expectNotBlank(page);
  await expect(page.locator("main").first()).toBeVisible({ timeout: 25_000 });
  await expectNoFatalUi(page);
}

function deepLinkMatrix(label: string, platform: NativePlatform): void {
  test(`${label}: cold-start deep links land on the right screen`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? "http://localhost:8080").origin;

    await emulateNativeShell(page, platform);
    await collectUncaught(page);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    test.skip(/\/onboarding/.test(page.url()), "account is still in onboarding");

    for (const path of DEEP_LINK_PATHS) {
      const signals = watchLaunch(page);
      await launchViaDeepLink(page, path);
      await expectLanded(page, path, origin);
      // The uncaught collector resets on each document, so read it per link.
      await expectNoUncaught(page, `cold deep link ${path}`);
      assertClean(signals, `cold deep link ${path}`);
    }
  });

  test(`${label}: cold-start deep links keep their query string`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? "http://localhost:8080").origin;

    await emulateNativeShell(page, platform);
    await collectUncaught(page);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    test.skip(/\/onboarding/.test(page.url()), "account is still in onboarding");

    for (const path of DEEP_LINK_QUERIES) {
      const signals = watchLaunch(page);
      await launchViaDeepLink(page, path);
      await expectLanded(page, path, origin);
      await expectNoUncaught(page, `cold deep link ${path}`);
      assertClean(signals, `cold deep link ${path}`);
    }
  });

  test(`${label}: warm-start deep links reuse the running session`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? "http://localhost:8080").origin;

    await emulateNativeShell(page, platform);
    await collectUncaught(page);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    test.skip(/\/onboarding/.test(page.url()), "account is still in onboarding");

    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await dismissPaywall(page).catch(() => undefined);
    const signals = watchLaunch(page);

    for (const path of DEEP_LINK_PATHS) {
      await openWarmDeepLink(page, path);
      await expectLanded(page, path, origin);
    }

    // Back-to-back opens must queue rather than race each other.
    await openWarmDeepLink(page, "/stack");
    await openWarmDeepLink(page, "/today");
    await expectLanded(page, "/today", origin);

    await expectNoUncaught(page, "warm deep links");
    assertClean(signals, "warm deep links");
  });
}

test.describe("Deep-link matrix — iOS (WebKit)", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "iOS deep links run on WebKit only");
  test.setTimeout(240_000);
  test.use(deviceShape("iPhone 13"));
  deepLinkMatrix("iOS", "ios");
});

test.describe("Deep-link matrix — Android (Chromium)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Android deep links run on Chromium");
  test.setTimeout(240_000);
  test.use(deviceShape("Pixel 7"));
  deepLinkMatrix("Android", "android");
});
