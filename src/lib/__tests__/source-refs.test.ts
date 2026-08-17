import { describe, expect, it } from "vitest";
import { parseSourceRef, parseSourceRefs, primarySource } from "@/lib/source-refs";

describe("parseSourceRef", () => {
  it("parses label|url pairs", () => {
    expect(parseSourceRef("NIH ODS|https://ods.od.nih.gov/factsheets/x")).toEqual({
      label: "NIH ODS",
      url: "https://ods.od.nih.gov/factsheets/x",
      kind: "url",
    });
  });

  it("falls back to hostname when no label", () => {
    expect(parseSourceRef("https://www.drugs.com/a")?.label).toBe("drugs.com");
  });

  it("links PMIDs", () => {
    expect(parseSourceRef("PMID: 12345678")).toEqual({
      label: "PMID 12345678",
      url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      kind: "pubmed",
    });
  });

  it("links DOIs", () => {
    expect(parseSourceRef("doi:10.1000/xyz123")).toEqual({
      label: "DOI 10.1000/xyz123",
      url: "https://doi.org/10.1000/xyz123",
      kind: "doi",
    });
  });

  it("keeps unlinkable text as plain", () => {
    expect(parseSourceRef("Manufacturer labeling")).toEqual({
      label: "Manufacturer labeling",
      url: null,
      kind: "text",
    });
  });

  it("ignores empty refs", () => {
    expect(parseSourceRef("   ")).toBeNull();
  });
});

describe("parseSourceRefs", () => {
  it("dedupes by url", () => {
    const out = parseSourceRefs([
      "A|https://example.com/x",
      "B|https://example.com/x",
      "PMID: 1111111",
    ]);
    expect(out).toHaveLength(2);
  });
});

describe("primarySource", () => {
  it("returns the first linkable source", () => {
    expect(primarySource(["Manufacturer labeling", "PMID: 999999"])?.url).toBe(
      "https://pubmed.ncbi.nlm.nih.gov/999999/",
    );
  });

  it("returns null when nothing links", () => {
    expect(primarySource(["Manufacturer labeling"])).toBeNull();
  });
});
