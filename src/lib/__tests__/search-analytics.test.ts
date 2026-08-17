import { describe, it, expect } from "vitest";
import { normalizeTerm, makeSuggestShownGuard, TERM_MAX_LENGTH } from "@/lib/search-analytics";

describe("normalizeTerm", () => {
  it("lowercases and trims", () => {
    expect(normalizeTerm("  BPC-157 ")).toBe("bpc-157");
  });

  it("collapses inner whitespace", () => {
    expect(normalizeTerm("semaglutide   dose")).toBe("semaglutide dose");
  });

  it("caps length", () => {
    expect(normalizeTerm("a".repeat(200)).length).toBe(TERM_MAX_LENGTH);
  });

  it("returns empty for blank input", () => {
    expect(normalizeTerm("   ")).toBe("");
  });
});

describe("makeSuggestShownGuard", () => {
  it("reports a new term once", () => {
    const guard = makeSuggestShownGuard();
    expect(guard("bpc", 3)).toBe(true);
    expect(guard("bpc", 3)).toBe(false);
  });

  it("reports again when the result count changes", () => {
    const guard = makeSuggestShownGuard();
    expect(guard("bpc", 3)).toBe(true);
    expect(guard("bpc", 5)).toBe(true);
  });

  it("never reports empty terms", () => {
    const guard = makeSuggestShownGuard();
    expect(guard("", 0)).toBe(false);
  });
});
