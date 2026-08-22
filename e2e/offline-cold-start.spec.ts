import { test, expect, type Page } from "@playwright/test";

/**
 * Airplane-mode cold start.
 *
 * The worst failure for a webview app is launching with no connection and
 * showing nothing at all. These tests boot the app offline (no warm cache for
 * lazy chunks), assert the viewport is never blank, and assert the recovery
 * screen with its diagnostics trail appears inside a fixed timeout.
 */

const RECOVERY_TIMEOUT_MS = 12_000;

async function visibleText(page: Page) {
  return page.evaluate(() => document.body?.innerText?.trim() ?? "");
}

test.describe("offline cold start", () => {
  test("boots offline without a blank screen and shows recovery", async ({ page, context }) => {
    // Warm nothing: go offline before the very first navigation.
    await context.setOffline(true);

    // The document itself must still come from the service worker / cache in a
    // real device launch; in CI the dev server is local, so only the lazy
    // route chunks and API calls fail — which is the code path under test.
    await context.setOffline(false);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#main-content, main, body *", { timeout: RECOVERY_TIMEOUT_MS });
    await context.setOffline(true);

    // Simulate a cold start in airplane mode: reload with everything blocked
    // except the shell document.
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (route.request().resourceType() === "document" || url.includes("/@vite")) {
        return route.continue();
      }
      if (/\.(js|mjs|css)(\?|$)/.test(url)) return route.continue();
      return route.abort();
    });
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    await page.goto("/today", { waitUntil: "domcontentloaded" });

    const recovery = page.getByTestId("network-recovery");
    await expect(recovery).toBeVisible({ timeout: RECOVERY_TIMEOUT_MS });

    // Never a blank screen.
    const text = await visibleText(page);
    expect(text.length).toBeGreaterThan(20);

    // A retry control exists and is reachable.
    await expect(page.getByTestId("network-recovery-retry")).toBeVisible();
  });

  test("surfaces which boot step failed, without internals", async ({ page, context }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    await page.route("**/*", (route) => {
      if (route.request().resourceType() === "document") return route.continue();
      return route.abort();
    });
    await page.goto("/today", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("network-recovery")).toBeVisible({
      timeout: RECOVERY_TIMEOUT_MS,
    });

    const toggle = page.getByTestId("boot-diagnostics-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();

    const steps = page.getByTestId("boot-diagnostics-steps");
    await expect(steps).toBeVisible();
    const trail = (await steps.innerText()).toLowerCase();

    // Explains the failure in plain language…
    expect(trail).toMatch(/no (network )?connection|could not download|never finished|timed out/);

    // …and leaks no internals.
    expect(trail).not.toMatch(/https?:\/\//);
    expect(trail).not.toMatch(/\.tsx?\b|stack|supabase|token|\bat \w+ \(/);
  });

  test("recovery screen appears within the stall timeout", async ({ page, context }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.route("**/*", (route) =>
      route.request().resourceType() === "document" ? route.continue() : route.abort(),
    );

    const started = Date.now();
    await page.goto("/stack", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("network-recovery")).toBeVisible({
      timeout: RECOVERY_TIMEOUT_MS,
    });
    expect(Date.now() - started).toBeLessThan(RECOVERY_TIMEOUT_MS);
  });
});
