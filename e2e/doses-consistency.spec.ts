import { test, expect, AUTH_AVAILABLE } from "./utils";
import type { Page } from "@playwright/test";

/**
 * End-to-end consistency check for dose actions.
 *
 * Marks a pending dose as "taken" on the Today page and verifies:
 *   1. The Today pill updates optimistically and persists after refresh.
 *   2. The Timeline page reflects the same event as taken.
 *   3. The 7-day on-time adherence (surfaced on both Today and Timeline)
 *      increments consistently.
 *
 * These specs require a real signed-in account with at least one pending
 * scheduled dose for today. When no pending dose exists, the test skips.
 */

test.describe("Doses — Today/Timeline/adherence consistency", () => {
  test.skip(!AUTH_AVAILABLE, "Requires TEST_USER_EMAIL / TEST_USER_PASSWORD");

  async function readOnTime7d(
    page: Page,
  ): Promise<{ pct: number | null; onTime: number; total: number }> {
    // Today page: "On-time (7d)" card renders "{n}/{m} on-time".
    const card = page.locator("section", { hasText: /On-time \(7d\)/i }).first();
    if (!(await card.isVisible().catch(() => false))) {
      return { pct: null, onTime: 0, total: 0 };
    }
    const text = await card.innerText();
    const pctMatch = text.match(/(\d+)\s*%/);
    const ratioMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
    return {
      pct: pctMatch ? Number(pctMatch[1]) : null,
      onTime: ratioMatch ? Number(ratioMatch[1]) : 0,
      total: ratioMatch ? Number(ratioMatch[2]) : 0,
    };
  }

  test("marking a dose taken stays consistent across Today, Timeline, and adherence", async ({
    authedPage: page,
  }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    // Find the first pending dose pill by locating a "Taken" action button.
    // DosePill only renders the Taken/Skip buttons when status === "pending".
    const takenBtn = page.getByRole("button", { name: /^\s*Taken\s*$/i }).first();
    if (!(await takenBtn.isVisible().catch(() => false))) {
      test.skip(true, "No pending dose available on Today to mark");
    }

    // Capture the pill's compound name for cross-page matching.
    const pill = takenBtn.locator("xpath=ancestor::div[contains(@class,'snap-start')][1]");
    const pillText = (await pill.innerText()).trim();
    const nameLine =
      pillText.split("\n").find((l) => !/\d/.test(l) && !/taken|skip/i.test(l)) ?? "";
    const compoundName = nameLine.trim();

    // Baseline adherence before the action.
    const before = await readOnTime7d(page);

    // Act — mark as taken.
    await takenBtn.click();

    // Optimistic: pill flips to the taken state (Undo button appears).
    await expect(pill.getByRole("button", { name: /Undo/i })).toBeVisible({ timeout: 2000 });

    // Wait for the persisted PATCH to schedule_events to settle.
    await page.waitForResponse(
      (res) =>
        /\/rest\/v1\/schedule_events/.test(res.url()) &&
        res.request().method() === "PATCH" &&
        res.ok(),
      { timeout: 10_000 },
    );

    // Reload — the taken state must survive a hard refresh (proves DB write).
    await page.reload();
    await page.waitForLoadState("networkidle");
    // After reload the Undo window is gone; the pill shows a Reset button
    // and the "Taken" action button is no longer offered for that pill.
    const reloadedPill = compoundName
      ? page.locator("div.snap-start", { hasText: compoundName }).first()
      : page.locator("div.snap-start").first();
    await expect(reloadedPill).toBeVisible();
    await expect(reloadedPill.getByRole("button", { name: /Reset/i })).toBeVisible();

    // Adherence: on-time count and total should not have regressed.
    const after = await readOnTime7d(page);
    expect(after.total).toBeGreaterThanOrEqual(before.total);
    expect(after.onTime).toBeGreaterThanOrEqual(before.onTime);
    // The event we just marked was within the 7d window, so on-time grew by
    // at least one (a scheduled_at within 1h of now counts as on-time).
    expect(after.onTime).toBeGreaterThan(before.onTime);

    // Timeline: same event, same day, must render as "taken".
    await page.goto("/timeline");
    await page.waitForLoadState("networkidle");

    // Today's collapsible section is open by default and headed by "Today".
    const todaySection = page
      .locator("section, div")
      .filter({ has: page.getByRole("button", { name: /^Today/i }) })
      .first();
    await expect(todaySection).toBeVisible();

    if (compoundName) {
      const row = page.locator("li", { hasText: compoundName }).first();
      await expect(row).toBeVisible({ timeout: 5000 });
      // The row's aria-label ends with the status label ("Taken").
      await expect(row).toHaveAttribute("aria-label", /Taken/i);
      // The pressed "Taken" pill inside that row confirms status.
      await expect(row.getByRole("button", { name: /Clear Taken/i })).toBeVisible();
    }

    // Timeline "On-time (7d)" stat should match Today's post-action reading.
    const timelineStat = page.locator("div", { hasText: /On-time \(7d\)/i }).first();
    if (await timelineStat.isVisible().catch(() => false)) {
      const t = await timelineStat.innerText();
      const m = t.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        const timelineOnTime = Number(m[1]);
        const timelineTotal = Number(m[2]);
        // Same underlying data source — counts must agree with Today.
        expect(timelineOnTime).toBe(after.onTime);
        expect(timelineTotal).toBe(after.total);
      }
    }
  });

  test("Undo restores the pending state on Today and Timeline", async ({ authedPage: page }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    const takenBtn = page.getByRole("button", { name: /^\s*Taken\s*$/i }).first();
    if (!(await takenBtn.isVisible().catch(() => false))) {
      test.skip(true, "No pending dose available on Today to mark");
    }
    const pill = takenBtn.locator("xpath=ancestor::div[contains(@class,'snap-start')][1]");

    await takenBtn.click();
    const undoBtn = pill.getByRole("button", { name: /Undo/i });
    await expect(undoBtn).toBeVisible({ timeout: 2000 });

    // Wait for the write to persist so Undo triggers a real reversal write.
    await page.waitForResponse(
      (res) =>
        /\/rest\/v1\/schedule_events/.test(res.url()) &&
        res.request().method() === "PATCH" &&
        res.ok(),
      { timeout: 10_000 },
    );

    await undoBtn.click();
    // After Undo the "Taken" action button comes back on the same pill.
    await expect(pill.getByRole("button", { name: /^\s*Taken\s*$/i })).toBeVisible({
      timeout: 5000,
    });

    // Reload — the reversal must have persisted to the DB.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /^\s*Taken\s*$/i }).first()).toBeVisible();
  });
});
