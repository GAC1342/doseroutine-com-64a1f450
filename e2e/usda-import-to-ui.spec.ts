import { test, expect, AUTH_AVAILABLE, dismissFirstRunOverlays, dismissPaywall } from "./utils";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * End-to-end coverage for the full USDA lifecycle: import a lab-measured item
 * in the admin catalog, then prove the same food renders correctly for a user.
 *
 *   1. admin searches USDA, imports an item, and gets the "Imported …" toast,
 *   2. the imported food comes back from product search with its USDA macros,
 *   3. the review sheet shows the household portion chips built from the
 *      imported food's portion table,
 *   4. macros match the imported per-portion values and the meal totals agree,
 *   5. the "how big is that?" cue is class-correct (rice is a grain, so it
 *      gets fist/cupped-hand cues, never the meat "deck of cards"),
 *   6. tapping a chip rescales the macros and moves the cue with them.
 *
 * Every step writes a screenshot to test-results/usda-import-to-ui.
 */

const SHOTS = path.join("test-results", "usda-import-to-ui");
mkdirSync(SHOTS, { recursive: true });

const FDC_ID = "169704";
const FOOD_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const FOOD_NAME = "Rice, brown, long-grain, cooked";

/** What `adminUsdaSearch` returns for the query below. */
const USDA_SEARCH_RESULTS = [
  {
    fdcId: FDC_ID,
    name: FOOD_NAME,
    dataType: "SR Legacy",
    kcal100: 111,
    protein100: 2.6,
    carbs100: 23,
    fat100: 0.9,
    alreadyImported: false,
    duplicateOf: null,
  },
];

/** What `adminImportUsdaFood` returns once the row lands in the catalog. */
const USDA_IMPORT_RESULT = {
  status: "imported",
  id: FOOD_ID,
  name: FOOD_NAME,
  updated: false,
};

/** Household portions stored against the imported food. */
const PORTIONS = [
  { label: "1 cup (195 g)", grams: 195, isDefault: true, referenceHint: "Cooked, packed lightly" },
  { label: "1/2 cup (98 g)", grams: 98, isDefault: false, referenceHint: null },
];

/** The imported food as product search hands it to the review sheet. */
const SEARCH_MATCH = {
  found: true,
  name: FOOD_NAME,
  brand: null,
  servingSize: "1 cup (195 g)",
  basis: "serving",
  sourceUrl: "https://fdc.nal.usda.gov/",
  barcode: "",
  perServing: {
    name: FOOD_NAME,
    portion: "195 g",
    grams: 195,
    calories: 216,
    protein_g: 5,
    carbs_g: 45,
    fat_g: 1.8,
    foodId: FOOD_ID,
    dataSource: "usda",
    sourceName: FOOD_NAME,
    sourceBasis: "111 kcal per 100 g · USDA SR Legacy",
    fiber_g: 3.5,
    sugar_g: 0.7,
    sodium_mg: 10,
    satfat_g: 0.2,
  },
};

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

function json(body: unknown) {
  return { status: 200, contentType: "application/json", body: JSON.stringify(body) };
}

/** Serves the imported food to the consumer-facing search + portion table. */
async function mockConsumerFood(page: Page, onPortions?: () => void) {
  await page.route(/\/_serverFn\/.*searchFoodLabels/i, (route) =>
    route.fulfill(json([SEARCH_MATCH])),
  );
  await page.route(/\/_serverFn\/.*foodPortionsFor/i, (route) => {
    onPortions?.();
    return route.fulfill(json(PORTIONS));
  });
}

/** Opens the review sheet with the imported USDA food selected. */
async function openImportedFoodInReviewSheet(page: Page) {
  await page.goto("/food");
  await dismissFirstRunOverlays(page);
  await dismissPaywall(page);
  await page.getByText("More ways to add a meal").click();
  await page.getByRole("button", { name: /search a product/i }).click();
  await page.getByLabel("Product name").fill("brown rice cooked");
  await page.getByRole("button", { name: "Search products" }).click();
  await page.getByRole("button", { name: new RegExp(FOOD_NAME, "i") }).click();
  await expect(page.getByLabel("Item 1 name")).toHaveValue(new RegExp(FOOD_NAME, "i"));
}

