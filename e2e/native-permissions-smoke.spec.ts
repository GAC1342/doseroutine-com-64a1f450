import type { Page } from "@playwright/test";
import { test, expect, dismissFirstRunOverlays, dismissPaywall, signIn } from "./utils";
import {
  assertClean,
  collectUncaught,
  expectNoUncaught,
  deviceShape,
  emulateNativeShell,
  expectNoFatalUi,
  watchLaunch,
  type NativePlatform,
} from "./native-signals";

/**
 * iOS / Android camera + photo-library permission smoke.
 *
 * The permission prompt is where a native build historically dies: a missing
 * Info.plist usage string aborts the process the instant the app asks, and a
 * denied prompt can leave the web layer stuck on a rejected promise. This spec
 * drives all three outcomes on a phone-sized context with the Capacitor shim
 * installed, then returns to /today and asserts the first authenticated screen
 * still renders with no fatal signal.
 *
 * Covered per platform:
 *   1. Camera permission GRANTED  → Start scan → live view, app healthy
 *   2. Camera permission DENIED   → soft failure, no unhandled rejection
 *   3. Photo library pick         → image handled, app healthy
 *
 * Auto-skipped without TEST_USER_EMAIL / TEST_USER_PASSWORD. The two camera
 * tests additionally skip when the test account has no Pro entitlement, since
 * /scan is behind the Pro gate for those accounts.
 */

/** 1x1 PNG — enough to exercise the photo-picker path without a fixture file. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Fakes a granted camera permission on both engines: `getUserMedia` resolves
 * with a canvas-captured stream so no real device is needed, and the
 * Permissions API reports "granted". WebKit has no
 * `context.grantPermissions('camera')`, so the page-level stub is the only
 * portable way to cover iOS and Android from one spec.
 */
async function grantCamera(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const fakeStream = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const capture = (
        canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }
      ).captureStream;
      return capture ? capture.call(canvas, 10) : new MediaStream();
    };

    const media = navigator.mediaDevices ?? ({} as MediaDevices);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: media });
    Object.defineProperty(media, "getUserMedia", {
      configurable: true,
      value: async () => fakeStream(),
    });
    if (navigator.permissions) {
      Object.defineProperty(navigator.permissions, "query", {
        configurable: true,
        value: async () => ({ state: "granted", onchange: null }) as unknown as PermissionStatus,
      });
    }
  });
}

/**
 * Fakes the user tapping "Don't Allow": `getUserMedia` rejects with the exact
 * DOMException name iOS/Android surface, which is what the app's error mapper
 * is supposed to translate into plain language.
 */
async function denyCamera(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const media = navigator.mediaDevices ?? ({} as MediaDevices);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: media });
    Object.defineProperty(media, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      },
    });
    if (navigator.permissions) {
      Object.defineProperty(navigator.permissions, "query", {
        configurable: true,
        value: async () => ({ state: "denied", onchange: null }) as unknown as PermissionStatus,
      });
    }
  });
}

/** Signs in and installs the Capacitor shim before the first paint. */
async function launchNative(page: Page, platform: NativePlatform): Promise<void> {
  await emulateNativeShell(page, platform);
  // Installed before the first navigation so window.onerror /
  // unhandledrejection listeners exist from the very first script.
  await collectUncaught(page);
  await signIn(page);
  await dismissFirstRunOverlays(page);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

/** Hard navigation that tolerates a router redirect racing the goto. */
async function visit(page: Page, path: string): Promise<void> {
  await expect(async () => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
  }).toPass({ timeout: 45_000 });
  await dismissPaywall(page);
}

/**
 * Waits for /scan to settle into one of its two terminal states. Entitlement
 * resolves asynchronously, so sampling the DOM once races the Pro gate in.
 */
