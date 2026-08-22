import { expect } from "@playwright/test";
import { test, AUTH_AVAILABLE, dismissFirstRunOverlays, dismissPaywall, signIn } from "./utils";

/**
 * Legacy ("custom") stack items — the Vitamin D3 regression.
 *
 * Rows created before the compound library match existed have
 * `compound_id: null` and only a free-text `custom_name`. An older build hid
 * every field of the edit sheet behind a library match, so those cards could
 * not be edited, and a silently-blocked delete looked like nothing happened.
 *
 * These tests drive the real Stack UI against stubbed PostgREST responses:
 *  1. the edit sheet opens with editable name / dose / schedule fields,
 *  2. saving sends a PATCH that keeps `custom_name` and `compound_id: null`,
 *  3. deleting removes the card,
 *  4. a delete that affects zero rows surfaces an error instead of pretending
 *     to succeed.
 */

const LEGACY_ID = "11111111-1111-4111-8111-111111111111";

function legacyRow() {
  return {
    id: LEGACY_ID,
    user_id: "00000000-0000-4000-8000-000000000000",
    compound_id: null,
    custom_name: "Vitamin D3 (legacy)",
    custom_category: "vitamin",
    dose_amount: 2000,
    dose_unit: "iu",
    frequency: "daily",
    days_of_week: null,
    times_of_day: ["08:00"],
    with_food: true,
    notes: null,
    active: true,
    compound: null,
  };
}

test.describe("legacy stack items", () => {
  test.skip(!AUTH_AVAILABLE, "Set TEST_USER_EMAIL / TEST_USER_PASSWORD to run stack E2E tests");

  test.beforeEach(async ({ page }) => {
    await page.route("**/rest/v1/user_compounds*", async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([legacyRow()]),
      });
    });
  });

  test("a custom item can be edited and keeps its name", async ({ page }) => {
    let patched: Record<string, unknown> | null = null;
    await page.route("**/rest/v1/user_compounds*", async (route) => {
      const req = route.request();
      if (req.method() !== "PATCH") return route.fallback();
      patched = JSON.parse(req.postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: LEGACY_ID }]),
      });
    });

    await signIn(page);
    await page.goto("/stack", { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    await expect(page.getByText("Vitamin D3 (legacy)")).toBeVisible();
    await page.getByRole("button", { name: /edit/i }).first().click();

    // The sheet must expose real, editable fields — not an empty shell.
    const nameField = page.getByLabel("Name");
    await expect(nameField).toHaveValue(/Vitamin D3/);
    const doseField = page.getByLabel("Dose amount");
    await expect(doseField).toBeVisible();
    await doseField.fill("4000");

    const save = page.getByRole("button", { name: /^save|update/i }).last();
    await expect(save).toBeEnabled();
    await save.click();

    await expect.poll(() => patched, { timeout: 10_000 }).not.toBeNull();
    expect(patched!["compound_id"]).toBeNull();
    expect(String(patched!["custom_name"])).toMatch(/Vitamin D3/);
    expect(Number(patched!["dose_amount"])).toBe(4000);
  });

  test("a custom item can be deleted", async ({ page }) => {
    await page.route("**/rest/v1/user_compounds*", async (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: LEGACY_ID }]),
      });
    });

    await signIn(page);
    await page.goto("/stack", { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    await page
      .getByRole("button", { name: /delete|remove/i })
      .first()
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /remove/i })
      .click();

    await expect(page.getByText("Vitamin D3 (legacy)")).toHaveCount(0);
  });

  test("a delete that affects no rows reports an error instead of silent success", async ({
    page,
  }) => {
    await page.route("**/rest/v1/user_compounds*", async (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await signIn(page);
    await page.goto("/stack", { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    await page
      .getByRole("button", { name: /delete|remove/i })
      .first()
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /remove/i })
      .click();

    await expect(page.getByText(/couldn.?t remove/i)).toBeVisible({ timeout: 10_000 });
    // The card must stay on screen so the user knows nothing was removed.
    await expect(page.getByText("Vitamin D3 (legacy)")).toBeVisible();
  });
});
