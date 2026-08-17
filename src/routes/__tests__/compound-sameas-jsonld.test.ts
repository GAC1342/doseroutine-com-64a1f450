/**
 * Offline contract tests for /library/$slug compound pages.
 *
 * 1. sameAs grounding — every entity mapping produces absolute, well-formed,
 *    de-duplicated PubChem / Wikidata / Wikipedia URLs that match the IDs they
 *    were built from (no empty arrays, no mismatched CID/QID).
 * 2. JSON-LD validity — the route's head() emits parseable application/ld+json
 *    blocks with @context/@type, a valid BreadcrumbList, an Article with the
 *    required fields, and a substance node whose sameAs/identifier agree with
 *    the entity table.
 */

import { describe, it, expect } from "vitest";
import { COMPOUND_ENTITY_IDS, entityIdentifiers, entitySameAs } from "@/lib/compound-entity-ids";
import { Route } from "../library.$slug";

const PUBCHEM = /^https:\/\/pubchem\.ncbi\.nlm\.nih\.gov\/compound\/(\d+)$/;
const WIKIDATA = /^https:\/\/www\.wikidata\.org\/wiki\/(Q\d+)$/;
const WIKIPEDIA = /^https:\/\/en\.wikipedia\.org\/wiki\/\S+$/;

const slugs = Object.keys(COMPOUND_ENTITY_IDS).sort();