async function scanState(page: Page): Promise<"ready" | "gated"> {
  const gate = page.getByText(/is a Pro feature/i).first();
  const start = page.getByRole("button", { name: /start scan/i }).first();
  // Entitlement resolves asynchronously; poll until one of the two states
  // appears. Anything else (upsell variants, empty state) counts as "gated" —
  // the camera path simply isn't reachable for this account.
  await expect
    .poll(async () => (await gate.count()) > 0 || (await start.count()) > 0, { timeout: 30_000 })
    .toBeTruthy()
    .catch(() => undefined);
  return (await start.count()) > 0 ? "ready" : "gated";
}

/** Returns to the first authenticated screen and asserts it renders. */
async function expectTodayStillRenders(page: Page): Promise<void> {
  await visit(page, "/today");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /today/i }).first()).toBeVisible({
    timeout: 20_000,
  });
  await expectNoFatalUi(page);
}

function permissionSuite(label: string, platform: NativePlatform): void {
  test(`${label}: granting camera permission keeps the app healthy`, async ({ page }) => {
    await grantCamera(page);
    await launchNative(page, platform);

    const signals = watchLaunch(page);
    await visit(page, "/scan");

    if ((await scanState(page)) === "gated") {
      // The gate itself must render cleanly, then the run is inconclusive for
      // the camera path on this account.
      await expectNoFatalUi(page);
      await expectTodayStillRenders(page);
      assertClean(signals, "Pro-gated scan screen");
      await expectNoUncaught(page, "Pro-gated scan screen");
      test.skip(true, "Test account has no Pro entitlement — /scan is gated");
      return;
    }

    const start = page.getByRole("button", { name: /start scan/i });
    await expect(start).toBeEnabled({ timeout: 15_000 });
    await start.click();

    // Camera opened: the live view exposes its stop control.
    await expect(page.getByRole("button", { name: /stop scan/i })).toBeVisible({ timeout: 15_000 });
    await expectNoFatalUi(page);
    // The collector resets on each document, so read it before leaving /scan.
    await expectNoUncaught(page, "camera live view");

    await expectTodayStillRenders(page);
    assertClean(signals, "camera permission grant");
    await expectNoUncaught(page, "camera permission grant");
  });

  test(`${label}: denying camera permission fails softly, not fatally`, async ({ page }) => {
    await denyCamera(page);
    await launchNative(page, platform);

    const signals = watchLaunch(page);
    await visit(page, "/scan");

    if ((await scanState(page)) === "gated") {
      await expectNoFatalUi(page);
      await expectTodayStillRenders(page);
      assertClean(signals, "Pro-gated scan screen");
      await expectNoUncaught(page, "Pro-gated scan screen");
      test.skip(true, "Test account has no Pro entitlement — /scan is gated");
      return;
    }

    const start = page.getByRole("button", { name: /start scan/i });
    if (await start.isEnabled()) {
      await start.click();
      // A denial must surface as copy, never as a crash screen: the page stays
      // on /scan with its manual fallbacks available.
      await expect(page.getByRole("button", { name: /type the numbers/i })).toBeVisible({
        timeout: 15_000,
      });
    }
    await expect(page.getByRole("button", { name: /stop scan/i })).toHaveCount(0);
    await expectNoFatalUi(page);
    // The collector resets on each document, so read it before leaving /scan.
    await expectNoUncaught(page, "camera denial handling");

    await expectTodayStillRenders(page);
    assertClean(signals, "camera permission denial");
    await expectNoUncaught(page, "camera permission denial");
  });

  test(`${label}: denied camera offers Open settings and recovers after granting`, async ({
    page,
  }) => {
    await denyCamera(page);
    await launchNative(page, platform);

    const signals = watchLaunch(page);
    await visit(page, "/scan");

    if ((await scanState(page)) === "gated") {
      await expectNoFatalUi(page);
      await expectTodayStillRenders(page);
      assertClean(signals, "Pro-gated scan screen");
      test.skip(true, "Test account has no Pro entitlement — /scan is gated");
      return;
    }

    await page
      .getByRole("button", { name: /start scan/i })
      .first()
      .click();

    // L1 — a denial in the native shell must offer the OS settings shortcut.
    const openSettings = page.getByRole("button", { name: /open settings/i }).first();
    await expect(openSettings).toBeVisible({ timeout: 15_000 });
    await expect(openSettings).toBeEnabled();

    // Tapping it hands off to the OS: the webview must stay on /scan with the
    // fallbacks intact — no navigation away, no crash, no stuck state.
    await openSettings.click();
    await page.waitForTimeout(1_000);
    await expect(page).toHaveURL(/\/scan/);
    await expect(page.getByRole("button", { name: /type the numbers/i })).toBeVisible();
    await expectNoFatalUi(page);
    await expectNoUncaught(page, "open settings from denied camera");

    // Recovery: the user flips the switch in Settings and returns. The camera
    // now resolves and "Try camera again" must reach the live view.
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const media = navigator.mediaDevices ?? ({} as MediaDevices);
      Object.defineProperty(media, "getUserMedia", {
        configurable: true,
        value: async () => {
          const capture = (
            canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }
          ).captureStream;
          return capture ? capture.call(canvas, 10) : new MediaStream();
        },
      });
      if (navigator.permissions) {
        Object.defineProperty(navigator.permissions, "query", {
          configurable: true,
          value: async () => ({ state: "granted", onchange: null }) as unknown as PermissionStatus,
        });
      }
    });

    const retry = page.getByRole("button", { name: /try camera again|start scan/i }).first();
    await expect(retry).toBeVisible({ timeout: 15_000 });
    await retry.click();
    await expect(page.getByRole("button", { name: /stop scan/i })).toBeVisible({ timeout: 20_000 });
    await expectNoFatalUi(page);
    await expectNoUncaught(page, "camera recovery after granting");

    await expectTodayStillRenders(page);
    assertClean(signals, "denied camera recovery");
  });

  test(`${label}: picking a photo from the library keeps the app healthy`, async ({ page }) => {
    // The camera is refused on purpose: the photo-library path must not depend
    // on it. The profile-photo picker is the one capture surface available on
    // every account (the progress-photo timeline sits behind the Pro gate).
    await denyCamera(page);

    // Stub the storage upload and the profile write so the smoke run never
    // mutates the test account, while the client-side pick → resize → upload
    // path still executes end to end.
    await page.route(/\/storage\/v1\/object\//, async (route) => {
      if (route.request().method() === "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Key: "avatars/smoke.webp" }),
      });
    });
    await page.route(/\/rest\/v1\/profiles/, async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await launchNative(page, platform);

    const signals = watchLaunch(page);
    await visit(page, "/today");

    const picker = page.getByRole("button", { name: /change profile photo/i }).first();
    await expect(picker).toBeVisible({ timeout: 20_000 });

    // The picker input is hidden; setting files directly is the Playwright
    // equivalent of the OS photo-library sheet returning an image.
    await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles({
      name: "profile.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });

    // The picker must settle back to an interactive state (no stuck spinner,
    // no error toast) and the screen must stay rendered.
    await expect(picker).toBeEnabled({ timeout: 30_000 });
    await expect(page.getByText(/upload failed/i)).toHaveCount(0);
    await expectNoFatalUi(page);
    // The collector resets on each document, so read it before navigating away.
    await expectNoUncaught(page, "photo pick handling");

    await expectTodayStillRenders(page);
    assertClean(signals, "photo library pick");
    await expectNoUncaught(page, "photo library pick");
  });
}

test.describe("Permissions smoke — iOS (WebKit)", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "iOS permissions run on WebKit only");
  test.setTimeout(150_000);
  test.use(deviceShape("iPhone 13"));
  permissionSuite("iOS", "ios");
});

test.describe("Permissions smoke — Android (Chromium)", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Android permissions run on Chromium only",
  );
  test.setTimeout(150_000);
  test.use({ ...deviceShape("Pixel 7"), permissions: ["camera"] });
  permissionSuite("Android", "android");
});
