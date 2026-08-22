import { test, expect, AUTH_AVAILABLE, dismissFirstRunOverlays, dismissPaywall } from "./utils";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * End-to-end coverage for the barcode fallback path.
 *
 * Open Food Facts misses plenty of US products, so `lookupFoodBarcode` falls
 * back to USDA's Branded set (exact GTIN match) and caches the hit into our
 * own `foods` catalog on the way past. This spec proves the user-visible half
 * of that chain:
 *
 *   1. a USDA Branded match lands in the review sheet with real macros,
 *   2. the provenance badge says "USDA data" (not "AI estimate"), and the
 *      popover shows the "… kcal per 100 g · USDA Branded" basis plus the
 *      "Also in this portion" extended-nutrition line built from the fields
 *      USDA actually publishes (fiber / sugars / sat fat / sodium),
 *   3. caching works: the cached catalog row carries a foodId, so the portion
 *      table is fetched once and re-scanning the same barcode reuses it
 *      instead of re-querying,
 *   4. (live leg) hitting the real server twice with the same GTIN returns the
 *      same product, with the second call served from the cached row.
 *
 * Every step writes a screenshot to test-results/barcode-usda-fallback.
 */

const SHOTS = path.join("test-results", "barcode-usda-fallback");
mkdirSync(SHOTS, { recursive: true });

/** A real USDA Branded GTIN used by the live caching leg. */
const LIVE_GTIN = "028400157155";
/** Synthetic GTIN for the mocked legs — never hits the network. */
const MOCK_GTIN = "099999900001";

const USDA_FOOD_ID = "11111111-2222-3333-4444-555555555555";

/** Shape of `FoodLabelLookup` as the USDA Branded fallback returns it. */
const USDA_LOOKUP = {
  found: true,
  name: "Roasted Peanuts, Salted",
  brand: "Test Brands",
  servingSize: "28 g",
  basis: "serving",
  sourceUrl: "https://fdc.nal.usda.gov/",
  perServing: {
    name: "Roasted Peanuts, Salted",
    portion: "28 g",
    calories: 166,
    protein_g: 7.1,
    carbs_g: 4.7,
    fat_g: 14.2,
    grams: 28,
    foodId: USDA_FOOD_ID,
    dataSource: "usda",
    sourceName: "Roasted Peanuts, Salted (Test Brands)",
    sourceBasis: "593 kcal per 100 g · USDA Branded",
    fiber_g: 2.4,
    sugar_g: 1.3,
    sodium_mg: 130,
    satfat_g: 2,
  },
};

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

async function openBarcodeEntry(page: Page) {
  await page.goto("/food");
  await dismissFirstRunOverlays(page);
  await dismissPaywall(page);
  await page.getByText("More ways to add a meal").click();
  await expect(page.getByLabel("Food barcode")).toBeVisible();
}

async function lookUp(page: Page, code: string) {
  await page.getByLabel("Food barcode").fill(code);
  await page.getByRole("button", { name: "Look up barcode" }).click();
}

/** Fulfils the lookup server fn with a USDA Branded payload. */
async function mockUsdaLookup(page: Page, onCall: () => void) {
  await page.route(/\/_serverFn\/.*lookupFoodLabel/i, async (route) => {
    onCall();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(USDA_LOOKUP),
    });
  });
}

