import { describe, it, expect } from "vitest";
import {
  buildSuggestions,
  moveActiveIndex,
  isSearchShortcut,
  isTypingTarget,
  SUGGEST_LIMIT,
} from "@/lib/library-suggest";

const C = [
  { slug: "bpc-157", name: "BPC-157", category: "peptide", aliases: ["Body Protection Compound"] },
  { slug: "tb-500", name: "TB-500", category: "peptide", aliases: ["Thymosin Beta-4", "TB4"] },
  {
    slug: "semaglutide",
    name: "Semaglutide",
    category: "medication",
    aliases: ["Ozempic", "Wegovy"],
  },
  {
    slug: "tirzepatide",
    name: "Tirzepatide",
    category: "medication",
    aliases: ["Mounjaro", "Zepbound"],
  },
  { slug: "magnesium-glycinate", name: "Magnesium Glycinate", category: "mineral", aliases: null },
  { slug: "melatonin", name: "Melatonin", category: "supplement", aliases: [] },
];

describe("buildSuggestions", () => {
  it("returns nothing for queries under two characters", () => {
    expect(buildSuggestions(C, "")).toEqual([]);
    expect(buildSuggestions(C, "b")).toEqual([]);
    expect(buildSuggestions(C, " m ")).toEqual([]);
  });

  it("ranks an exact name match first", () => {
    const r = buildSuggestions(C, "melatonin");
    expect(r[0]?.compound.slug).toBe("melatonin");
  });

  it("prefers name prefix over alias prefix", () => {
    const r = buildSuggestions(C, "tb");
    expect(r[0]?.compound.slug).toBe("tb-500");
    expect(r[0]?.matchedAlias).toBeNull();
  });

  it("matches aliases and reports which alias matched", () => {
    const r = buildSuggestions(C, "ozem");
    expect(r[0]?.compound.slug).toBe("semaglutide");
    expect(r[0]?.matchedAlias).toBe("Ozempic");
  });

  it("falls back to substring matches", () => {
    const r = buildSuggestions(C, "glutide");
    expect(r.map((x) => x.compound.slug)).toEqual(["semaglutide"]);
    expect(buildSuggestions(C, "epatide").map((x) => x.compound.slug)).toEqual(["tirzepatide"]);
  });

  it("is case and whitespace insensitive", () => {
    expect(buildSuggestions(C, "  BPC ")[0]?.compound.slug).toBe("bpc-157");
  });

  it("caps the list at the suggestion limit", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      slug: `zz-${i}`,
      name: `Zinc Variant ${i}`,
      category: "mineral",
      aliases: null,
    }));
    expect(buildSuggestions(many, "zinc").length).toBe(SUGGEST_LIMIT);
    expect(buildSuggestions(many, "zinc", 3).length).toBe(3);
  });

  it("returns an empty list when nothing matches", () => {
    expect(buildSuggestions(C, "qqqqq")).toEqual([]);
  });
});

describe("moveActiveIndex", () => {
  it("stays at -1 with no options", () => {
    expect(moveActiveIndex(-1, 1, 0)).toBe(-1);
  });
  it("enters the list from either end", () => {
    expect(moveActiveIndex(-1, 1, 3)).toBe(0);
    expect(moveActiveIndex(-1, -1, 3)).toBe(2);
  });
  it("wraps around both ways", () => {
    expect(moveActiveIndex(2, 1, 3)).toBe(0);
    expect(moveActiveIndex(0, -1, 3)).toBe(2);
  });
});

describe("isSearchShortcut", () => {
  const base = { metaKey: false, ctrlKey: false, altKey: false };
  it("accepts slash", () => {
    expect(isSearchShortcut({ ...base, key: "/" })).toBe(true);
  });
  it("accepts cmd/ctrl + k", () => {
    expect(isSearchShortcut({ ...base, key: "k", metaKey: true })).toBe(true);
    expect(isSearchShortcut({ ...base, key: "K", ctrlKey: true })).toBe(true);
  });
  it("ignores plain letters and handled events", () => {
    expect(isSearchShortcut({ ...base, key: "k" })).toBe(false);
    expect(isSearchShortcut({ ...base, key: "/", defaultPrevented: true })).toBe(false);
    expect(isSearchShortcut({ ...base, key: "k", metaKey: true, altKey: true })).toBe(false);
  });
});

describe("isTypingTarget", () => {
  it("detects form fields", () => {
    expect(isTypingTarget(document.createElement("input"))).toBe(true);
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
    expect(isTypingTarget(document.createElement("select"))).toBe(true);
  });
  it("ignores everything else", () => {
    expect(isTypingTarget(document.createElement("div"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
