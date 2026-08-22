import { test, expect, type Page } from "@playwright/test";

import { expectVisualSnapshot } from "./visual-baseline";
import { describeVisualThresholds, snapshotOptions } from "./visual-thresholds";
import { ALL_RESPONSIVE_VIEWPORTS, viewportsFor } from "./responsive-viewports";

/**
 * Responsive screenshot regression.
 *
 * The illustration specs already fan out across a device matrix, and the mint
 * spec pins chart/control pixels — but both at fixed contexts. Nothing guarded
 * how the *pages* look as the viewport narrows, so responsive drift (a grid
 * that stops wrapping at 390px, a nav that collapses wrong on iPad, a hero
 * that reflows at laptop width) shipped silently. The overflow guard only sees
 * horizontal scrolling, not layout that is merely wrong.
 *
 * Scope is deliberately small: public routes only (authenticated pages need
 * seeded data to be pixel-stable), the main content region only (never
 * fullPage — phone-width full-page shots are enormous and flake on
 * lazy-loaded content), and one shot per route/viewport.
 */

const COOKIE_CONSENT_KEY = "doseroutine:cookie-consent:v1";
const WELCOME_TOUR_KEY = "doseroutine_welcome_tour_v1";
const INSTALL_DISMISSED_KEY = "doseroutine_install_sticky_dismissed";

/** Fixed instant so any date-derived copy stays identical between runs. */
const FROZEN_TIME = new Date("2026-03-15T12:00:00Z");

const SNAPSHOT_OPTS = snapshotOptions("responsive");
console.log(describeVisualThresholds("responsive"));

type ResponsiveRoute = { name: string; path: string };

/** Public routes carrying the layouts that break first. */
const ROUTES: ResponsiveRoute[] = [
  { name: "landing", path: "/" },
  { name: "library", path: "/library" },
  { name: "calculator", path: "/calculator" },
  { name: "blog", path: "/blog" },
  { name: "booty-workout", path: "/booty-workout" },
];

const STABILISING_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
  /* Video posters and marquee-style decorations are not layout signal. */
  video { visibility: hidden !important; }
`;

/** Dismiss first-run overlays before first paint so they never occlude a shot. */
async function primePage(page: Page) {
  await page.clock.setFixedTime(FROZEN_TIME);
  await page.addInitScript(
    ([cookieKey, tourKey, installKey]: string[]) => {
      localStorage.setItem(cookieKey, "accepted");
      localStorage.setItem(tourKey, new Date().toISOString());
      localStorage.setItem(installKey, "1");
    },
    [COOKIE_CONSENT_KEY, WELCOME_TOUR_KEY, INSTALL_DISMISSED_KEY],
  );
}

/** Wait until fonts, images and layout have settled. */
async function settle(page: Page) {
  await page.addStyleTag({ content: STABILISING_CSS });
  await page.evaluate(() => document.fonts.ready);
  // Decode every in-viewport image; a half-loaded hero changes the whole shot.
  await page.evaluate(async () => {
    const images = Array.from(document.images).filter((img) => img.loading !== "lazy");
    await Promise.all(
      images.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))),
    );
  });
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

/** The page's main content region, falling back to body. */
function contentRegion(page: Page) {
  return page.locator("main").first().or(page.locator("body"));
}

test.describe("responsive screenshots", () => {
  test.describe.configure({ mode: "serial" });

  for (const route of ROUTES) {
    for (const viewport of ALL_RESPONSIVE_VIEWPORTS) {
      test(`${route.name} @ ${viewport.name}`, async ({ page }, testInfo) => {
        const allowed = viewportsFor(testInfo.project.name).some((v) => v.name === viewport.name);
        test.skip(!allowed, `${viewport.name} is not part of the ${testInfo.project.name} matrix`);

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await primePage(page);
        await page.goto(route.path, { waitUntil: "domcontentloaded" });

        const main = contentRegion(page);
        await expect(main.first()).toBeVisible({ timeout: 15_000 });
        await settle(page);

        // Clip to the viewport height: below-the-fold content is lazy and not
        // what this suite is guarding.
        const result = await expectVisualSnapshot(
          main.first(),
          `${route.name}-${viewport.name}.png`,
          {
            ...SNAPSHOT_OPTS,
            clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
          },
          testInfo,
        );

        // Layout sanity that runs even when a baseline is missing, so the
        // first run on a new viewport still produces signal.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(
          overflow,
          `${route.path} scrolls horizontally at ${viewport.name}`,
        ).toBeLessThanOrEqual(1);

        testInfo.annotations.push({ type: "snapshot", description: result });
      });
    }
  }
});
