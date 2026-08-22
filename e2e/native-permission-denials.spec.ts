import type { Page } from "@playwright/test";
import { test, expect, dismissFirstRunOverlays, dismissPaywall, signIn } from "./utils";
import {
  assertClean,
  collectUncaught,
  denyStorageWrites,
  denyWebNotifications,
  deviceShape,
  emulateNativeShell,
  expectNoFatalUi,
  expectNoUncaught,
  expectNotBlank,
  stubWebNotifications,
  watchLaunch,
  type NativePlatform,
  type WebNotificationStub,
} from "./native-signals";

/**
 * iOS / Android permission-denial coverage beyond the camera.
 *
 * App Review taps "Don't Allow" on every prompt. Each denial must degrade into
 * plain-language copy plus a usable fallback (Settings shortcut, manual entry,
 * or simply the screen continuing to work) — never a fatal error boundary, a
 * blank screen, or a stuck spinner.
 *
 * Covered here:
 *   - notifications denied up front (OS reports "denied" on launch)
 *   - notifications denied at the prompt (prompt → user refuses)
 *   - the notifications plugin failing outright (bridge unavailable)
 *   - web push denied on the Reminders screen
 *   - persistent storage refused (private/Lockdown mode, full disk)
 *
 * The camera + photo-library denials live in native-permissions-smoke.spec.ts.
 */

/** Boots the native shell with the requested permission state and signs in. */
async function launchNative(
  page: Page,
  platform: NativePlatform,
  notifications?: WebNotificationStub,
): Promise<void> {
  await emulateNativeShell(page, platform);
  if (notifications) await stubWebNotifications(page, notifications);
  await collectUncaught(page);
  await signIn(page);
  await dismissFirstRunOverlays(page);
  await dismissPaywall(page);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

async function visit(page: Page, path: string): Promise<void> {
  await expect(async () => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
  }).toPass({ timeout: 45_000 });
  await dismissPaywall(page);
}

/** The authenticated shell must stay usable after any denial. */
async function expectShellUsable(page: Page): Promise<void> {
  await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible({
    timeout: 20_000,
  });
  await expectNotBlank(page);
  await expectNoFatalUi(page);
}

function denialSuite(label: string, platform: NativePlatform): void {
  test(`${label}: notifications already denied offers a Settings recovery route`, async ({
    page,
  }) => {
    await launchNative(page, platform, { permission: "denied" });
    const signals = watchLaunch(page);
    await visit(page, "/today");

    // The denial card is the fallback: it explains the state and links out to
    // the OS settings screen — the only place the user can undo a denial.
    const card = page.getByTestId("notification-denied-card");
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card).toContainText(/reminders are turned off/i);
    const openSettings = page.getByTestId("open-app-settings");
    await expect(openSettings).toBeVisible();
    await openSettings.click();

    // Handing off to Settings must not navigate the webview anywhere.
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(/\/today/);
    await expectShellUsable(page);
    await expectNoUncaught(page, "notifications denied");
    assertClean(signals, "notifications denied");
  });

  test(`${label}: refusing the notification prompt never blocks the app`, async ({ page }) => {
    await launchNative(page, platform, { permission: "default", onRequest: "denied" });
    const signals = watchLaunch(page);
    await visit(page, "/today");

    const prime = page.getByTestId("notification-priming-card");
    await expect(prime).toBeVisible({ timeout: 20_000 });
    await prime.getByRole("button", { name: /enable reminders/i }).click();

    // The refusal flips the card into its recovery variant instead of leaving
    // a spinner behind or throwing on the rejected permission result.
    await expect(page.getByTestId("notification-denied-card")).toBeVisible({ timeout: 15_000 });
    await expect(prime).toHaveCount(0);
    await expectShellUsable(page);
    await expectNoUncaught(page, "notification prompt refused");
    assertClean(signals, "notification prompt refused");
  });

  test(`${label}: a failing notifications plugin degrades silently`, async ({ page }) => {
    await launchNative(page, platform, { permission: "default", unavailable: true });
    const signals = watchLaunch(page);
    await visit(page, "/today");

    // A bridge error must not surface as a crash: no card at all is the
    // correct outcome, and the rest of Today still renders.
    await expectShellUsable(page);
    await expect(page.getByRole("heading", { name: /today/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expectNoUncaught(page, "notifications plugin failure");
    assertClean(signals, "notifications plugin failure");
  });

  test(`${label}: web push denial shows copy, not a crash`, async ({ page }) => {
    await denyWebNotifications(page);
    await launchNative(page, platform);
    const signals = watchLaunch(page);
    await visit(page, "/reminders");

    // Reminders may sit behind the Pro gate on the smoke account; either way
    // the screen must render and stay interactive.
    await expectShellUsable(page);
    const toggle = page.getByRole("switch").first();
    if (await toggle.count()) {
      await toggle.click({ trial: true }).catch(() => undefined);
    }
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    await expectNoUncaught(page, "web push denial");
    assertClean(signals, "web push denial");
  });

  test(`${label}: blocked storage writes never white-screen the app`, async ({ page }) => {
    // Sign in first (needs a writable store), then take storage away the way
    // Lockdown mode / a full data partition does, and cold start again.
    await emulateNativeShell(page, platform);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    await denyStorageWrites(page);
    await collectUncaught(page);

    const signals = watchLaunch(page);
    await visit(page, "/today");

    // The session is read-only now, so the app may keep the user signed in or
    // send them to /auth — both are valid; a blank screen or crash is not.
    await expect(page).toHaveURL(/\/today|\/auth|\/onboarding/, { timeout: 25_000 });
    await expectNotBlank(page);
    await expectNoFatalUi(page);
    await expectNoUncaught(page, "storage writes blocked");
    assertClean(signals, "storage writes blocked");
  });
}

test.describe("Permission denials — iOS (WebKit)", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "iOS denials run on WebKit only");
  test.setTimeout(150_000);
  test.use(deviceShape("iPhone 13"));
  denialSuite("iOS", "ios");
});

test.describe("Permission denials — Android (Chromium)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Android denials run on Chromium");
  test.setTimeout(150_000);
  test.use(deviceShape("Pixel 7"));
  denialSuite("Android", "android");
});
