import { test, expect, AUTH_AVAILABLE, dismissFirstRunOverlays } from "./utils";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { classifyDuplicate, explainDuplicate, findDuplicatePairs } from "../src/lib/food-dedupe";

/**
 * End-to-end coverage for dedupe across visually confusable characters:
 * Greek and Cyrillic letters that render identically to Latin ones
 * ("Grillеd Chiсkеn" with a Cyrillic е/с, "Οlive Οil" with a Greek omicron).
 *
 *   1. the matching API must classify homoglyph spellings as the same food,
 *   2. genuinely different foods must still not merge,
 *   3. the admin duplicates panel must render those pairs,
 *   4. bulk merging must send exactly the expected keep/merge id set.
 *
 * Screenshots land in test-results/dedupe-confusables.
 */

const SHOTS = path.join("test-results", "dedupe-confusables");
mkdirSync(SHOTS, { recursive: true });

// Cyrillic lookalikes
const CY_E = "\u0435"; // е
const CY_C = "\u0441"; // с
const CY_A = "\u0430"; // а
const CY_O = "\u043e"; // о
const CY_P = "\u0440"; // р
// Greek lookalikes
const GR_O = "\u03bf"; // ο
const GR_I = "\u03b9"; // ι
const GR_K = "\u03ba"; // κ
const GR_A = "\u03b1"; // α

const CHICKEN_PLAIN = "Grilled Chicken Breast";
const CHICKEN_CYRILLIC = `Grill${CY_E}d Chi${CY_C}k${CY_E}n Br${CY_E}ast`;
const CHICKEN_GREEK = `Grilled Ch${GR_I}c${GR_K}en Bre${GR_A}st`;

const OLIVE_OIL_PLAIN = "Olive Oil";
const OLIVE_OIL_GREEK = `${GR_O.toUpperCase()}live ${GR_O.toUpperCase()}il`;

const PASTA_PLAIN = "Pasta Sauce";
const PASTA_MIXED = `${CY_P.toUpperCase()}${CY_A}sta S${CY_A}u${CY_C}${CY_E}`;

const CHICKEN_MACROS = { kcal100: 165, protein100: 31, carbs100: 0, fat100: 3.6 };
const OIL_MACROS = { kcal100: 884, protein100: 0, carbs100: 0, fat100: 100 };
const SAUCE_MACROS = { kcal100: 62, protein100: 1.6, carbs100: 9, fat100: 2.1 };

const food = (id: string, name: string, macros = CHICKEN_MACROS) => ({ id, name, ...macros });

const catalogRow = (id: string, name: string, kcal100: number, timesLogged: number) => ({
  id,
  name,
  kcal100,
  source: "usda",
  timesLogged,
});

/** Pairs served to the admin duplicates panel. */
const DUPLICATE_PAIRS = [
  {
    keep: catalogRow("chicken-keep", CHICKEN_PLAIN, CHICKEN_MACROS.kcal100, 88),
    duplicate: catalogRow("chicken-cyrillic", CHICKEN_CYRILLIC, CHICKEN_MACROS.kcal100, 4),
    verdict: "exact",
    reason: "Identical name",
  },
  {
    keep: catalogRow("oil-keep", OLIVE_OIL_PLAIN, OIL_MACROS.kcal100, 51),
    duplicate: catalogRow("oil-greek", OLIVE_OIL_GREEK, OIL_MACROS.kcal100, 2),
    verdict: "exact",
    reason: "Identical name",
  },
  {
    keep: catalogRow("sauce-keep", PASTA_PLAIN, SAUCE_MACROS.kcal100, 30),
    duplicate: catalogRow("sauce-mixed", PASTA_MIXED, SAUCE_MACROS.kcal100, 1),
    verdict: "exact",
    reason: "Identical name",
  },
];

/** The exact merge set the UI must produce for a bulk "merge all". */
const EXPECTED_MERGES = [
  { keepId: "chicken-keep", mergeId: "chicken-cyrillic" },
  { keepId: "oil-keep", mergeId: "oil-greek" },
  { keepId: "sauce-keep", mergeId: "sauce-mixed" },
];

