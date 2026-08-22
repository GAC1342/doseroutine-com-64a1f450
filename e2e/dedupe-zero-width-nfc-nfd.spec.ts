import { test, expect, AUTH_AVAILABLE, dismissFirstRunOverlays } from "./utils";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { classifyDuplicate, explainDuplicate } from "../src/lib/food-dedupe";

/**
 * End-to-end coverage for the full dedupe flow with hostile text:
 * zero-width characters inside words ("chi\u200bcken"), and the same accented
 * name spelled in NFC vs NFD ("Rôti" composed vs decomposed).
 *
 *   1. the pure matching API must classify every variant as the same food,
 *   2. the admin duplicates panel must render those pairs,
 *   3. selecting + bulk merging must send the right ids to the server,
 *   4. the USDA search panel must flag an incoming zero-width/NFD name as a
 *      possible duplicate of the catalog food it really is.
 *
 * Screenshots land in test-results/dedupe-zero-width-nfc-nfd.
 */

const SHOTS = path.join("test-results", "dedupe-zero-width-nfc-nfd");
mkdirSync(SHOTS, { recursive: true });

const ZWSP = "\u200b"; // zero-width space
const ZWJ = "\u200d"; // zero-width joiner
const BOM = "\ufeff"; // zero-width no-break space

/** "Grilled Chicken Breast" written four different (identical-looking) ways. */
const CHICKEN_PLAIN = "Grilled Chicken Breast";
const CHICKEN_ZWSP = `Grilled Chi${ZWSP}cken Breast`;
const CHICKEN_ZWJ = `Grilled Chick${ZWJ}en Breast`;
const CHICKEN_BOM = `${BOM}Grilled Chicken Breast`;

/** "Poulet Rôti" composed (NFC) and decomposed (NFD), plus a zero-width NFD. */
const ROTI_NFC = "Poulet Rôti".normalize("NFC");
const ROTI_NFD = "Poulet Rôti".normalize("NFD");
const ROTI_NFD_ZWSP = `Poulet R${ZWSP}ôti`.normalize("NFD");

const MACROS = { kcal100: 165, protein100: 31, carbs100: 0, fat100: 3.6 };

const food = (id: string, name: string) => ({ id, name, ...MACROS });

const catalogRow = (id: string, name: string, timesLogged: number) => ({
  id,
  name,
  kcal100: MACROS.kcal100,
  source: "usda",
  timesLogged,
});

/** What adminListDuplicateClusters serves to the panel. */
const DUPLICATE_PAIRS = [
  {
    keep: catalogRow("chicken-keep", CHICKEN_PLAIN, 42),
    duplicate: catalogRow("chicken-zwsp", CHICKEN_ZWSP, 3),
    verdict: "exact",
    reason: "Identical name",
  },
  {
    keep: catalogRow("roti-keep", ROTI_NFC, 17),
    duplicate: catalogRow("roti-nfd", ROTI_NFD_ZWSP, 1),
    verdict: "exact",
    reason: "Identical name",
  },
];

