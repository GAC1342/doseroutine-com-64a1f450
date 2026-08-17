import { describe, expect, it } from "vitest";
import {
  parseSourcesList,
  resolveAuthoritySource,
  resolveCompoundSources,
  resolveInteractionSources,
  citationJsonLd,
  documentCitations,
  numberSources,
  baselineCompoundSources,
} from "@/lib/authority-sources";

describe("parseSourcesList", () => {
  it("parses JSON-array rows", () => {
    expect(parseSourcesList('["MedlinePlus", "PubChem"]')).toEqual(["MedlinePlus", "PubChem"]);
  });
  it("parses markdown bullet rows", () => {
    expect(parseSourcesList("- MedlinePlus\n* PubChem\n\n1. DrugBank")).toEqual([
      "MedlinePlus",
      "PubChem",
      "DrugBank",
    ]);
  });
  it("returns [] for empty input", () => {
    expect(parseSourcesList(null)).toEqual([]);
    expect(parseSourcesList("   ")).toEqual([]);
  });
});

describe("resolveAuthoritySource", () => {
  it("resolves known publishers to absolute https URLs", () => {
    for (const entry of [
      "NIH Office of Dietary Supplements (ODS)",
      "MedlinePlus",
      "Cochrane Library",
      "DrugBank",
      "Mayo Clinic",
      "FDA label information for dietary supplements",
      "European Medicines Agency (EMA)",
    ]) {
      const s = resolveAuthoritySource(entry, "Creatine", "creatine");
      expect(s?.url, entry).toMatch(/^https:\/\//);
      expect(s?.publisher.length).toBeGreaterThan(0);
    }
  });

  it("uses the verified PubChem CID when we have one", () => {
    const s = resolveAuthoritySource("PubChem", "5-HTP", "5-htp");
    expect(s?.url).toBe("https://pubchem.ncbi.nlm.nih.gov/compound/144");
    expect(s?.isSearch).toBe(false);
  });

  it("passes through stored URLs and PMIDs verbatim", () => {
    expect(resolveAuthoritySource("https://example.org/paper", "X")?.url).toBe(
      "https://example.org/paper",
    );
    expect(resolveAuthoritySource("PMID: 12345678", "X")?.url).toBe(
      "https://pubmed.ncbi.nlm.nih.gov/12345678/",
    );
  });

  it("keeps unknown publishers as unlinked text rather than guessing", () => {
    const s = resolveAuthoritySource("Internal editorial review", "X");
    expect(s?.url).toBeNull();
    expect(s?.label).toBe("Internal editorial review");
  });
});

describe("resolveCompoundSources", () => {
  it("de-duplicates repeated publishers", () => {
    const out = resolveCompoundSources(
      '["MedlinePlus", "MedlinePlus - Iron", "PubChem"]',
      "Iron",
      "iron",
    );
    expect(out.filter((s) => s.label === "MedlinePlus")).toHaveLength(1);
  });
});

describe("baselineCompoundSources", () => {
  it("always offers PubChem, PubMed and DailyMed", () => {
    const urls = baselineCompoundSources("Creatine", "creatine").map((s) => s.url ?? "");
    expect(urls.some((u) => u.includes("pubchem"))).toBe(true);
    expect(urls.some((u) => u.includes("pubmed"))).toBe(true);
    expect(urls.some((u) => u.includes("dailymed"))).toBe(true);
  });
});

describe("resolveInteractionSources", () => {
  it("always yields verifiable pair-scoped references, even with no stored refs", () => {
    const out = resolveInteractionSources([], "Semaglutide", "Metformin");
    expect(out.length).toBeGreaterThanOrEqual(4);
    for (const s of out) expect(s.url).toMatch(/^https:\/\//);
    expect(out.some((s) => (s.url ?? "").includes("pubmed"))).toBe(true);
  });

  it("keeps stored refs first", () => {
    const out = resolveInteractionSources(["PMID: 11112222"], "A", "B");
    expect(out[0]?.url).toBe("https://pubmed.ncbi.nlm.nih.gov/11112222/");
  });
});

describe("citationJsonLd", () => {
  it("emits only linkable nodes with publisher metadata", () => {
    const nodes = citationJsonLd(resolveInteractionSources([], "A", "B"));
    for (const n of nodes) {
      expect(n["@type"]).toBe("WebPage");
      expect(n.url).toMatch(/^https:\/\//);
      expect(n.publisher.name.length).toBeGreaterThan(0);
    }
  });
});

describe("citation ordering matches visible numbering", () => {
  const sources = resolveInteractionSources(["PMID: 11112222", "PMID: 33334444"], "A", "B");

  it("emits position equal to the rendered reference number", () => {
    const numbered = documentCitations(sources);
    const nodes = citationJsonLd(sources);
    for (const node of nodes) {
      const match = numbered.find((s) => s.url === node.url);
      expect(match, `no numbered source for ${node.url}`).toBeTruthy();
      expect(node.position).toBe(match!.n);
    }
    // positions are strictly increasing (same order as the visible list)
    const positions = nodes.map((n) => n.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("anchors each citation to its on-page source entry", () => {
    const nodes = citationJsonLd(sources, { pageUrl: "https://doseroutine.com/library/x" });
    for (const node of nodes) {
      expect(node["@id"]).toBe(`https://doseroutine.com/library/x#source-${node.position}`);
    }
  });

  it("keeps numbering stable when an unlinkable source sits in the list", () => {
    const withPlain = [
      { label: "Internal note", publisher: "DoseRoutine" } as (typeof sources)[number],
      ...sources,
    ];
    const nodes = citationJsonLd(withPlain);
    // unlinkable and search entries are not numbered as citations, so the
    // first cited document is #1 and the numbering stays gapless
    expect(nodes[0]?.position).toBe(1);
    expect(nodes.map((n) => n.position)).toEqual(nodes.map((_, i) => i + 1));
  });
});
