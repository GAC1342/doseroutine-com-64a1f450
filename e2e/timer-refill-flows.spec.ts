/**
 * End-to-end coverage for the three "saved-state" flows added alongside the
 * refill/timer work:
 *
 *   1. Saving an interval-timer preset as a favourite and starting it.
 *   2. Viewing the refill run-out forecast on /reminders.
 *   3. Marking a medication as refilled and seeing the forecast update.
 *
 * Auth-gated, so the suite skips when TEST_USER_* credentials are absent.
 */
import { expect, test } from "@playwright/test";
import {
  AUTH_AVAILABLE,
  acceptMedicalDisclaimer,
  dismissFirstRunOverlays,
  dismissPaywall,
  signIn,
} from "./utils";

test.skip(!AUTH_AVAILABLE, "TEST_USER_EMAIL / TEST_USER_PASSWORD not set");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await dismissFirstRunOverlays(page);
  await signIn(page);
});

test("saves an interval timer favourite and starts it", async ({ page }) => {
  await page.goto("/timer");
  await dismissPaywall(page);
  await acceptMedicalDisclaimer(page);

  const nameField = page.getByLabel(/name this setup/i).first();
  await expect(nameField).toBeVisible();
  const presetName = `E2E preset ${Date.now().toString().slice(-5)}`;
  await nameField.fill(presetName);
  await page.getByRole("button", { name: /save favou?rite/i }).click();

  const favourite = page.getByText(presetName, { exact: false }).first();
  await expect(favourite).toBeVisible();

  // Survives a reload (localStorage-backed), then starts on one tap.
  await page.reload();
  await expect(page.getByText(presetName, { exact: false }).first()).toBeVisible();

  await page
    .locator("li")
    .filter({ hasText: presetName })
    .getByRole("button", { name: /^Start$/i })
    .first()
    .click();

  await expect(page.getByRole("button", { name: /pause|stop/i }).first()).toBeVisible();

  // Clean up so repeat runs stay deterministic.
  await page
    .getByRole("button", { name: new RegExp(`Delete favou?rite ${presetName}`, "i") })
    .click()
    .catch(() => undefined);
});

test("shows refill run-out forecasts on reminders", async ({ page }) => {
  await page.goto("/reminders");
  await dismissPaywall(page);
  await acceptMedicalDisclaimer(page);

  const heading = page.getByRole("heading", { name: /refill reminders/i });
  await expect(heading).toBeVisible();

  const list = page.getByTestId("refill-list");
  const empty = page.getByText(/No refill forecasts yet/i);
  await expect(list.or(empty).first()).toBeVisible({ timeout: 15_000 });

  if (await list.isVisible().catch(() => false)) {
    const first = page.getByTestId("refill-row").first();
    // Every forecast row states supply left (or that a quantity is missing).
    await expect(first).toContainText(/day|Refill|out|quantity/i);
    await expect(first.getByRole("button", { name: /mark refilled/i })).toBeVisible();
  }
});

test("marks a medication as refilled end to end", async ({ page }) => {
  await page.goto("/reminders");
  await dismissPaywall(page);
  await acceptMedicalDisclaimer(page);

  const list = page.getByTestId("refill-list");
  const hasRows = await list.isVisible({ timeout: 15_000 }).catch(() => false);
  test.skip(!hasRows, "test account has no medication with a saved bottle quantity");

  const row = page.getByTestId("refill-row").first();
  const before = (await row.innerText()).trim();

  await row.getByRole("spinbutton").first().fill("90");
  await row.getByRole("button", { name: /mark refilled/i }).click();

  // The card reloads its forecast after the write; the row must settle back
  // into a non-saving state and reflect the larger supply.
  await expect(row.getByRole("button", { name: /mark refilled/i })).toBeEnabled({
    timeout: 15_000,
  });
  await expect
    .poll(async () => (await page.getByTestId("refill-row").first().innerText()).trim(), {
      timeout: 15_000,
    })
    .not.toBe(before);

  await expect(page.getByText(/could not save the refill/i)).toHaveCount(0);
});
