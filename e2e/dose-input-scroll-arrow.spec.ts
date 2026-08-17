import { test, expect, AUTH_AVAILABLE, dismissFirstRunOverlays, dismissPaywall } from "./utils";
import type { Locator, Page } from "@playwright/test";

/**
 * Regression: a dose typed on the Safety/Dose editor must never be changed by
 * mouse-wheel scrolling or Up/Down arrow keys while the field is focused
 * (the classic `<input type="number">` spinner bug).
 *
 * Covers both the in-form value and the persisted value after save + reload.
 */

const TYPED_DOSE = "900";

async function openDoseEditor(page: Page): Promise<Locator | null> {
  await page.goto("/stack", { waitUntil: "domcontentloaded" });
  await dismissFirstRunOverlays(page);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await dismissPaywall(page);

  const editBtn = page.getByRole("button", { name: /^Edit$/i }).first();
  if (!(await editBtn.isVisible().catch(() => false))) return null;
  await editBtn.click();

  const dose = page.getByLabel("Dose amount");
  await dose.waitFor({ state: "visible", timeout: 10_000 });
  return dose;
}

test.describe("Dose input — scroll and arrow keys never change the value", () => {
  test.skip(!AUTH_AVAILABLE, "Requires TEST_USER_EMAIL / TEST_USER_PASSWORD");

  test("wheel scroll and arrow keys leave the typed dose untouched", async ({
    authedPage: page,
  }) => {
    const dose = await openDoseEditor(page);
    if (!dose) test.skip(true, "No stack item available to edit");
    const field = dose!;

    // The field must not be a spinner-capable number input in the first place.
    await expect(field).toHaveAttribute("type", "text");
    await expect(field).toHaveAttribute("inputmode", "decimal");

    await field.click();
    await field.fill(TYPED_DOSE);
    await expect(field).toHaveValue(TYPED_DOSE);

    // 1. Wheel over the focused field (the exact gesture that used to
    //    decrement 900 -> 899).
    const box = await field.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (const delta of [-240, 240, -120, 120]) {
        await page.mouse.wheel(0, delta);
      }
    }
    await expect(field).toHaveValue(TYPED_DOSE);

    // 2. Scrolling the page itself while the field keeps focus.
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.evaluate(() => window.scrollBy(0, -400));
    await expect(field).toHaveValue(TYPED_DOSE);

    // 3. Arrow keys while focused.
    await field.focus();
    for (const key of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowUp"]) {
      await page.keyboard.press(key);
    }
    await expect(field).toHaveValue(TYPED_DOSE);

    // 4. Save and confirm the persisted value is exactly what was typed.
    const save = page.getByRole("button", { name: /^(Save|Save changes|Update)$/i }).first();
    if (await save.isVisible().catch(() => false)) {
      await save.click();
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await dismissPaywall(page);

      const reopened = page.getByRole("button", { name: /^Edit$/i }).first();
      await reopened.click();
      const persisted = page.getByLabel("Dose amount");
      await expect(persisted).toHaveValue(TYPED_DOSE);
    }
  });
});
