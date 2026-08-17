import { describe, it, expect } from "vitest";
import { PAGE2_RESCUE, RESCUE_SLUGS } from "@/lib/page2-rescue";
import { buildFaqPairs, buildFaqPageJsonLd } from "@/lib/faq-schema";

const compound = {
  name: "Test",
  slug: "test",
  category: "supplement",
};

describe("page-2 rescue entries", () => {
  it("covers the ranked slugs", () => {
    expect(RESCUE_SLUGS.length).toBeGreaterThanOrEqual(20);
  });

  for (const [slug, entry] of Object.entries(PAGE2_RESCUE)) {
    it(`${slug} is snippet-safe`, () => {
      expect(entry.metaTitle.length).toBeLessThanOrEqual(58);
      expect(entry.metaDescription.length).toBeLessThanOrEqual(155);
      expect(entry.answer.split(/\s+/).length).toBeGreaterThanOrEqual(40);
      expect(entry.quickFacts.length).toBeGreaterThanOrEqual(4);
      expect(entry.extraFaq.length).toBeGreaterThanOrEqual(3);
      for (const f of entry.extraFaq) {
        expect(f.q.trim().endsWith("?")).toBe(true);
        expect(f.a.trim().length).toBeGreaterThan(80);
      }
    });
  }
});

describe("faq merge", () => {
  it("appends extra pairs without duplicating", () => {
    const extra = [{ q: "Is this a test?", a: "Yes, it is a test question used by the suite." }];
    const base = buildFaqPairs(compound, null);
    const merged = buildFaqPairs(compound, null, [...extra, ...extra]);
    expect(merged.length).toBe(base.length + 1);
    const json = buildFaqPageJsonLd(compound, null, "https://doseroutine.com/library/test", extra);
    expect((json?.mainEntity as unknown[]).length).toBe(merged.length);
  });
});
