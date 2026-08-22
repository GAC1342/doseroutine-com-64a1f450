import { devices } from "@playwright/test";
import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle, yogaThumbnail, yogaLightbox } from "./exercise-art-helpers";
import { expectNoCutoff } from "./exercise-art-containment";

/**
 * iOS Safari-specific viewport + devicePixelRatio regression for the
 * full-size illustration modal.
 *
 * Desktop WebKit runs at dpr 1 with a static viewport, so it cannot catch the
 * failures that only real iPhones/iPads produce:
 *   - Retina densities (dpr 2 on iPhone SE/13/iPad mini, dpr 3 on Pro Max):
 *     any sizing rule that leaks device pixels into layout makes the modal
 *     wider than the screen on 3x only.
 *   - `window.visualViewport`: iOS reports the area actually visible under the
 *     dynamic Safari toolbars, which is shorter than `innerHeight`. A modal
 *     that fits `innerHeight` can still sit under the toolbar with no way to
 *     scroll to it.
 *   - Short landscape (e.g. 375px tall on an iPhone SE): the 1:1 illustration
 *     drives dialog height, which is exactly where vertical clipping appears.
 *
 * Each profile opens the modal, asserts the emulated density really applied,
 * then checks containment against both the layout viewport and the visual
 * viewport in portrait and landscape.
 */

type IosProfile = {
  name: string;
  device: keyof typeof devices;
  /** Expected devicePixelRatio for that hardware. */
  dpr: number;
};

/** Small, medium, tallest-3x phone and a tablet — the shapes that differ. */
const IOS_PROFILES: IosProfile[] = [
  { name: "iPhone SE", device: "iPhone SE", dpr: 2 },
  { name: "iPhone 12 Mini", device: "iPhone 12 Mini", dpr: 3 },
  { name: "iPhone 13", device: "iPhone 13", dpr: 3 },
  { name: "iPhone 14 Pro Max", device: "iPhone 14 Pro Max", dpr: 3 },
  { name: "iPad Mini", device: "iPad Mini", dpr: 2 },
];

const ORIENTATIONS = ["portrait", "landscape"] as const;

/** Allowance for sub-pixel layout rounding in WebKit. */
const EPSILON = 1;

for (const profile of IOS_PROFILES) {
  const preset = devices[profile.device];
  if (!preset?.viewport) continue;

  for (const orientation of ORIENTATIONS) {
    const viewport =
      orientation === "portrait"
        ? preset.viewport
        : { width: preset.viewport.height, height: preset.viewport.width };

    test.describe(`iOS Safari — ${profile.name} ${orientation}`, () => {
      // Only meaningful on WebKit; Chromium/Firefox do not reproduce iOS
      // visual-viewport or Safari layout behaviour.
      test.skip(({ browserName }) => browserName !== "webkit", "iOS Safari checks require WebKit");
      test.use({ ...preset, viewport, deviceScaleFactor: profile.dpr });
      test.describe.configure({ timeout: 120_000 });

      test(`modal stays in-viewport at ${profile.dpr}x (${viewport.width}x${viewport.height})`, async ({
        authedPage: page,
      }) => {
        await openYogaWorkoutSheet(page);

        // The emulation must actually be in effect, otherwise the assertions
        // below silently degrade to a desktop-1x run.
        const env = await page.evaluate(() => ({
          dpr: window.devicePixelRatio,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
        }));
        expect(env.dpr).toBeCloseTo(profile.dpr, 1);
        expect(env.innerWidth).toBe(viewport.width);
        expect(env.touch).toBe(true);

        const thumb = yogaThumbnail(page);
        await expect(thumb).toBeVisible();
        // Tap, not click — iOS opens this via touch.
        await thumb.tap();

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

        // Layout-viewport containment (shared with the other art suites).
        await expectNoCutoff(page, dialog, {
          name: `${profile.name} ${orientation}`,
          width: viewport.width,
          height: viewport.height,
        });

        // Visual-viewport containment: this is the iOS-only failure mode where
        // the dialog fits innerHeight but hides under the Safari toolbars.
        const box = (await dialog.boundingBox())!;
        const visual = await page.evaluate(() => {
          const vv = window.visualViewport;
          return {
            width: vv?.width ?? window.innerWidth,
            height: vv?.height ?? window.innerHeight,
            offsetLeft: vv?.offsetLeft ?? 0,
            offsetTop: vv?.offsetTop ?? 0,
            scale: vv?.scale ?? 1,
          };
        });
        // No pinch-zoom should be applied by the modal opening.
        expect(visual.scale).toBeCloseTo(1, 1);
        expect(
          box.x,
          `${profile.name} ${orientation}: dialog left of the visual viewport`,
        ).toBeGreaterThanOrEqual(visual.offsetLeft - EPSILON);
        expect(
          box.x + box.width,
          `${profile.name} ${orientation}: dialog right of the visual viewport`,
        ).toBeLessThanOrEqual(visual.offsetLeft + visual.width + EPSILON);
        expect(
          box.y,
          `${profile.name} ${orientation}: dialog above the visual viewport`,
        ).toBeGreaterThanOrEqual(visual.offsetTop - EPSILON);
        expect(
          box.y + box.height,
          `${profile.name} ${orientation}: dialog below the visual viewport (Safari toolbar overlap)`,
        ).toBeLessThanOrEqual(visual.offsetTop + visual.height + EPSILON);

        // The image must be sharp on Retina: its bitmap has to cover the
        // device pixels it is painted into (SVG scales losslessly).
        const imgBox = (await image.boundingBox())!;
        const source = await image.evaluate((el: HTMLImageElement) => ({
          naturalWidth: el.naturalWidth,
          currentSrc: el.currentSrc,
        }));
        const isVector =
          source.currentSrc.includes(".svg") || source.currentSrc.startsWith("data:image/svg");
        if (!isVector && imgBox.width > 0) {
          expect(
            source.naturalWidth,
            `${profile.name}: illustration is soft at ${profile.dpr}x`,
          ).toBeGreaterThanOrEqual(Math.round(imgBox.width * profile.dpr));
        }

        // iOS "rubber band": the page behind the modal must not gain scroll
        // width, and the document must not be pushed sideways.
        const overflow = await page.evaluate(() => ({
          x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          scrollX: window.scrollX,
        }));
        expect(overflow.x).toBeLessThanOrEqual(0);
        expect(overflow.scrollX).toBeLessThanOrEqual(EPSILON);

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
      });
    });
  }
}
