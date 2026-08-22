import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle } from "./exercise-art-helpers";
import { selectedViewports } from "./exercise-art-viewports";
import { expectVisualSnapshot } from "./visual-baseline";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeVisualThresholds, snapshotOptions } from "./visual-thresholds";

/**
 * Pixel-diff visual regression for the workout-type illustration thumbnail and
 * its full-size modal.
 *
 * Two layers of protection:
 *   1. Per-browser pixel snapshots (element screenshots, never full page) so a
 *      CSS/layout edit that moves or resizes either surface fails loudly.
 *   2. A geometry ledger written per project to
 *      test-results/exercise-art-geometry/<project>.json, compared across
 *      engines by scripts/check-exercise-art-geometry.mjs — that is what
 *      catches "Chromium is fine but WebKit shifted 6px".
 *
 * Determinism rules mirror mint-visual-regression.spec.ts:
 * animations disabled, fonts settled, element-scoped screenshots, small pixel
 * budget for anti-aliasing.
 */

const GEOMETRY_DIR = join("test-results", "exercise-art-geometry");

// Thresholds come from VISUAL_DIFF_PROFILE / VISUAL_* env overrides so
// staging runs can absorb minor rendering drift without editing tests.
const SNAPSHOT_OPTS = snapshotOptions("exercise-art");
console.log(describeVisualThresholds("exercise-art"));

/**
 * Viewports come from e2e/exercise-art-viewports.ts and can be narrowed with
 * ART_VIEWPORTS (a name, "mobile", "desktop" or "all") so CI can run one job
 * per width. The workout sheet is the same surface at every width, so cutoff
 * regressions show up as geometry-assertion failures regardless of engine.
 */
const VIEWPORTS = selectedViewports();

type Box = { x: number; y: number; width: number; height: number };

const round = (box: Box): Box => ({
  x: Math.round(box.x),
  y: Math.round(box.y),
  width: Math.round(box.width),
  height: Math.round(box.height),
});

for (const viewport of VIEWPORTS) {
  test.describe(`workout type illustration — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    // Sign-in + fitness data load + two element snapshots exceed the default budget.
    test.describe.configure({ timeout: 120_000 });

    test(`thumbnail and full-size modal hold their pixels (${viewport.name})`, async ({
      authedPage: page,
    }, testInfo) => {
      const group = await openYogaWorkoutSheet(page);

      const thumb = page.getByRole("button", { name: /^Enlarge Yoga illustration/ }).first();
      await expect(thumb).toBeVisible();

      // The reference row (thumbnail + copy) pins both the thumbnail size and
      // its position relative to the surrounding card.
      await expectVisualSnapshot(
        group,
        `yoga-thumbnail-row-${viewport.name}.png`,
        SNAPSHOT_OPTS,
        testInfo,
      );

      const thumbBox = round((await thumb.boundingBox())!);
      // Thumbnail is declared at 56x56 (size={56} + h-14 w-14).
      expect(thumbBox.width).toBe(56);
      expect(thumbBox.height).toBe(56);

      // Keyboard activation is the most reliable trigger here: the sheet's
      // scroll container can move the thumbnail mid-click on small viewports.
      await thumb.focus();
      await page.keyboard.press("Enter");

      // Radix labels the dialog via aria-labelledby (the sr-only title), so the
      // accessible name is "Yoga illustration"; target the explicit aria-label
      // attribute to be unambiguous.
      const dialog = page.locator('[role="dialog"][data-art-dialog="Yoga"]');
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      const figure = dialog.locator("figure").first();
      const image = dialog.locator("img").first();
      await expect(image).toBeVisible();
      // Wait for the illustration bitmap so the snapshot never captures a
      // blank frame.
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

      // Hard invariants that must hold in every engine, independent of pixels.
      expect(dialogBox.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width);
      expect(imageBox.x).toBeGreaterThanOrEqual(dialogBox.x);
      expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);

      // Record geometry for the cross-browser comparison step.
      mkdirSync(GEOMETRY_DIR, { recursive: true });
      // One file per project+viewport so CI matrix shards never overwrite each
      // other; scripts/merge-exercise-art-geometry.mjs folds them back together.
      const file = join(GEOMETRY_DIR, `${testInfo.project.name}__${viewport.name}.json`);
      const existing = (testInfo.attachments.length,
      (globalThis as { __exerciseArtGeometry?: Record<string, unknown> }).__exerciseArtGeometry ??
        {}) as Record<string, unknown>;
      existing[viewport.name] = { thumb: thumbBox, dialog: dialogBox, image: imageBox };
      (globalThis as { __exerciseArtGeometry?: Record<string, unknown> }).__exerciseArtGeometry =
        existing;
      writeFileSync(
        file,
        JSON.stringify({ project: testInfo.project.name, viewports: existing }, null, 2),
      );

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });
  });
}
