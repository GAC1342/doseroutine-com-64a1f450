import { test, expect } from "./utils";
import { expectVisualSnapshot } from "./visual-baseline";
import { describeVisualThresholds, snapshotOptions } from "./visual-thresholds";
import {
  ARTICLE_LIKE_ROUTES,
  DESKTOP_VIEWPORT,
  MIN_EDGE_GUTTER,
  MOBILE_VIEWPORT,
  TABLET_VIEWPORT,
  auditTextEdges,
  formatViolations,
} from "./long-form-routes";

/**
 * Visual regression for every article-like route (/articles, /calculators and
 * each /vs/* comparison page) at desktop and mobile widths.
 *
 * Layer 1: geometry assertions (gutter + no overflow) that fail without needing
 * a committed baseline. Layer 2: pixel snapshots so a CSS edit that shifts the
 * padding fails loudly once baselines exist.
 */

const SNAPSHOT_OPTS = snapshotOptions("article-routes");
console.log(describeVisualThresholds("article-routes"));

const slug = (route: string) => route.replace(/^\//, "").replace(/\//g, "-") || "home";

async function open(page: import("@playwright/test").Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
  });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(400);
}

for (const [label, viewport] of [
  ["desktop", DESKTOP_VIEWPORT],
  // 768px = Tailwind's `md` boundary, the width where container padding is
  // most likely to fall between the mobile and desktop rules.
  ["tablet", TABLET_VIEWPORT],
  ["mobile", MOBILE_VIEWPORT],
] as const) {
  test.describe(`article-like routes — ${label}`, () => {
    test.use({ viewport });

    for (const route of ARTICLE_LIKE_ROUTES) {
      test(`${route} has consistent left/right padding`, async ({ page }, testInfo) => {
        await open(page, route);

        const audit = await auditTextEdges(page);
        expect(audit.violations, formatViolations(route, audit)).toEqual([]);
        expect(audit.scrollWidth).toBeLessThanOrEqual(audit.viewportWidth + 1);

        const prose = page.locator("[data-page-prose]").first();
        if ((await prose.count()) > 0) {
          const box = await prose.boundingBox();
          expect(box).not.toBeNull();
          const gutterLeft = box!.x;
          const gutterRight = viewport.width - (box!.x + box!.width);
          expect(gutterLeft).toBeGreaterThanOrEqual(MIN_EDGE_GUTTER);
          expect(gutterRight).toBeGreaterThanOrEqual(MIN_EDGE_GUTTER);
          // Symmetric container: the block is centred, not shoved to one side.
          expect(Math.abs(gutterLeft - gutterRight)).toBeLessThanOrEqual(2);
        }

        // Not every route uses the #main-content id; fall back to <main>, then body.
        const targets = ["#main-content", "main", "body"];
        let target = page.locator("body");
        for (const selector of targets) {
          const candidate = page.locator(selector).first();
          if ((await candidate.count()) > 0) {
            target = candidate;
            break;
          }
        }

        await expectVisualSnapshot(
          target,
          `article-route-${slug(route)}-${label}.png`,
          SNAPSHOT_OPTS,
          testInfo,
        );
      });
    }
  });
}
