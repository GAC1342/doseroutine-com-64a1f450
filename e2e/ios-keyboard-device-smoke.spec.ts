import { test, expect, type Page } from "@playwright/test";

import { measureBottomControls, shrinkVisualViewport } from "./helpers/keyboard-device";

/**
 * Device-shaped smoke test for the contract a real iPhone / undocked-iPad pass
 * exercises manually:
 *   1. `--keyboard-inset` tracks the native Keyboard plugin (iOS) and
 *      visualViewport (undocked / floating iPad keyboards, where the plugin
 *      can stay silent).
 *   2. Bottom controls stay reachable: fixed chrome hides and sticky action
 *      bars lift while the keyboard is open.
 *   3. In-app navigation stays inside the webview — no absolute same-site
 *      links that would bounce a reviewer out to Safari.
 *
 * This is an emulation, not a replacement for one physical-device pass; see
 * docs/ios-device-smoke-checklist.md for the manual steps.
 */

const IPHONE = { width: 390, height: 844 };
const IPAD = { width: 1024, height: 1366 };
const PAGE = "/library";

/**
 * Capacitor's own runtime assigns `window.Capacitor` during boot, so a plain
 * init-script object gets clobbered. Intercept the assignment and merge the
 * fake Keyboard plugin into whatever the runtime installs.
 */
async function installFakeKeyboardPlugin(page: Page) {
  await page.addInitScript(() => {
    const listeners: Record<string, Array<(info: { keyboardHeight?: number }) => void>> = {};
    const keyboard = {
      addListener(event: string, cb: (info: { keyboardHeight?: number }) => void) {
        (listeners[event] ??= []).push(cb);
        return Promise.resolve({
          remove() {
            listeners[event] = (listeners[event] ?? []).filter((fn) => fn !== cb);
          },
        });
      },
    };
    const graft = (cap: Record<string, unknown> | undefined) => {
      if (!cap) return cap;
      const plugins = (cap["Plugins"] ??= {}) as Record<string, unknown>;
      plugins["Keyboard"] = keyboard;
      return cap;
    };
    let current: Record<string, unknown> | undefined = graft({ Plugins: {} });
    Object.defineProperty(window, "Capacitor", {
      configurable: true,
      get: () => current,
      set: (value) => {
        current = graft(value as Record<string, unknown>);
      },
    });
    (window as unknown as { __emitKeyboard: (e: string, h: number) => void }).__emitKeyboard = (
      event,
      height,
    ) => (listeners[event] ?? []).forEach((cb) => cb({ keyboardHeight: height }));
  });
}

/** Waits until the app-wide tracker has published the variable inline. */
async function waitForTracker(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.style.getPropertyValue("--keyboard-inset") !== "",
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
}

function insetPx(page: Page) {
  return page.evaluate(() =>
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--keyboard-inset") || "0",
    ),
  );
}

