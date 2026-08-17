import { describe, it, expect } from "vitest";
import { findEntityIssues, formatEntityIssues } from "../entity-jsonld-lint";

const ORG_ID = "https://doseroutine.com/#organization";

const OPTS = {
  primaryOrgId: ORG_ID,
  siteOrigin: "https://doseroutine.com",
  brandNames: ["DoseRoutine", "DoseRoutine Editorial"],
};

const goodOrg = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: "DoseRoutine",
  url: "https://doseroutine.com",
  logo: {
    "@type": "ImageObject",
    url: "https://doseroutine.com/icon-512.png",
  },
  sameAs: ["https://t.me/GACSapp1"],
};

const lint = (blocks: unknown[]) => findEntityIssues(blocks, OPTS);

describe("Organization / Person JSON-LD lint", () => {
  it("passes a complete Organization", () => {
    expect(lint([goodOrg])).toEqual([]);
  });

  it("flags a missing name", () => {
    expect(lint([{ ...goodOrg, name: "  " }]).map((i) => i.field)).toContain("name");
  });

  it("flags a missing logo and image on our own entity", () => {
    const { logo: _logo, ...noLogo } = goodOrg;
    expect(formatEntityIssues(lint([noLogo]))).toMatch(/neither logo nor image/);
  });

  it("accepts image as a fallback for logo", () => {
    const { logo: _logo, ...rest } = goodOrg;
    expect(lint([{ ...rest, image: "https://doseroutine.com/og/home.jpg" }])).toEqual([]);
  });

  it("does not demand a logo from an external citation publisher", () => {
    const citation = {
      "@type": "ScholarlyArticle",
      name: "A study",
      publisher: { "@type": "Organization", name: "New England Journal of Medicine" },
    };
    expect(lint([citation])).toEqual([]);
  });

  it("flags a relative logo URL", () => {
    expect(formatEntityIssues(lint([{ ...goodOrg, logo: "/icon-512.png" }]))).toMatch(
      /not an absolute https URL/,
    );
  });

  it("flags a malformed logo object", () => {
    expect(lint([{ ...goodOrg, logo: { "@type": "ImageObject" } }]).map((i) => i.field)).toContain(
      "logo",
    );
  });

  it("flags a non-absolute url", () => {
    expect(lint([{ ...goodOrg, url: "/about" }]).map((i) => i.field)).toContain("url");
  });

  it("flags empty, relative and duplicated sameAs entries", () => {
    expect(lint([{ ...goodOrg, sameAs: [] }])).toHaveLength(1);
    expect(lint([{ ...goodOrg, sameAs: ["/profile"] }]).map((i) => i.field)).toEqual(["sameAs"]);
    expect(
      lint([{ ...goodOrg, sameAs: ["https://t.me/GACSapp1", "https://t.me/GACSapp1"] }]).map(
        (i) => i.message,
      ),
    ).toContain("sameAs has duplicate entries");
  });

  it("requires sameAs on the primary Organization entity", () => {
    const { sameAs: _s, ...noSameAs } = goodOrg;
    expect(lint([noSameAs])).toHaveLength(1);
    // An unrelated org on the page is not held to the sameAs requirement.
    expect(
      lint([
        {
          "@type": "Organization",
          "@id": "https://example.org/#org",
          name: "Example Labs",
          url: "https://example.org",
        },
      ]),
    ).toEqual([]);
  });

  it("requires our own Organization nodes to consolidate under the sitewide @id", () => {
    const issues = lint([
      { "@type": "Organization", name: "DoseRoutine", url: "https://doseroutine.com" },
    ]);
    expect(issues.map((i) => i.field)).toContain("@id");
  });

  it("merges nodes sharing an @id before validating", () => {
    const article = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Test",
      // Thin author reference with a name — completed by the sitewide node.
      author: { "@type": "Organization", "@id": ORG_ID, name: "DoseRoutine Editorial" },
      publisher: { "@id": ORG_ID },
    };
    expect(lint([goodOrg, article])).toEqual([]);
  });

  it("flags our publisher nested inside an Article when it stands alone", () => {
    const article = {
      "@type": "BlogPosting",
      publisher: { "@type": "Organization", name: "DoseRoutine" },
    };
    expect(formatEntityIssues(lint([article]))).toMatch(/neither logo nor image/);
  });

  it("ignores bare @id references", () => {
    expect(lint([{ "@type": "Organization", "@id": ORG_ID }])).toEqual([]);
  });

  it("validates Person authors", () => {
    expect(
      lint([{ "@type": "Person", name: "Jane Doe", url: "https://doseroutine.com/authors/jane" }]),
    ).toEqual([]);

    expect(lint([{ "@type": "Person", name: "Jane Doe" }])).toHaveLength(1);
    // Named-but-unresolvable is a real gap; a bare @id reference is not.
    expect(lint([{ "@type": "Person", "@id": "https://x.dev/#me" }])).toEqual([]);
    expect(lint([{ "@type": "Person", "@id": "https://x.dev/#me", name: "" }])).toHaveLength(1);
    expect(
      lint([
        { "@type": "Person", name: "Jane", "@id": "https://x.dev/#me", image: "/jane.jpg" },
      ]).map((i) => i.field),
    ).toEqual(["image"]);
  });

  it("walks @graph containers", () => {
    expect(lint([{ "@context": "https://schema.org", "@graph": [goodOrg] }])).toEqual([]);
  });
});
