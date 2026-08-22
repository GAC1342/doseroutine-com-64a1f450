import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle, yogaThumbnail, yogaLightbox } from "./exercise-art-helpers";
import { selectedViewports } from "./exercise-art-viewports";
import type { Page } from "@playwright/test";

/**
 * Scroll- and resize-stability regression for the illustration modal.
 *
 * Two classic failure modes for a dialog that locks scrolling:
 *   1. Opening it applies `overflow: hidden` (or `position: fixed`) to the
 *      body, so the page jumps to the top and the thumbnail moves; closing it
 *      does not restore the scroll offset.
 *   2. Resizing while the dialog is open reflows the surface behind it, so the
 *      thumbnail lands somewhere else or the page gains horizontal scroll.
 *
 * This suite scrolls the surface, snapshots the thumbnail's position relative
 * to its scroll container, cycles the modal (including through a resize), and
 * asserts nothing moved and nothing overflows.
 */

const DEFAULT_VIEWPORTS = ["phone-390", "laptop-1280"];
const VIEWPORTS = process.env.ART_VIEWPORTS
  ? selectedViewports()
  : selectedViewports().filter((v) => DEFAULT_VIEWPORTS.includes(v.name));

/** 1px absorbs sub-pixel layout rounding; anything larger is a real shift. */
const SLACK = 1;

type Offsets = { window: number; container: number };

/** Scrolls the window and the thumbnail's nearest scrollable ancestor. */
async function scrollSurfaces(page: Page, amount: number): Promise<Offsets> {
  return page.evaluate((delta) => {
    const thumb = document.querySelector<HTMLElement>('[aria-label^="Enlarge Yoga illustration"]');
    let node: HTMLElement | null = thumb?.parentElement ?? null;
    let container: HTMLElement | null = null;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      const scrollable = /(auto|scroll)/.test(style.overflowY);
      if (scrollable && node.scrollHeight > node.clientHeight + 4) {
        container = node;
        break;
      }
      node = node.parentElement;
    }
    if (container) container.scrollTop = Math.min(delta, container.scrollHeight);
    window.scrollTo(0, delta);
    return { window: window.scrollY, container: container?.scrollTop ?? 0 };
  }, amount);
}

async function readOffsets(page: Page): Promise<Offsets> {
  return page.evaluate(() => {
    const thumb = document.querySelector<HTMLElement>('[aria-label^="Enlarge Yoga illustration"]');
    let node: HTMLElement | null = thumb?.parentElement ?? null;
    let container: HTMLElement | null = null;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 4) {
        container = node;
        break;
      }
      node = node.parentElement;
    }
    return { window: window.scrollY, container: container?.scrollTop ?? 0 };
  });
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

for (const viewport of VIEWPORTS) {
  test.describe(`illustration modal scroll/resize stability — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test.describe.configure({ timeout: 120_000 });

    test(`open/close while scrolled keeps the thumbnail put (${viewport.name})`, async ({
      authedPage: page,
    }) => {
      await openYogaWorkoutSheet(page);
      const thumb = yogaThumbnail(page);
      await expect(thumb).toBeVisible();

      // Scroll the surface so any scroll-lock bug has something to lose.
      await scrollSurfaces(page, 240);
      await settle(page);
      const beforeOffsets = await readOffsets(page);
      const beforeBox = (await thumb.boundingBox())!;
      const beforeOverflow = await horizontalOverflow(page);

      // Two full open/close cycles: a scroll-restore bug often only drifts on
      // the second round trip.
      for (let cycle = 0; cycle < 2; cycle += 1) {
        await thumb.focus();
        await page.keyboard.press("Enter");
        const dialog = yogaLightbox(page);
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        await settle(page);

        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(SLACK);
        const dialogBox = (await dialog.boundingBox())!;
        expect(dialogBox.x).toBeGreaterThanOrEqual(-SLACK);
        expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width + SLACK);

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await settle(page);

        const afterOffsets = await readOffsets(page);
        expect(Math.abs(afterOffsets.window - beforeOffsets.window)).toBeLessThanOrEqual(SLACK);
        expect(Math.abs(afterOffsets.container - beforeOffsets.container)).toBeLessThanOrEqual(
          SLACK,
        );

        const afterBox = (await thumb.boundingBox())!;
        expect(Math.abs(afterBox.x - beforeBox.x)).toBeLessThanOrEqual(SLACK);
        expect(Math.abs(afterBox.y - beforeBox.y)).toBeLessThanOrEqual(SLACK);
        expect(Math.round(afterBox.width)).toBe(Math.round(beforeBox.width));
        expect(Math.round(afterBox.height)).toBe(Math.round(beforeBox.height));
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(Math.max(beforeOverflow, SLACK));

        // Focus must come back to the trigger, otherwise the next cycle's
        // keyboard open would silently target something else.
        await expect(thumb).toBeFocused();
      }
    });

    test(`resizing while the modal is open never overflows (${viewport.name})`, async ({
      authedPage: page,
    }) => {
      await openYogaWorkoutSheet(page);
      const thumb = yogaThumbnail(page);
      await expect(thumb).toBeVisible();
      await scrollSurfaces(page, 180);
      await settle(page);
      const beforeBox = (await thumb.boundingBox())!;

      await thumb.focus();
      await page.keyboard.press("Enter");
      const dialog = yogaLightbox(page);
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      // Shrink to the narrowest supported phone, grow to a desktop width, and
      // return — each step must keep the dialog and image inside the viewport.
      const steps = [
        { width: 360, height: 640 },
        { width: 1280, height: 900 },
        { width: viewport.width, height: viewport.height },
      ];
      for (const size of steps) {
        await page.setViewportSize(size);
        await settle(page);
        await expect(dialog).toBeVisible();

        const dialogBox = (await dialog.boundingBox())!;
        const image = dialog.locator("img").first();
        const imageBox = (await image.boundingBox())!;

        expect(dialogBox.x).toBeGreaterThanOrEqual(-SLACK);
        expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(size.width + SLACK);
        expect(imageBox.x).toBeGreaterThanOrEqual(dialogBox.x - SLACK);
        expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(
          dialogBox.x + dialogBox.width + SLACK,
        );
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(SLACK);
      }

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await settle(page);

      // Back at the original viewport the thumbnail must be its original size
      // and still free of page overflow.
      const afterBox = (await thumb.boundingBox())!;
      expect(Math.round(afterBox.width)).toBe(Math.round(beforeBox.width));
      expect(Math.round(afterBox.height)).toBe(Math.round(beforeBox.height));
      expect(afterBox.x).toBeGreaterThanOrEqual(0);
      expect(afterBox.x + afterBox.width).toBeLessThanOrEqual(viewport.width + SLACK);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(SLACK);
    });
  });
}