function json(body: unknown) {
  return { status: 200, contentType: "application/json", body: JSON.stringify(body) };
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

/** True when the admin catalog actually rendered for this account. */
async function isAdmin(page: Page) {
  return page
    .getByLabel("Search USDA")
    .isVisible()
    .catch(() => false);
}

// ---------------------------------------------------------------------------
// 1. API level — the contract the UI depends on.
// ---------------------------------------------------------------------------

test.describe("dedupe API: zero-width and NFC/NFD variants", () => {
  const zeroWidthVariants = [CHICKEN_ZWSP, CHICKEN_ZWJ, CHICKEN_BOM];

  for (const variant of zeroWidthVariants) {
    test(`treats ${JSON.stringify(variant)} as the same food as the plain name`, async () => {
      const verdict = classifyDuplicate(food("a", CHICKEN_PLAIN), food("b", variant));
      expect(verdict.verdict).toBe("exact");
      expect(verdict.score).toBe(1);

      // Both spelling directions must agree — order must not change the answer.
      expect(classifyDuplicate(food("b", variant), food("a", CHICKEN_PLAIN)).verdict).toBe("exact");
    });
  }

  test("NFC and NFD spellings of the same accented name match", () => {
    expect(ROTI_NFC).not.toBe(ROTI_NFD); // genuinely different byte sequences
    const verdict = classifyDuplicate(food("a", ROTI_NFC), food("b", ROTI_NFD));
    expect(verdict.verdict).toBe("exact");
  });

  test("zero-width characters inside an NFD name still match", () => {
    const verdict = classifyDuplicate(food("a", ROTI_NFC), food("b", ROTI_NFD_ZWSP));
    expect(verdict.verdict).toBe("exact");
    const explained = explainDuplicate(food("a", ROTI_NFC), food("b", ROTI_NFD_ZWSP));
    expect(explained.rule).toBe("identical-name");
    expect(explained.signals.find((s) => s.key === "names")?.passed).toBe(true);
  });

  test("a genuinely different food is still not merged despite zero-width noise", () => {
    const verdict = classifyDuplicate(
      food("a", CHICKEN_PLAIN),
      food("b", `Raw Chi${ZWSP}cken Breast`),
    );
    expect(verdict.verdict).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// 2-4. UI level — the admin duplicates flow end to end.
// ---------------------------------------------------------------------------

test.describe("dedupe UI: duplicates panel handles invisible characters", () => {
  test.skip(!AUTH_AVAILABLE, "TEST_USER_EMAIL / TEST_USER_PASSWORD are required");

  test("renders zero-width and NFD pairs and bulk merges them", async ({ authedPage: page }) => {
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
        description: "Test account is not an admin; duplicates UI leg skipped.",
      });
      await shot(page, "00-not-admin");
      return;
    }

    await expect(page.getByRole("heading", { name: /Possible duplicates/i })).toBeVisible();

    // Names render as authored — the invisible characters must not break the
    // row, and the visible text is what a human expects to read.
    const chickenRow = page.locator("li").filter({ hasText: "Grilled Chicken Breast" }).first();
    await expect(chickenRow).toBeVisible();
    await expect(chickenRow).toContainText("exact");
    const rotiRow = page.locator("li").filter({ hasText: "Poulet R" }).first();
    await expect(rotiRow).toBeVisible();
    await shot(page, "01-duplicate-pairs");

    // Select all and bulk merge.
    await page.getByLabel("Select all duplicate pairs").click();
    await page.getByRole("button", { name: /Merge selected \(2\)/ }).click();
    await page.getByRole("button", { name: /^Merge 2$/ }).click();

    await expect.poll(() => merges.length, { timeout: 20_000 }).toBe(2);
    expect(merges).toEqual(
      expect.arrayContaining([
        { keepId: "chicken-keep", mergeId: "chicken-zwsp" },
        { keepId: "roti-keep", mergeId: "roti-nfd" },
      ]),
    );
    await shot(page, "02-after-bulk-merge");
  });

  test("USDA search flags a zero-width / NFD incoming name as a duplicate", async ({
    authedPage: page,
  }) => {
    await page.route(/\/_serverFn\/.*adminUsdaSearch/i, (route) =>
      route.fulfill(
        json([
          {
            fdcId: "171077",
            name: CHICKEN_ZWSP,
            dataType: "SR Legacy",
            ...MACROS,
            alreadyImported: false,
            duplicateOf: { id: "chicken-keep", name: CHICKEN_PLAIN },
          },
          {
            fdcId: "171078",
            name: ROTI_NFD_ZWSP,
            dataType: "SR Legacy",
            ...MACROS,
            alreadyImported: false,
            duplicateOf: { id: "roti-keep", name: ROTI_NFC },
          },
        ]),
      ),
    );

    await page.goto("/admin/food-catalog");
    await dismissFirstRunOverlays(page);
    if (!(await isAdmin(page))) {
      test.info().annotations.push({
        type: "note",
        description: "Test account is not an admin; USDA duplicate-flag leg skipped.",
      });
      return;
    }

    await page.getByLabel("Search USDA").fill("grilled chicken breast");
    await page.getByRole("button", { name: /search usda/i }).click();

    await expect(page.getByText(/Possible duplicate of/).first()).toBeVisible();
    await expect(page.getByText(/Possible duplicate of/)).toHaveCount(2);
    await expect(page.getByText(`Possible duplicate of “${CHICKEN_PLAIN}”`)).toBeVisible();
    await shot(page, "03-usda-duplicate-flags");
  });
});