function isAbsoluteHttps(v: unknown): v is string {
  if (typeof v !== "string" || v.trim() !== v || v.length === 0) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

describe("compound sameAs URLs", () => {
  it("has entity mappings to check", () => {
    expect(slugs.length).toBeGreaterThan(300);
  });

  it("every mapped compound produces at least one sameAs URL", () => {
    const empty = slugs.filter((s) => entitySameAs(s).length === 0);
    expect(empty, `slugs with empty sameAs: ${empty.join(", ")}`).toEqual([]);
  });

  it("every sameAs URL is absolute, https, trimmed and unique per compound", () => {
    for (const slug of slugs) {
      const urls = entitySameAs(slug);
      for (const u of urls) {
        expect(isAbsoluteHttps(u), `${slug}: malformed sameAs URL "${u}"`).toBe(true);
        expect(
          PUBCHEM.test(u) || WIKIDATA.test(u) || WIKIPEDIA.test(u),
          `${slug}: unrecognised sameAs host "${u}"`,
        ).toBe(true);
      }
      expect(new Set(urls).size, `${slug}: duplicate sameAs URLs`).toBe(urls.length);
    }
  });

  it("sameAs URLs match the underlying CID / QID (no mismatches)", () => {
    for (const slug of slugs) {
      const e = COMPOUND_ENTITY_IDS[slug]!;
      const urls = entitySameAs(slug);
      const pub = urls.find((u) => PUBCHEM.test(u));
      const wd = urls.find((u) => WIKIDATA.test(u));
      const wp = urls.find((u) => WIKIPEDIA.test(u));

      expect(Boolean(pub), `${slug}: cid present but no PubChem URL`).toBe(Boolean(e.cid));
      expect(Boolean(wd), `${slug}: qid present but no Wikidata URL`).toBe(Boolean(e.qid));
      expect(Boolean(wp), `${slug}: wikipedia present but not in sameAs`).toBe(
        Boolean(e.wikipedia),
      );

      if (e.cid)
        expect(PUBCHEM.exec(pub!)![1], `${slug}: PubChem CID mismatch`).toBe(String(e.cid));
      if (e.qid) expect(WIKIDATA.exec(wd!)![1], `${slug}: Wikidata QID mismatch`).toBe(e.qid);
      if (e.wikipedia) expect(wp, `${slug}: Wikipedia URL mismatch`).toBe(e.wikipedia);
    }
  });

  it("identifiers agree with sameAs URLs", () => {
    for (const slug of slugs) {
      const e = COMPOUND_ENTITY_IDS[slug]!;
      const ids = entityIdentifiers(slug);
      for (const id of ids) {
        expect(id["@type"]).toBe("PropertyValue");
        expect(id.propertyID.length).toBeGreaterThan(0);
        expect(id.value.trim().length, `${slug}: empty identifier value`).toBeGreaterThan(0);
      }
      const cidId = ids.find((i) => i.propertyID === "PubChem CID");
      const qidId = ids.find((i) => i.propertyID === "Wikidata");
      expect(cidId?.value ?? null).toBe(e.cid ? String(e.cid) : null);
      expect(qidId?.value ?? null).toBe(e.qid ?? null);
    }
  });
});

type Node = Record<string, unknown>;

function flatten(node: unknown): Node[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (node && typeof node === "object") {
    const obj = node as Node;
    if (Array.isArray(obj["@graph"])) return (obj["@graph"] as unknown[]).flatMap(flatten);
    return [obj];
  }
  return [];
}

function typeList(t: unknown): string[] {
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

function headNodes(slug: string, name: string): Node[] {
  const head = Route.options.head as (ctx: unknown) => {
    scripts?: { type?: string; children?: string }[];
  };
  const result = head({
    params: { slug },
    loaderData: {
      compound: {
        id: `id-${slug}`,
        name,
        slug,
        category: "peptide",
        aliases: [],
        created_at: "2026-03-04T00:00:00Z",
      },
      content: null,
    },
  });
  const scripts = (result.scripts ?? []).filter(
    (s) => (s.type ?? "").toLowerCase() === "application/ld+json" && (s.children ?? "").trim(),
  );
  expect(scripts.length, `${slug}: no JSON-LD scripts`).toBeGreaterThan(0);
  const nodes: Node[] = [];
  for (const s of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(s.children!);
    } catch (err) {
      throw new Error(`${slug}: invalid JSON-LD — ${(err as Error).message}`);
    }
    nodes.push(...flatten(parsed));
  }
  return nodes;
}

// Sample across the alphabet so the suite stays fast but broad.
const sampled = slugs.filter((_, i) => i % 25 === 0);

describe("compound page JSON-LD", () => {
  for (const slug of sampled) {
    it(`${slug} emits valid JSON-LD with grounded sameAs`, () => {
      const name = slug.replace(/-/g, " ");
      const nodes = headNodes(slug, name);

      for (const n of nodes) {
        expect(n["@context"] ?? "https://schema.org", `${slug}: bad @context`).toMatch(
          /schema\.org/,
        );
        expect(typeList(n["@type"]).length, `${slug}: node missing @type`).toBeGreaterThan(0);
      }

      const crumb = nodes.find((n) => typeList(n["@type"]).includes("BreadcrumbList"));
      expect(crumb, `${slug}: missing BreadcrumbList`).toBeDefined();
      const items = crumb!.itemListElement as Node[];
      expect(Array.isArray(items) && items.length > 0).toBe(true);
      items.forEach((li, i) => {
        expect(li["@type"]).toBe("ListItem");
        expect(li.position).toBe(i + 1);
        expect(typeof li.name === "string" && (li.name as string).length > 0).toBe(true);
        expect(isAbsoluteHttps(li.item)).toBe(true);
      });

      const article = nodes.find((n) => typeList(n["@type"]).includes("Article"));
      expect(article, `${slug}: missing Article`).toBeDefined();
      expect(
        typeof article!.headline === "string" && (article!.headline as string).length > 0,
      ).toBe(true);
      expect(article!.author).toBeTruthy();
      expect(Number.isNaN(Date.parse(String(article!.datePublished)))).toBe(false);

      const substance = nodes.find((n) => String(n["@id"] ?? "").endsWith("#substance"));
      expect(substance, `${slug}: missing substance node`).toBeDefined();

      const expected = entitySameAs(slug);
      expect(substance!.sameAs, `${slug}: substance sameAs mismatch`).toEqual(expected);
      for (const u of (substance!.sameAs as string[]) ?? []) {
        expect(isAbsoluteHttps(u), `${slug}: bad sameAs "${u}"`).toBe(true);
      }
      const expectedIds = entityIdentifiers(slug);
      if (expectedIds.length > 0) {
        expect(substance!.identifier).toEqual(expectedIds);
      }
    });
  }

  it("an unmapped slug omits sameAs rather than emitting an empty array", () => {
    const nodes = headNodes("definitely-not-a-real-compound", "Fake Compound");
    const substance = nodes.find((n) => String(n["@id"] ?? "").endsWith("#substance"));
    expect(substance).toBeDefined();
    expect("sameAs" in substance!).toBe(false);
    expect("identifier" in substance!).toBe(false);
  });
});