function json(body: unknown) {
  return { status: 200, contentType: "application/json", body: JSON.stringify(body) };
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

async function isAdmin(page: Page) {
  return page
    .getByLabel("Search USDA")
    .isVisible()
    .catch(() => false);
}

// ---------------------------------------------------------------------------
// 1. API level
// ---------------------------------------------------------------------------

test.describe("dedupe API: confusable characters", () => {
  const cases: Array<[string, string, string, Record<string, number>]> = [
    ["Cyrillic е/с inside a Latin name", CHICKEN_PLAIN, CHICKEN_CYRILLIC, CHICKEN_MACROS],
    ["Greek ι/κ/α inside a Latin name", CHICKEN_PLAIN, CHICKEN_GREEK, CHICKEN_MACROS],
    ["Greek capital omicron", OLIVE_OIL_PLAIN, OLIVE_OIL_GREEK, OIL_MACROS],
    ["mixed Cyrillic spelling", PASTA_PLAIN, PASTA_MIXED, SAUCE_MACROS],
  ];

  for (const [label, plain, spoofed, macros] of cases) {
    test(`matches ${label}`, () => {
      expect(plain).not.toBe(spoofed); // different code points, identical glyphs
      const forward = classifyDuplicate(food("a", plain, macros), food("b", spoofed, macros));
      expect(forward.verdict).toBe("exact");
      // Order must not change the answer.
      expect(classifyDuplicate(food("b", spoofed, macros), food("a", plain, macros)).verdict).toBe(
        "exact",
      );
    });
  }

  test("two homoglyph spellings of the same name match each other", () => {
    expect(classifyDuplicate(food("a", CHICKEN_CYRILLIC), food("b", CHICKEN_GREEK)).verdict).toBe(
      "exact",
    );
    const explained = explainDuplicate(food("a", CHICKEN_CYRILLIC), food("b", CHICKEN_GREEK));
    expect(explained.rule).toBe("identical-name");
  });

  test("a different food is not merged just because it uses confusables", () => {
    const verdict = classifyDuplicate(
      food("a", CHICKEN_PLAIN),
      food("b", `R${CY_A}w Chi${CY_C}ken Breast`),
    );
    expect(verdict.verdict).toBe("none");
  });

  test("clustering a catalog slice yields exactly the expected merge set", () => {
    const catalog = [
      food("chicken-keep", CHICKEN_PLAIN),
      food("chicken-cyrillic", CHICKEN_CYRILLIC),
      food("oil-keep", OLIVE_OIL_PLAIN, OIL_MACROS),
      food("oil-greek", OLIVE_OIL_GREEK, OIL_MACROS),
      food("sauce-keep", PASTA_PLAIN, SAUCE_MACROS),
      food("sauce-mixed", PASTA_MIXED, SAUCE_MACROS),
      food("beef", "Ground Beef 85/15", { kcal100: 250, protein100: 26, carbs100: 0, fat100: 17 }),
    ];

    const pairs = findDuplicatePairs(catalog).map(({ a, b }) => [a.id, b.id].sort().join("+"));
    expect(pairs.sort()).toEqual(
      ["chicken-cyrillic+chicken-keep", "oil-greek+oil-keep", "sauce-keep+sauce-mixed"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// 2. UI level — admin duplicates panel + bulk merge id set
// ---------------------------------------------------------------------------

test.describe("dedupe UI: confusable duplicates panel", () => {
  test.skip(!AUTH_AVAILABLE, "TEST_USER_EMAIL / TEST_USER_PASSWORD are required");

  test("bulk merge sends exactly the expected keep/merge ids", async ({ authedPage: page }) => {
    const merges: Array<{ keepId: string; mergeId: string }> = [];

    await page.route(/\/_serverFn\/.*adminListDuplicateClusters/i, (route) =>
      route.fulfill(json(DUPLICATE_PAIRS)),
    );
    await page.route(/\/_serverFn\/.*adminMergeFoods/i, async (route) => {
      const body = route.request().postDataJSON();
      const data = body?.data ?? body;
      merges.push({ keepId: data?.keepId, mergeId: data?.mergeId });
      return route.fulfill(json({ ok: true, mergedInto: data?.keepId }));
    });

    await page.goto("/admin/food-catalog");
    await dismissFirstRunOverlays(page);
    if (!(await isAdmin(page))) {
      test.info().annotations.push({
        type: "note",
        description: "Test account is not an admin; confusable duplicates UI leg skipped.",
      });
      await shot(page, "00-not-admin");
      return;
    }

    await expect(page.getByRole("heading", { name: /Possible duplicates/i })).toBeVisible();
    await expect(
      page.locator("li").filter({ hasText: "Grilled Chicken Breast" }).first(),
    ).toBeVisible();
    await expect(page.locator("li").filter({ hasText: "Olive Oil" }).first()).toBeVisible();
    await shot(page, "01-confusable-pairs");

    await page.getByLabel("Select all duplicate pairs").click();
    await page.getByRole("button", { name: /Merge selected \(3\)/ }).click();
    await page.getByRole("button", { name: /^Merge 3$/ }).click();

    await expect.poll(() => merges.length, { timeout: 20_000 }).toBe(3);
    expect(merges.sort((a, b) => a.mergeId.localeCompare(b.mergeId))).toEqual(
      [...EXPECTED_MERGES].sort((a, b) => a.mergeId.localeCompare(b.mergeId)),
    );
    await shot(page, "02-after-bulk-merge");
  });
});
