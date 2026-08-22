import { test, expect, AUTH_AVAILABLE, dismissFirstRunOverlays, dismissPaywall } from "./utils";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Staging regression for portion scaling and cue mapping in the meal review
 * sheet, end to end against a running app:
 *
 *   1. free-typed grams rescale that item's macros and the meal totals,
 *   2. typing digit by digit never compounds the rescale,
 *   3. preset household chips (when the matched food has them) rescale too,
 *   4. the "how big is that?" cue matches the food that was matched —
 *      chicken gets deck of cards / palm, broccoli gets fist / cupped hand.
 *
 * Every step writes a screenshot to test-results/meal-portion-scaling so CI
 * can publish them as reviewable artifacts.
 */

const SHOTS = path.join("test-results", "meal-portion-scaling");
mkdirSync(SHOTS, { recursive: true });

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

/** Opens the review sheet through "Enter by hand" on /food. */
async function openReviewSheet(page: Page) {
  await page.goto("/food");
  await dismissFirstRunOverlays(page);
  await dismissPaywall(page);
  await page.getByText("More ways to add a meal").click();
  await page.getByRole("button", { name: "Enter by hand" }).click();
  await expect(page.getByLabel("Item 1 name")).toBeVisible();
}

async function fillItem(
  page: Page,
  index: number,
  values: { name: string; portion: string; kcal: string; protein: string; carbs: string },
) {
  await page.getByLabel(`Item ${index} name`).fill(values.name);
  await page.getByLabel(`Item ${index} kcal`).fill(values.kcal);
  await page.getByLabel(`Item ${index} Protein`).fill(values.protein);
  await page.getByLabel(`Item ${index} Carbs`).fill(values.carbs);
  await page.getByLabel(`Item ${index} portion`).fill(values.portion);
}

test.describe("meal portion scaling and cues", () => {
  test.skip(!AUTH_AVAILABLE, "TEST_USER_EMAIL / TEST_USER_PASSWORD are required");

  test("free-typed grams rescale macros and totals", async ({ authedPage: page }) => {
    await openReviewSheet(page);
    await fillItem(page, 1, {
      name: "Grilled chicken breast",
      portion: "100 g",
      kcal: "165",
      protein: "31",
      carbs: "0",
    });
    await shot(page, "01-baseline-100g");

    await page.getByLabel("Item 1 portion").fill("200 g");
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("330");
    await expect(page.getByLabel("Item 1 Protein")).toHaveValue("62");
    await expect(page.getByLabel("Meal total Calories")).toHaveValue("330");
    await shot(page, "02-typed-200g");
  });

  test("typing digit by digit does not compound the rescale", async ({ authedPage: page }) => {
    await openReviewSheet(page);
    await fillItem(page, 1, {
      name: "Grilled chicken breast",
      portion: "100 g",
      kcal: "165",
      protein: "31",
      carbs: "0",
    });

    const portion = page.getByLabel("Item 1 portion");
    await portion.fill("2");
    await portion.fill("20");
    await portion.fill("200 g");

    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("330");
    await shot(page, "03-digit-by-digit");
  });

  test("cues match the food: chicken vs broccoli", async ({ authedPage: page }) => {
    await openReviewSheet(page);
    await fillItem(page, 1, {
      name: "Grilled chicken breast",
      portion: "85 g",
      kcal: "140",
      protein: "26",
      carbs: "0",
    });
    await expect(page.getByText(/deck of cards/i).first()).toBeVisible();
    await expect(page.getByText(/cupped hand|clenched fist/i)).toHaveCount(0);
    await shot(page, "04-cue-chicken");

    // Second item: a vegetable must never borrow the meat cue.
    await page.getByRole("button", { name: /add item/i }).click();
    await fillItem(page, 2, {
      name: "Steamed broccoli",
      portion: "180 g",
      kcal: "63",
      protein: "4",
      carbs: "13",
    });
    await expect(page.getByText(/clenched fist|cupped hand/i).first()).toBeVisible();
    await shot(page, "05-cue-broccoli");
  });

  test("preset household chips rescale the item when the food has them", async ({
    authedPage: page,
  }) => {
    await openReviewSheet(page);
    await fillItem(page, 1, {
      name: "Grilled chicken breast",
      portion: "100 g",
      kcal: "165",
      protein: "31",
      carbs: "0",
    });

    // Household chips only exist for catalog-matched foods; a hand-typed item
    // may have none, so this leg is informational rather than fatal.
    const chip = page.locator("button", { hasText: /\(\d+\s*g\)/ }).first();
    if ((await chip.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description: "No household portion chips for a hand-entered item; preset leg skipped.",
      });
      await shot(page, "06-no-preset-chips");
      return;
    }

    const before = await page.getByLabel("Item 1 kcal").inputValue();
    await chip.click();
    await expect(page.getByLabel("Item 1 kcal")).not.toHaveValue(before);
    await shot(page, "06-preset-chip");
  });

  test("comma-decimal metric input rescales macros and totals", async ({ authedPage: page }) => {
    await openReviewSheet(page);
    await fillItem(page, 1, {
      name: "Grilled chicken breast",
      portion: "100 g",
      kcal: "165",
      protein: "31",
      carbs: "0",
    });
    await shot(page, "07-comma-baseline-100g");

    const portion = page.getByLabel("Item 1 portion");

    // Partial/ambiguous input must never rescale.
    await portion.fill("0,");
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("165");
    await shot(page, "08-comma-partial-input");

    // "0,2 kg" -> 200 g (European decimal comma).
    await portion.fill("0,2 kg");
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("330");
    await expect(page.getByLabel("Item 1 Protein")).toHaveValue("62");
    await expect(page.getByLabel("Meal total Calories")).toHaveValue("330");
    await shot(page, "09-comma-0_2kg");

    // Retyping from the same base must not compound: "0,15 kg" -> 150 g.
    await portion.fill("0,15 kg");
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("248");
    await expect(page.getByLabel("Meal total Calories")).toHaveValue("248");
    await shot(page, "10-comma-0_15kg");
  });

  test("compound imperial input (1 lb 4 oz) rescales macros and totals", async ({
    authedPage: page,
  }) => {
    await openReviewSheet(page);
    await fillItem(page, 1, {
      name: "Grilled chicken breast",
      portion: "100 g",
      kcal: "165",
      protein: "31",
      carbs: "0",
    });
    await shot(page, "11-imperial-baseline-100g");

    const portion = page.getByLabel("Item 1 portion");

    // Halfway through typing the compound amount ("1 lb") -> 453.6 g.
    await portion.fill("1 lb");
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("748");
    await shot(page, "12-imperial-1lb");

    // Full compound amount: 1 lb 4 oz = 567 g.
    await portion.fill("1 lb 4 oz");
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("936");
    await expect(page.getByLabel("Item 1 Protein")).toHaveValue("175.8");
    await expect(page.getByLabel("Meal total Calories")).toHaveValue("936");
    await shot(page, "13-imperial-1lb-4oz");

    // Imperial with a comma decimal: "0,5 lb" = 226.8 g, rescaled from base.
    await portion.fill("0,5 lb");
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("374");
    await shot(page, "14-imperial-comma-0_5lb");

    // Malformed input leaves the last good totals untouched.
    await portion.fill("lb 2");
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("374");
    await expect(page.getByLabel("Meal total Calories")).toHaveValue("374");
    await shot(page, "15-imperial-malformed-noop");
  });
});
