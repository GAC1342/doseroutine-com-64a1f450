import { test, expect } from "./utils";
import {
  activeElementInfo,
  openYogaWorkoutSheet,
  settle,
  yogaLightbox,
  yogaThumbnail,
} from "./exercise-art-helpers";
import { ALL_VIEWPORTS, selectedViewports } from "./exercise-art-viewports";
import { expectNoCutoff } from "./exercise-art-containment";

/**
 * Keyboard-only end-to-end coverage for the workout-type illustration
 * thumbnail and its full-size modal:
 *
 *   1. Tab order — the thumbnail is reachable with Tab alone and exposes the
 *      dialog affordance (aria-haspopup / aria-expanded).
 *   2. Activation — both Enter and Space open the modal and move focus into it.
 *   3. Focus trap — repeated Tab (and Shift+Tab) never escapes the dialog.
 *   4. Return focus — Escape closes and focus lands back on the thumbnail that
 *      opened it, not on the page body.
 *
 * Runs on a phone and a laptop width because the sheet is a bottom sheet on
 * small screens and a centred dialog on large ones.
 */

/**
 * Viewports come from the shared matrix (e2e/exercise-art-viewports.ts) so the
 * keyboard suite fans out over the same devices as the visual suite when CI
 * sets ART_VIEWPORTS. Without that env var it runs a fast representative set:
 * the shortest phone (the tightest layout), the reference phone and a laptop.
 */
const VIEWPORTS = process.env.ART_VIEWPORTS
  ? selectedViewports()
  : ALL_VIEWPORTS.filter((v) => ["phone-320x568", "phone-390", "laptop-1280"].includes(v.name));


for (const viewport of VIEWPORTS) {
  test.describe(`workout type illustration keyboard nav — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test.describe.configure({ timeout: 120_000 });

    test(`thumbnail is tab-reachable and announces the dialog (${viewport.name})`, async ({
      authedPage: page,
    }) => {
      await openYogaWorkoutSheet(page);
      const thumb = yogaThumbnail(page);
      await expect(thumb).toBeVisible();

      // Advertised as a dialog trigger before it is opened.
      await expect(thumb).toHaveAttribute("aria-haspopup", "dialog");
      await expect(thumb).toHaveAttribute("aria-expanded", "false");

      // Reachable by Tab alone from the top of the sheet — no positive
      // tabindex, no keyboard trap in front of it.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      let reached = false;
      for (let i = 0; i < 60; i += 1) {
        await page.keyboard.press("Tab");
        if (await thumb.evaluate((el) => el === document.activeElement)) {
          reached = true;
          break;
        }
      }
      expect(reached, "thumbnail should be reachable with Tab").toBe(true);
    });

    for (const key of ["Enter", "Space"] as const) {
      test(`${key} opens the modal and moves focus inside (${viewport.name})`, async ({
        authedPage: page,
      }) => {
        await openYogaWorkoutSheet(page);
        const thumb = yogaThumbnail(page);
        await thumb.focus();
        await page.keyboard.press(key);

        const dialog = yogaLightbox(page);
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        // While the dialog is open the background is inert/aria-hidden, so the
        // trigger drops out of the accessibility tree — query it by attribute.
        await expect(
          page.locator('button[aria-label^="Enlarge Yoga illustration"]'),
        ).toHaveAttribute("aria-expanded", "true");
        await settle(page);

        const active = await activeElementInfo(page);
        expect(active?.insideDialog, "focus should move into the dialog").toBe(true);

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
      });
    }

    test(`opened modal is fully on screen — no cutoff (${viewport.name})`, async ({
      authedPage: page,
    }) => {
      await openYogaWorkoutSheet(page);
      const thumb = yogaThumbnail(page);
      await thumb.focus();
      await page.keyboard.press("Enter");

      const dialog = yogaLightbox(page);
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await settle(page);

      // Keyboard users cannot pan a clipped dialog into view, so on short
      // viewports containment is an accessibility requirement, not polish.
      await expectNoCutoff(page, dialog, viewport);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });

    test(`focus stays trapped inside the modal (${viewport.name})`, async ({
      authedPage: page,
    }) => {
      await openYogaWorkoutSheet(page);
      const thumb = yogaThumbnail(page);
      await thumb.focus();
      await page.keyboard.press("Enter");

      const dialog = yogaLightbox(page);
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await settle(page);

      // Forward cycle: more presses than the dialog has focusables, so a leak
      // to the page behind would be caught.
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press("Tab");
        const active = await activeElementInfo(page);
        expect(active?.insideDialog, `Tab #${i + 1} escaped the dialog`).toBe(true);
      }

      // Backward cycle behaves the same way.
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press("Shift+Tab");
        const active = await activeElementInfo(page);
        expect(active?.insideDialog, `Shift+Tab #${i + 1} escaped the dialog`).toBe(true);
      }

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });

    test(`Escape closes and returns focus to the thumbnail (${viewport.name})`, async ({
      authedPage: page,
    }) => {
      await openYogaWorkoutSheet(page);
      const thumb = yogaThumbnail(page);
      await thumb.focus();
      await page.keyboard.press("Enter");

      const dialog = yogaLightbox(page);
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await settle(page);

      // Move focus around inside first so the restore is a real restore.
      await page.keyboard.press("Tab");
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();

      await expect
        .poll(() => thumb.evaluate((el) => el === document.activeElement), { timeout: 5_000 })
        .toBe(true);
      await expect(thumb).toHaveAttribute("aria-expanded", "false");

      // Focus must not have fallen back to the document body.
      const active = await activeElementInfo(page);
      expect(active?.tag).toBe("button");
      expect(active?.label ?? "").toMatch(/^Enlarge Yoga illustration/);

      // And the workout sheet behind it is still usable from the keyboard.
      await page.keyboard.press("Tab");
      const next = await activeElementInfo(page);
      expect(next?.tag).not.toBe("body");
    });
  });
}
