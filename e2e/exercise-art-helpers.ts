import { expect, dismissFirstRunOverlays, dismissPaywall } from "./utils";
import type { Locator, Page } from "@playwright/test";

/**
 * Shared setup for the workout-type illustration specs (pixel regression and
 * keyboard navigation). Kept in one place so both suites drive the exact same
 * surface and any route-load flakiness is fixed once.
 */

export const STABILISING_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
`;

export async function settle(page: Page) {
  await page.addStyleTag({ content: STABILISING_CSS });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

/** Opens the workout sheet on /fitness and selects the Yoga type. */
export async function openYogaWorkoutSheet(page: Page): Promise<Locator> {
  await page.goto("/fitness", { waitUntil: "domcontentloaded" });
  await dismissFirstRunOverlays(page);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  await dismissPaywall(page);
  await settle(page);

  // Floating action button on /fitness (icon-only, aria-label, fixed layer).
  // It only mounts after the route's queries resolve, so wait rather than click
  // straight away.
  const fab = page.getByRole("button", { name: "Log a workout" }).first();
  // The fitness route occasionally loses a route-load race in dev and renders an
  // empty shell; a hard re-entry recovers it. Retry a few times before failing.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await fab.isVisible().catch(() => false)) break;
    await page.waitForTimeout(2_000);
    if (await fab.isVisible().catch(() => false)) break;
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.goto("/fitness", { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    await dismissPaywall(page);
    await settle(page);
  }
  await expect(fab).toBeVisible({ timeout: 30_000 });

  await fab.click({ force: true });

  const yoga = page.getByRole("button", { name: "Yoga", exact: true }).first();
  if (!(await yoga.isVisible().catch(() => false))) {
    // Yoga lives inside a collapsed category group on some layouts.
    for (const category of ["Mind & body", "Flexibility", "Classes", "Other"]) {
      const toggle = page.getByRole("button", { name: category }).first();
      if (!(await toggle.isVisible().catch(() => false))) continue;
      await toggle.click().catch(() => undefined);
      if (await yoga.isVisible().catch(() => false)) break;
    }
  }
  await yoga.click({ timeout: 10_000 });

  const group = page.getByRole("group", { name: /yoga illustration reference/i });
  await expect(group).toBeVisible({ timeout: 10_000 });
  await settle(page);
  return group;
}

/** The illustration thumbnail button inside the reference row. */
export function yogaThumbnail(page: Page): Locator {
  return page.getByRole("button", { name: /^Enlarge Yoga illustration/ }).first();
}

/** The full-size illustration dialog (targeted by its explicit aria-label). */
export function yogaLightbox(page: Page): Locator {
  return page.locator('[role="dialog"][data-art-dialog="Yoga"]');
}

/** Describes whatever currently holds focus, for readable assertions. */
export function activeElementInfo(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      label: el.getAttribute("aria-label"),
      text: (el.textContent ?? "").trim().slice(0, 40),
      insideDialog: Boolean(el.closest('[role="dialog"]')),
      /**
       * The illustration modal specifically. The trigger lives inside the
       * workout sheet (also a dialog), so `insideDialog` cannot tell us whether
       * focus left the lightbox.
       */
      insideArtDialog: Boolean(el.closest("[data-art-dialog]")),
    };
  });
}
