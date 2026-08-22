import { describe, expect, it } from "vitest";
import {
  autoFixItems,
  autoFixTotals,
  describeAutoFix,
  validateMealTotals,
} from "@/lib/meal-nutrition";

describe("autoFixTotals", () => {
  it("clamps negatives to zero", () => {
    const { value, changes } = autoFixTotals({
      calories: -50,
      protein_g: 10,
      carbs_g: 5,
      fat_g: 2,
    });
    expect(value.calories).toBe(0);
    expect(value.protein_g).toBe(10);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.reason).toBe("negative");
  });

  it("caps extreme values and leaves sane ones untouched", () => {
    const { value, changes } = autoFixTotals({
      calories: 99999,
      protein_g: 30,
      carbs_g: 40,
      fat_g: 10,
    });
    expect(value.calories).toBe(10_000);
    expect(changes[0]?.reason).toBe("too_high");
    expect(validateMealTotals(value).filter((i) => i.kind === "error")).toHaveLength(0);
  });

  it("reports no changes for valid totals", () => {
    const { changes } = autoFixTotals({ calories: 500, protein_g: 30, carbs_g: 40, fat_g: 20 });
    expect(changes).toHaveLength(0);
    expect(describeAutoFix(changes)).toMatch(/already looks valid/);
  });

  it("fixes items and keeps names", () => {
    const { value, changes } = autoFixItems([
      { name: "Rice", portion: "1 cup", calories: -1, protein_g: 4, carbs_g: 45, fat_g: 0 },
    ]);
    expect(value[0]?.name).toBe("Rice");
    expect(value[0]?.calories).toBe(0);
    expect(changes[0]?.itemIndex).toBe(0);
  });
});
