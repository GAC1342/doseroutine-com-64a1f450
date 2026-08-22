import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle, yogaThumbnail, yogaLightbox } from "./exercise-art-helpers";

/**
 * WebKit / iOS Safari: the full-size illustration must open *from cache*.
 *
 * iOS has no hover, so the desktop warming path (pointerenter) never fires on
 * a phone. The only pre-tap signal is `touchstart`, which precedes the
 * synthesised `click` by ~100-300ms — enough to fetch and decode the file if
 * the listener is bound natively in the capture phase (see
 * `useWarmOnIntentRef` in src/lib/image-warm.ts) rather than delegated by
 * React from the root container.
 *
 * This spec asserts the observable consequence rather than the mechanism:
 *   1. a bare touchstart on the thumbnail (no tap) warms the file,
 *   2. the modal that opens afterwards paints a fully decoded image on its
 *      first frame (`complete && naturalWidth > 0`),
 *   3. opening it issues no new network request for that file.
 *
 * Run with the `webkit` and `mobile-safari` Playwright projects.
 */

test.describe("illustration modal opens from cache (WebKit touch)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("touchstart warms the file and the modal paints it from cache", async ({
    authedPage: page,
  }) => {
    // Record every image request so we can prove the modal added none.
    const requested: string[] = [];
    page.on("request", (req) => {
      if (req.resourceType() === "image") requested.push(req.url());
    });

    await openYogaWorkoutSheet(page);
    const thumb = yogaThumbnail(page);
    await expect(thumb).toBeVisible();
    await settle(page);

    const src = await thumb
      .locator("img")
      .first()
      .evaluate((el: HTMLImageElement) => el.src);
    expect(src).toBeTruthy();

    // Cold start: forget anything warmed while the list rendered.
    await page.evaluate(() => {
      (window as unknown as { __imageWarm?: { reset(): void } }).__imageWarm?.reset();
    });
    expect(
      await page.evaluate(
        (s) =>
          (window as unknown as { __imageWarm?: { state(x: string): string } }).__imageWarm?.state(
            s,
          ),
        src,
      ),
    ).toBe("cold");

    // The native (capture + passive) listeners must be bound to the trigger.
    await expect(thumb).toHaveAttribute("data-warm-intent", "bound");

    // A touch that never becomes a tap: just the touchstart iOS delivers the
    // moment a finger lands on the thumbnail. No click, no tap.
    await thumb.dispatchEvent("touchstart");

    // The warm completes asynchronously (fetch + decode).
    await expect
      .poll(
        () =>
          page.evaluate(
            (s) =>
              (
                window as unknown as { __imageWarm?: { state(x: string): string } }
              ).__imageWarm?.state(s),
            src,
          ),
        { timeout: 10_000 },
      )
      .toBe("ready");

    const beforeOpen = requested.length;

    await thumb.click();
    const dialog = yogaLightbox(page);
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // First frame after the dialog mounts: the image must already be decoded.
    const painted = await dialog
      .locator("img")
      .first()
      .evaluate(
        (el: HTMLImageElement) =>
          new Promise<{ complete: boolean; naturalWidth: number }>((resolve) =>
            requestAnimationFrame(() =>
              resolve({ complete: el.complete, naturalWidth: el.naturalWidth }),
            ),
          ),
      );
    expect(painted.complete).toBe(true);
    expect(painted.naturalWidth).toBeGreaterThan(0);

    // Cache hit: opening the modal fetched the illustration again from nowhere.
    const newFetches = requested.slice(beforeOpen).filter((url) => url === src);
    expect(newFetches).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
