import type { Page, ViewportSize } from "@playwright/test";

import { test, expect, dismissFirstRunOverlays, dismissPaywall } from "./utils";

/**
 * Mobile layout guard.
 *
 * Fails when either:
 *   1. the document can scroll horizontally at a phone/tablet viewport, or
 *   2. any visible element (including bottom-sheet content) sticks out past
 *      the right edge of the viewport.
 *
 * This is the regression that repeatedly cut off the workout log sheet on
 * iPhone. Runs at several common phone and tablet widths so device-specific
 * layout issues are caught in CI.
 */

/** 1px of slack absorbs subpixel rounding in transformed/animated elements. */
const TOLERANCE = 1;

// Always keep a video + trace + screenshot for a failing overflow run, even
// when the shared config is running in a lighter artifact mode.
test.use({
  video: "retain-on-failure",
  screenshot: "only-on-failure",
  trace: "retain-on-failure",
});

const VIEWPORTS: { name: string; size: ViewportSize }[] = [
  { name: "iPhone SE", size: { width: 360, height: 844 } },
  { name: "iPhone 14", size: { width: 390, height: 844 } },
  { name: "iPhone 14 Pro Max", size: { width: 430, height: 844 } },
  { name: "iPad portrait", size: { width: 768, height: 1024 } },
  { name: "iPad landscape", size: { width: 1024, height: 768 } },
];

type Offender = { tag: string; cls: string; right: number; width: number };

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
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute("class") ?? "").slice(0, 120),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }

    return {
      viewport,
      scrollWidth: doc.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      canScrollX: doc.scrollWidth > viewport + tolerance,
      offenders: offenders.slice(0, 10),
    };
  }, TOLERANCE);
}

function report(where: string, m: Awaited<ReturnType<typeof measure>>) {
  return [
    `${where}: viewport ${m.viewport}px, document ${m.scrollWidth}px, body ${m.bodyScrollWidth}px`,
    ...m.offenders.map(
      (o) => `  overflows to ${o.right}px (w=${o.width}) <${o.tag} class="${o.cls}">`,
    ),
  ].join("\n");
}

/**
 * Captures diagnostics the moment an overflow is detected: a JSON dump of the
 * offenders and a screenshot with each offending element outlined in red.
 * Attachments land in the Playwright report (and the CI artifact upload), so a
 * failure can be diagnosed without reproducing it locally.
 */
async function attachOverflowEvidence(
  page: Page,
  where: string,
  m: Awaited<ReturnType<typeof measure>>,
) {
  const info = test.info();
  const slug = where
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  await info.attach(`overflow-${slug}.json`, {
    body: JSON.stringify({ where, ...m }, null, 2),
    contentType: "application/json",
  });

  // Outline the offenders so the screenshot points straight at the culprit.
  await page
    .evaluate((tolerance) => {
      const viewport = document.documentElement.clientWidth;
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.right <= viewport + tolerance) continue;
        el.style.outline = "2px solid #ff0000";
        el.style.outlineOffset = "-2px";
      }
      const ruler = document.createElement("div");
      ruler.style.cssText = `position:fixed;top:0;bottom:0;left:${viewport - 1}px;width:2px;background:#ff0000;opacity:.7;z-index:2147483647;pointer-events:none`;
      document.body.appendChild(ruler);
    }, TOLERANCE)
    .catch(() => undefined);

  const shot = await page.screenshot({ timeout: 10_000 }).catch(() => null);
  if (shot) {
    await info.attach(`overflow-${slug}.png`, { body: shot, contentType: "image/png" });
  }
}

async function expectNoHorizontalOverflow(page: Page, where: string) {
  const m = await measure(page);
  if (m.canScrollX || m.offenders.length > 0) {
    await attachOverflowEvidence(page, where, m);
  }
  expect(m.canScrollX, report(where, m)).toBe(false);
  expect(m.offenders, report(where, m)).toEqual([]);
}

/** Selectors that match any rendered overlay surface (Radix + native). */
const OVERLAY_SELECTOR = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tooltip"]',
  "[data-radix-popper-content-wrapper]",
].join(",");

/**
 * Every currently-open overlay must sit fully inside the viewport. Radix
 * portals render outside the page flow, so a too-wide popover can escape the
 * document-level scroll check while still being cut off on screen.
 */
