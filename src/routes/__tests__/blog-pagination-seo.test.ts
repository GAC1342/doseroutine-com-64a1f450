/**
 * Pagination SEO field checks for /blog.
 *
 * Drives the REAL route head() with the loader data the route produces, and
 * asserts canonical, rel=prev/next and robots are correct on page 1, every
 * middle page, and the last page — for the default page size and each custom
 * page size, plus out-of-range pages and non-default sorts.
 */

import { describe, expect, it } from "vitest";
import {
  BLOG_PAGE_SIZE_OPTIONS,
  DEFAULT_BLOG_PAGE_SIZE,
  buildBlogListCanonical,
  type BlogPageSize,
} from "@/lib/blog-list-canonical";
import { BLOG_POSTS_NEWEST_FIRST } from "@/lib/blog-posts";
import { Route } from "@/routes/blog.index";

const TOTAL = BLOG_POSTS_NEWEST_FIRST.length;
const BASE = "https://doseroutine.com/blog";
const INDEXABLE = "index, follow, max-image-preview:large";
const NOINDEX = "noindex, follow";

type Head = {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<Record<string, string>>;
};

/** Mirrors the route loader's client branch: canonical derived from page. */
function loaderDataFor(page: number, pageSize: BlogPageSize, sort = "newest") {
  const url = new URL(BASE);
  if (page > 1) url.searchParams.set("page", String(page));
  return { canonical: buildBlogListCanonical(url), page, pageSize, sort };
}

function headFor(page: number, pageSize: BlogPageSize, sort = "newest"): Head {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  const head = (Route.options as any).head({ loaderData: loaderDataFor(page, pageSize, sort) });
  return { meta: head.meta ?? [], links: head.links ?? [], scripts: head.scripts ?? [] };
}

/** Parsed JSON-LD blocks emitted by the route head(). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
function jsonLd(head: Head): any[] {
  const parsed = head.scripts
    .filter((s) => s.type === "application/ld+json")
    .map((s) => JSON.parse(String(s.children)));
  return parsed.flatMap((node) => (Array.isArray(node?.["@graph"]) ? node["@graph"] : [node]));
}

const graphOfType = (head: Head, type: string) =>
  jsonLd(head).find((node) => node["@type"] === type);

/** Posts the route lists on a given page (clamped like the head() does). */
function visiblePosts(page: number, pageSize: BlogPageSize, totalPages: number) {
  const start = (Math.min(page, totalPages) - 1) * pageSize;
  return BLOG_POSTS_NEWEST_FIRST.slice(start, start + pageSize);
}

const metaValue = (head: Head, name: string) =>
  head.meta.find((m) => m.name === name || m.property === name)?.content;

const linkHrefs = (head: Head, rel: string) =>
  head.links.filter((l) => l.rel === rel).map((l) => l.href);

/** Expected canonical for a page: page 1 is clean /blog, deeper pages self-ref. */
const expectedCanonical = (page: number) => (page > 1 ? `${BASE}?page=${page}` : `${BASE}`);

/** Expected prev/next href, carrying pageSize only when non-default. */
function expectedPageHref(page: number, pageSize: BlogPageSize) {
  const url = new URL(BASE);
  if (page > 1) url.searchParams.set("page", String(page));
  if (pageSize !== DEFAULT_BLOG_PAGE_SIZE) url.searchParams.set("pageSize", String(pageSize));
  return url.toString();
}

