import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle, yogaThumbnail, yogaLightbox } from "./exercise-art-helpers";
import { selectedViewports } from "./exercise-art-viewports";

/**
 * Browser-zoom regression for the illustration modal.
 *
 * Browser page zoom is exactly "CSS viewport shrinks by the zoom factor while
 * the backing store grows by it": at 125% zoom on a 390px device the layout
 * viewport is 312 CSS px at dpr 1.25. Playwright has no page-zoom API, so we
 * emulate it that way — the layout consequences (narrower viewport, fractional
 * device pixels) are identical, which is what breaks modals.
 *
 * The invariant under test: at every zoom level the dialog stays fully inside
 * the viewport, the image stays inside the dialog, and nothing introduces
 * horizontal page scroll.
 *
 * Narrow with ART_VIEWPORTS / ART_ZOOMS (e.g. ART_ZOOMS="0.9,1,1.25").
 */

const DEFAULT_ZOOMS = [0.9, 1, 1.25];
const ZOOMS = (process.env.ART_ZOOMS ?? "")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
const LEVELS = ZOOMS.length > 0 ? ZOOMS : DEFAULT_ZOOMS;

const DEFAULT_ZOOM_VIEWPORTS = ["phone-390", "laptop-1280"];
const VIEWPORTS = process.env.ART_VIEWPORTS
  ? selectedViewports()
  : selectedViewports().filter((v) => DEFAULT_ZOOM_VIEWPORTS.includes(v.name));

const pct = (zoom: number) => `${Math.round(zoom * 100)}%`;

for (const zoom of LEVELS) {
  for (const viewport of VIEWPORTS) {
    // Layout viewport in CSS px after zoom, mirroring how browsers reflow.
    const width = Math.round(viewport.width / zoom);
    const height = Math.round(viewport.height / zoom);

    test.describe(`illustration modal @ ${pct(zoom)} zoom — ${viewport.name}`, () => {
      test.use({ viewport: { width, height }, deviceScaleFactor: zoom });
      // Firefox ignores deviceScaleFactor; the reflow half of the emulation
      // still applies, so it runs with density pinned to 1.
      test.describe.configure({ timeout: 120_000 });

      test(`dialog and image stay inside the viewport at ${pct(zoom)} (${viewport.name})`, async ({
        authedPage: page,
      }) => {
        await openYogaWorkoutSheet(page);

        const thumb = yogaThumbnail(page);
        await expect(thumb).toBeVisible();
        const thumbBox = (await thumb.boundingBox())!;
        // Zoom must not change the CSS size of the thumbnail.
        expect(Math.round(thumbBox.width)).toBe(56);
        expect(Math.round(thumbBox.height)).toBe(56);

        await thumb.focus();
        await page.keyboard.press("Enter");

        const dialog = yogaLightbox(page);
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        const image = dialog.locator("img").first();
        await expect(image).toBeVisible();
        await expect
          .poll(
            () => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
            { timeout: 10_000 },
          )
          .toBe(true);
        await settle(page);

        const dialogBox = (await dialog.boundingBox())!;
        const imageBox = (await image.boundingBox())!;
        const layout = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));

        // 1px of slack absorbs fractional-pixel rounding at 90%/125%.
        const SLACK = 1;
        expect(dialogBox.x).toBeGreaterThanOrEqual(-SLACK);
        expect(dialogBox.y).toBeGreaterThanOrEqual(-SLACK);
        expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(layout.width + SLACK);
        expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(layout.height + SLACK);

        // The illustration must not spill out of its dialog.
        expect(imageBox.x).toBeGreaterThanOrEqual(dialogBox.x - SLACK);
        expect(imageBox.y).toBeGreaterThanOrEqual(dialogBox.y - SLACK);
        expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(
          dialogBox.x + dialogBox.width + SLACK,
        );
        expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(
          dialogBox.y + dialogBox.height + SLACK,
        );

        // Zoom must never introduce horizontal page scroll.
        expect(layout.overflowX).toBeLessThanOrEqual(SLACK);

        // The modal must remain usable, not collapsed to a sliver.
        expect(imageBox.width).toBeGreaterThan(80);
        expect(imageBox.height).toBeGreaterThan(80);

        // Close control stays reachable inside the viewport.
        const close = dialog.getByRole("button").first();
        if (await close.isVisible().catch(() => false)) {
          const closeBox = (await close.boundingBox())!;
          expect(closeBox.x).toBeGreaterThanOrEqual(-SLACK);
          expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(layout.width + SLACK);
          expect(closeBox.y).toBeGreaterThanOrEqual(-SLACK);
          expect(closeBox.y + closeBox.height).toBeLessThanOrEqual(layout.height + SLACK);
        }

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
      });
    });
  }
}
