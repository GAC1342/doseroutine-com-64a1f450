import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle, yogaThumbnail, yogaLightbox } from "./exercise-art-helpers";
import { selectedLandscapeViewports } from "./exercise-art-viewports";
import { expectVisualSnapshot } from "./visual-baseline";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeVisualThresholds, snapshotOptions } from "./visual-thresholds";

/**
 * Landscape-orientation run of the illustration visual regression.
 *
 * Portrait coverage lives in exercise-art-visual.spec.ts. Rotating the same
 * devices is a genuinely different test: a landscape phone is only ~360-430
 * CSS px tall, so a dialog sized from the illustration's aspect ratio is the
 * most likely place for the full-size image to be cut off — especially on iOS
 * Safari, where the dynamic toolbars shrink the visual viewport below the
 * layout viewport.
 *
 * Covered here and not in the portrait suite:
 *   - vertical containment of the dialog and image (portrait only asserts
 *     horizontal, because height is never the constraint there),
 *   - the image keeps its natural aspect ratio (a squashed image is a cutoff
 *     in disguise: object-fit: cover would silently crop it),
 *   - the visual viewport, not just the layout viewport, contains the image on
 *     iOS Safari.
 *
 * Run the WebKit project (and the `mobile-safari` project, which is WebKit
 * with an iPhone UA, touch and mobile flags) to cover iOS Safari.
 */

const GEOMETRY_DIR = join("test-results", "exercise-art-landscape");

// Thresholds come from VISUAL_DIFF_PROFILE / VISUAL_* env overrides so
// staging runs can absorb minor rendering drift without editing tests.
const SNAPSHOT_OPTS = snapshotOptions("exercise-art-landscape");
console.log(describeVisualThresholds("exercise-art-landscape"));

/** Sub-pixel layout rounding; anything above this is a real cutoff. */
const SLACK = 1;

const VIEWPORTS = selectedLandscapeViewports();

type Box = { x: number; y: number; width: number; height: number };

const round = (box: Box): Box => ({
  x: Math.round(box.x),
  y: Math.round(box.y),
  width: Math.round(box.width),
  height: Math.round(box.height),
});

for (const viewport of VIEWPORTS) {
  test.describe(`workout type illustration (landscape) — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test.describe.configure({ timeout: 120_000 });

    test(`full-size image is never cut off in landscape (${viewport.name})`, async ({
      authedPage: page,
    }, testInfo) => {
      const group = await openYogaWorkoutSheet(page);

      const thumb = yogaThumbnail(page);
      await expect(thumb).toBeVisible();
      await expectVisualSnapshot(
        group,
        `yoga-thumbnail-row-${viewport.name}.png`,
        SNAPSHOT_OPTS,
        testInfo,
      );

      const thumbBox = round((await thumb.boundingBox())!);
      // Rotation must not change the declared 56x56 thumbnail.
      expect(thumbBox.width).toBe(56);
      expect(thumbBox.height).toBe(56);

      await thumb.focus();
      await page.keyboard.press("Enter");

      const dialog = yogaLightbox(page);
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      const figure = dialog.locator("figure").first();
      const image = dialog.locator("img").first();
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), {
          timeout: 10_000,
        })
        .toBe(true);
      await settle(page);

      await expectVisualSnapshot(
        figure,
        `yoga-modal-figure-${viewport.name}.png`,
        SNAPSHOT_OPTS,
        testInfo,
      );

      const dialogBox = round((await dialog.boundingBox())!);
      const imageBox = round((await image.boundingBox())!);

      // Horizontal containment (same invariant as portrait).
      expect(dialogBox.x).toBeGreaterThanOrEqual(-SLACK);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width + SLACK);
      expect(imageBox.x).toBeGreaterThanOrEqual(dialogBox.x - SLACK);
      expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(
        dialogBox.x + dialogBox.width + SLACK,
      );

      // Vertical containment — the landscape-specific risk.
      expect(dialogBox.y).toBeGreaterThanOrEqual(-SLACK);
      expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height + SLACK);
      expect(imageBox.y).toBeGreaterThanOrEqual(-SLACK);
      expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(viewport.height + SLACK);

      // No page scroll in either axis was introduced by the dialog.
      const overflow = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      }));
      expect(overflow.x).toBeLessThanOrEqual(SLACK);

      // Aspect-ratio fidelity: a cropped/squashed render is a cutoff too.
      const ratios = await image.evaluate((el: HTMLImageElement) => {
        const rect = el.getBoundingClientRect();
        return {
          natural: el.naturalWidth / el.naturalHeight,
          rendered: rect.width / rect.height,
          objectFit: getComputedStyle(el).objectFit,
        };
      });
      expect(ratios.objectFit).not.toBe("cover");
      expect(Math.abs(ratios.rendered - ratios.natural)).toBeLessThanOrEqual(0.02);

      // iOS Safari: the visual viewport can be shorter than the layout
      // viewport once the toolbars are showing. The image must fit that too.
      const visual = await page.evaluate(() => {
        const el = document.querySelector<HTMLImageElement>(
          '[role="dialog"][data-art-dialog="Yoga"] img',
        );
        const rect = el!.getBoundingClientRect();
        const vv = window.visualViewport;
        return {
          top: rect.top - (vv?.offsetTop ?? 0),
          bottom: rect.bottom - (vv?.offsetTop ?? 0),
          height: vv?.height ?? window.innerHeight,
        };
      });
      expect(visual.top).toBeGreaterThanOrEqual(-SLACK);
      expect(visual.bottom).toBeLessThanOrEqual(visual.height + SLACK);

      // Ledger for the cross-browser geometry comparison, same shape as the
      // portrait suite so the merge/check scripts can consume it unchanged.
      // The landscape-specific fields (viewport size, aspect ratios, visual
      // viewport bounds, bottom gap) feed
      // scripts/check-exercise-art-landscape.mjs, which re-asserts the
      // y-overflow and aspect-ratio invariants across every project and
      // against the committed baseline.
      mkdirSync(GEOMETRY_DIR, { recursive: true });
      const store =
        (globalThis as { __exerciseArtLandscape?: Record<string, unknown> })
          .__exerciseArtLandscape ?? {};
      store[viewport.name] = {
        thumb: thumbBox,
        dialog: dialogBox,
        image: imageBox,
        pageOverflowY: overflow.y,
        pageOverflowX: overflow.x,
        viewport: { width: viewport.width, height: viewport.height },
        aspect: {
          natural: Number(ratios.natural.toFixed(4)),
          rendered: Number(ratios.rendered.toFixed(4)),
          delta: Number(Math.abs(ratios.rendered - ratios.natural).toFixed(4)),
          objectFit: ratios.objectFit,
        },
        visualViewport: {
          top: Math.round(visual.top),
          bottom: Math.round(visual.bottom),
          height: Math.round(visual.height),
        },
        // Distance from the image's bottom edge to the bottom of the layout
        // viewport. Negative = cut off.
        bottomGap: Math.round(viewport.height - (imageBox.y + imageBox.height)),
      };

      (globalThis as { __exerciseArtLandscape?: Record<string, unknown> }).__exerciseArtLandscape =
        store;
      writeFileSync(
        join(GEOMETRY_DIR, `${testInfo.project.name}__${viewport.name}.json`),
        JSON.stringify({ project: testInfo.project.name, viewports: store }, null, 2),
      );

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });
  });
}
