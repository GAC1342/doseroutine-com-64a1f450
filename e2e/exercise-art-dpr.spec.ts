import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle, yogaThumbnail, yogaLightbox } from "./exercise-art-helpers";
import { selectedDprs, selectedViewports } from "./exercise-art-viewports";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * devicePixelRatio regression for the workout-type illustration thumbnail and
 * its full-size modal.
 *
 * Retina (dpr 2) and high-density Android (dpr 3) render the same CSS box with
 * a different backing bitmap. Two things can regress independently:
 *   1. Layout: a sizing rule expressed in device pixels (or an image that
 *      reports its intrinsic size into layout) would make the thumbnail/modal
 *      change CSS size on Retina only.
 *   2. Sharpness: if the illustration source is served at 1x, the modal looks
 *      soft on dpr 2/3.
 *
 * So each run asserts CSS geometry invariants in-test and writes a ledger to
 * test-results/exercise-art-dpr/<project>-dpr<n>.json; the cross-DPR diff is
 * done by scripts/check-exercise-art-dpr.mjs, which is what actually catches
 * "1x is fine but 3x is 4px wider".
 */

const LEDGER_DIR = join("test-results", "exercise-art-dpr");

/**
 * Densities and widths come from e2e/exercise-art-viewports.ts and can be
 * narrowed per CI job with ART_DPRS / ART_VIEWPORTS. Density bugs are
 * width-independent, so a single phone + laptop pair is enough locally.
 */
const RATIOS = selectedDprs();
const DEFAULT_DPR_VIEWPORTS = ["phone-390", "laptop-1280"];
const VIEWPORTS = process.env.ART_VIEWPORTS
  ? selectedViewports()
  : selectedViewports().filter((v) => DEFAULT_DPR_VIEWPORTS.includes(v.name));

type Box = { x: number; y: number; width: number; height: number };

const round = (box: Box): Box => ({
  x: Math.round(box.x),
  y: Math.round(box.y),
  width: Math.round(box.width),
  height: Math.round(box.height),
});

for (const dpr of RATIOS) {
  for (const viewport of VIEWPORTS) {
    test.describe(`illustration sizing @${dpr}x — ${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: dpr,
      });
      // Firefox does not honour deviceScaleFactor; running it would compare
      // 1x geometry against itself and hide nothing.
      test.skip(
        ({ browserName }) => browserName === "firefox" && dpr !== 1,
        "Firefox ignores deviceScaleFactor",
      );
      test.describe.configure({ timeout: 120_000 });

      test(`thumbnail and modal keep CSS sizing at ${dpr}x (${viewport.name})`, async ({
        authedPage: page,
      }, testInfo) => {
        await openYogaWorkoutSheet(page);

        // Confirm the context actually applied the density before asserting on it.
        expect(await page.evaluate(() => window.devicePixelRatio)).toBeCloseTo(dpr, 1);

        const thumb = yogaThumbnail(page);
        await expect(thumb).toBeVisible();

        const thumbBox = round((await thumb.boundingBox())!);
        // Declared at 56x56 in CSS pixels — must not scale with density.
        expect(thumbBox.width).toBe(56);
        expect(thumbBox.height).toBe(56);

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

        const dialogBox = round((await dialog.boundingBox())!);
        const imageBox = round((await image.boundingBox())!);

        // Layout invariants: the modal stays inside the viewport and the image
        // stays inside the modal at every density.
        expect(dialogBox.x).toBeGreaterThanOrEqual(0);
        expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width);
        expect(imageBox.x).toBeGreaterThanOrEqual(dialogBox.x);
        expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        ).toBeLessThanOrEqual(0);

        // Sharpness: the source bitmap must cover the device pixels it is
        // painted into (SVG reports a nominal intrinsic size but scales
        // losslessly, so it is exempt).
        const source = await image.evaluate((el: HTMLImageElement) => ({
          naturalWidth: el.naturalWidth,
          currentSrc: el.currentSrc,
        }));
        const isVector =
          source.currentSrc.includes(".svg") || source.currentSrc.startsWith("data:image/svg");
        if (!isVector && imageBox.width > 0) {
          expect(source.naturalWidth).toBeGreaterThanOrEqual(Math.round(imageBox.width * dpr));
        }

        mkdirSync(LEDGER_DIR, { recursive: true });
        const key = `__exerciseArtDpr_${dpr}`;
        const store = globalThis as Record<string, unknown>;
        const existing = (store[key] ?? {}) as Record<string, unknown>;
        existing[viewport.name] = { thumb: thumbBox, dialog: dialogBox, image: imageBox };
        store[key] = existing;
        writeFileSync(
          join(LEDGER_DIR, `${testInfo.project.name}-dpr${dpr}__${viewport.name}.json`),
          JSON.stringify({ project: testInfo.project.name, dpr, viewports: existing }, null, 2),
        );

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
      });
    });
  }
}
