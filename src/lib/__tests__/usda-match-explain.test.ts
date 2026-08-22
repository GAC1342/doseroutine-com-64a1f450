/**
 * Deterministic match-score explanations for USDA edge cases.
 *
 * Each case imports two USDA-shaped payloads through the real importer, then
 * asserts the *reason* the pair matched or failed — rule id, per-signal
 * pass/fail, and score. The full explanation text is attached to every
 * assertion, so a failing case prints the whole breakdown instead of a bare
 * boolean.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchUsdaFoods, type UsdaFood } from "@/lib/usda.server";
import {
  explainDuplicate,
  summarizeMatch,
  type DedupeFood,
  type MatchExplanation,
  type MatchSignal,
} from "@/lib/food-dedupe";
import * as usdaFixtures from "@/test/fixtures/usda";
import { numericStrings, nullsEverywhere } from "@/test/fixtures/usda/edge-cases";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Import one USDA payload through the real client. */
async function importFood(payload: unknown): Promise<UsdaFood> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ foods: [payload] })),
  );
  const [food] = await searchUsdaFoods("anything", 1);
  expect(food, "fixture should import").toBeDefined();
  return food!;
}

function toDedupe(food: UsdaFood, overrides: Partial<DedupeFood> = {}): DedupeFood {
  return {
    id: `usda-${food.fdcId}`,
    name: food.name,
    brand: food.brand,
    gtin: food.gtin,
    kcal100: food.kcal100,
    protein100: food.protein100,
    carbs100: food.carbs100,
    fat100: food.fat100,
    ...overrides,
  };
}

function signal(explanation: MatchExplanation, key: MatchSignal["key"]): MatchSignal {
  const found = explanation.signals.find((s) => s.key === key);
  expect(found, `signal "${key}" missing:\n${explanation.text}`).toBeDefined();
  return found!;
}

