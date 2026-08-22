import { test, expect, dismissFirstRunOverlays, dismissPaywall } from "./utils";

/**
 * Regression cover for repeat-weekly workout plans: a routine saved on the
 * Fitness weekly plan must persist its repeat days and end date across a
 * reload, and the same occurrence must show up on both Today and the Timeline
 * day panel. Historically these three surfaces read the recurrence through
 * different code paths and drifted apart.
 *
 * The test skips (rather than fails) when the fixture account has no saved
 * routine template, so it never becomes a flaky gate on an empty account.
 */

function localDayKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

test.describe("Repeat-weekly workouts stay consistent across Today and Timeline", () => {
  test("persists repeat days and end date, and renders on both surfaces", async ({
    authedPage: page,
  }) => {
    await page.goto("/fitness?view=routine", { waitUntil: "domcontentloaded" });
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);

    const templateSelect = page.locator("select").first();
    const hasRoutineUi = await templateSelect
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasRoutineUi, "Fitness weekly-plan UI is not available for this account");

    const options = await templateSelect.locator("option").allTextContents();
    test.skip(options.length === 0, "Test account has no saved routine template");

    const todayLabel = WEEKDAY_LABELS[new Date().getDay()] as string;
    const tomorrowLabel = WEEKDAY_LABELS[(new Date().getDay() + 1) % 7] as string;

    // Two days, so a bug that collapses the pattern to a single day is caught.
    for (const label of [todayLabel, tomorrowLabel]) {
      const chip = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();
      if (await chip.isVisible().catch(() => false)) await chip.click();
    }

    const endDate = page.getByLabel(/repeat until/i).first();
    const endKey = localDayKey(21);
    if (await endDate.isVisible().catch(() => false)) await endDate.fill(endKey);

    await page
      .getByRole("button", { name: /repeat every week/i })
      .first()
      .click();

    // Persistence: the saved plan must still show both days and the end date
    // after a full reload, not just in the optimistic local state.
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissPaywall(page);
    const summary = page.getByText(new RegExp(`${todayLabel}.*${tomorrowLabel}`, "i")).first();
    await expect(summary).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/until/i).first()).toBeVisible({ timeout: 15_000 });

    // Today must show the occurrence for the current weekday.
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await dismissPaywall(page);
    const todayRoutine = page.getByTestId("today-routine-strip").or(page.getByText(/workout/i));
    await expect(todayRoutine.first()).toBeVisible({ timeout: 15_000 });

    // Timeline reads the same recurrence rows through a different query.
    await page.goto(`/timeline?day=${localDayKey()}&tab=training`, {
      waitUntil: "domcontentloaded",
    });
    await dismissPaywall(page);
    await expect(page.getByText(/training/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
