import { describe, expect, it } from "vitest";
import { pubmedUrl, studyCitationJsonLd } from "@/lib/authority-sources";

describe("study citations", () => {
  it("builds canonical PubMed URLs", () => {
    expect(pubmedUrl("12345678")).toBe("https://pubmed.ncbi.nlm.nih.gov/12345678/");
  });

  it("emits ScholarlyArticle nodes with PMID identifiers", () => {
    const [node] = studyCitationJsonLd([
      { pmid: "999", title: "Creatine and strength", journal: "J Sports Sci", year: "2020" },
    ]);
    expect(node).toMatchObject({
      "@type": "ScholarlyArticle",
      name: "Creatine and strength",
      url: "https://pubmed.ncbi.nlm.nih.gov/999/",
      datePublished: "2020",
      isPartOf: { "@type": "Periodical", name: "J Sports Sci" },
    });
    expect(node?.identifier).toEqual([
      { "@type": "PropertyValue", propertyID: "PMID", value: "999" },
    ]);
  });

  it("omits journal and year when unknown", () => {
    const [node] = studyCitationJsonLd([{ pmid: "1", title: "T", journal: null, year: null }]);
    expect(node).not.toHaveProperty("isPartOf");
    expect(node).not.toHaveProperty("datePublished");
  });
});
