import { describe, expect, it } from "vitest";
import { convertDose, fitLabelToUnit, parseSupplementLabel } from "@/lib/label-parse";

describe("convertDose", () => {
  it("converts between mass units", () => {
    expect(convertDose(1, "g", "mg")).toBe(1000);
    expect(convertDose(500, "mcg", "mg")).toBe(0.5);
    expect(convertDose(900, "mg", "mg")).toBe(900);
  });

  it("refuses to cross unit families", () => {
    expect(convertDose(400, "iu", "mg")).toBeNull();
    expect(convertDose(5, "ml", "mg")).toBeNull();
  });
});

describe("parseSupplementLabel", () => {
  it("reads a per-softgel amount with a comma", () => {
    const r = parseSupplementLabel("Omega-3 1,000 mg per softgel")!;
    expect(r.strengthPerUnit).toBe(1000);
    expect(r.unit).toBe("mg");
    expect(r.noun).toBe("soft gel");
    expect(r.confidence).toBe("high");
  });

  it("reads 'Each capsule contains'", () => {
    const r = parseSupplementLabel("Each capsule contains 500 mg of magnesium")!;
    expect(r.strengthPerUnit).toBe(500);
    expect(r.noun).toBe("capsule");
  });

  it("combines serving size with per-capsule amount", () => {
    const r = parseSupplementLabel("Serving size: 2 softgels\nOmega-3 1000mg per softgel")!;
    expect(r.countPerServing).toBe(2);
    expect(r.totalPerServing).toBe(2000);
  });

  it("divides a per-serving total by the serving size", () => {
    const r = parseSupplementLabel("Serving size 2 capsules. 1 g per serving")!;
    expect(r.strengthPerUnit).toBe(0.5);
    expect(r.unit).toBe("g");
    expect(r.countPerServing).toBe(2);
    expect(r.totalPerServing).toBe(1);
    expect(r.confidence).toBe("medium");
  });

  it("handles decimals and micrograms", () => {
    const r = parseSupplementLabel("Vitamin D3 62.5 mcg per capsule")!;
    expect(r.strengthPerUnit).toBe(62.5);
    expect(r.unit).toBe("mcg");
  });

  it("reads 'take 3 tablets' as the serving count", () => {
    const r = parseSupplementLabel("Take 3 tablets daily. 250 mg per tablet")!;
    expect(r.countPerServing).toBe(3);
    expect(r.noun).toBe("tablet");
    expect(r.totalPerServing).toBe(750);
  });

  it("returns null when nothing is recognisable", () => {
    expect(parseSupplementLabel("just some marketing words")).toBeNull();
    expect(parseSupplementLabel("")).toBeNull();
  });
});

describe("fitLabelToUnit", () => {
  it("converts grams into the form's mg unit", () => {
    const parsed = parseSupplementLabel("Serving size 2 capsules. 1 g per serving")!;
    const fitted = fitLabelToUnit(parsed, "mg");
    expect(fitted.unit).toBe("mg");
    expect(fitted.strength).toBe(500);
    expect(fitted.total).toBe(1000);
  });

  it("keeps the label unit when conversion is impossible", () => {
    const parsed = parseSupplementLabel("400 IU per softgel")!;
    const fitted = fitLabelToUnit(parsed, "mg");
    expect(fitted.unit).toBe("iu");
    expect(fitted.strength).toBe(400);
  });
});
