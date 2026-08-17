import { describe, expect, it } from "vitest";
import { COMPOUND_ENTITY_IDS, entityIdentifiers, entitySameAs } from "../compound-entity-ids";

describe("compound entity ids", () => {
  it("covers most of the library and has well-formed IDs", () => {
    const entries = Object.entries(COMPOUND_ENTITY_IDS);
    expect(entries.length).toBeGreaterThan(300);
    for (const [slug, e] of entries) {
      expect(slug, slug).toMatch(/^[a-z0-9-]+$/);
      expect(e.cid || e.qid, slug).toBeTruthy();
      if (e.cid) expect(Number.isInteger(e.cid) && e.cid > 0, slug).toBe(true);
      if (e.qid) expect(e.qid, slug).toMatch(/^Q\d+$/);
      if (e.wikipedia) expect(e.wikipedia, slug).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    }
  });

  it("builds absolute sameAs URLs and PropertyValue identifiers", () => {
    const slug = Object.keys(COMPOUND_ENTITY_IDS)[0]!;
    for (const u of entitySameAs(slug)) expect(u).toMatch(/^https:\/\//);
    for (const id of entityIdentifiers(slug)) expect(id["@type"]).toBe("PropertyValue");
  });

  it("returns nothing for an unknown slug", () => {
    expect(entitySameAs("not-a-compound")).toEqual([]);
    expect(entityIdentifiers("not-a-compound")).toEqual([]);
  });
});
