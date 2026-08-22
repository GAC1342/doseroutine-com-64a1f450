import { describe, expect, it } from "vitest";
import { documentCitations, type AuthoritySource } from "@/lib/authority-sources";
import { sectionCitations } from "@/lib/section-citations";

const src = (p: Partial<AuthoritySource>): AuthoritySource => ({
  label: "x",
  publisher: "x",
  url: "https://example.com/a",
  isSearch: false,
  ...p,
});

const list: AuthoritySource[] = [
  src({ label: "ODS search", publisher: "National Institutes of Health", isSearch: true }),
  src({
    label: "PubChem CID 1",
    publisher: "NCBI",
    url: "https://pubchem.ncbi.nlm.nih.gov/compound/1",
  }),
  src({
    label: "DailyMed label",
    publisher: "Food and Drug Administration",
    url: "https://dailymed.nlm.nih.gov/x",
  }),
];

describe("sectionCitations", () => {
  const docs = documentCitations(list);

  it("numbers the cited documents gaplessly (search entries are not numbered)", () => {
    expect(docs.map((d) => d.n)).toEqual([1, 2]);
  });

  it("prefers label sources for safety sections", () => {
    expect(sectionCitations("warnings", docs).map((d) => d.n)).toEqual([2]);
    expect(sectionCitations("contra", docs).map((d) => d.n)).toEqual([2]);
  });

  it("prefers substance records for the overview", () => {
    expect(sectionCitations("overview", docs)[0].n).toBe(1);
  });

  it("renders nothing rather than guessing a source for unknown sections", () => {
    expect(sectionCitations("unknown-section", docs)).toEqual([]);
  });

  it("never cites a publisher that does not document that section's claim", () => {
    // PubChem + Wikipedia only: neither documents a drug-interaction claim.
    const thin = docs.filter((d) => /pubchem|wikipedia/i.test(d.publisher));
    expect(sectionCitations("interactions", thin)).toEqual([]);
  });

  it("never returns anything when no document sources exist", () => {
    expect(sectionCitations("warnings", [])).toEqual([]);
  });
});
