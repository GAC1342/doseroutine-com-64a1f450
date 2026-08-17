import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle, yogaThumbnail, yogaLightbox } from "./exercise-art-helpers";
import { selectedDprs, selectedViewports } from "./exercise-art-viewports";

/**
 * Touch-target regression for the illustration thumbnail and the controls
 * inside its full-size modal.
 *
 * Minimum hit area is defined in CSS pixels (44x44 — WCAG 2.5.8 AAA / Apple
 * HIG / Material). devicePixelRatio must not change it: a rule accidentally
 * expressed in device pixels, or an icon sized from the bitmap rather than the
 * box, shrinks the real tap area on dpr 2/3 only. So the same assertions run
 * at 1x, 2x and 3x across the standard viewport matrix.
 *
 * We measure the *hit* rectangle (client rect + any pointer-transparent
 * padding is already included) rather than the icon, and we also verify the
 * centre of each control actually receives the pointer — a 44px box hidden
 * behind an overlay is not a touch target.
 */

const MIN_TOUCH_PX = 44;

const RATIOS = selectedDprs();
const DEFAULT_VIEWPORTS = ["phone-360", "phone-390", "tablet-768"];
const VIEWPORTS = process.env.ART_VIEWPORTS
  ? selectedViewports()
  : selectedViewports().filter((v) => DEFAULT_VIEWPORTS.includes(v.name));

type Rect = { width: number; height: number; x: number; y: number };

async function hitRect(locator: ReturnType<typeof yogaThumbnail>): Promise<Rect> {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height, x: r.x, y: r.y };
  });
}

/** True when the element (or a descendant of it) is what a tap at its centre hits. */
async function receivesPointerAtCentre(
  page: import("@playwright/test").Page,
  locator: ReturnType<typeof yogaThumbnail>,
) {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return Boolean(hit && (el === hit || el.contains(hit)));
  });
}

for (const dpr of RATIOS) {
  for (const viewport of VIEWPORTS) {
    test.describe(`touch targets @${dpr}x — ${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: dpr,
      });
      // Firefox ignores deviceScaleFactor, so >1x there would just re-test 1x.
      test.skip(
        ({ browserName }) => browserName === "firefox" && dpr !== 1,
        "Firefox ignores deviceScaleFactor",
      );
      test.describe.configure({ timeout: 120_000 });

      test(`thumbnail and modal controls stay >= ${MIN_TOUCH_PX}px at ${dpr}x (${viewport.name})`, async ({
        authedPage: page,
      }) => {
        await openYogaWorkoutSheet(page);
        expect(await page.evaluate(() => window.devicePixelRatio)).toBeCloseTo(dpr, 1);

        // 1. Thumbnail trigger.
        const thumb = yogaThumbnail(page);
        await expect(thumb).toBeVisible();
        const thumbRect = await hitRect(thumb);
        expect(
          thumbRect.width,
          `thumbnail width ${thumbRect.width}px at dpr ${dpr}`,
        ).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
        expect(
          thumbRect.height,
          `thumbnail height ${thumbRect.height}px at dpr ${dpr}`,
        ).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
        expect(await receivesPointerAtCentre(page, thumb)).toBe(true);

        // The thumbnail must be fully reachable, not clipped by the row.
        expect(thumbRect.x).toBeGreaterThanOrEqual(0);
        expect(thumbRect.x + thumbRect.width).toBeLessThanOrEqual(viewport.width + 1);

        // 2. Open the modal and check every interactive control inside it.
        await thumb.click();
        const dialog = yogaLightbox(page);
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        await settle(page);

        const controls = dialog.locator(
          'button, [role="button"], a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const count = await controls.count();
        // The close affordance is the minimum; if it ever disappears the modal
        // becomes keyboard/Esc-only and this assertion should fail loudly.
        expect(count).toBeGreaterThan(0);

        const undersized: string[] = [];
        for (let i = 0; i < count; i += 1) {
          const control = controls.nth(i);
          if (!(await control.isVisible().catch(() => false))) continue;
          const rect = await hitRect(control);
          const name =
            (await control.getAttribute("aria-label")) ||
            (await control.textContent())?.trim() ||
            (await control.evaluate((el) => el.tagName.toLowerCase()));
          if (rect.width < MIN_TOUCH_PX || rect.height < MIN_TOUCH_PX) {
            undersized.push(`${name}: ${Math.round(rect.width)}x${Math.round(rect.height)}`);
          }
          // Also inside the viewport, otherwise the size is academic.
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 1);
        }
        expect(
          undersized,
          `controls below ${MIN_TOUCH_PX}px at dpr ${dpr} / ${viewport.name}`,
        ).toEqual([]);

        // 3. The close control specifically must be tappable at its centre.
        const close = dialog.getByRole("button", { name: /close/i }).first();
        if (await close.isVisible().catch(() => false)) {
          expect(await receivesPointerAtCentre(page, close)).toBe(true);
          await close.click();
          await expect(dialog).toBeHidden();
        } else {
          await page.keyboard.press("Escape");
          await expect(dialog).toBeHidden();
        }
      });
    });
  }
}
