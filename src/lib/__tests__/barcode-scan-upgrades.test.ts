import { describe, expect, it } from "vitest";
import {
  canonicalGtin,
  cleanBarcode,
  compressToUpcE,
  expandUpcE,
  gtinVariants,
  innerGtinOfCase,
  isValidGtin,
  suggestGtinFix,
  withCheckDigit,
} from "@/lib/gtin";
import { macroDrift, rankAlternates, scoreBarcodeMatch } from "@/lib/barcode-confidence";
import { inferMealSlot, slotFromLabel } from "@/lib/meal-slot";

describe("gtin normalisation", () => {
  it("strips spaces, hyphens and stray characters", () => {
    expect(cleanBarcode(" 0 12345-67890 5 ")).toBe("012345678905");
    expect(cleanBarcode("EAN: 4006381333931")).toBe("4006381333931");
  });

  it("validates check digits across lengths", () => {
    expect(isValidGtin("4006381333931")).toBe(true); // EAN-13
    expect(isValidGtin("012345678905")).toBe(true); // UPC-A
    expect(isValidGtin("4006381333930")).toBe(false);
  });

  it("round-trips UPC-E to UPC-A and back", () => {
    const upcA = expandUpcE("04252614");
    expect(upcA).toHaveLength(12);
    expect(compressToUpcE(upcA!)).toBe("04252614");
  });

  it("derives the inner consumer GTIN of a case code", () => {
    const inner = innerGtinOfCase("10012345678902");
    expect(inner).toBe(withCheckDigit("001234567890"));
    expect(isValidGtin(inner!)).toBe(true);
  });

  it("keys every padding variant to the same canonical GTIN", () => {
    expect(canonicalGtin("012345678905")).toBe(canonicalGtin("0012345678905"));
    expect(canonicalGtin("012345678905")).toHaveLength(14);
  });

  it("offers padding variants most-specific first", () => {
    const variants = gtinVariants("012345678905");
    expect(variants[0]).toBe("012345678905");
    expect(variants).toContain("00012345678905");
    expect(new Set(variants).size).toBe(variants.length);
  });

  it("suggests a corrected check digit for a mistyped code", () => {
    expect(suggestGtinFix("4006381333930")).toBe("4006381333931");
    expect(suggestGtinFix("4006381333931")).toBeNull();
  });
});

const panel = (over: Partial<Parameters<typeof scoreBarcodeMatch>[0]["panel"]> = {}) => ({
  found: true,
  name: "Greek yoghurt",
  brand: "Brandy",
  servingSize: "170 g",
  basis: "serving" as const,
  perServing: { calories: 100, protein_g: 17, carbs_g: 6, fat_g: 0 },
  ...over,
});

describe("barcode confidence", () => {
  it("rates an exact USDA match highest", () => {
    const result = scoreBarcodeMatch({
      panel: panel(),
      source: "usda",
      scanned: "012345678905",
      matched: "012345678905",
    });
    expect(result.level === "exact" || result.level === "high").toBe(true);
    expect(result.advice).toBeNull();
  });

  it("penalises panels whose calories contradict their macros", () => {
    const bad = scoreBarcodeMatch({
      panel: panel({ perServing: { calories: 100, protein_g: 40, carbs_g: 40, fat_g: 20 } }),
      source: "openfoodfacts",
      scanned: "012345678905",
      matched: "012345678905",
    });
    expect(bad.score).toBeLessThan(72);
    expect(bad.reasons.join(" ")).toMatch(/don't line up/);
  });

  it("returns zero for a miss", () => {
    const miss = scoreBarcodeMatch({
      panel: { ...panel(), found: false, perServing: null },
      source: "openfoodfacts",
      scanned: "012345678905",
      matched: "012345678905",
    });
    expect(miss.score).toBe(0);
    expect(miss.advice).toBeTruthy();
  });

  it("computes Atwater drift", () => {
    expect(macroDrift(panel())).toBeLessThan(0.15);
  });

  it("ranks alternates best first", () => {
    const ranked = rankAlternates("012345678905", [
      {
        panel: panel({ basis: "100g", servingSize: null }),
        source: "openfoodfacts",
        matched: "0012345678905",
      },
      { panel: panel(), source: "usda", matched: "012345678905" },
    ]);
    expect(ranked[0]!.source).toBe("usda");
    expect(ranked[0]!.confidence.score).toBeGreaterThan(ranked[1]!.confidence.score);
  });
});

describe("meal slot inference", () => {
  const at = (h: number, m = 0) => new Date(2026, 0, 15, h, m, 0);

  it("uses the clock when no meal times are configured", () => {
    expect(inferMealSlot(at(8))).toBe("breakfast");
    expect(inferMealSlot(at(13))).toBe("lunch");
    expect(inferMealSlot(at(19))).toBe("dinner");
    expect(inferMealSlot(at(23))).toBe("snack");
  });

  it("snaps to the user's own meal times", () => {
    const times = [
      { label: "Breakfast", time: "10:00" },
      { label: "Dinner", time: "22:00" },
    ];
    expect(inferMealSlot(at(22, 15), times)).toBe("dinner");
    expect(inferMealSlot(at(10, 30), times)).toBe("breakfast");
  });

  it("wraps across midnight", () => {
    expect(inferMealSlot(at(0, 20), [{ label: "Dinner", time: "23:30" }])).toBe("dinner");
  });

  it("maps free-text labels to slots", () => {
    expect(slotFromLabel("Evening meal")).toBe("dinner");
    expect(slotFromLabel("Pre-workout shake")).toBe("snack");
    expect(slotFromLabel("Meds")).toBeNull();
  });
});
