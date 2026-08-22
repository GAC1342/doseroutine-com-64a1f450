import { test, expect } from "./utils";
import { expectVisualSnapshot } from "./visual-baseline";
import { describeVisualThresholds, snapshotOptions } from "./visual-thresholds";

/**
 * iPhone-specific visual regression for the marketing header and home layout.
 *
 * The header nav overflowed the screen on iPhone twice. Geometry assertions
 * caught it the second time; pixel baselines make the *shape* of the header
 * (single row: logo + CTA + hamburger, links inside the drawer) part of the
 * contract, so a future "just add one more nav link" edit fails here.
 *
 * Every test also asserts zero horizontal overflow, so the spec is useful even
 * before baselines are committed.
 */

const SNAPSHOT_OPTS = snapshotOptions("iphone-home");
console.log(describeVisualThresholds("iphone-home"));

/** Real iPhone CSS widths, smallest first — 320 is the SE at larger text sizes. */
const DEVICES = [
  { name: "iphone-se-320", width: 320, height: 812 },
  { name: "iphone-13-mini-375", width: 375, height: 812 },
  { name: "iphone-14-390", width: 390, height: 844 },
  { name: "iphone-14-pro-max-430", width: 430, height: 932 },
];

async function open(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
  });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(400);
}

async function overflowAmount(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
}

for (const device of DEVICES) {
  test.describe(`iPhone home layout — ${device.name}`, () => {
    test.use({ viewport: { width: device.width, height: device.height }, deviceScaleFactor: 2 });

    test("header fits and matches its baseline", async ({ page }, testInfo) => {
      await open(page);

      expect(await overflowAmount(page), "document is wider than the viewport").toBeLessThanOrEqual(
        1,
      );

      const header = page.locator("header").first();
      await expect(header).toBeVisible();

      const box = await header.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(device.width + 1);

      await expectVisualSnapshot(header, `home-header-${device.name}.png`, SNAPSHOT_OPTS, testInfo);
    });

    test("open mobile menu fits and matches its baseline", async ({ page }, testInfo) => {
      await open(page);

      const toggle = page.getByRole("button", { name: /open menu/i });
      if ((await toggle.count()) === 0) {
        test.skip(true, "no mobile menu toggle at this width");
      }
      await toggle.first().click();
      await page.waitForTimeout(250);

      expect(
        await overflowAmount(page),
        "open menu pushes the document wider than the viewport",
      ).toBeLessThanOrEqual(1);

      await expectVisualSnapshot(
        page.locator("header").first(),
        `home-header-menu-open-${device.name}.png`,
        SNAPSHOT_OPTS,
        testInfo,
      );
    });

    test("above-the-fold home layout matches its baseline", async ({ page }, testInfo) => {
      await open(page);
      expect(await overflowAmount(page)).toBeLessThanOrEqual(1);

      await expectVisualSnapshot(
        page.locator("body"),
        `home-viewport-${device.name}.png`,
        { ...SNAPSHOT_OPTS, clip: { x: 0, y: 0, width: device.width, height: device.height } },
        testInfo,
      );
    });
  });
}
