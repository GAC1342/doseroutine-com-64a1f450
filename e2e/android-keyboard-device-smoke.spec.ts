import { test, expect } from "@playwright/test";

import {
  emitKeyboard,
  insetPx,
  installFakeKeyboardPlugin,
  measureBottomControls,
  shrinkVisualViewport,
  waitForTracker,
} from "./helpers/keyboard-device";

/**
 * Android counterpart to the iOS device smoke test.
 *
 * Android is configured with `windowSoftInputMode="adjustNothing"`, so the
 * webview never resizes itself — every bit of keyboard compensation has to come
 * from `--keyboard-inset`. That makes these assertions stricter than on iOS: if
 * the inset is wrong, bottom controls are simply unreachable.
 */

const PIXEL = { width: 412, height: 915 };
const TABLET = { width: 800, height: 1280 };
const PAGE = "/library";
const KEYBOARD_H = 320;

test.describe("Android keyboard + bottom controls smoke", () => {
  test("phone: plugin height drives the inset and bottom controls clear the keyboard", async ({
    page,
  }) => {
    await page.setViewportSize(PIXEL);
    await installFakeKeyboardPlugin(page);
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });
    await waitForTracker(page);
    await expect.poll(() => insetPx(page)).toBe(0);

    await emitKeyboard(page, "keyboardWillShow", KEYBOARD_H);
    await expect.poll(() => insetPx(page)).toBeGreaterThanOrEqual(KEYBOARD_H - 1);
    await expect(page.locator("html[data-keyboard-open]")).toHaveCount(1);

    const open = await measureBottomControls(page);
    expect(open.hiddenChromeClears).toBe(true);
    expect(open.liftedBarsClear).toBe(true);

    await emitKeyboard(page, "keyboardWillHide", 0);
    await expect.poll(() => insetPx(page)).toBe(0);
    await expect(page.locator("html[data-keyboard-open]")).toHaveCount(0);
  });

  test("phone: body reserves the keyboard height so content can scroll clear", async ({ page }) => {
    await page.setViewportSize(PIXEL);
    await installFakeKeyboardPlugin(page);
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });
    await waitForTracker(page);

    await emitKeyboard(page, "keyboardWillShow", KEYBOARD_H);
    const padding = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.body).paddingBottom || "0"),
    );
    expect(padding).toBeGreaterThanOrEqual(KEYBOARD_H - 1);
  });

  test("tablet: visualViewport fallback covers a silent plugin", async ({ page }) => {
    await page.setViewportSize(TABLET);
    await installFakeKeyboardPlugin(page);
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });
    await waitForTracker(page);

    const applied = await shrinkVisualViewport(page, KEYBOARD_H);
    test.skip(applied === "no-visualviewport", "visualViewport unavailable");
    expect(parseFloat(applied as string)).toBeGreaterThanOrEqual(KEYBOARD_H - 1);
  });

  test("off-origin links open in the system browser, same-site stays in the shell", async ({
    page,
  }) => {
    await page.setViewportSize(PIXEL);
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='http']"));
      return {
        absoluteInternal: anchors
          .map((a) => a.getAttribute("href") ?? "")
          .filter((href) => /^https?:\/\/(www\.)?doseroutine\.com/i.test(href)),
        unsafeExternal: anchors
          .filter((a) => !a.href.startsWith(location.origin) && a.target !== "_blank")
          .map((a) => a.href),
      };
    });
    expect(links.absoluteInternal).toEqual([]);
    expect(links.unsafeExternal).toEqual([]);
  });
});
