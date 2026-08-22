import { test, expect, dismissFirstRunOverlays, dismissPaywall, signIn } from "./utils";
import { emulateNativeShell, type NativePlatform } from "./native-signals";

/**
 * Companion to native-debug-routes.spec.ts.
 *
 * That spec proves the redirect lands on /today. This one proves the *journey*
 * is clean: a deep link into /debug — including one carrying query strings or
 * a hash, which is how a pasted link normally arrives — must never paint debug
 * UI for even one frame before the guard fires. An App Store reviewer opening
 * such a link should see the ordinary app, not a flash of internal tooling.
 */

const DEEP_LINKS = [
  "/debug?token=abc123",
  "/debug/env?verbose=1&secret=peek",
  "/debug/session?redirect=/admin#panel",
  "/debug/not-a-real-screen?x=1",
];

// Strings that only ever appear on internal tooling screens.
const DEBUG_MARKERS = /debug (panel|tools|info)|environment variables|raw session|feature flags/i;

function flashSuite(label: string, platform: NativePlatform): void {
  test(`${label}: debug deep links redirect without flashing debug UI`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    test.skip(/\/onboarding/.test(page.url()), "account is still in onboarding");

    for (const link of DEEP_LINKS) {
      // Sample the DOM continuously from first paint so a single-frame render
      // of debug UI is caught, not just the settled end state.
      const samples: string[] = [];
      const stopSampling = { value: false };
      const sampler = (async () => {
        while (!stopSampling.value) {
          const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
          if (text) samples.push(text);
          await page.waitForTimeout(50);
        }
      })();

      await expect(async () => {
        await page.goto(link, { waitUntil: "domcontentloaded" });
      }).toPass({ timeout: 45_000 });
      await dismissPaywall(page);
      await expect(page, `expected ${link} to redirect`).toHaveURL(/\/today/, { timeout: 25_000 });

      stopSampling.value = true;
      await sampler;

      for (const sample of samples) {
        expect(sample, `debug UI was visible while loading ${link}`).not.toMatch(DEBUG_MARKERS);
      }

      // Query strings and hashes must not survive the redirect either — a
      // leftover ?secret= in the address bar is still an exposure.
      const url = new URL(page.url());
      expect(url.pathname, link).toMatch(/^\/today\/?$/);
      expect(url.search, link).not.toMatch(/secret|token|verbose/);
    }
  });
}

test.describe("Native shell: /debug deep links never flash internal UI", () => {
  flashSuite("iOS", "ios");
  flashSuite("Android", "android");
});
