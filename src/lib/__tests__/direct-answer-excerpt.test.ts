import { describe, expect, it } from "vitest";
import { excerptWithAttribution, toPlainExcerpt } from "@/lib/direct-answer";

describe("toPlainExcerpt", () => {
  it("strips markdown, links and citation markers", () => {
    expect(toPlainExcerpt("**Zinc** is a [mineral](/library/zinc) [1,2]")).toBe(
      "Zinc is a mineral.",
    );
  });
  it("normalizes smart punctuation and whitespace", () => {
    expect(toPlainExcerpt("It\u2019s   used \u2014 daily\u2026")).toBe("It's used - daily...");
  });
  it("returns empty string for empty input", () => {
    expect(toPlainExcerpt("")).toBe("");
  });
  it("builds an attributed quote", () => {
    expect(excerptWithAttribution("Zinc is a mineral.", "Zinc", "https://x/y")).toBe(
      '"Zinc is a mineral." — DoseRoutine, Zinc. https://x/y',
    );
  });
});
