import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Shared "nothing is cut off" assertions for the workout-type illustration.
 *
 * Horizontal clipping is obvious (a scrollbar appears); vertical clipping is
 * the silent one — on short phones (568/640/667 CSS px tall) the full-size
 * modal is sized from the illustration's 1:1 aspect ratio, so a dialog that
 * fits a 932px-tall iPhone can hang off the bottom of an iPhone SE with no
 * scrollbar and no way to reach it by keyboard.
 *
 * Used by both the visual suite (every viewport) and the keyboard suite.
 */

export type ViewportSize = { name: string; width: number; height: number };

/** Allowance for sub-pixel layout rounding across engines. */
const EPSILON = 1;

export async function expectNoCutoff(
  page: Page,
  dialog: Locator,
  viewport: ViewportSize,
): Promise<void> {
  const box = (await dialog.boundingBox())!;
  expect(box, `dialog should have a box at ${viewport.name}`).toBeTruthy();

  // Fully inside the viewport on both axes.
  expect(box.x, `${viewport.name}: dialog clipped on the left`).toBeGreaterThanOrEqual(-EPSILON);
  expect(box.y, `${viewport.name}: dialog clipped at the top`).toBeGreaterThanOrEqual(-EPSILON);
  expect(box.x + box.width, `${viewport.name}: dialog clipped on the right`).toBeLessThanOrEqual(
    viewport.width + EPSILON,
  );
  expect(box.y + box.height, `${viewport.name}: dialog clipped at the bottom`).toBeLessThanOrEqual(
    viewport.height + EPSILON,
  );

  // The image and the caption must both be inside the dialog, not spilling out
  // of it — a dialog that fits while its contents overflow is still a cutoff.
  const image = dialog.locator("img").first();
  if (await image.count()) {
    const img = (await image.boundingBox())!;
    expect(img.y, `${viewport.name}: image spills above the dialog`).toBeGreaterThanOrEqual(
      box.y - EPSILON,
    );
    expect(
      img.y + img.height,
      `${viewport.name}: image spills below the dialog`,
    ).toBeLessThanOrEqual(box.y + box.height + EPSILON);
  }

  const caption = dialog.locator("figcaption").first();
  if (await caption.count()) {
    const cap = (await caption.boundingBox())!;
    expect(
      cap.y + cap.height,
      `${viewport.name}: caption is cut off at the bottom of the viewport`,
    ).toBeLessThanOrEqual(viewport.height + EPSILON);
  }

  // No element inside the dialog scrolls horizontally, and the page itself
  // never gains a horizontal scrollbar while the dialog is open.
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const dlg = document.querySelector('[role="dialog"]');
    // Visually-hidden (sr-only) nodes are 1x1 clipped boxes whose text always
    // "overflows" by design — they are announced, never painted, so they are
    // not a cutoff. Same for anything the layout has collapsed to zero size.
    const inner = dlg
      ? Array.from(dlg.querySelectorAll<HTMLElement>("*")).filter((el) => {
          if (el.clientWidth <= 1 || el.clientHeight <= 1) return false;
          const style = getComputedStyle(el);
          if (style.visibility === "hidden" || style.display === "none") return false;
          // A deliberate scroll container is allowed to scroll horizontally
          // only if the author asked for it.
          if (style.overflowX === "auto" || style.overflowX === "scroll") return false;
          return el.scrollWidth - el.clientWidth > 1;
        }).length
      : 0;
    return { page: doc.scrollWidth - doc.clientWidth, inner };
  });
  expect(overflow.page, `${viewport.name}: page overflows horizontally`).toBeLessThanOrEqual(0);
  expect(overflow.inner, `${viewport.name}: an element inside the dialog overflows`).toBe(0);
}