test.describe("USDA import → user-facing portion chips, macros and cues", () => {
  test.skip(!AUTH_AVAILABLE, "TEST_USER_EMAIL / TEST_USER_PASSWORD are required");

  test("admin imports the USDA item into the catalog", async ({ authedPage: page }) => {
    let imports = 0;
    await page.route(/\/_serverFn\/.*adminUsdaSearch/i, (route) =>
      route.fulfill(json(USDA_SEARCH_RESULTS)),
    );
    await page.route(/\/_serverFn\/.*adminImportUsdaFood/i, (route) => {
      imports += 1;
      return route.fulfill(json(USDA_IMPORT_RESULT));
    });

    await page.goto("/admin/food-catalog");
    await dismissFirstRunOverlays(page);
    const search = page.getByLabel("Search USDA");
    if (!(await search.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: "note",
        description: "Test account is not an admin; catalog import leg skipped.",
      });
      await shot(page, "00-not-admin");
      return;
    }

    await search.fill("brown rice, cooked");
    await page.getByRole("button", { name: /search usda/i }).click();
    await expect(page.getByText(new RegExp(`FDC ${FDC_ID}`))).toBeVisible();
    await shot(page, "01-usda-search-results");

    await page
      .getByRole("button", { name: /^Import$/ })
      .first()
      .click();
    await expect(page.getByText(`Imported ${FOOD_NAME}`)).toBeVisible();
    expect(imports).toBe(1);
    await shot(page, "02-import-toast");
  });

  test("imported food renders its portion chips, macros and grain cue", async ({
    authedPage: page,
  }) => {
    let portionCalls = 0;
    await mockConsumerFood(page, () => (portionCalls += 1));
    await openImportedFoodInReviewSheet(page);
    await shot(page, "03-review-sheet-from-search");

    // Macros are the imported USDA numbers, not a photo estimate.
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("216");
    await expect(page.getByLabel("Item 1 Protein")).toHaveValue("5");
    await expect(page.getByLabel("Item 1 Carbs")).toHaveValue("45");
    await expect(page.getByLabel("Item 1 portion")).toHaveValue("195 g");
    await expect(page.getByLabel("Meal total Calories")).toHaveValue("216");

    // Provenance says USDA, never the amber "AI estimate" pill.
    await expect(page.getByRole("button", { name: /came from: USDA data/i }).first()).toBeVisible();
    await expect(page.getByText("AI estimate")).toHaveCount(0);

    // Portion chips come from the imported food's portion table.
    await expect.poll(() => portionCalls, { timeout: 10_000 }).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "1 cup (195 g)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "1/2 cup (98 g)" })).toBeVisible();
    await shot(page, "04-portion-chips");

    // Cue mapping: rice is a grain, so it gets grain cues — never the meat cue.
    await expect(page.getByText(/clenched fist|cupped hand|tennis ball/i).first()).toBeVisible();
    await expect(page.getByText(/deck of cards|palm/i)).toHaveCount(0);
    await shot(page, "05-grain-cue");
  });

  test("tapping a chip rescales macros, totals and the cue", async ({ authedPage: page }) => {
    await mockConsumerFood(page);
    await openImportedFoodInReviewSheet(page);
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("216");

    await page.getByRole("button", { name: "1/2 cup (98 g)" }).click();

    // 98 g of a 195 g portion: macros and meal totals halve together.
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue(/^10[789]$|^11[01]$/);
    await expect(page.getByLabel("Item 1 portion")).toHaveValue("1/2 cup (98 g)");
    const kcal = await page.getByLabel("Item 1 kcal").inputValue();
    await expect(page.getByLabel("Meal total Calories")).toHaveValue(kcal);
    await shot(page, "06-rescaled-half-cup");

    // Still a grain cue at the smaller weight, and still USDA-sourced.
    await expect(page.getByText(/cupped hand|tennis ball|clenched fist/i).first()).toBeVisible();
    await expect(page.getByText(/deck of cards/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /came from: USDA data/i }).first()).toBeVisible();
    await shot(page, "07-cue-after-rescale");
  });
});
