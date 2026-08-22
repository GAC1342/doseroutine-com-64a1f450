import { expect } from "@playwright/test";
import { test, AUTH_AVAILABLE, dismissFirstRunOverlays } from "./utils";

/**
 * Entitlement resilience.
 *
 * Two invariants that must never regress:
 *  1. A user with an active paid subscription is NEVER shown the "trial ended"
 *     lock on a Pro screen.
 *  2. When the entitlement check itself fails (offline, 500, timeout) the app
 *     shows a retry state — it must not silently conclude "not subscribed"
 *     and lock a paying customer out.
 *
 * Both are driven through the real ProRouteGate by stubbing the
 * getSubscriptionStatus server function.
 */

const PRO_ROUTE = "/timeline";
const SUB_FN = /\/_serverFn\/.*getSubscriptionStatus/i;

const ACTIVE_PRO = {
  tier: "pro",
  isPaid: true,
  isPro: true,
  active: true,
  plan: "monthly",
  status: "active",
  currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
  cancelAtPeriodEnd: false,
};

const lockCopy = /trial|upgrade|reactivate/i;
const retryHeading = /couldn.?t check your subscription/i;

test.describe("entitlement resilience", () => {
  test.skip(
    !AUTH_AVAILABLE,
    "Set TEST_USER_EMAIL / TEST_USER_PASSWORD to run entitlement E2E tests",
  );

  test("an active paying user is never locked out of a Pro screen", async ({
    authedPage: page,
  }) => {
    await page.route(SUB_FN, (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ result: ACTIVE_PRO }),
      }),
    );

    await page.goto(PRO_ROUTE, { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);

    // The gate resolves and renders the real screen.
    await expect(page.getByRole("heading", { name: /timeline/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(retryHeading)).toHaveCount(0);
    await expect(page.getByRole("button", { name: lockCopy })).toHaveCount(0);
  });

  test("a paying user stays in even when the profile flags read is slow", async ({
    authedPage: page,
  }) => {
    await page.route(SUB_FN, (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ result: ACTIVE_PRO }),
      }),
    );
    // Delay the profile read: the gate must show its spinner, never the lock.
    await page.route(/\/rest\/v1\/profiles.*/i, async (route) => {
      await new Promise((r) => setTimeout(r, 1_500));
      await route.continue();
    });

    await page.goto(PRO_ROUTE, { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);

    // During the wait, no lock screen may flash.
    await expect(page.getByRole("button", { name: lockCopy })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /timeline/i }).first()).toBeVisible({
      timeout: 25_000,
    });
  });

  test("a failing entitlement check shows the retry state, not the paywall", async ({
    authedPage: page,
  }) => {
    let failing = true;
    let attempts = 0;
    await page.route(SUB_FN, async (route) => {
      attempts += 1;
      if (failing) {
        await route.fulfill({
          status: 500,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ error: "entitlement backend unavailable" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ result: ACTIVE_PRO }),
      });
    });

    await page.goto(PRO_ROUTE, { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);

    // Retry state — explicitly NOT the "trial ended" wall.
    await expect(page.getByText(retryHeading)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/still signed in/i)).toBeVisible();
    await expect(page.getByRole("button", { name: lockCopy })).toHaveCount(0);

    // The query retried before giving up (useSubscription retry: 2).
    expect(attempts).toBeGreaterThan(1);

    // Recovering: pressing "Try again" refetches and lets the user through.
    failing = false;
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(page.getByText(retryHeading)).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /timeline/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("the retry state offers a way back to a free screen", async ({ authedPage: page }) => {
    await page.route(SUB_FN, (route) =>
      route.fulfill({ status: 503, body: "upstream unavailable" }),
    );

    await page.goto(PRO_ROUTE, { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);

    await expect(page.getByText(retryHeading)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: /back to today/i }).click();
    await page.waitForURL(/\/today/, { timeout: 15_000 });
  });
});
