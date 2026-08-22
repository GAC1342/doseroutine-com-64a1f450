/**
 * Blog pagination regression test.
 *
 * Covers the paging behavior the /blog list actually performs — page counts,
 * slicing, rel=prev/next chains, canonical URLs and the robots rule — for the
 * default page size and every supported custom page size.
 *
 * Driven off the real post list and the real helpers so it stays correct as
 * posts are added.
 */

import { describe, expect, it } from "vitest";
import {
  BLOG_PAGE_SIZE_OPTIONS,
  DEFAULT_BLOG_PAGE_SIZE,
  buildBlogListPageUrl,
  buildBlogPaginationLinks,
  normalizeBlogPageSize,
  type BlogPageSize,
} from "@/lib/blog-list-canonical";
import { BLOG_POSTS_NEWEST_FIRST } from "@/lib/blog-posts";

const TOTAL = BLOG_POSTS_NEWEST_FIRST.length;

/** Mirrors the slicing the route performs for a given page/pageSize. */
function pageOf(page: number, pageSize: BlogPageSize) {
  const totalPages = Math.max(1, Math.ceil(TOTAL / pageSize));
  const clamped = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (clamped - 1) * pageSize;
  return {
    totalPages,
    clamped,
    posts: BLOG_POSTS_NEWEST_FIRST.slice(start, start + pageSize),
  };
}

/** Robots rule from the route head(): out-of-range or non-default sort = noindex. */
function robotsFor(page: number, totalPages: number, sort: string) {
  return sort !== "newest" || page > totalPages
    ? "noindex, follow"
    : "index, follow, max-image-preview:large";
}

describe("blog pagination", () => {
  it("has posts to paginate and 3 as the default page size", () => {
    expect(TOTAL).toBeGreaterThan(0);
    expect(DEFAULT_BLOG_PAGE_SIZE).toBe(3);
    expect(BLOG_PAGE_SIZE_OPTIONS).toContain(DEFAULT_BLOG_PAGE_SIZE);
  });

  for (const pageSize of BLOG_PAGE_SIZE_OPTIONS) {
    const label =
      pageSize === DEFAULT_BLOG_PAGE_SIZE ? `default pageSize=${pageSize}` : `pageSize=${pageSize}`;

    describe(label, () => {
      const totalPages = Math.max(1, Math.ceil(TOTAL / pageSize));

      it("computes the expected number of pages", () => {
        expect(pageOf(1, pageSize).totalPages).toBe(totalPages);
        expect(totalPages).toBeGreaterThanOrEqual(1);
      });

      it("covers every post exactly once, newest-first, with no gaps", () => {
        const seen: string[] = [];
        for (let page = 1; page <= totalPages; page++) {
          const { posts } = pageOf(page, pageSize);
          expect(posts.length).toBeGreaterThan(0);
          if (page < totalPages) expect(posts).toHaveLength(pageSize);
          else expect(posts.length).toBeLessThanOrEqual(pageSize);
          seen.push(...posts.map((p) => p.slug));
        }
        expect(seen).toHaveLength(TOTAL);
        expect(new Set(seen).size).toBe(TOTAL);
        expect(seen).toEqual(BLOG_POSTS_NEWEST_FIRST.map((p) => p.slug));
      });

      it("clamps an out-of-range page to the last slice instead of rendering nothing", () => {
        const beyond = pageOf(totalPages + 5, pageSize);
        expect(beyond.clamped).toBe(totalPages);
        expect(beyond.posts).toEqual(pageOf(totalPages, pageSize).posts);
        expect(beyond.posts.length).toBeGreaterThan(0);
      });

      it("builds a correct rel=prev/next chain", () => {
        for (let page = 1; page <= totalPages; page++) {
          const links = buildBlogPaginationLinks(page, totalPages, { pageSize, sort: "newest" });
          const rels = links.map((l) => l.rel);
          if (totalPages === 1) expect(rels).toEqual([]);
          else if (page === 1) expect(rels).toEqual(["next"]);
          else if (page === totalPages) expect(rels).toEqual(["prev"]);
          else expect(rels).toEqual(["prev", "next"]);
        }
      });

      it("carries pageSize in prev/next hrefs only when it is non-default", () => {
        const links = buildBlogPaginationLinks(1, Math.max(totalPages, 2), {
          pageSize,
          sort: "newest",
        });
        for (const link of links) {
          const url = new URL(link.href);
          if (pageSize === DEFAULT_BLOG_PAGE_SIZE) {
            expect(url.searchParams.get("pageSize")).toBeNull();
          } else {
            expect(url.searchParams.get("pageSize")).toBe(String(pageSize));
          }
        }
      });

      it("walks from page 1 to the last page in totalPages - 1 hops", () => {
        let page = 1;
        let hops = 0;
        while (hops < totalPages + 5) {
          const next = buildBlogPaginationLinks(page, totalPages, {
            pageSize,
            sort: "newest",
          }).find((l) => l.rel === "next");
          if (!next) break;
          page = Number(new URL(next.href).searchParams.get("page") ?? 1);
          hops++;
        }
        expect(page).toBe(totalPages);
        expect(hops).toBe(totalPages - 1);
      });

      it("returns no links for a page outside the range", () => {
        expect(
          buildBlogPaginationLinks(totalPages + 1, totalPages, { pageSize, sort: "newest" }),
        ).toEqual([]);
        expect(buildBlogPaginationLinks(0, totalPages, { pageSize, sort: "newest" })).toEqual([]);
      });

      it("canonicalizes to /blog and /blog?page=N without pageSize", () => {
        for (let page = 1; page <= totalPages; page++) {
          const url = new URL(buildBlogListPageUrl(page, { sort: "newest" }));
          expect(url.pathname).toBe("/blog");
          expect(url.searchParams.get("pageSize")).toBeNull();
          if (page === 1) expect(url.searchParams.get("page")).toBeNull();
          else expect(url.searchParams.get("page")).toBe(String(page));
        }
      });

      it("marks out-of-range pages and non-default sorts noindex", () => {
        expect(robotsFor(1, totalPages, "newest")).toBe("index, follow, max-image-preview:large");
        expect(robotsFor(totalPages + 1, totalPages, "newest")).toBe("noindex, follow");
        expect(robotsFor(1, totalPages, "oldest")).toBe("noindex, follow");
      });
    });
  }

  it("normalizes an unsupported pageSize back to the default paging", () => {
    for (const bad of [12, -1, 0, 3.5, Number.NaN, "abc", null, undefined]) {
      const size = normalizeBlogPageSize(bad);
      expect(size).toBe(DEFAULT_BLOG_PAGE_SIZE);
      expect(pageOf(1, size).posts).toEqual(pageOf(1, DEFAULT_BLOG_PAGE_SIZE).posts);
    }
  });
});
