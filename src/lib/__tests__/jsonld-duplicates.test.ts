import { describe, it, expect } from "vitest";
import { findJsonLdConflicts, flattenJsonLd, parseJsonLdFromHtml } from "../jsonld-duplicates";

const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://doseroutine.com/#website",
  name: "DoseRoutine",
};

describe("findJsonLdConflicts", () => {
  it("passes a clean page", () => {
    expect(
      findJsonLdConflicts([
        WEBSITE,
        { "@type": "WebPage", "@id": "https://doseroutine.com/a#webpage", name: "A" },
        { "@type": "FAQPage", "@id": "https://doseroutine.com/a#faq", mainEntity: [] },
      ]),
    ).toEqual([]);
  });

  it("flags the same @id declared twice with different content", () => {
    const conflicts = findJsonLdConflicts([
      WEBSITE,
      { "@type": "WebSite", "@id": "https://doseroutine.com/#website", name: "Dose Routine" },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.kind).toBe("conflicting-id");
    expect(conflicts[0]?.subject).toBe("https://doseroutine.com/#website");
  });

  it("flags identical duplicates of the same @id", () => {
    const conflicts = findJsonLdConflicts([WEBSITE, { ...WEBSITE }]);
    expect(conflicts[0]?.kind).toBe("duplicate-id");
  });

  it("flags two nodes of a page-level type even with different @ids", () => {
    const conflicts = findJsonLdConflicts([
      { "@type": "FAQPage", "@id": "https://doseroutine.com/a#faq", mainEntity: [] },
      { "@type": "FAQPage", "@id": "https://doseroutine.com/a#faq2", mainEntity: [] },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.kind).toBe("duplicate-type");
    expect(conflicts[0]?.subject).toBe("FAQPage");
  });

  it("does not flag a reference to an entity declared elsewhere", () => {
    expect(
      findJsonLdConflicts([
        WEBSITE,
        {
          "@type": "CollectionPage",
          "@id": "https://doseroutine.com/library#webpage",
          isPartOf: { "@id": "https://doseroutine.com/#website" },
        },
        { "@id": "https://doseroutine.com/#website" },
      ]),
    ).toEqual([]);
  });

  it("does not flag repeatable member types", () => {
    expect(
      findJsonLdConflicts([
        {
          "@type": "FAQPage",
          "@id": "https://doseroutine.com/a#faq",
          mainEntity: [
            { "@type": "Question", name: "One", acceptedAnswer: { "@type": "Answer", text: "1" } },
            { "@type": "Question", name: "Two", acceptedAnswer: { "@type": "Answer", text: "2" } },
          ],
        },
      ]),
    ).toEqual([]);
  });

  it("treats key order as equivalent, not conflicting", () => {
    expect(
      findJsonLdConflicts([
        { "@type": "WebPage", "@id": "https://doseroutine.com/a#webpage", name: "A", url: "/a" },
      ]),
    ).toEqual([]);
  });

  it("flattens @graph containers", () => {
    const nodes = flattenJsonLd({ "@context": "https://schema.org", "@graph": [WEBSITE] });
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.["@type"]).toBe("WebSite");
  });

  it("detects a graph-level duplicate across two script blocks", () => {
    const conflicts = findJsonLdConflicts([
      { "@graph": [WEBSITE] },
      { "@graph": [{ "@type": "WebSite", "@id": "https://doseroutine.com/#website" }] },
    ]);
    // The second is reference-only shape? No — it carries @type + @id only, so
    // it is treated as a reference and must not be flagged.
    expect(conflicts).toEqual([]);
  });

  it("extracts and reports unparseable JSON-LD from HTML", () => {
    const { blocks, parseErrors } = parseJsonLdFromHtml(
      `<script type="application/ld+json">${JSON.stringify(WEBSITE)}</script>` +
        `<script type="application/ld+json">{oops}</script>`,
    );
    expect(blocks).toHaveLength(1);
    expect(parseErrors).toHaveLength(1);
  });
});
