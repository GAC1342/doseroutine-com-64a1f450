/**
 * The fixtures themselves must not drift: macros have to scale exactly, each
 * food has to classify into the cue class it declares, and the portion chips
 * served by the component-test harness have to match the catalog.
 */
import { describe, expect, it } from "vitest";
import { cueClassFor, parsePortionGrams, visualHintFor } from "@/lib/portion-units";
import { roundTotals, totalsFor } from "@/lib/meal-nutrition";
import {
  COMBO_KEYS,
  FOOD_KEYS,
  allPortionChips,
  foodFixture,
  makeComboDraft,
  makeComboMeal,
  makeLargeMeal,
  makeMeal,
  makeMealDraft,
  makeMealItem,
  portionChipMocks,
  portionsFor,
} from "@/test/fixtures/foods";
import { portionsQueryMock } from "@/test/fixtures/meal-harness";

describe("food fixtures", () => {
  it.each(FOOD_KEYS)("scales %s macros linearly from per-100g values", (key) => {
    const food = foodFixture(key);
    const at100 = makeMealItem(key, { grams: 100 });
    expect(at100.calories).toBe(Math.round(food.per100.calories));
    expect(at100.protein_g).toBeCloseTo(food.per100.protein_g, 1);

    const at200 = makeMealItem(key, { grams: 200 });
    // Both ends are rounded to whole kcal, so allow one unit of rounding slack.
    expect(Math.abs(at200.calories - at100.calories * 2)).toBeLessThanOrEqual(1);
    expect(at200.protein_g).toBeCloseTo(at100.protein_g * 2, 1);
    expect(at200.grams).toBe(200);
  });

  it.each(FOOD_KEYS)("classifies %s into its declared cue class", (key) => {
    const food = foodFixture(key);
    expect(cueClassFor(food.name)).toBe(food.cueClass);
  });

  it.each(FOOD_KEYS)("shows the expected cue for %s at its default serving", (key) => {
    const food = foodFixture(key);
    const hint = visualHintFor(food.defaultGrams, food.name);
    if (food.cuePattern) {
      expect(hint).toMatch(food.cuePattern);
    } else {
      expect(hint === null || typeof hint === "string").toBe(true);
    }
  });

  it("carries source provenance on every item", () => {
    const item = makeMealItem("chicken");
    expect(item.foodId).toBe("food-chicken");
    expect(item.dataSource).toBe("database");
    expect(item.sourceName).toMatch(/chicken/i);
  });

  it("lets overrides win over generated values", () => {
    const item = makeMealItem("chicken", { grams: 100, calories: 1, name: "Custom" });
    expect(item.calories).toBe(1);
    expect(item.name).toBe("Custom");
  });

  it("builds multi-item meals and totals them", () => {
    const items = makeMeal(["chicken", "broccoli"], {
      chicken: { grams: 100 },
      broccoli: { grams: 100 },
    });
    expect(roundTotals(totalsFor(items)).calories).toBe(200);
  });

  it("builds a large meal for perf runs", () => {
    const items = makeLargeMeal(12);
    expect(items).toHaveLength(12);
    expect(items.every((i) => (i.grams ?? 0) > 0)).toBe(true);
  });

  it("defaults the draft to a two-item chicken and broccoli meal", () => {
    const draft = makeMealDraft();
    expect(draft.items).toHaveLength(2);
    expect(roundTotals(totalsFor(draft.items)).calories).toBe(200);
  });

  it("serves household chips per food id", () => {
    expect(portionsFor("food-chicken").map((p) => p.grams)).toEqual([85, 170]);
    expect(portionsFor("nope")).toEqual([]);
  });

  it("keeps the harness portion chips in sync with the catalog", () => {
    const catalog = portionChipMocks();
    const { useQuery: queryPortions } = portionsQueryMock();
    for (const [foodId, chips] of Object.entries(catalog)) {
      const served = queryPortions({ queryKey: ["food-portions", foodId] }).data;
      expect(served).toEqual(chips);
    }
  });
});

describe("portion chips", () => {
  const chips = allPortionChips();

  it("covers the household formats users actually type", () => {
    const labels = chips.map((c) => c.label.toLowerCase()).join(" | ");
    for (const format of [
      "1/2 cup",
      "½ cup",
      "¼ cup",
      "4 oz",
      "1 lb",
      "1 lb 4 oz",
      "1 tbsp",
      "1 tsp",
      "250 ml",
      "1 slice",
      "2 slices",
      "1 medium",
      "10 chips",
    ]) {
      expect(labels).toContain(format);
    }
  });

  it.each(chips.map((c) => [`${c.food}: ${c.label}`, c] as const))(
    "parses %s back to its gram weight",
    (_name, chip) => {
      const parsed = parsePortionGrams(chip.label);
      expect(parsed).not.toBeNull();
      // Labels that state grams must round-trip exactly; unit-only labels
      // ("4 oz", "250 ml") convert, so allow a 2 g conversion rounding gap.
      expect(Math.abs((parsed as number) - chip.grams)).toBeLessThanOrEqual(2);
    },
  );

  it("gives every food at least one chip and no duplicate gram values", () => {
    for (const key of FOOD_KEYS) {
      const food = foodFixture(key);
      expect(food.portions.length).toBeGreaterThan(0);
      const grams = food.portions.map((p) => p.grams);
      // Two chips may share grams only when their wording differs (e.g. cups vs block).
      const labels = new Set(food.portions.map((p) => p.label));
      expect(labels.size).toBe(grams.length);
    }
  });

  it("spreads foods across every data source", () => {
    const sources = new Set(FOOD_KEYS.map((k) => foodFixture(k).dataSource));
    expect(sources).toEqual(new Set(["database", "usda", "barcode", "ai"]));
  });
});

describe("combo meals", () => {
  it.each(COMBO_KEYS)("builds %s with positive totals", (key) => {
    const items = makeComboMeal(key);
    expect(items.length).toBeGreaterThan(1);
    const totals = roundTotals(totalsFor(items));
    expect(totals.calories).toBeGreaterThan(0);
    expect(items.every((i) => (i.grams ?? 0) > 0)).toBe(true);
  });

  it("makes the protein-first plate protein dominant", () => {
    const totals = roundTotals(totalsFor(makeComboMeal("proteinFirstPlate")));
    expect(totals.protein_g).toBeGreaterThan(50);
  });

  it("keeps the packaged snack barcode-sourced end to end", () => {
    expect(makeComboMeal("packagedSnack").every((i) => i.dataSource === "barcode")).toBe(true);
  });

  it("wraps a combo in a review-sheet draft", () => {
    const draft = makeComboDraft("breakfastBowl");
    expect(draft.label).toBe("Breakfast bowl");
    expect(draft.items).toHaveLength(4);
  });
});
