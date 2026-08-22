import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hasVisibleCredit, hasPublisherJsonLd, normalizeHtml } from "./attribution-crawl.server";

const ld = (obj: unknown) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

describe("attribution crawler detection", () => {
  describe("visible credit line", () => {
    it("matches the AttributionFooter copy", () => {
      expect(
        hasVisibleCredit("<p><strong>Original editorial compilation by DoseRoutine.</strong></p>"),
      ).toBe(true);
    });

    it("matches the help-article credit line", () => {
      expect(hasVisibleCredit("<p>Published by DoseRoutine · © 2026</p>")).toBe(true);
    });

    it("matches the homepage / hub credit line", () => {
      expect(hasVisibleCredit("© 2026 <strong>DoseRoutine</strong> — original content")).toBe(true);
    });

    it("matches a plain copyright line", () => {
      expect(hasVisibleCredit("<span>© 2026 DoseRoutine</span>")).toBe(true);
    });

    it("sees through React SSR comment separators", () => {
      const ssr = "© <!-- -->2026<!-- --> <strong>DoseRoutine</strong>";
      expect(hasVisibleCredit(normalizeHtml(ssr))).toBe(true);
    });

    it("rejects a page with no credit at all", () => {
      expect(hasVisibleCredit("<p>Some article body with no credit.</p>")).toBe(false);
    });

    it("does not accept an unrelated brand mention as credit", () => {
      expect(hasVisibleCredit("<p>Compare us to Medisafe and MyTherapy.</p>")).toBe(false);
    });
  });

  describe("publisher JSON-LD", () => {
    it("accepts an Article with a DoseRoutine publisher object", () => {
      const html = ld({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Semaglutide",
        publisher: { "@type": "Organization", name: "DoseRoutine" },
      });
      expect(hasPublisherJsonLd(html)).toBe(true);
    });

    it("accepts a standalone Organization node", () => {
      const html = ld({
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": "https://doseroutine.com/#organization",
        name: "DoseRoutine",
        url: "https://doseroutine.com",
      });
      expect(hasPublisherJsonLd(html)).toBe(true);
    });

    it("accepts a publisher nested inside an @graph", () => {
      const html = ld({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", name: "Page" },
          {
            "@type": "MedicalWebPage",
            author: { "@type": "Organization", name: "DoseRoutine" },
          },
        ],
      });
      expect(hasPublisherJsonLd(html)).toBe(true);
    });

    it("accepts an array of top-level blocks", () => {
      const html =
        ld({ "@type": "BreadcrumbList", itemListElement: [] }) +
        ld([{ "@type": "Article", publisher: { name: "DoseRoutine" } }]);
      expect(hasPublisherJsonLd(html)).toBe(true);
    });

    it("rejects JSON-LD that credits nobody", () => {
      const html = ld({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{ "@type": "ListItem", position: 1, name: "Library" }],
      });
      expect(hasPublisherJsonLd(html)).toBe(false);
    });

    it("rejects JSON-LD crediting a different publisher", () => {
      const html = ld({
        "@type": "Article",
        publisher: { "@type": "Organization", name: "Some Other Site" },
      });
      expect(hasPublisherJsonLd(html)).toBe(false);
    });

    it("ignores unparseable blocks without throwing", () => {
      const html = '<script type="application/ld+json">{ broken json</script>';
      expect(hasPublisherJsonLd(html)).toBe(false);
    });

    it("returns false when there is no JSON-LD at all", () => {
      expect(hasPublisherJsonLd("<html><body>hi</body></html>")).toBe(false);
    });
  });
});

describe("library MedicalWebPage review date", () => {
  it("always emits lastReviewed, falling back to the last-modified date", () => {
    const src = readFileSync(resolve(process.cwd(), "src/routes/library.$slug.tsx"), "utf8");
    // Must be unconditional: a spread like `...(lastReviewed ? {...} : {})`
    // silently drops the field for records with no explicit review date.
    expect(src).toMatch(/lastReviewed: lastReviewed \?\?/);
    expect(src).not.toMatch(/\.\.\.\(lastReviewed \? \{ lastReviewed \} : \{\}\)/);
  });
});
