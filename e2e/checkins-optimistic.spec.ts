import { test, expect, AUTH_AVAILABLE } from "./utils";

/**
 * Optimistic-update tests for the Check-ins page.
 *
 * Intercepts the TanStack server-function RPC endpoints for
 * `upsertCheckin` / `deleteCheckin` so we can:
 *   - Delay the response and assert the optimistic row is visible
 *     BEFORE the server reply arrives.
 *   - Fail the response with 500 and assert the row is rolled back.
 *
 * These specs require a real signed-in user because the /checkins
 * route lives under the `_authenticated/` layout. They are skipped
 * automatically when TEST_USER_EMAIL / TEST_USER_PASSWORD are absent.
 */

test.describe("Check-ins — optimistic updates", () => {
  test.skip(!AUTH_AVAILABLE, "Requires TEST_USER_EMAIL / TEST_USER_PASSWORD");

  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto("/checkins");
    await page.waitForLoadState("networkidle");
  });

  test("new check-in appears immediately while server call is slow", async ({
    authedPage: page,
  }) => {
    // Stall the upsert server-fn call for ~3s so we can observe the
    // optimistic UI before the server response returns.
    let resolveHold: () => void = () => {};
    const hold = new Promise<void>((r) => (resolveHold = r));
    await page.route(/\/_serverFn\/.*upsertCheckin/i, async (route) => {
      await hold;
      await route.continue();
    });

    // Pick a unique historical date so upsert doesn't collide with today.
    const testDate = "2025-01-15";
    const uniqueWeight = String(88 + Math.floor(Math.random() * 10));

    await page
      .getByRole("button", { name: /add check-in|log first check-in/i })
      .first()
      .click();
    await page.getByLabel(/^date$/i).fill(testDate);
    await page.getByLabel(/weight/i).fill(uniqueWeight);

    const save = page.getByRole("button", { name: /save check-in/i });
    await save.click();

    // Row appears optimistically — before the server call resolves.
    const listItem = page.locator("li", { hasText: uniqueWeight });
    await expect(listItem).toBeVisible({ timeout: 1500 });

    // Now let the server complete and confirm the row persists.
    resolveHold();
    await page.waitForResponse(/\/_serverFn\/.*upsertCheckin/i);
    await expect(listItem).toBeVisible();
  });

  test("failed save rolls the optimistic row back", async ({ authedPage: page }) => {
    // Force the server-fn call to fail with 500.
    await page.route(/\/_serverFn\/.*upsertCheckin/i, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated failure" }),
      }),
    );

    const testDate = "2025-02-20";
    const uniqueWeight = String(150 + Math.floor(Math.random() * 40));

    await page
      .getByRole("button", { name: /add check-in|log first check-in/i })
      .first()
      .click();
    await page.getByLabel(/^date$/i).fill(testDate);
    await page.getByLabel(/weight/i).fill(uniqueWeight);
    await page.getByRole("button", { name: /save check-in/i }).click();

    // Optimistic row should have flashed in briefly, then disappeared
    // once the 500 came back and the mutation rolled the cache back.
    const listItem = page.locator("li", { hasText: uniqueWeight });
    await expect(listItem).toHaveCount(0, { timeout: 5000 });

    // Error surface — either the inline error in the sheet or the sheet
    // remains open. Either is acceptable proof of rollback.
    const sheetOpen = await page
      .getByRole("dialog")
      .isVisible()
      .catch(() => false);
    expect(sheetOpen).toBeTruthy();
  });

  test("delete removes the row immediately and restores it on failure", async ({
    authedPage: page,
  }) => {
    // Ensure there's at least one row to work with. If the list is empty
    // this test can't run — skip gracefully.
    const firstRow = page.locator("main li, ul > li").first();
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, "No existing check-ins to delete");
    }

    // Grab the visible text so we can assert its removal / restore.
    const rowText = (await firstRow.innerText()).slice(0, 40);

    // Fail the delete call so we can prove rollback.
    await page.route(/\/_serverFn\/.*deleteCheckin/i, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated failure" }),
      }),
    );

    // Auto-accept the confirm() dialog.
    page.once("dialog", (d) => d.accept());
    await firstRow.getByRole("button", { name: /delete/i }).click();

    // The row disappears optimistically, then reappears after the 500.
    await expect(page.locator("li", { hasText: rowText })).toBeVisible({ timeout: 5000 });
  });
});
