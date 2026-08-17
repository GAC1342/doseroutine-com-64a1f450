import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { countFaqPageBlocks, assertSingleFaqPage } from "./faq-emission-check";

const faq = (n = 1) => ({
  type: "application/ld+json",
  children: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: Array.from({ length: n }, (_, i) => ({
      "@type": "Question",
      name: `Q${i}`,
      acceptedAnswer: { "@type": "Answer", text: `A${i}` },
    })),
  }),
});
const article = { type: "application/ld+json", children: JSON.stringify({ "@type": "Article" }) };

describe("faq-emission-check", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it("counts single FAQPage block", () => {
    expect(countFaqPageBlocks([article, faq()])).toBe(1);
  });
  it("counts duplicates", () => {
    expect(countFaqPageBlocks([faq(), faq()])).toBe(2);
  });
  it("returns 0 when missing", () => {
    expect(countFaqPageBlocks([article])).toBe(0);
  });
  it("ignores unparseable JSON", () => {
    expect(countFaqPageBlocks([{ type: "application/ld+json", children: "not json" }])).toBe(0);
  });
  it("handles case-insensitive @type via normalized comparison", () => {
    const weird = { type: "application/ld+json", children: JSON.stringify({ "@type": "faqpage" }) };
    expect(countFaqPageBlocks([weird])).toBe(1);
  });
  it("does not warn on exactly 1", () => {
    assertSingleFaqPage([faq()], { route: "/x" });
    expect(warn).not.toHaveBeenCalled();
  });
  it("warns MISSING when 0", () => {
    assertSingleFaqPage([article], { route: "/x", slug: "s" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("MISSING"));
  });
  it("warns DUPLICATE when 2+", () => {
    assertSingleFaqPage([faq(), faq()], { route: "/x", slug: "s" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("DUPLICATE"));
  });
});
