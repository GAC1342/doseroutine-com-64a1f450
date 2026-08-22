import { test, expect, dismissFirstRunOverlays, dismissPaywall } from "./utils";

/**
 * Editing an existing "Repeat until" date used to be lossy: the native date
 * input emits partial values while the user types, and each of those was
 * written straight through — so moving an end date forward could clear it
 * instead. This covers the two edits that matter: pushing the date further
 * out, and clearing it back to "no end date".
 */

function localDayKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

test.describe("Repeat-until end date can be edited forward and cleared", () => {
  test("moves the end date forward and clears it back to no end", async ({ authedPage: page }) => {
    await page.goto("/fitness?view=routine", { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    const endDate = page.getByLabel(/repeat until/i).first();
    const hasEndField = await endDate
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasEndField, "Test account has no repeating routine to edit");

    // 1. Set an initial end date.
    const first = localDayKey(14);
    await endDate.fill(first);
    await endDate.blur();
    await expect(endDate).toHaveValue(first, { timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissPaywall(page);
    await expect(page.getByLabel(/repeat until/i).first()).toHaveValue(first, { timeout: 15_000 });

    // 2. Push it further out — the classic regression: this used to land as
    //    an empty value because of the intermediate keystroke writes.
    const later = localDayKey(45);
    const field = page.getByLabel(/repeat until/i).first();
    await field.fill(later);
    await field.blur();
    await expect(field).toHaveValue(later, { timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissPaywall(page);
    await expect(page.getByLabel(/repeat until/i).first()).toHaveValue(later, { timeout: 15_000 });

    // 3. Clear it back to "no end date" and confirm that also survives a reload.
    const clear = page.getByRole("button", { name: /clear end date/i }).first();
    if (await clear.isVisible().catch(() => false)) {
      await clear.click();
    } else {
      const target = page.getByLabel(/repeat until/i).first();
      await target.fill("");
      await target.blur();
    }
    await expect(page.getByLabel(/repeat until/i).first()).toHaveValue("", { timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissPaywall(page);
    await expect(page.getByLabel(/repeat until/i).first()).toHaveValue("", { timeout: 15_000 });
    // Still repeating — clearing an end date must not stop the routine.
    await expect(page.getByText(/repeats/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
