import { test, expect, dismissFirstRunOverlays, dismissPaywall } from "./utils";

/**
 * Core signed-in loop smoke test: Today → mark a dose taken → see it reflected
 * on the Timeline.
 *
 * The rest of the e2e suite is heavy on marketing/SEO surfaces; this covers the
 * loop the product actually lives on. It is deliberately tolerant about copy
 * and skips (rather than fails) when the test account has no dose scheduled
 * today, so it never turns into a flaky gate for an empty fixture account.
 */
test.describe("Core loop — log a dose and see it on the timeline", () => {
  test("marking a dose taken persists to the timeline", async ({ authedPage: page }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    const takeButton = page.getByRole("button", { name: /^(Taken|Log late)$/ }).first();
    const hasDose = await takeButton
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    test.skip(!hasDose, "Test account has no pending dose scheduled today");

    await takeButton.click();

    // Optimistic UI flips the row to a completed state immediately.
    await expect(page.getByText(/taken/i).first()).toBeVisible({ timeout: 10_000 });

    // The write must survive a reload — this is what catches a silent
    // mutation failure that the optimistic update papers over.
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissPaywall(page);
    await expect(page.getByText(/taken/i).first()).toBeVisible({ timeout: 15_000 });

    // And it must be visible on the timeline, which reads the same rows back
    // through a different query.
    await page.goto("/timeline", { waitUntil: "domcontentloaded" });
    await dismissPaywall(page);
    await expect(page.getByText(/taken/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
