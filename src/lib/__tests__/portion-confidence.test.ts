import { describe, expect, it } from "vitest";
import { assessPortionConfidence, portionSpreadPct } from "@/lib/portion-confidence";
import type { MealItem } from "@/lib/meal-nutrition";

function item(over: Partial<MealItem> = {}): MealItem {
  return {
    name: "chicken breast, cooked",
    portion: "150 g",
    calories: 250,
    protein_g: 45,
    carbs_g: 0,
    fat_g: 6,
    grams: 150,
    gramsLow: 140,
    gramsHigh: 160,
    itemConfidence: "high",
    ...over,
  };
}

describe("portionSpreadPct", () => {
  it("measures the low/high spread against the best guess", () => {
    expect(portionSpreadPct(item({ grams: 100, gramsLow: 80, gramsHigh: 140 }))).toBe(60);
  });
  it("returns 0 when the model gave no range", () => {
    expect(portionSpreadPct(item({ gramsLow: null, gramsHigh: null }))).toBe(0);
  });
});

describe("assessPortionConfidence", () => {
  it("never gates a barcode read", () => {
    const a = assessPortionConfidence({
      items: [item()],
      confidence: "low",
      note: "",
      readFrom: "barcode",
    });
    expect(a.verdict).toBe("trusted");
    expect(a.score).toBe(100);
  });

  it("trusts a tight, well-scaled visual estimate", () => {
    const a = assessPortionConfidence({
      items: [item()],
      confidence: "high",
      note: "",
      readFrom: "visual",
      scaleBasis: "26 cm dinner plate",
    });
    expect(a.verdict).toBe("trusted");
    expect(a.summary).toContain("26 cm dinner plate");
  });

  it("asks for a retake when there is no scale and the model is unsure", () => {
    const a = assessPortionConfidence({
      items: [
        item({ itemConfidence: "low", grams: 200, gramsLow: 100, gramsHigh: 400 }),
        item({ name: "rice", itemConfidence: "low" }),
      ],
      confidence: "low",
      note: "",
      readFrom: "visual",
      scaleBasis: "",
    });
    expect(a.verdict).toBe("retake");
    expect(a.missingScaleReference).toBe(true);
    expect(a.steps.join(" ")).toMatch(/fork|credit card|thumb/i);
    expect(a.reasons.length).toBeGreaterThan(1);
  });

  it("flags a middling estimate for a check rather than a retake", () => {
    const a = assessPortionConfidence({
      items: [item({ grams: 150, gramsLow: 100, gramsHigh: 210 })],
      confidence: "medium",
      note: "",
      readFrom: "visual",
      scaleBasis: "standard fork in frame",
    });
    expect(a.verdict).toBe("check");
    expect(a.steps.some((s) => /Edit any portion/i.test(s))).toBe(true);
  });

  it("penalises a calories-vs-macros mismatch", () => {
    const clean = assessPortionConfidence({
      items: [item()],
      confidence: "high",
      note: "",
      readFrom: "visual",
      scaleBasis: "plate",
    });
    const mismatched = assessPortionConfidence({
      items: [item()],
      confidence: "high",
      note: "",
      readFrom: "visual",
      scaleBasis: "plate",
      reconciliation: { stated: 500, implied: 250, driftPct: 50, status: "mismatch" },
    });
    expect(mismatched.score).toBeLessThan(clean.score);
    expect(mismatched.reasons.join(" ")).toContain("don't line up");
  });

  it("always gives actionable next steps when it is not trusted", () => {
    const a = assessPortionConfidence({
      items: [],
      confidence: "low",
      note: "",
      readFrom: "visual",
      scaleBasis: "",
    });
    expect(a.verdict).toBe("retake");
    expect(a.steps.length).toBeGreaterThanOrEqual(3);
  });
});
