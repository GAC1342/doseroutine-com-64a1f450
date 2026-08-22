import { describe, expect, it } from "vitest";
import {
  EMPTY_NUTRITION,
  categoryFromOffTags,
  mergeProducts,
  parseServingUnits,
  pickBestProduct,
  scaleNutrition,
  type UniversalProduct,
} from "@/lib/universal-product";

function make(overrides: Partial<UniversalProduct>): UniversalProduct {
  return {
    code: "038000183737",
    code_type: "UPC-A",
    category: "food",
    name: "Test product",
    brand: null,
    image_url: null,
    source: "openfoodfacts",
    confidence: 0.8,
    serving: { size: null, grams: null, servings_per_container: null },
    nutrition_per_serving: { ...EMPTY_NUTRITION },
    ingredients: [],
    medication: null,
    gs1: null,
    ...overrides,
  };
}

describe("pickBestProduct", () => {
  it("prefers a drug listing over a crowd-sourced food entry", () => {
    const best = pickBestProduct([
      make({ source: "openfoodfacts", confidence: 0.9 }),
      make({ source: "openfda", category: "medication", confidence: 0.7 }),
    ]);
    expect(best?.source).toBe("openfda");
  });

  it("prefers a supplement facts panel over a bare catalog title", () => {
    const best = pickBestProduct([
      make({ source: "upcitemdb", confidence: 0.95 }),
      make({ source: "dsld", category: "supplement", confidence: 0.5 }),
    ]);
    expect(best?.source).toBe("dsld");
  });

  it("ignores nameless results and returns null when nothing usable came back", () => {
    expect(pickBestProduct([null, undefined, make({ name: "" })])).toBeNull();
  });
});

describe("mergeProducts", () => {
  it("fills gaps in the winner from a lower-priority source", () => {
    const base = make({ source: "dsld", category: "supplement", brand: null });
    const extra = make({
      source: "openfoodfacts",
      brand: "Acme",
      image_url: "https://img",
      nutrition_per_serving: { ...EMPTY_NUTRITION, calories: 12 },
    });
    const merged = mergeProducts(base, extra);
    expect(merged.brand).toBe("Acme");
    expect(merged.image_url).toBe("https://img");
    expect(merged.nutrition_per_serving.calories).toBe(12);
    expect(merged.source).toBe("dsld");
  });
});

describe("categoryFromOffTags", () => {
  it("reclassifies pill bottles Open Food Facts files under food", () => {
    expect(categoryFromOffTags(["en:dietary-supplements"], true)).toBe("supplement");
  });

  it("keeps real food as food and unknowns as other", () => {
    expect(categoryFromOffTags(["en:cereals"], true)).toBe("food");
    expect(categoryFromOffTags([], false)).toBe("other");
  });
});

describe("scaleNutrition", () => {
  it("scales per-serving values and leaves nulls alone", () => {
    const out = scaleNutrition({ ...EMPTY_NUTRITION, calories: 100, protein_g: 5.5 }, 1.5);
    expect(out.calories).toBe(150);
    expect(out.protein_g).toBe(8.3);
    expect(out.carbs_g).toBeNull();
  });
});

describe("parseServingUnits", () => {
  it("reads the label's own unit noun", () => {
    expect(parseServingUnits("2 capsules")).toEqual({ count: 2, noun: "capsules" });
    expect(parseServingUnits(null).noun).toBe("serving");
  });
});
