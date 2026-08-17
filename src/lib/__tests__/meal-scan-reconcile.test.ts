import { describe, expect, it } from "vitest";
import {
  buildScaleBreakdown,
  macroImpliedCalories,
  provenanceFactors,
  reconcileEstimate,
  validateMealItem,
  validateMealTotals,
  type MealEstimate,
} from "@/lib/meal-nutrition";

function estimate(partial: Partial<MealEstimate>): MealEstimate {
  return {
    label: "Test",
    items: [
      { name: "Item", portion: "1 serving", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    ],
    confidence: "medium",
    note: "",
    ...partial,
  };
}

describe("meal estimate reconciliation", () => {
  it("computes Atwater calories from macros", () => {
    expect(
      macroImpliedCalories([
        { name: "a", portion: "", calories: 0, protein_g: 10, carbs_g: 10, fat_g: 10 },
      ]),
    ).toBe(170);
  });

  it("promotes a consistent label read to high confidence", () => {
    const out = reconcileEstimate(
      estimate({
        readFrom: "nutrition_label",
        confidence: "medium",
        items: [
          { name: "Bar", portion: "1 bar", calories: 170, protein_g: 10, carbs_g: 10, fat_g: 10 },
        ],
      }),
    );
    expect(out.confidence).toBe("high");
  });

  it("downgrades when calories and macros disagree", () => {
    const out = reconcileEstimate(
      estimate({
        readFrom: "nutrition_label",
        confidence: "high",
        items: [
          { name: "Bowl", portion: "1", calories: 900, protein_g: 10, carbs_g: 10, fat_g: 10 },
        ],
      }),
    );
    expect(out.confidence).toBe("medium");
    expect(out.note).toContain("don't line up");
  });

  it("never second-guesses a published barcode panel", () => {
    const out = reconcileEstimate(
      estimate({
        readFrom: "barcode",
        confidence: "high",
        items: [
          { name: "Soda", portion: "1 can", calories: 140, protein_g: 0, carbs_g: 0, fat_g: 0 },
        ],
      }),
    );
    expect(out.confidence).toBe("high");
    expect(out.note).toBe("");
  });
});

describe("structured reconciliation and provenance", () => {
  const label = [
    { name: "Bar", portion: "1 bar", calories: 170, protein_g: 10, carbs_g: 10, fat_g: 10 },
  ];
  const mismatch = [
    { name: "Bowl", portion: "1", calories: 900, protein_g: 10, carbs_g: 10, fat_g: 10 },
  ];

  it("reports a passing cross-check", () => {
    const out = reconcileEstimate(estimate({ readFrom: "nutrition_label", items: label }));
    expect(out.reconciliation).toMatchObject({ stated: 170, implied: 170, status: "ok" });
  });

  it("reports a failing cross-check", () => {
    const out = reconcileEstimate(estimate({ readFrom: "nutrition_label", items: mismatch }));
    expect(out.reconciliation?.status).toBe("mismatch");
    expect(out.reconciliation?.driftPct).toBeGreaterThan(25);
  });

  it("skips the cross-check for a barcode panel", () => {
    const out = reconcileEstimate(estimate({ readFrom: "barcode", items: mismatch }));
    expect(out.reconciliation?.status).toBe("not_applicable");
  });

  it("explains a barcode read", () => {
    const factors = provenanceFactors({ source: "barcode", readFrom: "barcode", items: label });
    expect(factors[0]).toContain("published nutrition panel");
    expect(factors.join(" ")).not.toContain("Cross-check");
  });

  it("explains a label read that reconciles", () => {
    const factors = provenanceFactors({
      source: "photo",
      readFrom: "nutrition_label",
      items: label,
    });
    expect(factors.join(" ")).toContain("Cross-check passed");
  });

  it("explains a visual estimate that does not reconcile, plus manual edits", () => {
    const factors = provenanceFactors({
      source: "photo",
      readFrom: "visual",
      items: mismatch,
      edited: true,
    });
    expect(factors.join(" ")).toContain("Cross-check failed");
    expect(factors.at(-1)).toContain("manual edits");
  });

  it("marks hand-entered meals", () => {
    const factors = provenanceFactors({ source: "manual", items: label });
    expect(factors[0]).toContain("typed in by hand");
  });
});

describe("meal validation", () => {
  it("flags negative totals as errors", () => {
    const issues = validateMealTotals({ calories: -10, protein_g: 0, carbs_g: 0, fat_g: 0 });
    expect(issues.some((i) => i.kind === "error" && i.field === "calories")).toBe(true);
  });

  it("flags extreme totals as errors", () => {
    const issues = validateMealTotals({
      calories: 15_000,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    });
    expect(issues.some((i) => i.kind === "error" && i.field === "calories")).toBe(true);
  });

  it("warns when calories exist but all macros are zero", () => {
    const issues = validateMealTotals({ calories: 100, protein_g: 0, carbs_g: 0, fat_g: 0 });
    expect(issues.some((i) => i.kind === "warning" && i.field === "totals")).toBe(true);
  });

  it("warns when Atwater mismatch exceeds the threshold", () => {
    // 10g protein + 10g carbs + 10g fat = 170 kcal implied, but 500 stated.
    const issues = validateMealTotals({
      calories: 500,
      protein_g: 10,
      carbs_g: 10,
      fat_g: 10,
    });
    expect(issues.some((i) => i.kind === "warning" && i.field === "totals")).toBe(true);
  });

  it("prefixes item issues with the item number", () => {
    const issues = validateMealItem(
      { name: "x", portion: "1", calories: -5, protein_g: 0, carbs_g: 0, fat_g: 0 },
      2,
    );
    expect(issues[0].message).toContain("Item 3");
    expect(issues[0].kind).toBe("error");
  });

  it("passes reasonable meals without issues", () => {
    const issues = validateMealTotals({
      calories: 450,
      protein_g: 30,
      carbs_g: 40,
      fat_g: 15,
    });
    expect(issues).toHaveLength(0);
  });
});

describe("buildScaleBreakdown", () => {
  const item = (name: string, calories: number) => ({
    name,
    portion: "1 cup",
    calories,
    protein_g: 10,
    carbs_g: 20,
    fat_g: 5,
  });

  it("explains per-serving values multiplied by servings", () => {
    const breakdown = buildScaleBreakdown({
      perServing: { calories: 240, protein_g: 12, carbs_g: 30, fat_g: 8 },
      servings: 2,
      shownTotals: { calories: 480, protein_g: 24, carbs_g: 60, fat_g: 16 },
      baseItems: [item("Yogurt", 120)],
      items: [item("Yogurt", 240)],
    });
    expect(breakdown.servings).toBe(2);
    const calories = breakdown.macros.find((row) => row.key === "calories")!;
    expect(calories.perServing).toBe(240);
    expect(calories.shown).toBe(480);
    expect(calories.rounded).toBe(false);
    expect(breakdown.anyRounded).toBe(false);
    expect(breakdown.items[0]).toMatchObject({
      name: "Yogurt",
      perServingCalories: 120,
      scaledCalories: 240,
    });
  });

  it("flags rows whose displayed value was rounded", () => {
    const breakdown = buildScaleBreakdown({
      perServing: { calories: 101, protein_g: 3.3, carbs_g: 0, fat_g: 0 },
      servings: 3,
      shownTotals: { calories: 300, protein_g: 9.9, carbs_g: 0, fat_g: 0 },
      baseItems: [],
      items: [],
    });
    expect(breakdown.anyRounded).toBe(true);
    expect(breakdown.macros.find((row) => row.key === "calories")!.rounded).toBe(true);
    expect(breakdown.macros.find((row) => row.key === "protein_g")!.rounded).toBe(false);
  });

  it("derives per-serving item calories when no base list is given", () => {
    const breakdown = buildScaleBreakdown({
      perServing: { calories: 100, protein_g: 0, carbs_g: 0, fat_g: 0 },
      servings: 2,
      shownTotals: { calories: 200, protein_g: 0, carbs_g: 0, fat_g: 0 },
      baseItems: [],
      items: [item("Rice", 200)],
    });
    expect(breakdown.items[0].perServingCalories).toBe(100);
  });
});
