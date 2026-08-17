import { describe, expect, it } from "vitest";
import { reasonTags } from "@/lib/reason-tags";

describe("reasonTags", () => {
  it("detects absorption competition", () => {
    expect(reasonTags("Zinc and iron compete for absorption in the gut")).toContain("Absorption");
  });

  it("detects CYP metabolism", () => {
    expect(reasonTags("Inhibits CYP3A4 metabolism")).toContain("CYP metabolism");
  });

  it("detects bleeding risk", () => {
    expect(reasonTags("Additive antiplatelet effect increases bleeding risk")).toContain(
      "Bleeding risk",
    );
  });

  it("falls back to recommendation text", () => {
    expect(reasonTags("", "Monitor blood pressure when stacking")).toContain("Blood pressure");
  });

  it("returns at most two tags", () => {
    const tags = reasonTags(
      "Affects absorption, CYP3A4 metabolism, renal clearance, and blood sugar",
    );
    expect(tags).toHaveLength(2);
    expect(tags[0]).toBe("Absorption");
  });

  it("returns nothing for unrecognised text", () => {
    expect(reasonTags("General caution advised")).toEqual([]);
  });

  it("adds Same axis only when explicitly requested", () => {
    expect(reasonTags("", "", { sameAxis: true })).toEqual([]);
    expect(reasonTags("", "", { sameAxis: true, includeSameAxis: true })).toEqual(["Same axis"]);
  });
});
