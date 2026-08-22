import { expect, type Page } from "@playwright/test";

/**
 * Shared harness for the device-shaped keyboard smoke tests (iOS + Android).
 *
 * Capacitor's own runtime assigns `window.Capacitor` during boot, so a plain
 * init-script object gets clobbered. Intercept the assignment and merge a fake
 * Keyboard plugin into whatever the runtime installs.
 */
export async function installFakeKeyboardPlugin(page: Page) {
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
export async function waitForTracker(page: Page) {
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

export function insetPx(page: Page) {
  return page.evaluate(() =>
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--keyboard-inset") || "0",
    ),
  );
}

export async function emitKeyboard(page: Page, event: string, height: number) {
  await page.evaluate(
    ([e, h]) => {
      (
        window as unknown as { __emitKeyboard: (event: string, height: number) => void }
      ).__emitKeyboard(e as string, h as number);
    },
    [event, height] as const,
  );
}

/** Simulates the viewport shrink an OS keyboard causes, for the fallback path. */
export async function shrinkVisualViewport(page: Page, by: number) {
  return page.evaluate((amount) => {
    const vv = window.visualViewport;
    if (!vv) return "no-visualviewport";
    Object.defineProperty(vv, "height", {
      value: window.innerHeight - amount,
      configurable: true,
    });
    vv.dispatchEvent(new Event("resize"));
    return getComputedStyle(document.documentElement).getPropertyValue("--keyboard-inset").trim();
  }, by);
}

export type BottomControlState = {
  /** Bottom-most visible pixel of every persistent bottom control. */
  maxBottomEdge: number;
  /** Top of the simulated keyboard in viewport coordinates. */
  keyboardTop: number;
  hiddenChromeClears: boolean;
  liftedBarsClear: boolean;
  inspected: number;
};

/**
 * Geometric assertion: nothing that is meant to stay tappable may overlap the
 * keyboard rectangle. `.keyboard-hide` elements must be gone; `.keyboard-lift`
 * and sticky action bars must end above the keyboard's top edge.
 */
export async function measureBottomControls(page: Page): Promise<BottomControlState> {
  return page.evaluate(() => {
    const inset = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--keyboard-inset") || "0",
    );
    const keyboardTop = window.innerHeight - inset;
    const isInvisible = (el: Element) => {
      const s = getComputedStyle(el);
      return s.display === "none" || s.visibility === "hidden" || s.opacity === "0";
    };
    const hideEls = Array.from(document.querySelectorAll(".keyboard-hide"));
    const liftEls = Array.from(document.querySelectorAll(".keyboard-lift")).filter(
      (el) => !isInvisible(el),
    );
    const edges = liftEls.map((el) => el.getBoundingClientRect().bottom);
    return {
      maxBottomEdge: edges.length ? Math.max(...edges) : 0,
      keyboardTop,
      hiddenChromeClears: hideEls.every(isInvisible),
      liftedBarsClear: edges.every((bottom) => bottom <= keyboardTop + 1),
      inspected: hideEls.length + liftEls.length,
    };
  });
}
