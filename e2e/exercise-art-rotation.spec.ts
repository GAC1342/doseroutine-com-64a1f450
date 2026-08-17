import { test, expect } from "./utils";
import {
  activeElementInfo,
  openYogaWorkoutSheet,
  settle,
  yogaLightbox,
  yogaThumbnail,
} from "./exercise-art-helpers";
import { landscape } from "./exercise-art-viewports";
import type { Page } from "@playwright/test";

/**
 * Device rotation while the full-size illustration modal is open.
 *
 * The landscape suite (exercise-art-landscape.spec.ts) opens the dialog at a
 * fixed landscape size. This one is the harder case: the dialog is already
 * mounted when the viewport changes, so the layout has to *re-solve* rather
 * than be computed once, and Radix has to keep its focus trap intact across
 * the resize. Two real failure modes this catches on iOS Safari:
 *
 *   - the image keeps a height computed from the portrait viewport and now
 *     overflows a ~390px-tall landscape screen (cut off, unscrollable),
 *   - WebKit drops focus to <body> on orientation change, which silently
 *     breaks the focus trap and the return-to-trigger behaviour on close.
 *
 * Run with --project=mobile-safari (WebKit + iPhone UA/touch) for iOS Safari;
 * the webkit and chromium projects run the same assertions as a control.
 */

/** Sub-pixel layout rounding; anything above this is a real cutoff. */
const SLACK = 1;

const PORTRAIT = { name: "phone-390", width: 390, height: 844, class: "mobile" as const };
const LANDSCAPE = landscape(PORTRAIT);

type Box = { x: number; y: number; width: number; height: number };

/** Rotates, then waits for the layout to actually re-solve. */
async function rotate(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  // Two frames after the resize event, plus font/animation settling, so the
  // measurements below are of the final layout rather than a mid-transition one.
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
  await settle(page);
}

/** Asserts the dialog and its image sit fully inside the current viewport. */
async function assertContained(page: Page, label: string) {
  const dialog = yogaLightbox(page);
  const image = dialog.locator("img").first();

  const viewport = page.viewportSize()!;
  const dialogBox = (await dialog.boundingBox()) as Box | null;
  const imageBox = (await image.boundingBox()) as Box | null;
  expect(dialogBox, `${label}: dialog has no box`).not.toBeNull();
  expect(imageBox, `${label}: image has no box`).not.toBeNull();

  for (const [what, box] of [
    ["dialog", dialogBox!],
    ["image", imageBox!],
  ] as const) {
    expect(box.x, `${label}: ${what} clipped left`).toBeGreaterThanOrEqual(-SLACK);
    expect(box.y, `${label}: ${what} clipped top`).toBeGreaterThanOrEqual(-SLACK);
    expect(box.x + box.width, `${label}: ${what} clipped right`).toBeLessThanOrEqual(
      viewport.width + SLACK,
    );
    expect(box.y + box.height, `${label}: ${what} clipped bottom`).toBeLessThanOrEqual(
      viewport.height + SLACK,
    );
  }

  // Aspect ratio must survive the rotation: a squashed image is a crop in
  // disguise, and object-contain would letterbox rather than distort.
  const ratio = imageBox!.width / imageBox!.height;
  expect(Math.abs(ratio - 1), `${label}: image aspect ratio drifted (${ratio.toFixed(3)})`)
    .toBeLessThanOrEqual(0.02);

  // Rotation must not introduce a horizontal scrollbar on the page behind.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(SLACK);

  // On iOS Safari the visual viewport (minus dynamic toolbars) is the real
  // constraint; assert against it too when it is available.
  const visual = await page.evaluate(() => {
    const vv = window.visualViewport;
    return vv ? { width: vv.width, height: vv.height } : null;
  });
  if (visual) {
    expect(imageBox!.y + imageBox!.height, `${label}: image below the visual viewport`)
      .toBeLessThanOrEqual(visual.height + SLACK + 1);
  }
}

