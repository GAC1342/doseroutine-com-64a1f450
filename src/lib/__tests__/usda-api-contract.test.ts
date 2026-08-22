/**
 * API contract tests for the USDA FoodData Central integration.
 *
 * These lock the *shape* of what we accept from USDA and what we do when the
 * API misbehaves. USDA has shipped nutrient payloads in three different shapes
 * over the years (`nutrientId`, `nutrientNumber`, nested `nutrient.id`) and
 * rate-limits at 1,000 req/h with a 429. Neither a schema change nor a
 * throttled response is allowed to throw, produce NaN macros, lose the portion
 * table, or shift the portion cue a food maps to.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getUsdaFoodById,
  lookupUsdaByBarcode,
  searchUsdaFoods,
  usdaQualityScore,
  type UsdaFood,
} from "@/lib/usda.server";
import { scaleFoodToGrams } from "@/lib/food-resolver.server";
import { cueClassFor, describeGrams, visualHintFor } from "@/lib/portion-units";
import * as usdaFixtures from "@/test/fixtures/usda";
import {
  USDA_EDGE_CASES,
  USDA_MALFORMED_ENVELOPES,
  garbageNutrients,
  numericStrings,
  noMacrosWater,
  missingDescription,
  missingFdcId,
  undeterminedPortions,
  overlongPortionTable,
  emptyPortionTable,
  sugarAltNutrient,
  unknownFutureFields,
  implausibleMacros,
  impossibleMacroSum,
  implausiblePortionWeight,
} from "@/test/fixtures/usda/edge-cases";

/* ------------------------------ fetch harness ----------------------------- */

type FetchCall = { url: string; init?: RequestInit };
let calls: FetchCall[] = [];

function mockFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init };
    calls.push(call);
    return handler(call);
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* ------------------------------- fixtures --------------------------------- */

/**
 * Payloads live as JSON in `src/test/fixtures/usda` so they can be refreshed
 * from real API responses without touching test code; their shape is pinned by
 * snapshots in `usda-contract-snapshots.test.ts`.
 *
 *   foundationChicken — flat `nutrientId`, real `foodPortions` table
 *   legacyBroccoli    — nested `nutrient.id` + `amount`
 *   surveyRice        — string `nutrientNumber` only
 *   brandedBar        — no portion table, `servingSize` + GTIN instead
 */
const foundationChicken = usdaFixtures.foundationChicken;
const legacyBroccoli = usdaFixtures.srLegacyBroccoli;
const surveyRice = usdaFixtures.surveyRice;
const brandedBar = usdaFixtures.brandedBar;

