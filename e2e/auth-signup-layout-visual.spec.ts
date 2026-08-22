import { test, expect } from "./utils";
import { expectVisualSnapshot } from "./visual-baseline";
import { describeVisualThresholds, snapshotOptions } from "./visual-thresholds";

/**
 * Guards the /auth sign-up layout at desktop and mobile widths.
 *
 * The regression this exists for: the page used a single `max-w-sm` column at
 * every width, so on a 1440px desktop the form was a phone-width strip with a
 * huge empty gutter. Desktop now promotes to a two-column grid
 * (form + sticky testimonials/safety sidebar); mobile stays single column.
 *
 * Two layers, same as the other visual specs:
 *   1. Geometry assertions that fail without needing a committed baseline
 *      (column count, container width, sidebar visibility).
 *   2. Pixel snapshots via expectVisualSnapshot so any CSS edit that shifts
 *      the layout fails loudly once baselines exist.
 */

const SNAPSHOT_OPTS = snapshotOptions("auth-signup");
console.log(describeVisualThresholds("auth-signup"));

const DESKTOP = { width: 1440, height: 1000 };
const MOBILE = { width: 390, height: 844 };

async function openSignup(page: import("@playwright/test").Page) {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  const heading = page.getByRole("heading", { name: /create your free account/i });
  await expect(heading).toBeVisible();
  // Freeze animations so the pixel diff is deterministic.
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
  });
  await page.evaluate(() => document.fonts?.ready);
  return page.locator("#main-content");
}

test.describe("auth sign-up layout", () => {
  test.describe("desktop", () => {
    test.use({ viewport: DESKTOP });

    test("uses a two-column grid, not a phone-width strip", async ({ page }, testInfo) => {
      const main = await openSignup(page);
      const container = main.locator("> div").first();

      const metrics = await container.evaluate((el) => {
        const styles = getComputedStyle(el);
        return {
          display: styles.display,
          columns: styles.gridTemplateColumns.split(" ").filter(Boolean).length,
          width: el.getBoundingClientRect().width,
        };
      });

      expect(metrics.display).toBe("grid");
      expect(metrics.columns).toBe(2);
      // The bug produced a ~384px container on a 1440px screen.
      expect(metrics.width).toBeGreaterThan(900);

      // Sidebar (testimonials + safety panel) is the second column on desktop.
      const aside = main.locator("aside");
      await expect(aside).toBeVisible();
      const [formBox, asideBox] = await Promise.all([
        container.locator("> div").first().boundingBox(),
        aside.boundingBox(),
      ]);
      expect(formBox && asideBox).toBeTruthy();
      // Side by side: the sidebar starts to the right of the form.
      expect(asideBox!.x).toBeGreaterThan(formBox!.x + formBox!.width - 1);

      await expectVisualSnapshot(main, "auth-signup-desktop.png", SNAPSHOT_OPTS, testInfo);
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: MOBILE });

    test("stays a single column with inline social proof", async ({ page }, testInfo) => {
      const main = await openSignup(page);
      const container = main.locator("> div").first();

      const width = await container.evaluate((el) => el.getBoundingClientRect().width);
      // Single column filling the viewport minus the px-6 gutters.
      expect(width).toBeGreaterThan(MOBILE.width - 80);
      expect(width).toBeLessThanOrEqual(MOBILE.width);

      // The desktop sidebar is hidden at this width.
      await expect(main.locator("aside")).toBeHidden();

      // No horizontal overflow.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      await expectVisualSnapshot(main, "auth-signup-mobile.png", SNAPSHOT_OPTS, testInfo);
    });
  });
});