async function expectOverlaysWithinViewport(page: Page, where: string) {
  const result = await page.evaluate(
    ({ selector, tolerance }) => {
      const viewport = document.documentElement.clientWidth;
      const bad: { sel: string; left: number; right: number; width: number }[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          continue;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.left >= -tolerance && rect.right <= viewport + tolerance) continue;
        bad.push({
          sel: `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 80)}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
      return { viewport, bad };
    },
    { selector: OVERLAY_SELECTOR, tolerance: TOLERANCE },
  );

  if (result.bad.length > 0) {
    await test.info().attach(`overlay-${where.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`, {
      body: JSON.stringify({ where, ...result }, null, 2),
      contentType: "application/json",
    });
    const shot = await page.screenshot({ timeout: 10_000 }).catch(() => null);
    if (shot) {
      await test.info().attach(`overlay-${where.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`, {
        body: shot,
        contentType: "image/png",
      });
    }
  }

  expect(
    result.bad,
    `${where}: overlay escapes the ${result.viewport}px viewport\n` +
      result.bad.map((b) => `  ${b.sel} left=${b.left} right=${b.right} w=${b.width}`).join("\n"),
  ).toEqual([]);
}

/**
 * Opens each overlay trigger on the page one at a time (menus, dropdowns,
 * dialogs, popovers) and verifies the resulting surface fits the viewport.
 */
async function checkOverlayTriggers(page: Page, where: string) {
  const triggers = page.locator(
    '[aria-haspopup="menu"], [aria-haspopup="dialog"], [aria-haspopup="listbox"], [aria-haspopup="true"], [data-slot="dropdown-menu-trigger"], [data-slot="select-trigger"], [data-slot="popover-trigger"], [data-slot="dialog-trigger"], [data-slot="sheet-trigger"]',
  );
  const count = Math.min(await triggers.count(), 8);

  for (let i = 0; i < count; i += 1) {
    const trigger = triggers.nth(i);
    if (!(await trigger.isVisible().catch(() => false))) continue;
    if (!(await trigger.isEnabled().catch(() => false))) continue;

    await trigger.click({ timeout: 5_000 }).catch(() => undefined);
    // Let the open animation settle before measuring geometry.
    await page.waitForTimeout(350);

    await expectOverlaysWithinViewport(page, `${where} overlay #${i + 1}`);
    await expectNoHorizontalOverflow(page, `${where} overlay #${i + 1}`);

    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(200);
  }
}

const PUBLIC_ROUTES = ["/", "/library", "/calculator", "/blog", "/help"];

for (const { name, size } of VIEWPORTS) {
  const { width } = size;

  test.describe(`Horizontal overflow guard @ ${name} (${width}px)`, () => {
    test.use({ viewport: size });

    for (const path of PUBLIC_ROUTES) {
      test(`${path} does not scroll sideways`, async ({ page }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await dismissFirstRunOverlays(page);
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
        await expectNoHorizontalOverflow(page, `${path} @ ${width}px`);
      });

      test(`${path} overlays stay inside the viewport`, async ({ page }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await dismissFirstRunOverlays(page);
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
        await checkOverlayTriggers(page, `${path} @ ${width}px`);
      });
    }

    test("workout log sheet fits the viewport", async ({ authedPage: page }) => {
      await page.goto("/fitness", { waitUntil: "domcontentloaded" });
      await dismissFirstRunOverlays(page);
      await dismissPaywall(page);
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

      await expectNoHorizontalOverflow(page, `/fitness @ ${width}px`);

      await page.getByRole("button", { name: /log a workout/i }).click({ timeout: 15_000 });
      const sheet = page.getByRole("dialog");
      await sheet.waitFor({ state: "visible", timeout: 15_000 });

      // Let the slide-in transform settle before measuring geometry.
      await page.waitForTimeout(600);

      const box = await sheet.boundingBox();
      expect(box, "sheet has no bounding box").not.toBeNull();
      expect(box!.x, "sheet starts left of the viewport").toBeGreaterThanOrEqual(-TOLERANCE);
      expect(box!.x + box!.width, "sheet is wider than the viewport").toBeLessThanOrEqual(
        width + TOLERANCE,
      );

      await expectNoHorizontalOverflow(page, `/fitness (workout sheet open) @ ${width}px`);
      await expectOverlaysWithinViewport(page, `/fitness (workout sheet open) @ ${width}px`);

      // Expand the muscle-group picker — the densest row in the sheet.
      const browse = page.getByRole("button", { name: /pick by muscle group/i });
      if (await browse.isVisible().catch(() => false)) {
        await browse.click();
        await page.waitForTimeout(300);
        await expectNoHorizontalOverflow(page, `/fitness (muscle group picker open) @ ${width}px`);
        await expectOverlaysWithinViewport(page, `/fitness (muscle picker open) @ ${width}px`);
        // Any dialog/menu opened from inside the sheet must also fit.
        await checkOverlayTriggers(page, `/fitness (sheet) @ ${width}px`);
      }
    });
  });
}