beforeEach(() => {
  calls = [];
  vi.stubEnv("USDA_FDC_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/* ------------------------------ nutrient shapes --------------------------- */

describe("nutrient payload shapes", () => {
  it("parses flat nutrientId payloads", async () => {
    mockFetch(() => json({ foods: [foundationChicken] }));
    const [food] = await searchUsdaFoods("chicken breast", 1);
    expect(food).toBeDefined();
    expect(food!.kcal100).toBe(120);
    expect(food!.protein100).toBe(22.5);
    expect(food!.carbs100).toBe(0);
    expect(food!.fat100).toBe(2.6);
    expect(food!.sodium100mg).toBe(63);
    expect(food!.satfat100).toBe(0.7);
  });

  it("parses nested nutrient.id + amount payloads", async () => {
    mockFetch(() => json({ foods: [legacyBroccoli] }));
    const [food] = await searchUsdaFoods("broccoli", 1);
    expect(food!.kcal100).toBe(34);
    expect(food!.protein100).toBe(2.82);
    expect(food!.fiber100).toBe(2.6);
    expect(food!.sugar100).toBe(1.7);
  });

  it("parses string nutrientNumber payloads", async () => {
    mockFetch(() => json({ foods: [surveyRice] }));
    const [food] = await searchUsdaFoods("brown rice", 1);
    expect(food!.kcal100).toBe(123);
    expect(food!.carbs100).toBe(25.6);
  });

  it("falls back to nutrient 1063 when 2000 (total sugars) is absent", async () => {
    mockFetch(() => json({ foods: [sugarAltNutrient] }));
    const [food] = await searchUsdaFoods("brown rice", 1);
    expect(food!.sugar100).toBe(0.4);
  });

  it("reports unknown extended nutrients as null, never 0 or NaN", async () => {
    mockFetch(() => json({ foods: [surveyRice] }));
    const [food] = await searchUsdaFoods("brown rice", 1);
    expect(food!.fiber100).toBeNull();
    expect(food!.sugar100).toBeNull();
    expect(food!.sodium100mg).toBeNull();
    expect(food!.satfat100).toBeNull();
  });

  it("ignores unknown/added fields and unknown nutrient ids", async () => {
    mockFetch(() =>
      json({
        totalHits: 1,
        foodSearchCriteria: { somethingNew: true },
        foods: [unknownFutureFields],
      }),
    );
    const [food] = await searchUsdaFoods("chicken breast", 1);
    expect(food!.kcal100).toBe(120);
  });

  it("drops records with no usable macros or no id/description", async () => {
    mockFetch(() =>
      json({
        foods: [noMacrosWater, missingFdcId, missingDescription, foundationChicken],
      }),
    );
    const foods = await searchUsdaFoods("anything", 5);
    expect(foods).toHaveLength(1);
    expect(foods[0]!.fdcId).toBe("171077");
  });

  it("never emits NaN macros for garbage values", async () => {
    mockFetch(() => json({ foods: [garbageNutrients] }));
    const [food] = await searchUsdaFoods("garbage", 1);
    for (const v of [food!.kcal100, food!.protein100, food!.carbs100, food!.fat100]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(food!.fat100).toBe(3);
  });
});

/* -------------------------------- portions -------------------------------- */

describe("portion import contract", () => {
  it("imports household measures with labels and grams", async () => {
    mockFetch(() => json({ foods: [legacyBroccoli] }));
    const [food] = await searchUsdaFoods("broccoli", 1);
    expect(food!.portions).toEqual([
      { label: "1 cup chopped", grams: 91 },
      { label: "1 stalk, large", grams: 148 },
    ]);
    expect(food!.defaultPortionG).toBe(91);
  });

  it("skips undetermined and zero-weight portions", async () => {
    mockFetch(() => json({ foods: [undeterminedPortions] }));
    const [food] = await searchUsdaFoods("rice", 1);
    expect(food!.portions).toEqual([{ label: "1 cup", grams: 195 }]);
  });

  it("dedupes repeated labels and caps the table at 8 rows", async () => {
    mockFetch(() => json({ foods: [overlongPortionTable] }));
    const [food] = await searchUsdaFoods("rice", 1);
    expect(food!.portions).toHaveLength(8);
    expect(new Set(food!.portions.map((p) => p.label)).size).toBe(8);
  });

  it("synthesizes a serving portion for branded foods with no portion table", async () => {
    mockFetch(() => json({ foods: [brandedBar] }));
    const food = await lookupUsdaByBarcode("012345678905");
    expect(food!.portions).toEqual([{ label: "1 bar", grams: 60 }]);
    expect(food!.defaultPortionG).toBe(60);
  });

  it("defaults to 100 g when USDA publishes no portions at all", async () => {
    mockFetch(() => json({ foods: [emptyPortionTable] }));
    const [food] = await searchUsdaFoods("rice", 1);
    expect(food!.portions).toEqual([]);
    expect(food!.defaultPortionG).toBe(100);
  });

  it("imported portions drive the review-sheet chip labels", async () => {
    mockFetch(() => json({ foods: [legacyBroccoli] }));
    const [food] = await searchUsdaFoods("broccoli", 1);
    const chips = food!.portions.map((p) => ({
      label: p.label,
      grams: p.grams,
      isDefault: false,
      referenceHint: null,
    }));
    expect(describeGrams(91, chips)).toMatch(/1 cup chopped/i);
  });
});

/* ---------------------------- failure behavior ---------------------------- */

describe("rate limits and API failures degrade, never throw", () => {
  const failures: [string, () => Response][] = [
    ["429 rate limited", () => json({ error: { code: "OVER_RATE_LIMIT" } }, 429)],
    ["403 invalid key", () => json({ error: { code: "API_KEY_INVALID" } }, 403)],
    ["500 server error", () => new Response("upstream boom", { status: 500 })],
    ["503 maintenance", () => new Response("", { status: 503 })],
    ["200 with HTML body", () => new Response("<html>nope</html>", { status: 200 })],
    ["200 with null body", () => json(null)],
    ["200 with no foods key", () => json(USDA_MALFORMED_ENVELOPES[2]!.payload)],
    ["200 with foods: null", () => json(USDA_MALFORMED_ENVELOPES[1]!.payload)],
    ["200 with foods as a string", () => json(USDA_MALFORMED_ENVELOPES[0]!.payload)],
  ];

  it.each(failures)("search returns [] on %s", async (_label, respond) => {
    mockFetch(respond);
    await expect(searchUsdaFoods("chicken breast", 3)).resolves.toEqual([]);
  });

  it.each(failures)("barcode lookup returns null on %s", async (_label, respond) => {
    mockFetch(respond);
    await expect(lookupUsdaByBarcode("012345678905")).resolves.toBeNull();
  });

  it.each(failures)("detail fetch returns null on %s", async (_label, respond) => {
    mockFetch(respond);
    await expect(getUsdaFoodById("171077")).resolves.toBeNull();
  });

  it("survives a network-level rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      }),
    );
    await expect(searchUsdaFoods("chicken", 1)).resolves.toEqual([]);
    await expect(getUsdaFoodById("171077")).resolves.toBeNull();
    await expect(lookupUsdaByBarcode("012345678905")).resolves.toBeNull();
  });

  it("makes no request at all when the key is missing", async () => {
    vi.stubEnv("USDA_FDC_API_KEY", "");
    const spy = mockFetch(() => json({ foods: [foundationChicken] }));
    expect(await searchUsdaFoods("chicken", 1)).toEqual([]);
    expect(await getUsdaFoodById("171077")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("makes no request for inputs that cannot match", async () => {
    const spy = mockFetch(() => json({ foods: [foundationChicken] }));
    expect(await searchUsdaFoods("a", 1)).toEqual([]);
    expect(await getUsdaFoodById("not-an-id")).toBeNull();
    expect(await lookupUsdaByBarcode("123")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

/* ------------------------------ request contract --------------------------- */

describe("outgoing request contract", () => {
  it("searches generic data types only, with the key and page size", async () => {
    mockFetch(() => json({ foods: [] }));
    await searchUsdaFoods("chicken breast", 5);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain("/fdc/v1/foods/search");
    expect(calls[0]!.url).toContain("api_key=test-key");
    const body = JSON.parse(String(calls[0]!.init?.body));
    expect(body.dataType).toEqual(["Foundation", "SR Legacy", "Survey (FNDDS)"]);
    expect(body.pageSize).toBe(5);
    expect(body.query).toBe("chicken breast");
  });

  it("clamps page size into USDA's accepted range", async () => {
    mockFetch(() => json({ foods: [] }));
    await searchUsdaFoods("chicken", 500);
    expect(JSON.parse(String(calls[0]!.init?.body)).pageSize).toBe(25);
    calls = [];
    await searchUsdaFoods("chicken", 0);
    expect(JSON.parse(String(calls[0]!.init?.body)).pageSize).toBe(1);
  });

  it("restricts the barcode path to the Branded data type", async () => {
    mockFetch(() => json({ foods: [] }));
    await lookupUsdaByBarcode("012345678905");
    expect(JSON.parse(String(calls[0]!.init?.body)).dataType).toEqual(["Branded"]);
  });

  it("fetches details by id on the single-food endpoint", async () => {
    mockFetch(() => json(foundationChicken));
    const food = await getUsdaFoodById("171077");
    expect(calls[0]!.url).toContain("/fdc/v1/food/171077?api_key=test-key");
    expect(food!.portions[0]).toEqual({ label: "1 breast", grams: 174 });
  });
});

/* --------------------------------- barcode -------------------------------- */

describe("barcode matching contract", () => {
  it("matches GTIN-12/13/14 forms that differ only by leading zeros", async () => {
    mockFetch(() => json({ foods: [brandedBar] }));
    for (const scanned of ["012345678905", "12345678905", "00012345678905"]) {
      const food = await lookupUsdaByBarcode(scanned);
      expect(food, scanned).not.toBeNull();
      expect(food!.gtin).toBe("0012345678905");
    }
  });

  it("refuses a near-miss barcode rather than logging the wrong product", async () => {
    mockFetch(() => json({ foods: [brandedBar] }));
    expect(await lookupUsdaByBarcode("012345678906")).toBeNull();
  });

  it("keeps brand naming from brandName, falling back to brandOwner", async () => {
    mockFetch(() => json({ foods: [brandedBar] }));
    expect((await lookupUsdaByBarcode("012345678905"))!.brand).toBe("Test Brand");
    mockFetch(() => json({ foods: [{ ...brandedBar, brandName: undefined }] }));
    expect((await lookupUsdaByBarcode("012345678905"))!.brand).toBe("Test Owner Inc");
  });
});

/* ----------------------------- downstream mapping -------------------------- */

describe("USDA payloads keep macros and cue mapping stable downstream", () => {
  const toFoodRecord = (food: UsdaFood) => ({
    id: `usda-${food.fdcId}`,
    name: food.name,
    brand: food.brand,
    source: "usda",
    kcal100: food.kcal100,
    protein100: food.protein100,
    carbs100: food.carbs100,
    fat100: food.fat100,
    defaultPortionG: food.defaultPortionG,
    qualityScore: usdaQualityScore(food.dataType),
    verified: true,
    fiber100: food.fiber100,
    sugar100: food.sugar100,
    sodium100mg: food.sodium100mg,
    satfat100: food.satfat100,
  });

  it("scales a Foundation chicken record and keeps the protein cue", async () => {
    mockFetch(() => json({ foods: [foundationChicken] }));
    const [food] = await searchUsdaFoods("chicken breast", 1);
    const scaled = scaleFoodToGrams(toFoodRecord(food!), 85);
    expect(scaled.calories).toBe(102);
    expect(scaled.protein_g).toBeCloseTo(19.1, 1);
    expect(scaled.dataSource).toBe("usda");
    expect(cueClassFor(food!.name)).toBe("protein");
    expect(visualHintFor(85, food!.name)).toMatch(/deck of cards/i);
  });

  it("scales a legacy broccoli record and keeps the vegetable cue", async () => {
    mockFetch(() => json({ foods: [legacyBroccoli] }));
    const [food] = await searchUsdaFoods("broccoli", 1);
    const scaled = scaleFoodToGrams(toFoodRecord(food!), 180);
    expect(scaled.calories).toBe(61);
    expect(scaled.fiber_g).toBeCloseTo(4.7, 1);
    const hint = visualHintFor(180, food!.name);
    expect(hint).toMatch(/fist|cupped hand/i);
    expect(hint).not.toMatch(/deck of cards/i);
  });

  it("keeps null extended nutrients null after scaling", async () => {
    mockFetch(() => json({ foods: [surveyRice] }));
    const [food] = await searchUsdaFoods("brown rice", 1);
    const scaled = scaleFoodToGrams(toFoodRecord(food!), 195);
    expect(scaled.fiber_g).toBeNull();
    expect(scaled.sodium_mg).toBeNull();
    expect(cueClassFor(food!.name)).toBe("grain");
  });

  it("keeps quality scores ordered by USDA data type", () => {
    expect(usdaQualityScore("Foundation")).toBeGreaterThan(usdaQualityScore("SR Legacy"));
    expect(usdaQualityScore("SR Legacy")).toBeGreaterThan(usdaQualityScore("Branded"));
    expect(usdaQualityScore("Anything Else")).toBeGreaterThan(0);
  });
});

/* ------------------------- edge-case fixture matrix ------------------------ */

describe("edge-case fixtures import safely", () => {
  it.each(USDA_EDGE_CASES.map((f) => [f.key, f] as const))(
    "%s is handled as expected",
    async (_key, fixture) => {
      mockFetch(() => json({ foods: [fixture.payload] }));
      const foods = await searchUsdaFoods("anything", 1);
      if (fixture.expect === "reject") {
        expect(foods, fixture.about).toEqual([]);
        return;
      }
      const food = foods[0];
      expect(food, fixture.about).toBeDefined();
      for (const v of [food!.kcal100, food!.protein100, food!.carbs100, food!.fat100]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
      expect(food!.portions.length).toBeLessThanOrEqual(8);
      for (const p of food!.portions) {
        expect(p.grams).toBeGreaterThan(0);
        expect(p.grams).toBeLessThanOrEqual(20_000);
        expect(p.label.length).toBeGreaterThan(0);
      }
      expect(food!.defaultPortionG).toBeGreaterThan(0);
    },
  );

  it("parses numeric-string payloads into real numbers", async () => {
    mockFetch(() => json({ foods: [numericStrings] }));
    const [food] = await searchUsdaFoods("cheddar", 1);
    expect(food!.fdcId).toBe("7000002");
    expect(food!.kcal100).toBe(403);
    expect(food!.protein100).toBe(22.9);
    expect(food!.portions).toEqual([{ label: "1 oz", grams: 28.4 }]);
  });

  it("drops corrupt gram weights but keeps the valid portion row", async () => {
    mockFetch(() => json({ foods: [implausiblePortionWeight] }));
    const [food] = await searchUsdaFoods("broccoli", 1);
    expect(food!.portions).toEqual([{ label: "1 stalk, large", grams: 148 }]);
  });

  it("rejects physically impossible macro records outright", async () => {
    for (const payload of [implausibleMacros, impossibleMacroSum]) {
      mockFetch(() => json({ foods: [payload] }));
      await expect(searchUsdaFoods("corrupt", 1)).resolves.toEqual([]);
    }
  });
});
