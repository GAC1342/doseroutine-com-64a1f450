import { describe, expect, it } from "vitest";
import {
  detectUnitMistake,
  errorFor,
  fromMg,
  parseNumeric,
  toMg,
  validateRecon,
  type ReconInput,
} from "@/lib/recon-validation";

const base: ReconInput = {
  vialMg: 5,
  bacMl: 2,
  doseValue: 250,
  doseUnit: "mcg",
  syringe: "U-100",
};

const ok = (over: Partial<ReconInput> = {}) => validateRecon({ ...base, ...over });

describe("parseNumeric", () => {
  it("accepts plain decimals as string or number", () => {
    expect(parseNumeric("2.5")).toBe(2.5);
    expect(parseNumeric(" 10 ")).toBe(10);
    expect(parseNumeric(7)).toBe(7);
  });

  it("rejects blanks, junk and non-finite values", () => {
    for (const v of [
      "",
      "   ",
      "abc",
      "5mg",
      "1,5",
      "1e5",
      "--2",
      NaN,
      Infinity,
      null,
      undefined,
    ]) {
      expect(parseNumeric(v as string)).toBeNull();
    }
  });
});

describe("unit conversion", () => {
  it("round-trips mcg and mg", () => {
    expect(toMg(250, "mcg")).toBe(0.25);
    expect(toMg(2.5, "mg")).toBe(2.5);
    expect(fromMg(0.25, "mcg")).toBe(250);
    expect(fromMg(2.5, "mg")).toBe(2.5);
  });

  it("flags likely mg/mcg mix-ups", () => {
    expect(detectUnitMistake(500_000, "mcg")).toMatch(/milligrams/);
    expect(detectUnitMistake(0.0002, "mg")).toMatch(/mcg/);
    expect(detectUnitMistake(250, "mcg")).toBeNull();
    expect(detectUnitMistake(2.5, "mg")).toBeNull();
  });
});

describe("validateRecon — happy path", () => {
  it("computes the documented 5 mg / 2 mL / 250 mcg example", () => {
    const v = ok();
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.result.mgPerMl).toBeCloseTo(2.5, 6);
    expect(v.result.mlPerDose).toBeCloseTo(0.1, 6);
    expect(v.result.units).toBeCloseTo(10, 6);
    expect(v.result.dosesPerVial).toBeCloseTo(20, 6);
    expect(v.warnings).toEqual([]);
  });

  it("scales units with the syringe type", () => {
    const u40 = ok({ syringe: "U-40" });
    expect(u40.ok).toBe(true);
    if (!u40.ok) return;
    expect(u40.result.units).toBeCloseTo(4, 6);
  });

  it("treats 2.5 mg and 2500 mcg as the same dose", () => {
    const a = ok({ doseValue: 2.5, doseUnit: "mg" });
    const b = ok({ doseValue: 2500, doseUnit: "mcg" });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.result.units).toBeCloseTo(b.result.units, 9);
  });
});

describe("validateRecon — per-field errors", () => {
  it("rejects blank fields with a field-scoped message", () => {
    const v = validateRecon({ ...base, vialMg: "", bacMl: "", doseValue: "" });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.errors).toHaveLength(3);
    expect(errorFor(v.errors, "vialMg")).toMatch(/number/i);
    expect(errorFor(v.errors, "bacMl")).toMatch(/bacteriostatic/i);
    expect(errorFor(v.errors, "doseValue")).toMatch(/target dose/i);
    expect(v.result).toBeNull();
  });

  it("rejects non-numeric text", () => {
    const v = ok({ vialMg: "five" });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(errorFor(v.errors, "vialMg")).toBeDefined();
  });

  it("rejects zero and negative values", () => {
    for (const field of ["vialMg", "bacMl", "doseValue"] as const) {
      for (const value of [0, -1]) {
        const v = ok({ [field]: value } as Partial<ReconInput>);
        expect(v.ok).toBe(false);
        if (v.ok) continue;
        expect(errorFor(v.errors, field)).toMatch(/greater than zero/i);
      }
    }
  });

  it("rejects out-of-range vial strength and diluent volume", () => {
    expect(ok({ vialMg: 500 }).ok).toBe(false);
    expect(ok({ vialMg: 0.01 }).ok).toBe(false);
    expect(ok({ bacMl: 90 }).ok).toBe(false);
    expect(ok({ bacMl: 0.01 }).ok).toBe(false);
  });

  it("refuses a mg/mcg mix-up instead of computing it", () => {
    const v = ok({ doseValue: 900_000, doseUnit: "mcg" });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(errorFor(v.errors, "doseValue")).toMatch(/milligrams/i);
  });
});

describe("validateRecon — cross-field checks", () => {
  it("blocks a dose larger than the vial holds", () => {
    const v = ok({ doseValue: 10, doseUnit: "mg" });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(errorFor(v.errors, "doseValue")).toMatch(/more than the 5 mg/i);
  });

  it("blocks a concentration that cannot dissolve", () => {
    const v = ok({ vialMg: 80, bacMl: 0.2 });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(errorFor(v.errors, "bacMl")).toMatch(/will not go into solution/i);
  });
});

describe("validateRecon — advisory warnings", () => {
  it("warns when the draw exceeds one barrel", () => {
    const v = ok({ vialMg: 2, bacMl: 3, doseValue: 1.5, doseUnit: "mg" });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.result.overfull).toBe(true);
    expect(v.warnings.join(" ")).toMatch(/larger than one full/i);
  });

  it("warns when the draw is under five units", () => {
    const v = ok({ vialMg: 10, bacMl: 1, doseValue: 100 });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.result.tiny).toBe(true);
    expect(v.warnings.join(" ")).toMatch(/hard to read/i);
  });

  it("warns on a large but valid subcutaneous volume", () => {
    const v = ok({ vialMg: 5, bacMl: 3, doseValue: 1.2, doseUnit: "mg" });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.warnings.join(" ")).toMatch(/large subcutaneous volume/i);
  });

  it("warns when a vial holds barely one dose", () => {
    const v = ok({ vialMg: 5, bacMl: 2, doseValue: 4, doseUnit: "mg" });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.warnings.join(" ")).toMatch(/barely more than one dose/i);
  });
});