describe("blog pagination SEO fields", () => {
  it("has enough posts to produce multiple pages at the default size", () => {
    expect(TOTAL).toBeGreaterThan(DEFAULT_BLOG_PAGE_SIZE);
  });

  for (const pageSize of BLOG_PAGE_SIZE_OPTIONS) {
    const totalPages = Math.max(1, Math.ceil(TOTAL / pageSize));
    const label =
      pageSize === DEFAULT_BLOG_PAGE_SIZE ? `default pageSize=${pageSize}` : `pageSize=${pageSize}`;

    describe(label, () => {
      it("page 1: canonical is clean /blog, no rel=prev, next points at page 2", () => {
        const head = headFor(1, pageSize);
        expect(linkHrefs(head, "canonical")).toEqual([expectedCanonical(1)]);
        expect(metaValue(head, "og:url")).toBe(expectedCanonical(1));
        expect(metaValue(head, "robots")).toBe(INDEXABLE);
        expect(linkHrefs(head, "prev")).toEqual([]);
        if (totalPages > 1)
          expect(linkHrefs(head, "next")).toEqual([expectedPageHref(2, pageSize)]);
        else expect(linkHrefs(head, "next")).toEqual([]);
      });

      it("middle pages: self-referencing canonical with both prev and next", () => {
        const middles = Array.from({ length: Math.max(0, totalPages - 2) }, (_, i) => i + 2);
        if (middles.length === 0) {
          expect(totalPages).toBeLessThanOrEqual(2);
          return;
        }
        for (const page of middles) {
          const head = headFor(page, pageSize);
          expect(linkHrefs(head, "canonical")).toEqual([expectedCanonical(page)]);
          expect(metaValue(head, "og:url")).toBe(expectedCanonical(page));
          expect(metaValue(head, "robots")).toBe(INDEXABLE);
          expect(linkHrefs(head, "prev")).toEqual([expectedPageHref(page - 1, pageSize)]);
          expect(linkHrefs(head, "next")).toEqual([expectedPageHref(page + 1, pageSize)]);
          expect(metaValue(head, "description")).toContain(`Page ${page}`);
        }
      });

      it("last page: canonical self-refs, prev only, still indexable", () => {
        const head = headFor(totalPages, pageSize);
        expect(linkHrefs(head, "canonical")).toEqual([expectedCanonical(totalPages)]);
        expect(metaValue(head, "robots")).toBe(INDEXABLE);
        expect(linkHrefs(head, "next")).toEqual([]);
        if (totalPages > 1)
          expect(linkHrefs(head, "prev")).toEqual([expectedPageHref(totalPages - 1, pageSize)]);
        else expect(linkHrefs(head, "prev")).toEqual([]);
      });

      it("never emits pageSize or sort in the canonical on any page", () => {
        for (let page = 1; page <= totalPages; page++) {
          const url = new URL(linkHrefs(headFor(page, pageSize), "canonical")[0]);
          expect(url.pathname).toBe("/blog");
          expect(url.searchParams.get("pageSize")).toBeNull();
          expect(url.searchParams.get("sort")).toBeNull();
        }
      });

      it("emits exactly one canonical link per page", () => {
        for (let page = 1; page <= totalPages; page++) {
          expect(linkHrefs(headFor(page, pageSize), "canonical")).toHaveLength(1);
        }
      });

      it("out-of-range page is noindex with no prev/next chain", () => {
        const head = headFor(totalPages + 1, pageSize);
        expect(metaValue(head, "robots")).toBe(NOINDEX);
        expect(linkHrefs(head, "prev")).toEqual([]);
        expect(linkHrefs(head, "next")).toEqual([]);
      });

      it("non-default sort is noindex on page 1 and the last page", () => {
        for (const page of [1, totalPages]) {
          expect(metaValue(headFor(page, pageSize, "oldest"), "robots")).toBe(NOINDEX);
        }
      });

      it("prev/next carry pageSize only when it is non-default", () => {
        for (let page = 1; page <= totalPages; page++) {
          const head = headFor(page, pageSize);
          for (const href of [...linkHrefs(head, "prev"), ...linkHrefs(head, "next")]) {
            const got = new URL(href).searchParams.get("pageSize");
            expect(got).toBe(pageSize === DEFAULT_BLOG_PAGE_SIZE ? null : String(pageSize));
          }
        }
      });

      it("prev/next chain is symmetric across neighbouring pages", () => {
        for (let page = 1; page < totalPages; page++) {
          const next = linkHrefs(headFor(page, pageSize), "next")[0];
          const backPrev = linkHrefs(headFor(page + 1, pageSize), "prev")[0];
          expect(next).toBe(expectedPageHref(page + 1, pageSize));
          expect(backPrev).toBe(expectedPageHref(page, pageSize));
        }
      });

      describe("structured data", () => {
        const pagesUnderTest = Array.from(new Set([1, Math.ceil(totalPages / 2), totalPages]));

        it("emits exactly one Blog and one BreadcrumbList block per page", () => {
          for (const page of pagesUnderTest) {
            const nodes = jsonLd(headFor(page, pageSize));
            const types = nodes.map((n) => n["@type"]);
            expect(types.filter((t) => t === "Blog")).toHaveLength(1);
            expect(types.filter((t) => t === "BreadcrumbList")).toHaveLength(1);
            for (const node of nodes) {
              expect(node["@context"]).toBe("https://schema.org");
              expect(node["@type"]).toBeTruthy();
            }
          }
        });

        it("Blog url and breadcrumb leaf match the page canonical", () => {
          for (const page of pagesUnderTest) {
            const head = headFor(page, pageSize);
            const canonical = linkHrefs(head, "canonical")[0];
            expect(graphOfType(head, "Blog").url).toBe(canonical);
            const crumbs = graphOfType(head, "BreadcrumbList").itemListElement;
            expect(crumbs).toHaveLength(2);
            expect(crumbs[0].position).toBe(1);
            expect(crumbs[1].position).toBe(2);
            expect(crumbs[1].item).toBe(canonical);
          }
        });

        it("Blog description matches the page-aware meta description", () => {
          for (const page of pagesUnderTest) {
            const head = headFor(page, pageSize);
            expect(graphOfType(head, "Blog").description).toBe(metaValue(head, "description"));
          }
        });

        it("blogPost entries match exactly the posts listed on that page", () => {
          for (const page of pagesUnderTest) {
            const head = headFor(page, pageSize);
            const posts = graphOfType(head, "Blog").blogPost;
            const expected = visiblePosts(page, pageSize, totalPages);
            expect(posts).toHaveLength(expected.length);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
            expect(posts.map((p: any) => p.url)).toEqual(
              expected.map((p) => `https://doseroutine.com/blog/${p.slug}`),
            );
            for (const [i, post] of posts.entries()) {
              expect(post["@type"]).toBe("BlogPosting");
              expect(post.headline).toBe(expected[i].heading);
              expect(post.datePublished).toBe(expected[i].published);
              // author/publisher reference the sitewide Organization by @id
              // so the entity consolidates instead of being redefined.
              expect(post.author?.["@id"]).toBe("https://doseroutine.com/#organization");
              expect(post.publisher?.["@id"]).toBe("https://doseroutine.com/#organization");
            }
          }
        });

        it("no post appears in the structured data of two different pages", () => {
          const seen = new Set<string>();
          for (let page = 1; page <= totalPages; page++) {
            for (const post of graphOfType(headFor(page, pageSize), "Blog").blogPost) {
              expect(seen.has(post.url)).toBe(false);
              seen.add(post.url);
            }
          }
          expect(seen.size).toBe(TOTAL);
        });

        it("publisher identity stays identical across pages", () => {
          const publishers = pagesUnderTest.map((page) =>
            JSON.stringify(graphOfType(headFor(page, pageSize), "Blog").publisher),
          );
          expect(new Set(publishers).size).toBe(1);
          expect(JSON.parse(publishers[0])["@id"]).toBe("https://doseroutine.com/#organization");
        });

        it("out-of-range page still emits valid, canonical-consistent JSON-LD", () => {
          const head = headFor(totalPages + 1, pageSize);
          const canonical = linkHrefs(head, "canonical")[0];
          expect(graphOfType(head, "Blog").url).toBe(canonical);
          expect(graphOfType(head, "Blog").blogPost).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                url: `https://doseroutine.com/blog/${visiblePosts(totalPages, pageSize, totalPages)[0].slug}`,
              }),
            ]),
          );
        });
      });
    });
  }
});