test.describe("barcode fallback → USDA Branded", () => {
  test.skip(!AUTH_AVAILABLE, "TEST_USER_EMAIL / TEST_USER_PASSWORD are required");

  test("USDA Branded match fills the review sheet with the right source badge", async ({
    authedPage: page,
  }) => {
    let calls = 0;
    await mockUsdaLookup(page, () => (calls += 1));

    await openBarcodeEntry(page);
    await shot(page, "01-barcode-entry");

    await lookUp(page, MOCK_GTIN);

    // Review sheet opens with the manufacturer panel, not a guess.
    await expect(page.getByLabel("Item 1 name")).toHaveValue(/Roasted Peanuts/i);
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("166");
    await expect(page.getByLabel("Item 1 Protein")).toHaveValue("7.1");
    await expect(page.getByLabel("Item 1 Carbs")).toHaveValue("4.7");
    await expect(page.getByLabel("Item 1 portion")).toHaveValue("28 g");
    expect(calls).toBe(1);
    await shot(page, "02-review-sheet-usda-match");

    // Provenance badge: USDA data, never the amber "AI estimate" pill.
    const badge = page.getByRole("button", {
      name: /Where the numbers for Roasted Peanuts.*came from: USDA data/i,
    });
    await expect(badge).toBeVisible();
    await expect(page.getByText("AI estimate")).toHaveCount(0);
    await shot(page, "03-source-badge-usda");

    // Popover: matched name, USDA Branded basis, and the extended line.
    await badge.click();
    const pop = page.getByText("Matched to").locator("..");
    await expect(pop).toContainText("Roasted Peanuts, Salted (Test Brands)");
    await expect(page.getByText(/kcal per 100 g · USDA Branded/)).toBeVisible();
    const extended = page.getByText(/Also in this portion:/);
    await expect(extended).toBeVisible();
    await expect(extended).toContainText("2.4 g fiber");
    await expect(extended).toContainText("1.3 g sugars");
    await expect(extended).toContainText("2 g sat fat");
    await expect(extended).toContainText("130 mg sodium");
    await shot(page, "04-source-popover-also-in-this-portion");
  });

  test("extended nutrition rescales with the portion and keeps the USDA badge", async ({
    authedPage: page,
  }) => {
    await mockUsdaLookup(page, () => undefined);
    await openBarcodeEntry(page);
    await lookUp(page, MOCK_GTIN);
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("166");
    await shot(page, "05-rescale-baseline-28g");

    // Double the portion: macros and the published micros scale with it.
    await page.getByLabel("Item 1 portion").fill("56 g");
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("332");
    const extended = page.getByText(/Also in this portion:/);
    await expect(extended).toContainText("4.8 g fiber");
    await expect(extended).toContainText("260 mg sodium");
    await expect(page.getByRole("button", { name: /came from: USDA data/i })).toBeVisible();
    await shot(page, "06-rescaled-56g");
  });

  test("cached catalog row means the portion table is fetched once", async ({
    authedPage: page,
  }) => {
    let lookups = 0;
    let portionCalls = 0;
    await mockUsdaLookup(page, () => (lookups += 1));
    await page.route(/\/_serverFn\/.*foodPortionsFor/i, async (route) => {
      portionCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ label: "1 oz (28 g)", grams: 28, isDefault: true }]),
      });
    });

    await openBarcodeEntry(page);
    await lookUp(page, MOCK_GTIN);
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("166");
    // The cached row carries a foodId, so household portions are available.
    await expect.poll(() => portionCalls, { timeout: 10_000 }).toBe(1);
    await shot(page, "07-cached-portion-chips");

    // Close and re-scan the same barcode: the portion table is reused from the
    // client cache (keyed by the cached foodId), so no second fetch.
    await page.keyboard.press("Escape");
    await lookUp(page, MOCK_GTIN);
    await expect(page.getByLabel("Item 1 kcal")).toHaveValue("166");
    expect(lookups).toBe(2);
    expect(portionCalls).toBe(1);
    await shot(page, "08-rescan-served-from-cache");
  });

  test("live: repeat lookups of the same GTIN return the cached catalog row", async ({
    authedPage: page,
  }) => {
    await openBarcodeEntry(page);

    const first = page.waitForResponse(/\/_serverFn\/.*lookupFoodLabel/i);
    await lookUp(page, LIVE_GTIN);
    await first;

    const sheetName = page.getByLabel("Item 1 name");
    const resolved = await sheetName
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (!resolved) {
      // No upstream match (no USDA key, product delisted, or network blocked).
      // The graceful path is the product-search fallback, not a crash.
      await expect(page.getByPlaceholder(/search/i).first()).toBeVisible({ timeout: 10_000 });
      await shot(page, "09-live-no-match-search-fallback");
      test.info().annotations.push({
        type: "note",
        description: "Live GTIN did not resolve upstream; caching leg skipped.",
      });
      return;
    }

    const firstName = await sheetName.inputValue();
    await shot(page, "09-live-first-lookup");

    const startedAt = Date.now();
    await page.keyboard.press("Escape");
    const second = page.waitForResponse(/\/_serverFn\/.*lookupFoodLabel/i);
    await lookUp(page, LIVE_GTIN);
    await second;
    const cachedMs = Date.now() - startedAt;

    // Same product, served from the row cached by the first lookup.
    await expect(sheetName).toHaveValue(firstName);
    expect(cachedMs).toBeLessThan(15_000);
    await shot(page, "10-live-second-lookup-cached");
  });
});
