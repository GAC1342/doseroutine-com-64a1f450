import { test, expect } from "./utils";
import {
  ARTICLE_LIKE_ROUTES,
  DESKTOP_VIEWPORT,
  LONG_FORM_ROUTES,
  MOBILE_VIEWPORT,
  TABLET_VIEWPORT,
  auditTextEdges,
  formatViolations,
} from "./long-form-routes";

/**
 * Automated guard for the "text touches the screen edge" class of bug.
 *
 * The regression this exists for: long-form prose blocks were rendered outside
 * the padded page container on /articles, /calculators and the /vs/* pages, so
 * paragraphs ran flush to the left edge on mobile. Any future layout/CSS edit
 * that drops a container's horizontal padding fails here instead of shipping.
 */

async function open(page: import("@playwright/test").Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.fonts?.ready);
}

for (const [label, viewport] of [
  ["mobile", MOBILE_VIEWPORT],
  ["tablet", TABLET_VIEWPORT],
  ["desktop", DESKTOP_VIEWPORT],
] as const) {
  test.describe(`long-form edge padding — ${label}`, () => {
    test.use({ viewport });

    for (const route of LONG_FORM_ROUTES) {
      test(`${route} keeps text off the viewport edges`, async ({ page }) => {
        await open(page, route);
        const audit = await auditTextEdges(page);
        expect(audit.violations, formatViolations(route, audit)).toEqual([]);
        // No horizontal overflow either — a wide child pushes text off-screen.
        expect(audit.scrollWidth).toBeLessThanOrEqual(audit.viewportWidth + 1);
      });
    }
  });
}

test.describe("article-like prose measurements", () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test("share one line length, font size and gutter", async ({ page }) => {
    const measurements: Record<string, unknown> = {};

    for (const route of ARTICLE_LIKE_ROUTES) {
      await open(page, route);
      const prose = page.locator("[data-page-prose]").first();
      if ((await prose.count()) === 0) continue;

      measurements[route] = await prose.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const p = el.querySelector("p");
        const style = p ? getComputedStyle(p) : null;
        return {
          width: Math.round(rect.width),
          fontSize: style?.fontSize ?? null,
          lineHeight: style?.lineHeight ?? null,
        };
      });
    }

    const values = Object.values(measurements);
    expect(values.length, "no article-like route rendered a prose block").toBeGreaterThan(0);
    const [first] = values;
    for (const value of values) {
      expect(value, JSON.stringify(measurements, null, 2)).toEqual(first);
    }
  });
});
