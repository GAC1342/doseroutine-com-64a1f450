import { test, expect, dismissFirstRunOverlays, dismissPaywall } from "./utils";
import type { Page } from "@playwright/test";

/**
 * The 7-day free trial may only be advertised to an account that can actually
 * claim it. Showing "Try Pro free for 7 days" to someone already paying (or
 * already inside a trial) is a billing-trust bug and an App Store review risk.
 *
 * Entitlement state is stubbed at the network layer so all three cases can be
 * exercised against one fixture account.
 */

const TRIAL_COPY = /free for 7 days|7-day free trial|start (your )?free trial/i;
const REACTIVATE_COPY = /reactivate pro|subscribe|upgrade to pro/i;

type EntitlementCase = {
  subscribed: boolean;
  trialing: boolean;
  hasUsedTrial: boolean;
};

/**
 * Rewrites subscription/profile reads so the client resolves a known
 * entitlement, whatever the fixture account really owns.
 */
async function stubEntitlement(page: Page, state: EntitlementCase): Promise<void> {
  await page.route("**/rest/v1/subscriptions**", async (route) => {
    const rows =
      state.subscribed || state.trialing
        ? [
            {
              status: state.trialing ? "trialing" : "active",
              current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(),
              cancel_at_period_end: false,
              price_id: "pro_monthly",
              environment: "sandbox",
            },
          ]
        : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` },
      body: JSON.stringify(rows),
    });
  });

  await page.route("**/rest/v1/profiles**", async (route) => {
    const response = await route.fetch();
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      await route.fulfill({ response });
      return;
    }
    const patch = (row: Record<string, unknown>) => ({
      ...row,
      has_used_trial: state.hasUsedTrial,
      trial_ends_at: state.trialing ? new Date(Date.now() + 5 * 864e5).toISOString() : null,
    });
    const patched = Array.isArray(body)
      ? body.map((r) => patch(r as Record<string, unknown>))
      : patch((body ?? {}) as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(patched),
    });
  });
}

/** Every signed-in surface that is allowed to pitch the trial. */
const SURFACES = ["/today", "/upgrade"];

async function visibleText(page: Page, path: string): Promise<string> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissFirstRunOverlays(page);
  await dismissPaywall(page);
  // Entitlement resolves asynchronously; wait for the shell to settle so we
  // don't read the pre-hydration placeholder.
  await page.waitForTimeout(1_500);
  return (await page.evaluate(() => document.body?.innerText ?? "")) || "";
}

test.describe("7-day trial CTA is only shown to eligible accounts", () => {
  test("eligible free account is offered the trial", async ({ authedPage: page }) => {
    await stubEntitlement(page, { subscribed: false, trialing: false, hasUsedTrial: false });
    for (const path of SURFACES) {
      const text = await visibleText(page, path);
      expect(text, `${path} should offer the trial`).toMatch(TRIAL_COPY);
    }
  });

  test("active subscriber is never shown the trial", async ({ authedPage: page }) => {
    await stubEntitlement(page, { subscribed: true, trialing: false, hasUsedTrial: false });
    for (const path of SURFACES) {
      const text = await visibleText(page, path);
      expect(text, `${path} must not advertise a trial to a paying user`).not.toMatch(TRIAL_COPY);
    }
  });

  test("account already in a trial is never shown the trial CTA", async ({ authedPage: page }) => {
    await stubEntitlement(page, { subscribed: true, trialing: true, hasUsedTrial: true });
    for (const path of SURFACES) {
      const text = await visibleText(page, path);
      expect(text, `${path} must not re-pitch an in-progress trial`).not.toMatch(TRIAL_COPY);
    }
  });

  test("used-up trial falls back to a reactivate offer", async ({ authedPage: page }) => {
    await stubEntitlement(page, { subscribed: false, trialing: false, hasUsedTrial: true });
    const text = await visibleText(page, "/upgrade");
    expect(text).not.toMatch(TRIAL_COPY);
    expect(text).toMatch(REACTIVATE_COPY);
  });
});