test.describe("iOS keyboard + bottom controls smoke", () => {
  test("iPhone: native plugin height drives the inset and keyboard-open state", async ({
    page,
  }) => {
    await page.setViewportSize(IPHONE);
    await installFakeKeyboardPlugin(page);
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });
    await waitForTracker(page);
    await expect.poll(() => insetPx(page)).toBe(0);

    await page.evaluate(() => {
      (window as unknown as { __emitKeyboard: (e: string, h: number) => void }).__emitKeyboard(
        "keyboardWillShow",
        336,
      );
    });

    await expect.poll(() => insetPx(page)).toBeGreaterThanOrEqual(300);
    await expect(page.locator("html[data-keyboard-open]")).toHaveCount(1);

    // Bottom chrome, wherever it is rendered, must clear the keyboard.
    const bottomControls = await page.evaluate(() => {
      const hidden = Array.from(document.querySelectorAll(".keyboard-hide")).every((el) => {
        const s = getComputedStyle(el);
        return s.display === "none" || s.visibility === "hidden" || s.opacity === "0";
      });
      const lifted = Array.from(document.querySelectorAll(".keyboard-lift")).every(
        (el) => parseFloat(getComputedStyle(el).bottom || "0") >= 300,
      );
      return { hidden, lifted };
    });
    expect(bottomControls.hidden).toBe(true);
    expect(bottomControls.lifted).toBe(true);

    await page.evaluate(() => {
      (window as unknown as { __emitKeyboard: (e: string, h: number) => void }).__emitKeyboard(
        "keyboardWillHide",
        0,
      );
    });
    await expect.poll(() => insetPx(page)).toBe(0);
    await expect(page.locator("html[data-keyboard-open]")).toHaveCount(0);
  });

  test("keyboard CSS contract is present for fixed and sticky bottom bars", async ({ page }) => {
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });
    const rules = await page.evaluate(() =>
      Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules).map((r) => r.cssText);
          } catch {
            return [];
          }
        })
        .filter((text) => text.includes("keyboard-inset") || text.includes("keyboard-")),
    );
    const joined = rules.join("\n");
    expect(joined).toContain(".keyboard-hide");
    expect(joined).toContain(".keyboard-lift");
    expect(joined).toContain("--keyboard-inset");
  });

  test("iPad undocked: visualViewport fallback still produces an inset", async ({ page }) => {
    await page.setViewportSize(IPAD);
    // Plugin registered but silent — the undocked / floating keyboard case.
    await installFakeKeyboardPlugin(page);
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });
    await waitForTracker(page);

    const applied = await page.evaluate(() => {
      const vv = window.visualViewport;
      if (!vv) return "no-visualviewport";
      Object.defineProperty(vv, "height", { value: window.innerHeight - 320, configurable: true });
      vv.dispatchEvent(new Event("resize"));
      return getComputedStyle(document.documentElement).getPropertyValue("--keyboard-inset").trim();
    });

    test.skip(applied === "no-visualviewport", "visualViewport unavailable");
    expect(parseFloat(applied)).toBeGreaterThanOrEqual(300);
  });

  // A docked iPad keyboard reports through the plugin like an iPhone; a split or
  // floating one only shows up in visualViewport. Portrait and landscape differ
  // in keyboard height, so both orientations are exercised.
  const IPAD_ORIENTATIONS = [
    { name: "portrait", size: { width: 1024, height: 1366 }, height: 378 },
    { name: "landscape", size: { width: 1366, height: 1024 }, height: 420 },
  ] as const;

  for (const orientation of IPAD_ORIENTATIONS) {
    test(`iPad docked (${orientation.name}): plugin inset applies and bottom controls clear the keyboard`, async ({
      page,
    }) => {
      await page.setViewportSize(orientation.size);
      await installFakeKeyboardPlugin(page);
      await page.goto(PAGE, { waitUntil: "domcontentloaded" });
      await waitForTracker(page);
      await expect.poll(() => insetPx(page)).toBe(0);

      await page.evaluate((height) => {
        (window as unknown as { __emitKeyboard: (e: string, h: number) => void }).__emitKeyboard(
          "keyboardWillShow",
          height,
        );
      }, orientation.height);

      await expect.poll(() => insetPx(page)).toBeGreaterThanOrEqual(orientation.height - 1);
      await expect(page.locator("html[data-keyboard-open]")).toHaveCount(1);

      const open = await measureBottomControls(page);
      expect(open.hiddenChromeClears).toBe(true);
      expect(open.liftedBarsClear).toBe(true);

      await page.evaluate(() => {
        (window as unknown as { __emitKeyboard: (e: string, h: number) => void }).__emitKeyboard(
          "keyboardWillHide",
          0,
        );
      });
      await expect.poll(() => insetPx(page)).toBe(0);
    });
  }

  test("iPad portrait, split keyboard: visualViewport fallback still lifts controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await installFakeKeyboardPlugin(page);
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });
    await waitForTracker(page);

    const applied = await shrinkVisualViewport(page, 280);
    test.skip(applied === "no-visualviewport", "visualViewport unavailable");
    expect(parseFloat(applied as string)).toBeGreaterThanOrEqual(279);

    const open = await measureBottomControls(page);
    expect(open.liftedBarsClear).toBe(true);
  });

  /**
   * Pixel evidence for the thing a reviewer actually checks by hand: the strip
   * of screen the keyboard would cover must contain no persistent bottom
   * control while open, and the controls must come back when it closes.
   */
  test("screenshots: bottom controls sit above the keyboard while open and return on close", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(IPHONE);
    await installFakeKeyboardPlugin(page);
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });
    await waitForTracker(page);

    const closedBefore = await measureBottomControls(page);
    await testInfo.attach("keyboard-closed-before.png", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    await page.evaluate(() => {
      (window as unknown as { __emitKeyboard: (e: string, h: number) => void }).__emitKeyboard(
        "keyboardWillShow",
        336,
      );
    });
    await expect.poll(() => insetPx(page)).toBeGreaterThanOrEqual(335);

    const open = await measureBottomControls(page);
    expect(open.hiddenChromeClears).toBe(true);
    expect(open.liftedBarsClear).toBe(true);
    // Nothing may intrude into the keyboard rectangle.
    expect(open.maxBottomEdge).toBeLessThanOrEqual(open.keyboardTop + 1);

    // Screenshot the keyboard strip itself so a regression is visible, not just numeric.
    await testInfo.attach("keyboard-open-strip.png", {
      body: await page.screenshot({
        clip: {
          x: 0,
          y: Math.max(0, open.keyboardTop),
          width: IPHONE.width,
          height: Math.min(IPHONE.height - Math.max(0, open.keyboardTop), 336),
        },
      }),
      contentType: "image/png",
    });

    await page.evaluate(() => {
      (window as unknown as { __emitKeyboard: (e: string, h: number) => void }).__emitKeyboard(
        "keyboardWillHide",
        0,
      );
    });
    await expect.poll(() => insetPx(page)).toBe(0);

    const closedAfter = await measureBottomControls(page);
    await testInfo.attach("keyboard-closed-after.png", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    // Controls are restored to the same place they started.
    expect(closedAfter.inspected).toBe(closedBefore.inspected);
    expect(Math.abs(closedAfter.maxBottomEdge - closedBefore.maxBottomEdge)).toBeLessThanOrEqual(2);
  });

  test("in-app navigation stays in the webview", async ({ page }) => {
    await page.setViewportSize(IPHONE);
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });

    // Same-site affordances must be router links, not absolute URLs that the
    // native shell would hand off to Safari.
    const absoluteInternal = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .map((a) => a.getAttribute("href") ?? "")
        .filter((href) => /^https?:\/\/(www\.)?doseroutine\.com/i.test(href)),
    );
    expect(absoluteInternal).toEqual([]);

    // Genuinely off-origin links must be flagged for the system browser.
    const unsafeExternal = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='http']"))
        .filter((a) => !a.href.startsWith(location.origin) && a.target !== "_blank")
        .map((a) => a.href),
    );
    expect(unsafeExternal).toEqual([]);
  });
});
