import { test, expect } from "./utils";
import type { Page } from "@playwright/test";

/**
 * Verifies the /scan page's capability detection and downstream barcode
 * detail flow work when the browser's native `BarcodeDetector` API is
 * unavailable (iOS Safari, Firefox, older Chrome).
 *
 * We can't actually decode a real barcode in Playwright without a fake video
 * device, but we CAN prove:
 *
 *   1. `detectCapability()` falls back to ZXing (not "none") when
 *      `window.BarcodeDetector` is missing and getUserMedia is present —
 *      surfaced by the "ZXing camera reader" hint under the Start button.
 *   2. The Start scan button remains enabled (fallback wired up), NOT the
 *      "Camera isn't available" disabled state.
 *   3. When BOTH BarcodeDetector and getUserMedia are missing, the UI
 *      degrades to the disabled + typed-search state without crashing.
 *   4. The downstream detail flow the confirmed-barcode path lands in —
 *      compound search results → compound detail sheet with "Add to my
 *      stack" — is reachable via the search input in every fallback state.
 *      This is the same UI a user sees after tapping "Use this code" on the
 *      confirmation card, so if it works via search it works via scan.
 */

async function stripBarcodeDetector(page: Page) {
  await page.addInitScript(() => {
    try {
      // Some engines expose it on window, some on self — clear both.
      // @ts-expect-error BarcodeDetector is not in lib.dom for all engines.
      delete (window as any).BarcodeDetector;
      // @ts-expect-error idem
      delete (globalThis as any).BarcodeDetector;
      Object.defineProperty(window, "BarcodeDetector", {
        configurable: true,
        get() {
          return undefined;
        },
      });
    } catch {
      /* engine already lacks it — nothing to do */
    }
  });
}

async function stripGetUserMedia(page: Page) {
  await page.addInitScript(() => {
    try {
      if (navigator.mediaDevices) {
        Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
          configurable: true,
          value: undefined,
        });
      }
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        get() {
          return undefined;
        },
      });
    } catch {
      /* ignore */
    }
  });
}

async function openDetailSheetViaSearch(page: Page) {
  const search = page.getByPlaceholder(/magnesium glycinate/i);
  await expect(search).toBeVisible();
  // "creatine" is one of the 450+ seeded compounds and matches a short,
  // stable name unlikely to change.
  await search.fill("creatine");

  // Wait for the async compound search to resolve. Results render as
  // buttons containing a "+" icon; pick the first row.
  const firstResult = page
    .locator("button:has(svg.lucide-plus)")
    .filter({ hasText: /creatine/i })
    .first();
  await expect(firstResult).toBeVisible({ timeout: 10_000 });
  await firstResult.click();

  // Detail sheet mounts with "Add to my stack" button — the exact same
  // sheet the confirmed-barcode path opens.
  const addBtn = page.getByRole("button", { name: /add to my stack/i });
  await expect(addBtn).toBeVisible();
  await expect(addBtn).toBeEnabled();

  // Do NOT click Add — this test is read-only. Close the sheet.
  await page.getByRole("button", { name: /^close$/i }).click();
}

test.describe("scan page — fallback when BarcodeDetector is unavailable", () => {
  test("falls back to ZXing camera reader and reaches the detail flow", async ({
    authedPage: page,
  }) => {
    await stripBarcodeDetector(page);
    await page.goto("/scan");
    await page.waitForLoadState("domcontentloaded");

    // Sanity: patch survived into the page.
    const hasDetector = await page.evaluate(
      () => typeof (window as any).BarcodeDetector === "function",
    );
    expect(hasDetector).toBe(false);

    // Capability hint under the Start button confirms which fallback wired
    // up. WebKit/Firefox natively lack BarcodeDetector, so this also
    // exercises the real-world iOS-Safari code path when run in webkit.
    const startBtn = page.getByRole("button", { name: /start scan/i });
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    await expect(page.getByText(/zxing camera reader/i)).toBeVisible();
    await expect(page.getByText(/camera isn't available on this device/i)).toHaveCount(0);

    // Downstream detail flow — same sheet the confirmed-barcode path opens.
    await openDetailSheetViaSearch(page);
  });

  test("still reaches detail flow via typed search when camera is fully unavailable", async ({
    authedPage: page,
  }) => {
    await stripBarcodeDetector(page);
    await stripGetUserMedia(page);
    await page.goto("/scan");
    await page.waitForLoadState("domcontentloaded");

    // Both capabilities gone → capability="none" → Start button disabled,
    // helper copy tells the user to type the name.
    const startBtn = page.getByRole("button", { name: /start scan/i });
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeDisabled();
    await expect(page.getByText(/camera isn't available on this device/i)).toBeVisible();

    // Confirmation card should NOT appear (nothing decoded).
    await expect(page.getByText(/confirm barcode/i)).toHaveCount(0);

    // Typed-search downstream flow still works.
    await openDetailSheetViaSearch(page);
  });
});
