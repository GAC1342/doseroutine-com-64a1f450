import { describe, expect, it } from "vitest";
import {
  contextMatchesSchemaOrg,
  equalsNormalized,
  findDuplicateGroups,
  formatDuplicateGroups,
  hasNormalizedContent,
  isTrimmed,
  normalizeFaqText,
  typeMatchesNormalized,
} from "./faq-normalize";

describe("normalizeFaqText", () => {
  it.each([
    ["  Hello   World  ", "hello world"],
    ["\n\tFoo\r\nBar\t", "foo bar"],
    ["ALREADY", "already"],
    ["", ""],
    ["   ", ""],
  ])("normalizes %j -> %j", (input, expected) => {
    expect(normalizeFaqText(input)).toBe(expected);
  });

  it("coerces null/undefined/numbers to normalized strings", () => {
    expect(normalizeFaqText(null)).toBe("");
    expect(normalizeFaqText(undefined)).toBe("");
    expect(normalizeFaqText(42)).toBe("42");
  });
});

describe("isTrimmed", () => {
  it.each([
    ["abc", true],
    [" abc", false],
    ["abc ", false],
    ["", true],
    [42 as any, false],
  ])("isTrimmed(%j) === %j", (input, expected) => {
    expect(isTrimmed(input)).toBe(expected);
  });
});

describe("hasNormalizedContent", () => {
  it.each([
    ["abc", true],
    ["  x  ", true],
    ["   ", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("hasNormalizedContent(%j) === %j", (input, expected) => {
    expect(hasNormalizedContent(input)).toBe(expected);
  });
});

describe("findDuplicateGroups", () => {
  it("groups by normalized key and returns only duplicate groups", () => {
    const items = [
      { name: "Foo" },
      { name: "foo " },
      { name: "  FOO\n" },
      { name: "Bar" },
      { name: "baz" },
      { name: "BAZ" },
    ];
    const groups = findDuplicateGroups(items, (e) => e.name);
    expect(groups).toHaveLength(2);
    const foo = groups.find((g) => g.key === "foo")!;
    expect(foo.indices).toEqual([0, 1, 2]);
    const baz = groups.find((g) => g.key === "baz")!;
    expect(baz.indices).toEqual([4, 5]);
  });

  it("returns empty when everything is unique", () => {
    expect(findDuplicateGroups(["a", "b", "c"], (s) => s)).toEqual([]);
  });

  it("groups all empty/whitespace/null values together (same normalized key)", () => {
    const items = ["", "   ", null, undefined, "\t\n"];
    const groups = findDuplicateGroups(items, (v) => v);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("");
    expect(groups[0].indices).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("formatDuplicateGroups", () => {
  it("renders duplicate groups with truncation", () => {
    const groups = findDuplicateGroups(["Hello", "hello"], (v) => v);
    const out = formatDuplicateGroups(groups, "name");
    expect(out).toEqual([`"hello" at mainEntity[0,1] (name)`]);
  });
});

describe("equalsNormalized", () => {
  it.each([
    ["FAQPage", "faqpage", true],
    ["  Question ", "question", true],
    ["Answer", "Answer\n", true],
    ["https://schema.org", "HTTPS://SCHEMA.ORG", true],
    ["Question", "Answer", false],
    ["FAQPage", "WebPage", false],
    [null, "", true],
    [undefined, "  ", true],
  ])("equalsNormalized(%j, %j) === %j", (a, b, expected) => {
    expect(equalsNormalized(a, b)).toBe(expected);
  });
});

describe("typeMatchesNormalized", () => {
  it("matches string @type with case + whitespace differences", () => {
    expect(typeMatchesNormalized(" FAQPage ", "faqpage")).toBe(true);
    expect(typeMatchesNormalized("WebPage", "FAQPage")).toBe(false);
  });
  it("matches when @type is an array (JSON-LD allows this)", () => {
    expect(typeMatchesNormalized(["Thing", "  question  "], "Question")).toBe(true);
    expect(typeMatchesNormalized(["Thing", "Article"], "Question")).toBe(false);
  });
  it("rejects non-string entries", () => {
    expect(typeMatchesNormalized([null, 42, {}], "Question")).toBe(false);
    expect(typeMatchesNormalized(undefined, "Question")).toBe(false);
  });
});

describe("contextMatchesSchemaOrg", () => {
  it.each([
    ["https://schema.org", true],
    ["http://schema.org", true],
    ["https://schema.org/", true],
    ["  HTTPS://Schema.Org  ", true],
    ["https://schema.org///", true],
    ["https://example.com", false],
    ["", false],
    [null, false],
    [42, false],
  ])("contextMatchesSchemaOrg(%j) === %j", (input, expected) => {
    expect(contextMatchesSchemaOrg(input)).toBe(expected);
  });
  it("accepts arrays where any entry references schema.org", () => {
    expect(contextMatchesSchemaOrg(["https://example.com", "https://schema.org"])).toBe(true);
    expect(contextMatchesSchemaOrg(["https://example.com", "https://other.org"])).toBe(false);
  });
});
