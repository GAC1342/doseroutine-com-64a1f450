import { test, expect, dismissFirstRunOverlays, dismissPaywall } from "./utils";
import type { Page } from "@playwright/test";

/**
 * A signed-in user must never see the old Today "welcome" / "7-day Pro free
 * trial" card — not on load, and not for a single frame while entitlement is
 * being refreshed after login or after returning from checkout.
 *
 * The card was removed outright and every remaining trial banner is gated on
 * `useEntitlementSettled()`, so this spec locks both behaviours in.
 */

const WELCOME_COPY = /welcome to your 7-day pro free trial|welcome to doseroutine pro/i;
const TRIAL_CARD_COPY = /7-day pro free trial/i;

/** Slow the entitlement reads so any flicker window is wide enough to catch. */
async function delayEntitlement(page: Page, ms: number): Promise<void> {
  for (const pattern of ["**/rest/v1/subscriptions**", "**/rest/v1/profiles**"]) {
    await page.route(pattern, async (route) => {
      await new Promise((r) => setTimeout(r, ms));
      await route.continue();
    });
  }
}

/**
 * Samples the DOM repeatedly while the page settles, so a card that paints and
 * then disappears is still caught.
 */
async function sampleForCard(page: Page, ms: number): Promise<string[]> {
  const hits: string[] = [];
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body.innerText || "");
    if (WELCOME_COPY.test(text) || TRIAL_CARD_COPY.test(text)) hits.push(text.slice(0, 200));
    await page.waitForTimeout(50);
  }
  return hits;
}

test.describe("Today never shows the welcome / trial card", () => {
  test("not on a normal signed-in load", async ({ page }) => {
    await delayEntitlement(page, 400);
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    const hits = await sampleForCard(page, 2500);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    expect(hits, `welcome/trial card rendered: ${hits[0] ?? ""}`).toEqual([]);
  });

  test("not while entitlement refreshes after login", async ({ page }) => {
    await delayEntitlement(page, 600);
    // `?trial=started` used to force the card open regardless of entitlement.
    await page.goto("/today?trial=started", { waitUntil: "domcontentloaded" });
    const hits = await sampleForCard(page, 3000);
    expect(hits, `welcome/trial card rendered after login: ${hits[0] ?? ""}`).toEqual([]);
  });

  test("not on return from checkout", async ({ page }) => {
    await delayEntitlement(page, 600);
    await page.goto("/today?checkout=success", { waitUntil: "domcontentloaded" });
    const hits = await sampleForCard(page, 3000);
    expect(hits, `welcome/trial card rendered after checkout: ${hits[0] ?? ""}`).toEqual([]);
  });

  test("the component is gone from the bundle", async ({ page }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    const found = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-testid]")).some(
        (el) => el.getAttribute("data-testid") === "welcome-card",
      ),
    );
    expect(found).toBe(false);
  });
});
