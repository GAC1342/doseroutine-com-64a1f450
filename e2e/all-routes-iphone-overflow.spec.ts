import type { Page } from "@playwright/test";

import { test, expect } from "./utils";
import { publicRoutes } from "./public-routes";

/**
 * Site-wide horizontal-overflow sweep at iPhone widths.
 *
 * `mobile-horizontal-overflow.spec.ts` covers the app's interactive surfaces in
 * depth. This one goes wide instead of deep: EVERY public route, at the two
 * iPhone widths that actually break layouts (the 320px SE-in-zoom case and the
 * common 390px case), asserting nothing renders past the right edge.
 *
 * It exists because the header regression shipped twice: the fix was verified
 * on the pages we happened to look at, not on all of them.
 */

const TOLERANCE = 1;

const IPHONE_WIDTHS = [
  { name: "iPhone SE / 320", size: { width: 320, height: 812 } },
  { name: "iPhone 14 / 390", size: { width: 390, height: 844 } },
];

type Offender = { tag: string; cls: string; right: number; width: number; text: string };

async function measure(page: Page) {
  return page.evaluate((tolerance) => {
    const doc = document.documentElement;
    const viewport = doc.clientWidth;
    const offenders: Offender[] = [];

    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.right <= viewport + tolerance) continue;
      // A horizontally scrollable container (tables, chip rows) is allowed to
      // have wider children — that's an intentional swipe surface, not overflow.
      let scroller: HTMLElement | null = el.parentElement;
      let inScroller = false;
      while (scroller && scroller !== document.body) {
        const s = getComputedStyle(scroller);
        if (s.overflowX === "auto" || s.overflowX === "scroll") {
          inScroller = true;
          break;
        }
        scroller = scroller.parentElement;
      }
      if (inScroller) continue;

      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute("class") ?? "").slice(0, 120),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        text: (el.innerText ?? "").trim().slice(0, 60),
      });
    }

    return {
      viewport,
      scrollWidth: doc.scrollWidth,
      canScrollX: doc.scrollWidth > viewport + tolerance,
      offenders: offenders.slice(0, 8),
    };
  }, TOLERANCE);
}

for (const device of IPHONE_WIDTHS) {
  test.describe(`horizontal overflow — ${device.name}`, () => {
    test.use({ viewport: device.size });

    for (const route of publicRoutes()) {
      test(`${route} fits the viewport`, async ({ page }) => {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        // A route that 404s or errors isn't an overflow bug — skip rather than
        // report a misleading layout failure.
        test.skip((response?.status() ?? 200) >= 400, `route returned ${response?.status()}`);
        await page.waitForTimeout(300);
        await page.evaluate(() => document.fonts?.ready);

        const m = await measure(page);
        const detail = [
          `${route} @${m.viewport}px — document ${m.scrollWidth}px`,
          ...m.offenders.map(
            (o) => `  <${o.tag} class="${o.cls}"> right=${o.right} w=${o.width} "${o.text}"`,
          ),
        ].join("\n");

        expect(m.offenders, detail).toEqual([]);
        expect(m.canScrollX, detail).toBe(false);
      });
    }
  });
}
