/**
 * Snapshot guards for the USDA FoodData Central contract.
 *
 * The API-behavior assertions live in `usda-api-contract.test.ts`. This file
 * pins two things that plain assertions miss:
 *
 *   1. the *shape* of each stored JSON fixture (keys + value types, never
 *      values), so refreshing a fixture from a live response is a no-op unless
 *      USDA actually added, removed, or retyped a field, and
 *   2. the full normalized `UsdaFood` plus the downstream view a user sees —
 *      portion chips, scaled macros, cue class and visual hint — so a parser
 *      change that silently drops a nutrient or shifts a cue fails loudly.
 *
 * Update snapshots with `vitest -u` only after reviewing the diff.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchUsdaFoods, usdaQualityScore, type UsdaFood } from "@/lib/usda.server";
import { scaleFoodToGrams } from "@/lib/food-resolver.server";
import { cueClassFor, describeGrams, visualHintFor } from "@/lib/portion-units";
import { USDA_FIXTURES, describeShape } from "@/test/fixtures/usda";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubEnv("USDA_FDC_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Normalizes one fixture payload through the real parser. */
async function parseFixture(payload: Record<string, unknown>): Promise<UsdaFood> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ foods: [payload] })),
  );
  const [food] = await searchUsdaFoods("fixture query", 1);
  if (!food) throw new Error("fixture did not parse into a UsdaFood");
  return food;
}

/** What the app builds from a parsed food: chips, macros, cue. */
function downstreamView(food: UsdaFood, grams: number) {
  const chips = food.portions.map((p) => ({
    label: p.label,
    grams: p.grams,
    isDefault: p.grams === food.defaultPortionG,
    referenceHint: null,
  }));
  const scaled = scaleFoodToGrams(
    {
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
    },
    grams,
  );
  return {
    chips,
    chipLabelForDefault: describeGrams(food.defaultPortionG, chips),
    scaledTo: grams,
    scaled: {
      calories: scaled.calories,
      protein_g: scaled.protein_g,
      carbs_g: scaled.carbs_g,
      fat_g: scaled.fat_g,
      fiber_g: scaled.fiber_g,
      sugar_g: scaled.sugar_g,
      sodium_mg: scaled.sodium_mg,
      satfat_g: scaled.satfat_g,
      dataSource: scaled.dataSource,
    },
    cueClass: cueClassFor(food.name),
    visualHint: visualHintFor(grams, food.name),
    qualityScore: usdaQualityScore(food.dataType),
  };
}

describe.each(USDA_FIXTURES)("USDA fixture: $key", (fixture) => {
  it(`payload shape is unchanged (${fixture.about})`, () => {
    expect(describeShape(fixture.payload)).toMatchSnapshot();
  });

  it("normalizes to the same UsdaFood", async () => {
    const food = await parseFixture(fixture.payload);
    expect(food).toMatchSnapshot();
  });

  it("produces the same chips, macros and cue downstream", async () => {
    const food = await parseFixture(fixture.payload);
    expect(downstreamView(food, fixture.scaleTo)).toMatchSnapshot();
  });
});

describe("fixture coverage", () => {
  it("covers every USDA data type the importer accepts", () => {
    const types = USDA_FIXTURES.map((f) => String(f.payload["dataType"])).sort();
    expect(types).toMatchInlineSnapshot(`
      [
        "Branded",
        "Foundation",
        "SR Legacy",
        "Survey (FNDDS)",
      ]
    `);
  });

  it("covers all three nutrient payload encodings", () => {
    const encodings = new Set<string>();
    for (const fixture of USDA_FIXTURES) {
      for (const n of (fixture.payload["foodNutrients"] as Record<string, unknown>[]) ?? []) {
        if ("nutrientId" in n) encodings.add("nutrientId");
        if ("nutrientNumber" in n) encodings.add("nutrientNumber");
        if ("nutrient" in n) encodings.add("nested nutrient.id");
      }
    }
    expect([...encodings].sort()).toEqual(["nested nutrient.id", "nutrientId", "nutrientNumber"]);
  });
});
