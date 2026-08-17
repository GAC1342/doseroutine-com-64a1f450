import { describe, expect, it } from "vitest";
import {
  clusterZeroResultTerms,
  matchCatalog,
  parseTerm,
  similarity,
  type CatalogEntry,
} from "@/lib/zero-result-clusters";

const catalog: CatalogEntry[] = [
  { slug: "tesamorelin", name: "Tesamorelin", aliases: ["Egrifta"], goalTags: ["fat loss"] },
  { slug: "magnesium-glycinate", name: "Magnesium Glycinate", aliases: [], goalTags: ["sleep"] },
];

describe("parseTerm", () => {
  it("strips stopwords and pulls out intent and goal words", () => {
    const p = parseTerm("what is the best tesamorelin dosage for fat loss");
    expect(p.tokens).toContain("tesamorelin");
    expect(p.tokens).not.toContain("the");
    expect(p.intents).toContain("dosage");
    expect(p.goals).toContain("fat loss");
  });
});

describe("similarity / matchCatalog", () => {
  it("scores near-misspellings highly", () => {
    expect(similarity("tesamorelin", "tesamorelin")).toBe(1);
    expect(similarity("tesamorlin", "Tesamorelin")).toBeGreaterThan(0.5);
  });

  it("matches an alias", () => {
    expect(matchCatalog("egrifta", catalog)?.entry.slug).toBe("tesamorelin");
  });

  it("returns null when nothing is close", () => {
    expect(matchCatalog("quantum banana", catalog)).toBeNull();
  });
});

describe("clusterZeroResultTerms", () => {
  it("groups misspellings of the same compound and proposes an alias", () => {
    const clusters = clusterZeroResultTerms(
      [
        { term: "tesamorlin", searches: 4 },
        { term: "tesamorelin dose", searches: 7 },
      ],
      catalog,
    );

    expect(clusters).toHaveLength(1);
    const c = clusters[0]!;
    expect(c.searches).toBe(11);
    expect(c.label).toBe("tesamorelin dose");
    expect(c.intents).toContain("dosage");
    const alias = c.proposals.find((p) => p.kind === "alias");
    expect(alias?.targetSlug).toBe("tesamorelin");
  });

  it("proposes a new library entry when nothing in the catalog is close", () => {
    const clusters = clusterZeroResultTerms(
      [{ term: "quantum banana extract", searches: 3 }],
      catalog,
    );
    expect(clusters[0]!.proposals.some((p) => p.kind === "new_entry")).toBe(true);
  });

  it("proposes a goal tag for goal-style searches", () => {
    const clusters = clusterZeroResultTerms(
      [{ term: "something for better sleep", searches: 5 }],
      catalog,
    );
    const goal = clusters[0]!.proposals.find((p) => p.kind === "goal_tag");
    expect(goal?.value).toBe("sleep");
  });

  it("sorts by volume, honours minSearches and limit, and ignores blank terms", () => {
    const clusters = clusterZeroResultTerms(
      [
        { term: "  ", searches: 9 },
        { term: "quantum banana", searches: 1 },
        { term: "tesamorelin", searches: 6 },
      ],
      catalog,
      { minSearches: 2, limit: 1 },
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.label).toBe("tesamorelin");
  });
});