test.describe("illustration modal rotation (iOS Safari)", () => {
  test.use({ viewport: { width: PORTRAIT.width, height: PORTRAIT.height } });
  test.describe.configure({ timeout: 180_000 });

  test("stays contained and keeps focus through portrait → landscape → portrait", async ({
    authedPage: page,
  }, testInfo) => {
    await openYogaWorkoutSheet(page);
    const thumb = yogaThumbnail(page);
    await expect(thumb).toBeVisible();

    await thumb.focus();
    await page.keyboard.press("Enter");
    const dialog = yogaLightbox(page);
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await settle(page);
    await assertContained(page, "portrait");

    const focusBefore = await activeElementInfo(page);
    expect(focusBefore?.insideDialog, "focus should start inside the dialog").toBe(true);

    // --- rotate to landscape with the dialog open -------------------------
    await rotate(page, { width: LANDSCAPE.width, height: LANDSCAPE.height });
    await expect(dialog).toBeVisible();
    await assertContained(page, "landscape");

    // Focus must survive the orientation change, still inside the dialog.
    const focusAfter = await activeElementInfo(page);
    expect(focusAfter?.insideDialog, "focus escaped the dialog on rotation").toBe(true);
    expect(focusAfter?.tag).toBe(focusBefore?.tag);

    // The trap must still hold: tabbing cannot reach the page behind.
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      const info = await activeElementInfo(page);
      expect(info?.insideDialog, `Tab ${i + 1} left the dialog after rotation`).toBe(true);
    }

    await testInfo.attach("landscape-open.png", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    // --- rotate back to portrait -----------------------------------------
    await rotate(page, { width: PORTRAIT.width, height: PORTRAIT.height });
    await expect(dialog).toBeVisible();
    await assertContained(page, "portrait-after-rotation");
    expect((await activeElementInfo(page))?.insideDialog).toBe(true);

    // --- close and confirm focus returns to the trigger -------------------
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    const restored = await activeElementInfo(page);
    expect(restored?.insideDialog).toBe(false);
    expect(restored?.label ?? "").toMatch(/^Enlarge Yoga illustration/);
    await expect(thumb).toHaveAttribute("aria-expanded", "false");
  });

  test("closing while rotated returns focus to the thumbnail without shifting it", async ({
    authedPage: page,
  }) => {
    await openYogaWorkoutSheet(page);
    const thumb = yogaThumbnail(page);
    await expect(thumb).toBeVisible();
    const boxBefore = (await thumb.boundingBox())!;

    await thumb.focus();
    await page.keyboard.press("Enter");
    const dialog = yogaLightbox(page);
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Rotate, then close *while still landscape* — the trigger is now at a
    // different position than when the dialog opened.
    await rotate(page, { width: LANDSCAPE.width, height: LANDSCAPE.height });
    await assertContained(page, "landscape");

    const close = dialog.getByRole("button").first();
    await close.click();
    await expect(dialog).toBeHidden();

    const restored = await activeElementInfo(page);
    expect(restored?.label ?? "", "focus did not return to the trigger").toMatch(
      /^Enlarge Yoga illustration/,
    );

    // Rotating back must restore the original thumbnail geometry exactly —
    // a modal open/close cycle must not leave residual layout state.
    await rotate(page, { width: PORTRAIT.width, height: PORTRAIT.height });
    const boxAfter = (await thumb.boundingBox())!;
    expect(Math.abs(boxAfter.width - boxBefore.width)).toBeLessThanOrEqual(SLACK);
    expect(Math.abs(boxAfter.height - boxBefore.height)).toBeLessThanOrEqual(SLACK);
    expect(Math.abs(boxAfter.x - boxBefore.x)).toBeLessThanOrEqual(SLACK);

    // Body scroll locking must be released after close, in either orientation.
    const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(["visible", "auto", ""]).toContain(bodyOverflow);
  });

  test("opening the modal while already in landscape is contained", async ({
    authedPage: page,
  }) => {
    await openYogaWorkoutSheet(page);
    // Rotate before opening: the dialog is measured fresh at landscape size.
    await rotate(page, { width: LANDSCAPE.width, height: LANDSCAPE.height });

    const thumb = yogaThumbnail(page);
    await expect(thumb).toBeVisible();
    await thumb.scrollIntoViewIfNeeded();
    await thumb.focus();
    await page.keyboard.press("Enter");

    const dialog = yogaLightbox(page);
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await settle(page);
    await assertContained(page, "opened-in-landscape");
    expect((await activeElementInfo(page))?.insideDialog).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
