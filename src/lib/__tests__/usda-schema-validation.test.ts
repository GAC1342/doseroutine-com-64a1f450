import { describe, it, expect } from "vitest";
import {
  UsdaSchemaError,
  parseFdcFood,
  parseFdcSearchResponse,
  macroPlausibilityIssues,
  isPlausiblePortionGrams,
} from "../usda-schema";
import {
  numericStrings,
  nullsEverywhere,
  implausibleMacros,
  impossibleMacroSum,
  garbageNutrients,
  envelopeFoodsString,
  envelopeFoodsNull,
  envelopeNoFoods,
} from "@/test/fixtures/usda/edge-cases";

describe("USDA runtime schema validation", () => {
  it("rejects non-object payloads with a schema error", () => {
    for (const bad of [null, "html", 42, ["a"]]) {
      expect(() => parseFdcFood(bad)).toThrowError(UsdaSchemaError);
      try {
        parseFdcFood(bad);
      } catch (e) {
        expect((e as UsdaSchemaError).kind).toBe("schema");
      }
    }
  });

  it("accepts the numeric-string fixture USDA sometimes sends", () => {
    const parsed = parseFdcFood(numericStrings);
    expect(parsed.fdcId).toBe(7000002);
    expect(parsed.foodNutrients?.[0]?.value).toBe(403);
  });

  it("accepts the null-heavy fixture", () => {
    const parsed = parseFdcFood(nullsEverywhere);
    expect(parsed.foodPortions).toBeUndefined();
    expect(parsed.brandName).toBeUndefined();
  });

  it("keeps garbage nutrient values non-numeric-safe after parsing", () => {
    const parsed = parseFdcFood(garbageNutrients);
    expect(parsed.foodNutrients?.[0]?.value).toBeUndefined();
    expect(parsed.foodNutrients?.[1]?.value).toBeUndefined();
  });

  it("rejects a foods envelope that is not an array", () => {
    expect(() => parseFdcSearchResponse(envelopeFoodsString)).toThrowError(UsdaSchemaError);
    expect(parseFdcSearchResponse(envelopeFoodsNull)).toEqual([]);
    expect(parseFdcSearchResponse(envelopeNoFoods)).toEqual([]);
  });

  it("flags the implausible-macro fixtures", () => {
    for (const payload of [implausibleMacros, impossibleMacroSum]) {
      const nutrients = (payload.foodNutrients ?? []) as { value?: number; amount?: number }[];
      const val = (i: number) => Number(nutrients[i]?.value ?? nutrients[i]?.amount ?? 0);
      expect(
        macroPlausibilityIssues({
          kcal100: val(0),
          protein100: val(1),
          carbs100: val(2),
          fat100: val(3),
        }).length,
      ).toBeGreaterThan(0);
    }
  });

  it("flags implausible macro values", () => {
    expect(
      macroPlausibilityIssues({ kcal100: 5000, protein100: 10, carbs100: 10, fat100: 10 }).length,
    ).toBeGreaterThan(0);
    expect(
      macroPlausibilityIssues({ kcal100: 100, protein100: -5, carbs100: 10, fat100: 1 }).length,
    ).toBeGreaterThan(0);
    expect(
      macroPlausibilityIssues({ kcal100: 400, protein100: 60, carbs100: 60, fat100: 30 }).length,
    ).toBeGreaterThan(0);
  });

  it("passes real-world foods", () => {
    expect(
      macroPlausibilityIssues({
        kcal100: 403,
        protein100: 22.9,
        carbs100: 3.1,
        fat100: 33.1,
        fiber100: 0,
        sodium100mg: 621,
      }),
    ).toEqual([]);
  });

  it("bounds portion gram weights", () => {
    expect(isPlausiblePortionGrams(91)).toBe(true);
    expect(isPlausiblePortionGrams(0)).toBe(false);
    expect(isPlausiblePortionGrams(-3)).toBe(false);
    expect(isPlausiblePortionGrams(999_999)).toBe(false);
    expect(isPlausiblePortionGrams(Number.NaN)).toBe(false);
  });
});