beforeEach(() => {
  vi.stubEnv("USDA_FDC_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("USDA pair match explanations", () => {
  it("explains an identical re-import as an exact name match", async () => {
    const chicken = await importFood(usdaFixtures.foundationChicken);
    const explanation = explainDuplicate(toDedupe(chicken), toDedupe(chicken, { id: "catalog-1" }));

    expect(explanation.rule, explanation.text).toBe("identical-name");
    expect(explanation.verdict).toBe("exact");
    expect(explanation.score).toBe(1);
    expect(signal(explanation, "names").passed, explanation.text).toBe(true);
    expect(summarizeMatch(explanation)).toBe("exact 1 identical-name — Identical name");
  });

  it("explains a branded barcode re-import as a barcode match, name aside", async () => {
    const bar = await importFood(usdaFixtures.brandedBar);
    const explanation = explainDuplicate(
      toDedupe(bar),
      toDedupe(bar, { id: "catalog-2", name: "Chocolate protein bar", gtin: "12345678905" }),
    );

    expect(explanation.rule, explanation.text).toBe("same-barcode");
    expect(signal(explanation, "barcode").passed, explanation.text).toBe(true);
    expect(signal(explanation, "names").passed, explanation.text).toBe(false);
  });

  it("explains a near-miss barcode as a barcode disagreement, not a match", async () => {
    const bar = await importFood(usdaFixtures.brandedBar);
    const explanation = explainDuplicate(
      toDedupe(bar),
      toDedupe(bar, { id: "catalog-3", name: "Totally different snack", gtin: "012345678906" }),
    );

    expect(explanation.verdict, explanation.text).toBe("none");
    expect(signal(explanation, "barcode").passed, explanation.text).toBe(false);
    expect(signal(explanation, "barcode").detail).toContain("vs");
  });

  it("explains a raw-vs-cooked failure by naming the conflicting qualifier", async () => {
    const chicken = await importFood(usdaFixtures.foundationChicken);
    const explanation = explainDuplicate(
      toDedupe(chicken),
      toDedupe(chicken, {
        id: "catalog-4",
        name: "Chicken, broilers or fryers, breast, meat only, cooked",
        kcal100: 165,
        protein100: 31,
      }),
    );

    expect(explanation.rule, explanation.text).toBe("qualifier-conflict");
    expect(explanation.verdict).toBe("none");
    expect(signal(explanation, "qualifiers").detail).toContain("cooked");
  });

  it("explains a macro-driven failure with the exact deltas and tolerances", async () => {
    const rice = await importFood(usdaFixtures.surveyRice);
    const explanation = explainDuplicate(
      toDedupe(rice),
      toDedupe(rice, { id: "catalog-5", name: "Rice, brown, boiled soft", kcal100: 360 }),
    );

    expect(explanation.verdict, explanation.text).toBe("none");
    const kcal = signal(explanation, "kcal100");
    expect(kcal.passed, explanation.text).toBe(false);
    expect(kcal.detail).toContain("123 vs 360");
    expect(kcal.detail).toContain("tolerance 15%");
  });

  it("explains a same-brand probable match", async () => {
    const bar = await importFood(usdaFixtures.brandedBar);
    const explanation = explainDuplicate(
      toDedupe(bar, { gtin: null }),
      toDedupe(bar, {
        id: "catalog-6",
        gtin: null,
        name: "Protein bar, chocolate peanut",
        kcal100: 380,
      }),
    );

    expect(explanation.rule, explanation.text).toBe("brand-and-name");
    expect(explanation.verdict).toBe("probable");
    expect(signal(explanation, "brand").passed, explanation.text).toBe(true);
    expect(signal(explanation, "token-overlap").detail).toMatch(/shared \[/);
  });

  it("explains an alias hit", async () => {
    const broccoli = await importFood(usdaFixtures.srLegacyBroccoli);
    const explanation = explainDuplicate(
      toDedupe(broccoli),
      toDedupe(broccoli, {
        id: "catalog-7",
        name: "Broccoli florets",
        aliases: ["Broccoli, raw"],
      }),
    );

    expect(explanation.rule, explanation.text).toBe("alias-hit");
    expect(signal(explanation, "alias").detail).toContain("Broccoli, raw");
  });

  it("explains that unrelated foods fall below the overlap threshold", async () => {
    const chicken = await importFood(usdaFixtures.foundationChicken);
    const broccoli = await importFood(usdaFixtures.srLegacyBroccoli);
    const explanation = explainDuplicate(toDedupe(chicken), toDedupe(broccoli));

    expect(explanation.rule, explanation.text).toBe("below-threshold");
    expect(signal(explanation, "token-overlap").passed, explanation.text).toBe(false);
  });

  it("shows identical macros but divergent names on the string vs null cheese pair", async () => {
    const fromStrings = await importFood(numericStrings);
    const fromNulls = await importFood(nullsEverywhere);
    const explanation = explainDuplicate(toDedupe(fromStrings), toDedupe(fromNulls));

    // Every macro agrees exactly — the *only* reason this pair fails is the name.
    for (const key of ["kcal100", "protein100", "carbs100", "fat100"] as const) {
      expect(signal(explanation, key).passed, explanation.text).toBe(true);
      expect(signal(explanation, key).detail).toContain("Δ 0");
    }
    expect(explanation.rule, explanation.text).toBe("below-threshold");
    expect(signal(explanation, "token-overlap").detail).toContain("shared [cheddar, cheese]");

    // Once the descriptive suffixes are dropped, the same pair matches strongly.
    const trimmed = explainDuplicate(
      toDedupe(fromStrings, { name: "Cheese, cheddar" }),
      toDedupe(fromNulls, { id: "catalog-8", name: "Cheddar cheese" }),
    );
    expect(trimmed.rule, trimmed.text).toBe("name-and-macros");
    expect(trimmed.verdict).toBe("strong");
  });

  it("is deterministic: the same pair always yields the same explanation text", async () => {
    const rice = await importFood(usdaFixtures.surveyRice);
    const a = explainDuplicate(toDedupe(rice), toDedupe(rice, { id: "x", name: "Rice, brown" }));
    const b = explainDuplicate(toDedupe(rice), toDedupe(rice, { id: "x", name: "Rice, brown" }));
    expect(a.text).toBe(b.text);
    expect(a.lines[a.lines.length - 1]).toMatch(/^= (EXACT|STRONG|PROBABLE|NONE) /);
  });
});