describe("blog pagination human-facing meta text", () => {
  for (const pageSize of BLOG_PAGE_SIZE_OPTIONS) {
    const totalPages = Math.max(1, Math.ceil(TOTAL / pageSize));
    const middle = Math.max(2, Math.ceil(totalPages / 2));
    const pages = Array.from(new Set([1, middle, totalPages])).filter((p) => p <= totalPages);

    describe(`pageSize=${pageSize}`, () => {
      it("emits a title and description on every checked page", () => {
        for (const page of pages) {
          const head = headFor(page, pageSize as BlogPageSize);
          const title = head.meta.find((m) => typeof m.title === "string")?.title;
          const description = metaValue(head, "description");
          expect(title, `title on page ${page}`).toBeTruthy();
          expect(description, `description on page ${page}`).toBeTruthy();
          expect(String(description).length, `description length on page ${page}`).toBeLessThan(
            160,
          );
        }
      });

      it("puts the page number in the title for pages 2+ only", () => {
        for (const page of pages) {
          const head = headFor(page, pageSize as BlogPageSize);
          const title = String(head.meta.find((m) => typeof m.title === "string")?.title);
          if (page === 1) {
            expect(title).not.toMatch(/page\s*\d+/i);
          } else {
            expect(title).toMatch(new RegExp(`Page\\s*${page}\\b`, "i"));
          }
        }
      });

      it("keeps titles and descriptions unique across pages", () => {
        if (totalPages < 2) return;
        const titles = new Set<string>();
        const descriptions = new Set<string>();
        for (let page = 1; page <= totalPages; page += 1) {
          const head = headFor(page, pageSize as BlogPageSize);
          titles.add(String(head.meta.find((m) => typeof m.title === "string")?.title));
          descriptions.add(String(metaValue(head, "description")));
        }
        expect(titles.size).toBe(totalPages);
        expect(descriptions.size).toBe(totalPages);
      });

      it("mirrors title/description into og and twitter tags", () => {
        for (const page of pages) {
          const head = headFor(page, pageSize as BlogPageSize);
          const title = String(head.meta.find((m) => typeof m.title === "string")?.title);
          const description = String(metaValue(head, "description"));
          expect(metaValue(head, "og:title")).toBe(title);
          expect(metaValue(head, "og:description")).toBe(description);
          expect(metaValue(head, "twitter:title")).toBe(title);
          expect(metaValue(head, "twitter:description")).toBe(description);
        }
      });

      it("keeps og:url equal to the canonical with no pageSize or sort leakage", () => {
        for (const page of pages) {
          for (const sort of ["newest", "oldest"]) {
            const head = headFor(page, pageSize as BlogPageSize, sort);
            const canonical = linkHrefs(head, "canonical")[0];
            expect(canonical).toBe(expectedCanonical(page));
            expect(metaValue(head, "og:url")).toBe(canonical);
            expect(canonical).not.toContain("pageSize=");
            expect(canonical).not.toContain("sort=");
          }
        }
      });
    });
  }
});
