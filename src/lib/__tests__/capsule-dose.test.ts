import { describe, expect, it } from "vitest";
import {
  computeCapsuleDose,
  formatCapsuleSummary,
  roundDose,
  validateCapsuleInput,
  validateParsedLabelDose,
} from "@/lib/capsule-dose";

describe("computeCapsuleDose", () => {
  it("multiplies capsule strength by count", () => {
    expect(computeCapsuleDose({ strengthPerCapsule: 900, count: 2 })).toBe(1800);
  });

  it("accepts string inputs from form fields", () => {
    expect(computeCapsuleDose({ strengthPerCapsule: "900", count: "1" })).toBe(900);
  });

  it("supports fractional counts", () => {
    expect(computeCapsuleDose({ strengthPerCapsule: 900, count: 1.5 })).toBe(1350);
  });

  it("avoids floating point dust", () => {
    expect(computeCapsuleDose({ strengthPerCapsule: 0.1, count: 3 })).toBe(0.3);
  });

  it("returns null for blank, invalid, or non-positive strength", () => {
    expect(computeCapsuleDose({ strengthPerCapsule: "", count: 2 })).toBeNull();
    expect(computeCapsuleDose({ strengthPerCapsule: "abc", count: 2 })).toBeNull();
    expect(computeCapsuleDose({ strengthPerCapsule: 0, count: 2 })).toBeNull();
    expect(computeCapsuleDose({ strengthPerCapsule: -900, count: 2 })).toBeNull();
  });

  it("returns null for missing or negative count", () => {
    expect(computeCapsuleDose({ strengthPerCapsule: 900, count: "" })).toBeNull();
    expect(computeCapsuleDose({ strengthPerCapsule: 900, count: -1 })).toBeNull();
  });
});

describe("roundDose", () => {
  it("keeps six decimals of real precision", () => {
    expect(roundDose(0.1234564)).toBe(0.123456);
  });
});

describe("formatCapsuleSummary", () => {
  it("describes the calculation", () => {
    expect(formatCapsuleSummary({ strengthPerCapsule: 900, count: 2 }, "mg")).toBe(
      "2 soft gels × 900 mg = 1800 mg",
    );
  });

  it("uses singular noun for one capsule", () => {
    expect(formatCapsuleSummary({ strengthPerCapsule: 900, count: 1 }, "mg")).toBe(
      "1 soft gel × 900 mg = 900 mg",
    );
  });

  it("honours a custom noun", () => {
    expect(formatCapsuleSummary({ strengthPerCapsule: 500, count: 2 }, "mg", "capsule")).toBe(
      "2 capsules × 500 mg = 1000 mg",
    );
  });

  it("returns null when inputs are incomplete", () => {
    expect(formatCapsuleSummary({ strengthPerCapsule: "", count: 2 }, "mg")).toBeNull();
  });
});

describe("validateCapsuleInput", () => {
  it("accepts a normal entry", () => {
    const r = validateCapsuleInput({ strengthPerCapsule: "900", count: "2" }, "mg");
    expect(r.ok).toBe(true);
    expect(r.total).toBe(1800);
    expect(r.error).toBeUndefined();
  });

  it("stays neutral while a field is blank", () => {
    expect(validateCapsuleInput({ strengthPerCapsule: "", count: "2" }, "mg").empty).toBe(true);
    expect(validateCapsuleInput({ strengthPerCapsule: "900", count: "" }, "mg").empty).toBe(true);
  });

  it("rejects zero and negative counts", () => {
    const zero = validateCapsuleInput({ strengthPerCapsule: "900", count: "0" }, "mg");
    expect(zero.ok).toBe(false);
    expect(zero.field).toBe("count");
    expect(validateCapsuleInput({ strengthPerCapsule: "900", count: "-2" }, "mg").ok).toBe(false);
  });

  it("rejects zero and negative strengths", () => {
    expect(validateCapsuleInput({ strengthPerCapsule: "0", count: "2" }, "mg").field).toBe(
      "strength",
    );
    expect(validateCapsuleInput({ strengthPerCapsule: "-900", count: "2" }, "mg").ok).toBe(false);
  });

  it("rejects non-numeric entries", () => {
    expect(validateCapsuleInput({ strengthPerCapsule: "abc", count: "2" }, "mg").ok).toBe(false);
    expect(validateCapsuleInput({ strengthPerCapsule: "900", count: "abc" }, "mg").ok).toBe(false);
  });

  it("rejects counts over the daily maximum", () => {
    const r = validateCapsuleInput({ strengthPerCapsule: "900", count: "90" }, "mg");
    expect(r.ok).toBe(false);
    expect(r.field).toBe("count");
  });

  it("rejects capsule strengths over the maximum", () => {
    expect(validateCapsuleInput({ strengthPerCapsule: "500000", count: "1" }, "mg").ok).toBe(false);
  });

  it("rejects totals over the cap", () => {
    const r = validateCapsuleInput({ strengthPerCapsule: "100000", count: "50" }, "mg");
    expect(r.ok).toBe(false);
  });

  it("rejects counts with too many decimals", () => {
    expect(validateCapsuleInput({ strengthPerCapsule: "900", count: "1.333" }, "mg").ok).toBe(
      false,
    );
    expect(validateCapsuleInput({ strengthPerCapsule: "900", count: "0.5" }, "mg").ok).toBe(true);
  });

  it("warns without blocking for unusually high counts", () => {
    const r = validateCapsuleInput({ strengthPerCapsule: "100", count: "20" }, "mg");
    expect(r.ok).toBe(true);
    expect(r.warning).toBeTruthy();
  });
});

describe("validateParsedLabelDose", () => {
  it("accepts a normal label parse", () => {
    const r = validateParsedLabelDose(900, 2, "mg", "soft gel");
    expect(r.ok).toBe(true);
    expect(r.total).toBe(1800);
    expect(r.clamped).toBe(false);
    expect(r.error).toBeUndefined();
  });

  it("clamps a noisy count to two decimals", () => {
    const r = validateParsedLabelDose(500, 2.004, "mg");
    expect(r.count).toBe(2);
    expect(r.clamped).toBe(true);
    expect(r.ok).toBe(true);
  });

  it("blocks a zero or missing strength", () => {
    expect(validateParsedLabelDose(0, 2, "mg").ok).toBe(false);
    expect(validateParsedLabelDose(Number.NaN, 2, "mg").ok).toBe(false);
  });

  it("blocks a count that rounds to zero", () => {
    const r = validateParsedLabelDose(900, 0.001, "mg");
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("blocks an absurd capsule count", () => {
    expect(validateParsedLabelDose(900, 500, "mg").ok).toBe(false);
  });

  it("blocks an absurd per-capsule strength", () => {
    expect(validateParsedLabelDose(5_000_000, 1, "mg").ok).toBe(false);
  });

  it("warns without blocking on an unusual but legal count", () => {
    const r = validateParsedLabelDose(100, 20, "mg");
    expect(r.ok).toBe(true);
    expect(r.warning).toBeTruthy();
  });
});
