import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle, yogaThumbnail, yogaLightbox } from "./exercise-art-helpers";

/**
 * Image-loading performance regression for the illustration modal.
 *
 * What must hold, in every engine:
 *   1. The reference thumbnail loads eagerly (it is always visible, and it is
 *      the same file the modal shows — lazy-loading it is what used to make
 *      the modal feel slow).
 *   2. The modal image declares intrinsic width/height, so its box is reserved
 *      before the bitmap paints. Measured directly as layout shift.
 *   3. Opening the modal after the thumbnail has loaded issues no new network
 *      request — it is a memory/disk cache hit, i.e. instant.
 *   4. The image is already decoded (complete && naturalWidth > 0) within a
 *      tight budget after the dialog becomes visible.
 *
 * Run on chromium and webkit; the CLS observer only exists in Chromium, so the
 * shift assertion is skipped elsewhere while the rest still runs.
 */

const YOGA_IMG = '[role="dialog"][data-art-dialog="Yoga"] img';

/** Budget for "the image is ready when the dialog appears". */
const READY_BUDGET_MS = 400;

test.describe("illustration image loading", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.describe.configure({ timeout: 120_000 });

  test("thumbnail is eager and the modal opens from cache without shifting", async ({
    authedPage: page,
  }, testInfo) => {
    // Record every image request so we can prove the modal open is a cache hit.
    const imageRequests: string[] = [];
    page.on("request", (req) => {
      if (req.resourceType() === "image") imageRequests.push(req.url());
    });

    await openYogaWorkoutSheet(page);

    const thumb = yogaThumbnail(page);
    await expect(thumb).toBeVisible();

    // (1) Loading attributes on the always-visible reference thumbnail.
    const thumbImg = thumb.locator("img").first();
    expect(await thumbImg.getAttribute("loading")).toBe("eager");
    expect(await thumbImg.getAttribute("decoding")).toBe("async");
    expect(await thumbImg.getAttribute("width")).toBe("56");
    expect(await thumbImg.getAttribute("height")).toBe("56");

    const src = await thumbImg.getAttribute("src");
    expect(src).toBeTruthy();

    // Thumbnail bitmap must be in before we measure the modal open.
    await expect
      .poll(
        () => thumbImg.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
        { timeout: 15_000 },
      )
      .toBe(true);
    await settle(page);

    // Start a layout-shift observer scoped to the modal open.
    const hasCLS = await page.evaluate(() => {
      const w = window as unknown as { __artShift?: number };
      w.__artShift = 0;
      try {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) w.__artShift = (w.__artShift ?? 0) + entry.value;
          }
        });
        obs.observe({ type: "layout-shift", buffered: false });
        return true;
      } catch {
        return false; // WebKit/Firefox: no layout-shift entries.
      }
    });

    const requestsBeforeOpen = imageRequests.length;

    const openedAt = Date.now();
    await thumb.focus();
    await page.keyboard.press("Enter");

    const dialog = yogaLightbox(page);
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const image = dialog.locator("img").first();

    // (2) Intrinsic dimensions declared up front.
    expect(await image.getAttribute("width")).toBe("816");
    expect(await image.getAttribute("height")).toBe("816");
    expect(await image.getAttribute("loading")).toBe("eager");
    expect(await image.getAttribute("decoding")).toBe("async");

    // (4) Already decoded, essentially immediately.
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), {
        timeout: READY_BUDGET_MS,
        intervals: [25, 50, 50, 100],
      })
      .toBe(true);
    const readyMs = Date.now() - openedAt;
    testInfo.annotations.push({ type: "modal-image-ready-ms", description: String(readyMs) });

    // (3) Same file as the thumbnail, served from cache — no new image request.
    expect(await image.getAttribute("src")).toBe(src);
    const newImageRequests = imageRequests
      .slice(requestsBeforeOpen)
      .filter((url) => url === new URL(src!, page.url()).toString() || url.endsWith(src!));
    expect(newImageRequests).toEqual([]);

    // The reserved box must be square before and after paint, i.e. no reflow.
    await settle(page);
    const box = (await image.boundingBox())!;
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(
      Math.max(2, box.width * 0.02) + 0.5,
    );

    if (hasCLS) {
      const shift = await page.evaluate(
        () => (window as unknown as { __artShift?: number }).__artShift ?? 0,
      );
      testInfo.annotations.push({ type: "modal-open-cls", description: String(shift) });
      // Anything above 0.01 is a visible jump; a missing width/height pushes
      // this well past 0.1.
      expect(shift).toBeLessThanOrEqual(0.01);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("hovering a thumbnail warms the full-size image before it is opened", async ({
    authedPage: page,
  }) => {
    await openYogaWorkoutSheet(page);
    const thumb = yogaThumbnail(page);
    await expect(thumb).toBeVisible();

    // Hover is the intent signal the component listens for.
    await thumb.hover();

    const src = await thumb.locator("img").first().getAttribute("src");
    await expect
      .poll(
        () =>
          page.evaluate(async (url) => {
            const probe = new Image();
            probe.src = url!;
            // A warm image reports complete synchronously from cache.
            return probe.complete;
          }, src),
        { timeout: 15_000 },
      )
      .toBe(true);

    await thumb.focus();
    await page.keyboard.press("Enter");
    const dialog = yogaLightbox(page);
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const decoded = await dialog
      .locator("img")
      .first()
      .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
    expect(decoded).toBe(true);
  });
});
