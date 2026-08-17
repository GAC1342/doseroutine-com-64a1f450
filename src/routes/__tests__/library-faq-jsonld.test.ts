/**
 * Validates JSON-LD contracts on every guide, hub, and comparison route
 * in the library. Runs offline: imports the route module, calls head(),
 * extracts application/ld+json scripts, and enforces the same rules as
 * scripts/validate-library-faq.py (mirrored so the live-URL sweep and
 * this static test agree).
 *
 * Per page:
 *  - FAQPage: exactly one; @context schema.org; non-empty mainEntity;
 *    each Question has name + Answer.text; no duplicate question names.
 *  - BreadcrumbList: exactly one; @context schema.org; itemListElement
 *    is a non-empty array; every ListItem has sequential position
 *    starting at 1, non-empty name, and a well-formed absolute item URL.
 *  - Article: exactly one; @context schema.org; non-empty headline;
 *    author and publisher objects with a name; publisher includes a
 *    logo.url; datePublished parses as a valid ISO date.
 */

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

type HeadScript = { type?: string; children?: string };
type HeadResult = { scripts?: HeadScript[] };
type RouteMod = {
  Route: { options: { head?: (ctx?: unknown) => HeadResult } };
};

const ROUTES_DIR = join(process.cwd(), "src", "routes");

// Every route file that MUST publish an FAQPage. Enumerated from the
// filesystem so a new guide/hub/compare page is automatically covered.
const PATTERNS = [
  /^library\.guides\..+\.tsx$/,
  /^library\.compare\..+\.tsx$/,
  /^library\.mens-health\.tsx$/,
  /^library\.prostate-health\.tsx$/,
  /^library\.testosterone-support\.tsx$/,
  /^library\.womens-health\.(testosterone-women|maca-libido|l-arginine-women|tribulus-women|vaginal-probiotics|ashwagandha-women)\.tsx$/,
];

const files = readdirSync(ROUTES_DIR)
  .filter((f) => PATTERNS.some((re) => re.test(f)))
  .sort();

function flatten(node: unknown): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) return (obj["@graph"] as unknown[]).flatMap(flatten);
    return [obj];
  }
  return [];
}

function typeMatches(t: unknown, expected: string): boolean {
  if (typeof t === "string") return t.trim().toLowerCase() === expected.toLowerCase();
  if (Array.isArray(t)) return t.some((x) => typeMatches(x, expected));
  return false;
}

function contextIsSchemaOrg(c: unknown): boolean {
  const v =
    typeof c === "string" ? c : Array.isArray(c) ? c.find((x) => typeof x === "string") : null;
  if (typeof v !== "string") return false;
  return /^https?:\/\/schema\.org\/?$/i.test(v.trim());
}

function nonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function isAbsoluteHttpUrl(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Women's-health articles publish Article + FAQPage JSON-LD from the page body
 * (head() carries only breadcrumbs + meta) so the long article bodies stay out
 * of the critical route bundle. Collect those nodes from the same helper the
 * component renders, keyed by the route's slug.
 */
async function womensBodyNodes(file: string): Promise<Record<string, unknown>[]> {
  const m = /^library\.womens-health\.([a-z0-9-]+)\.tsx$/.exec(file);
  if (!m) return [];
  const slug = m[1];
  const { womensCompoundBodyLD } = await import("@/components/womens-compound-article");
  const modules = await Promise.all([
    import("@/lib/womens-health/fertility-content"),
    import("@/lib/womens-health/longevity-content"),
    import("@/lib/womens-health/menopause-content"),
    import("@/lib/womens-health/sexual-health-content"),
  ]);
  for (const mod of modules) {
    for (const value of Object.values(mod as Record<string, unknown>)) {
      const c = value as { slug?: string };
      if (c && typeof c === "object" && c.slug === slug) {
        return womensCompoundBodyLD(c as never).flatMap(flatten);
      }
    }
  }
  throw new Error(`${file}: no women's-health content export found for slug "${slug}"`);
}

async function loadNodes(file: string): Promise<Record<string, unknown>[]> {
  const mod = (await import(/* @vite-ignore */ join(ROUTES_DIR, file))) as RouteMod;
  expect(mod.Route, `${file}: missing exported Route`).toBeDefined();
  const head = mod.Route.options.head;
  expect(head, `${file}: Route has no head() option`).toBeTypeOf("function");
  const result = head!({ params: {}, loaderData: undefined });
  const scripts = (result.scripts ?? []).filter(
    (s) => (s.type ?? "").toLowerCase() === "application/ld+json" && nonEmpty(s.children),
  );
  expect(scripts.length, `${file}: no application/ld+json scripts`).toBeGreaterThan(0);
  const nodes: Record<string, unknown>[] = [];
  for (const s of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(s.children!);
    } catch (e) {
      throw new Error(`${file}: JSON-LD parse error — ${(e as Error).message}`);
    }
    nodes.push(...flatten(parsed));
  }
  nodes.push(...(await womensBodyNodes(file)));
  return nodes;
}

