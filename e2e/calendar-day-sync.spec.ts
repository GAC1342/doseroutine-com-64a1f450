/**
 * The calendar day panel must always agree with itself.
 *
 * Two bugs motivated this: days with only *scheduled* work rendered as empty
 * cells, and the exercise list/illustrations in the day panel could go stale
 * when switching between a single workout and the All view on the same day.
 */

import { test, expect, AUTH_AVAILABLE, dismissFirstRunOverlays, dismissPaywall } from "./utils";

test.describe("calendar day markers and day panel", () => {
  test.skip(!AUTH_AVAILABLE, "requires TEST_USER_EMAIL / TEST_USER_PASSWORD");

  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto("/fitness?view=workout");
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    await page.waitForSelector("button[data-day]");
  });

  test("every day cell reports its plans to screen readers", async ({ authedPage: page }) => {
    const cells = page.locator("button[data-day]");
    const count = await cells.count();
    expect(count).toBeGreaterThan(27);

    for (let i = 0; i < count; i += 1) {
      const cell = cells.nth(i);
      const label = (await cell.getAttribute("aria-label")) ?? "";
      const hasPlans = (await cell.getAttribute("data-has-plans")) === "true";
      expect(label).not.toBe("");
      if (hasPlans) {
        expect(label).toMatch(/logged|scheduled|meal/);
      } else {
        expect(label).toContain("nothing scheduled");
      }
    }
  });

  test("a day with plans never shows more than three dots plus an overflow count", async ({
    authedPage: page,
  }) => {
    const dotRows = page.locator('button[data-day][data-has-plans="true"] span.h-1\\.5');
    const rows = await dotRows.count();
    for (let i = 0; i < rows; i += 1) {
      const dots = await dotRows.nth(i).locator("span.rounded-full").count();
      expect(dots).toBeLessThanOrEqual(3);
    }
  });

  test("scheduled exercises and illustrations stay in sync across day changes", async ({
    authedPage: page,
  }) => {
    const planned = page.locator("[data-session]");
    const days = page.locator('button[data-day][data-has-plans="true"]');
    const dayCount = await days.count();
    test.skip(dayCount === 0, "no scheduled days on this account");

    async function snapshot() {
      await expect(page.getByTestId("scheduled-day-loading")).toHaveCount(0, { timeout: 10_000 });
      const sessions = await planned.count();
      const names: string[] = [];
      for (let i = 0; i < sessions; i += 1) {
        const list = planned.nth(i).locator("[data-planned-exercise]");
        for (let j = 0; j < (await list.count()); j += 1) {
          names.push((await list.nth(j).getAttribute("data-planned-exercise")) ?? "");
        }
      }
      return names;
    }

    await days.first().click();
    const first = await snapshot();

    // Switch away and back: the panel must rebuild the identical list, and no
    // exercise row may be left without its illustration slot.
    if (dayCount > 1) {
      await days.nth(1).click();
      await snapshot();
      await days.first().click();
    }
    const again = await snapshot();
    expect(again).toEqual(first);

    const rows = page.locator("[data-planned-exercise]");
    for (let i = 0; i < (await rows.count()); i += 1) {
      await expect(rows.nth(i).locator("img, svg, canvas").first()).toBeVisible();
    }
  });

  test("meals can be hidden independently of workouts", async ({ authedPage: page }) => {
    const toggle = page.getByRole("button", { name: /meals$/i });
    await expect(toggle).toBeVisible();
    const label = (await toggle.textContent()) ?? "";
    await toggle.click();
    await expect(toggle).not.toHaveText(label);
    if (/hide meals/i.test(label)) {
      await expect(page.getByLabel("Scheduled meals")).toHaveCount(0);
    }
    // Preference survives a reload.
    await page.reload();
    await dismissFirstRunOverlays(page);
    await expect(page.getByRole("button", { name: /meals$/i })).not.toHaveText(label);
  });
});
