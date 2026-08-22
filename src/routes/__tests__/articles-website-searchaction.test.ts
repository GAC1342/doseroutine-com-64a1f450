/**
 * WebSite + SearchAction structured data for /articles.
 *
 * Google reads the sitewide WebSite node (declared once in __root.tsx, so the
 * duplicate lint stays green) for the sitelinks search box. This test asserts
 * that the node a crawler sees on /articles pages carries a SearchAction whose
 * entry point is the working /articles?q= URL, and that the /articles routes
 * do not re-declare WebSite themselves.
 */

import { describe, it, expect } from "vitest";
import { Route as RootRoute } from "../__root";
import { Route as ArticlesIndexRoute } from "../articles.index";
import { Route as ArticleRoute } from "../articles.$slug";
import { LOCAL_ARTICLES } from "../../lib/local-articles";
import { SITE_URL, ARTICLES_PREFIX } from "../../lib/article-config";
import { findJsonLdConflicts, flattenJsonLd } from "../../lib/jsonld-duplicates";

type ScriptTag = { type?: string; children?: string };
type HeadOut = { scripts?: ScriptTag[] };

function blocks(head: HeadOut | undefined): unknown[] {
  return (head?.scripts ?? [])
    .filter((s) => s.type === "application/ld+json" && typeof s.children === "string")
    .flatMap((s) => flattenJsonLd(JSON.parse(s.children as string)));
}

function headOf(route: unknown, ctx: unknown): HeadOut {
  const head = (route as { options: { head?: (c: unknown) => HeadOut } }).options.head!;
  return head(ctx);
}

const rootBlocks = blocks(
  headOf(RootRoute, { matches: [], params: {}, loaderData: { locale: "en" } }),
);

const indexBlocks = blocks(
  headOf(ArticlesIndexRoute, {
    matches: [],
    params: {},
    loaderData: { posts: [], nextCursor: null },
  }),
);

const postBlocks = blocks(
  headOf(ArticleRoute, {
    matches: [],
    params: { slug: LOCAL_ARTICLES[0].slug },
    loaderData: { kind: "local", article: LOCAL_ARTICLES[0] },
  }),
);

type Node = Record<string, unknown>;

function websiteNode(all: unknown[]): Node {
  const site = (all as Node[]).find((n) => n["@type"] === "WebSite");
  expect(site, "a WebSite node must be present").toBeTruthy();
  return site as Node;
}

function searchActions(site: Node): Node[] {
  const raw = site.potentialAction;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return (list as Node[]).filter((a) => a["@type"] === "SearchAction");
}

describe("WebSite + SearchAction on /articles", () => {
  it("the /articles index page carries a WebSite node", () => {
    const site = websiteNode([...rootBlocks, ...indexBlocks]);
    expect(site["@id"]).toBe(`${SITE_URL}/#website`);
    expect(site.name).toBe("DoseRoutine");
    expect(site.url).toBe(SITE_URL);
  });

  it("an /articles post page carries the same WebSite node", () => {
    const site = websiteNode([...rootBlocks, ...postBlocks]);
    expect(site["@id"]).toBe(`${SITE_URL}/#website`);
  });

  it("declares a SearchAction pointing at the /articles search URL", () => {
    const actions = searchActions(websiteNode([...rootBlocks, ...indexBlocks]));
    const target = `${SITE_URL}${ARTICLES_PREFIX}?q={search_term_string}`;

    const articlesAction = actions.find(
      (a) => (a.target as Node | undefined)?.urlTemplate === target,
    );
    expect(articlesAction, `no SearchAction targets ${target}`).toBeTruthy();
    expect((articlesAction!.target as Node)["@type"]).toBe("EntryPoint");
    expect(articlesAction!["query-input"]).toBe("required name=search_term_string");
  });

  it("every SearchAction uses an absolute https template with the query token", () => {
    for (const action of searchActions(websiteNode(rootBlocks))) {
      const template = (action.target as Node).urlTemplate as string;
      expect(template.startsWith("https://doseroutine.com/")).toBe(true);
      expect(template).toContain("{search_term_string}");
    }
  });

  it("the /articles routes never re-declare WebSite (single node per page)", () => {
    for (const own of [indexBlocks, postBlocks]) {
      const localSites = (own as Node[]).filter((n) => n["@type"] === "WebSite");
      expect(localSites).toHaveLength(0);
    }
  });

  it("merged /articles structured data has no duplicate or conflicting nodes", () => {
    expect(findJsonLdConflicts([...rootBlocks, ...indexBlocks])).toEqual([]);
    expect(findJsonLdConflicts([...rootBlocks, ...postBlocks])).toEqual([]);
  });

  it("the /articles?q= search param is accepted by the route", () => {
    const validate = ArticlesIndexRoute.options.validateSearch as unknown as (
      i: Record<string, unknown>,
    ) => { q?: string };
    expect(validate({ q: "pill reminder" }).q).toBe("pill reminder");
    expect(validate({}).q).toBeUndefined();
  });
});