describe("Library FAQPage JSON-LD", () => {
  it("discovers guide, hub, and comparison route files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} publishes a valid FAQPage`, async () => {
      const nodes = await loadNodes(file);
      const faqNodes = nodes.filter((n) => typeMatches(n["@type"], "FAQPage"));
      expect(faqNodes.length, `${file}: expected exactly one FAQPage JSON-LD block`).toBe(1);
      const faq = faqNodes[0];

      expect(contextIsSchemaOrg(faq["@context"]), `${file}: @context must be schema.org`).toBe(
        true,
      );

      const rawEntities = faq.mainEntity;
      const entities = Array.isArray(rawEntities) ? rawEntities : rawEntities ? [rawEntities] : [];
      expect(entities.length, `${file}: mainEntity must be a non-empty array`).toBeGreaterThan(0);

      const seenNames = new Set<string>();
      entities.forEach((q, i) => {
        expect(
          typeof q === "object" && q !== null,
          `${file}: mainEntity[${i}] must be an object`,
        ).toBe(true);
        const question = q as Record<string, unknown>;
        expect(
          typeMatches(question["@type"], "Question"),
          `${file}: mainEntity[${i}].@type must be 'Question'`,
        ).toBe(true);
        expect(nonEmpty(question.name), `${file}: mainEntity[${i}].name must be non-empty`).toBe(
          true,
        );
        const norm = (question.name as string).trim().toLowerCase().replace(/\s+/g, " ");
        expect(
          seenNames.has(norm),
          `${file}: duplicate question name at index ${i} ("${question.name}")`,
        ).toBe(false);
        seenNames.add(norm);
        const ans = question.acceptedAnswer;
        expect(
          typeof ans === "object" && ans !== null,
          `${file}: mainEntity[${i}].acceptedAnswer must be an object`,
        ).toBe(true);
        const answer = ans as Record<string, unknown>;
        expect(
          typeMatches(answer["@type"], "Answer"),
          `${file}: mainEntity[${i}].acceptedAnswer.@type must be 'Answer'`,
        ).toBe(true);
        expect(
          nonEmpty(answer.text),
          `${file}: mainEntity[${i}].acceptedAnswer.text must be non-empty`,
        ).toBe(true);
      });
    });
  }
});

describe("Library BreadcrumbList JSON-LD", () => {
  for (const file of files) {
    it(`${file} publishes a valid BreadcrumbList`, async () => {
      const nodes = await loadNodes(file);
      const crumbs = nodes.filter((n) => typeMatches(n["@type"], "BreadcrumbList"));
      expect(crumbs.length, `${file}: expected exactly one BreadcrumbList JSON-LD block`).toBe(1);
      const bc = crumbs[0];

      expect(
        contextIsSchemaOrg(bc["@context"]),
        `${file}: BreadcrumbList @context must be schema.org`,
      ).toBe(true);

      const raw = bc.itemListElement;
      const items = Array.isArray(raw) ? raw : [];
      expect(items.length, `${file}: itemListElement must be a non-empty array`).toBeGreaterThan(0);

      items.forEach((it, i) => {
        expect(
          typeof it === "object" && it !== null,
          `${file}: itemListElement[${i}] must be an object`,
        ).toBe(true);
        const li = it as Record<string, unknown>;
        expect(
          typeMatches(li["@type"], "ListItem"),
          `${file}: itemListElement[${i}].@type must be 'ListItem'`,
        ).toBe(true);
        expect(li.position, `${file}: itemListElement[${i}].position must be ${i + 1}`).toBe(i + 1);
        expect(nonEmpty(li.name), `${file}: itemListElement[${i}].name must be non-empty`).toBe(
          true,
        );
        const item = li.item;
        const url =
          typeof item === "string"
            ? item
            : typeof item === "object" && item !== null
              ? ((item as Record<string, unknown>)["@id"] ?? (item as Record<string, unknown>).url)
              : undefined;
        expect(
          isAbsoluteHttpUrl(url),
          `${file}: itemListElement[${i}].item must be an absolute http(s) URL`,
        ).toBe(true);
      });
    });
  }
});

describe("Library Article JSON-LD", () => {
  for (const file of files) {
    it(`${file} publishes a valid Article`, async () => {
      const nodes = await loadNodes(file);
      const articles = nodes.filter((n) =>
        ["Article", "NewsArticle", "BlogPosting", "MedicalWebPage"].some((t) =>
          typeMatches(n["@type"], t),
        ),
      );
      expect(
        articles.length,
        `${file}: expected exactly one Article (or Article subtype) JSON-LD block`,
      ).toBe(1);
      const art = articles[0];

      expect(
        contextIsSchemaOrg(art["@context"]),
        `${file}: Article @context must be schema.org`,
      ).toBe(true);
      expect(nonEmpty(art.headline), `${file}: Article.headline must be non-empty`).toBe(true);

      const author = art.author;
      expect(
        typeof author === "object" && author !== null,
        `${file}: Article.author must be an object`,
      ).toBe(true);
      expect(
        nonEmpty((author as Record<string, unknown>).name),
        `${file}: Article.author.name must be non-empty`,
      ).toBe(true);

      const publisher = art.publisher as Record<string, unknown> | undefined;
      expect(
        typeof publisher === "object" && publisher !== null,
        `${file}: Article.publisher must be an object`,
      ).toBe(true);
      expect(nonEmpty(publisher!.name), `${file}: Article.publisher.name must be non-empty`).toBe(
        true,
      );
      const logo = publisher!.logo as Record<string, unknown> | undefined;
      expect(
        typeof logo === "object" && logo !== null,
        `${file}: Article.publisher.logo must be an object`,
      ).toBe(true);
      expect(
        isAbsoluteHttpUrl(logo!.url),
        `${file}: Article.publisher.logo.url must be an absolute http(s) URL`,
      ).toBe(true);

      const dp = art.datePublished;
      expect(
        typeof dp === "string" && !Number.isNaN(Date.parse(dp)),
        `${file}: Article.datePublished must parse as an ISO date`,
      ).toBe(true);
    });
  }
});
