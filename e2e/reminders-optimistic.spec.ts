import { test, expect, AUTH_AVAILABLE } from "./utils";

/**
 * Optimistic-update tests for the Reminders page.
 *
 * Reminders are persisted directly with supabase-js, so we intercept
 * the PostgREST `/rest/v1/reminders*` calls to simulate slow / failed
 * writes. The per-compound toggle should flip in the UI immediately
 * and revert if the write fails.
 *
 * Requires:
 *  - TEST_USER_EMAIL / TEST_USER_PASSWORD
 *  - The signed-in account has a paid subscription (Plus/Pro) — reminders
 *    is paywalled. The test skips itself when the paywall is shown.
 *  - At least one active compound in the user's stack.
 */

test.describe("Reminders — optimistic updates", () => {
  test.skip(!AUTH_AVAILABLE, "Requires TEST_USER_EMAIL / TEST_USER_PASSWORD");

  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto("/reminders");
    // Skip if paywalled or no compounds.
    const paywall = await page
      .getByText(/upgrade|plus|pro/i)
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    if (
      paywall &&
      !(await page
        .locator('input[type="checkbox"]')
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      test.skip(true, "Reminders paywalled for this account");
    }
    const anyToggle = page.locator('section input[type="checkbox"]').first();
    await anyToggle.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  });

  test("per-compound toggle flips immediately while write is slow", async ({
    authedPage: page,
  }) => {
    // Find a per-compound toggle inside the "Per compound" section.
    const section = page.locator("section", { hasText: /per compound/i });
    const toggle = section.locator('input[type="checkbox"]').first();
    if (!(await toggle.isVisible().catch(() => false))) {
      test.skip(true, "No per-compound reminder toggles present");
    }
    const wasChecked = await toggle.isChecked();

    let release: () => void = () => {};
    const hold = new Promise<void>((r) => (release = r));
    await page.route(/\/rest\/v1\/reminders\b/i, async (route) => {
      if (route.request().method() === "GET") return route.continue();
      await hold;
      await route.continue();
    });

    await toggle.click();
    // Optimistic flip is immediate — assert BEFORE releasing the network.
    await expect(toggle).toBeChecked({ checked: !wasChecked, timeout: 1500 });

    release();
    await page.waitForResponse(
      (res) => /\/rest\/v1\/reminders/i.test(res.url()) && res.request().method() !== "GET",
      { timeout: 5000 },
    );
    await expect(toggle).toBeChecked({ checked: !wasChecked });
  });

  test("failed toggle reverts to previous state", async ({ authedPage: page }) => {
    const section = page.locator("section", { hasText: /per compound/i });
    const toggle = section.locator('input[type="checkbox"]').first();
    if (!(await toggle.isVisible().catch(() => false))) {
      test.skip(true, "No per-compound reminder toggles present");
    }
    const wasChecked = await toggle.isChecked();

    await page.route(/\/rest\/v1\/reminders\b/i, (route) => {
      if (route.request().method() === "GET") return route.continue();
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Simulated failure" }),
      });
    });

    await toggle.click();
    // Optimistic flip lands immediately...
    await expect(toggle).toBeChecked({ checked: !wasChecked, timeout: 1500 });
    // ...then rolls back to the original state after the 500.
    await expect(toggle).toBeChecked({ checked: wasChecked, timeout: 5000 });
  });
});
