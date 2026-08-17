import { describe, it, expect } from "vitest";
import {
  blogListPageMeta,
  buildBlogListPageUrl,
  buildBlogPaginationLinks,
  blogListSitemapPaths,
  parseBlogListParams,
} from "../blog-list-canonical";

const BASE = {
  title: "Research & Updates — Peptide and GLP-1 News | DoseRoutine",
  description: "Plain-English updates on peptide research.",
};

describe("buildBlogListPageUrl", () => {
  it("returns the clean URL for page 1", () => {
    expect(buildBlogListPageUrl(1)).toBe("https://doseroutine.com/blog");
    expect(buildBlogListPageUrl(0)).toBe("https://doseroutine.com/blog");
  });

  it("adds page for deeper pages", () => {
    expect(buildBlogListPageUrl(2)).toBe("https://doseroutine.com/blog?page=2");
    expect(buildBlogListPageUrl(7)).toBe("https://doseroutine.com/blog?page=7");
  });
});

describe("parseBlogListParams", () => {
  it("defaults when params are missing or invalid", () => {
    expect(parseBlogListParams("https://doseroutine.com/blog")).toEqual({
      page: 1,
      sort: "newest",
      pageSize: 3,
    });
    expect(parseBlogListParams("https://doseroutine.com/blog?page=abc&pageSize=0")).toEqual({
      page: 1,
      sort: "newest",
      pageSize: 3,
    });
  });

  it("reads page, sort and pageSize", () => {
    expect(
      parseBlogListParams("https://doseroutine.com/blog?page=2&sort=oldest&pageSize=9"),
    ).toEqual({
      page: 2,
      sort: "oldest",
      pageSize: 9,
    });
  });
});

describe("blogListPageMeta", () => {
  it("keeps base copy on page 1", () => {
    expect(blogListPageMeta(1, BASE)).toEqual(BASE);
  });

  it("makes deeper pages distinct", () => {
    const meta = blogListPageMeta(3, BASE);
    expect(meta.title).toBe("Research & Updates — Page 3 | DoseRoutine");
    expect(meta.description.startsWith("Page 3 of plain-English updates")).toBe(true);
    expect(meta.title).not.toBe(BASE.title);
  });
});

describe("rel=prev/next with pageSize and sort", () => {
  it("keeps the URL clean for defaults", () => {
    expect(buildBlogListPageUrl(2, { pageSize: 3, sort: "newest" })).toBe(
      "https://doseroutine.com/blog?page=2",
    );
  });

  it("preserves non-default pageSize and sort", () => {
    expect(buildBlogListPageUrl(3, { pageSize: 6, sort: "oldest" })).toBe(
      "https://doseroutine.com/blog?page=3&sort=oldest&pageSize=6",
    );
    expect(buildBlogListPageUrl(1, { pageSize: 9 })).toBe(
      "https://doseroutine.com/blog?pageSize=9",
    );
  });

  it("normalizes an invalid pageSize back to the default (omitted)", () => {
    expect(buildBlogListPageUrl(2, { pageSize: "abc" })).toBe(
      "https://doseroutine.com/blog?page=2",
    );
  });

  it("emits next only on the first page and prev only on the last", () => {
    expect(buildBlogPaginationLinks(1, 3, { pageSize: 6 })).toEqual([
      { rel: "next", href: "https://doseroutine.com/blog?page=2&pageSize=6" },
    ]);
    expect(buildBlogPaginationLinks(3, 3, { pageSize: 6 })).toEqual([
      { rel: "prev", href: "https://doseroutine.com/blog?page=2&pageSize=6" },
    ]);
  });

  it("emits both links in the middle of the chain", () => {
    expect(buildBlogPaginationLinks(2, 3, { pageSize: 9, sort: "oldest" })).toEqual([
      { rel: "prev", href: "https://doseroutine.com/blog?sort=oldest&pageSize=9" },
      { rel: "next", href: "https://doseroutine.com/blog?page=3&sort=oldest&pageSize=9" },
    ]);
  });

  it("emits nothing for a single page or an out-of-range page", () => {
    expect(buildBlogPaginationLinks(1, 1)).toEqual([]);
    expect(buildBlogPaginationLinks(9, 3)).toEqual([]);
    expect(buildBlogPaginationLinks(0, 3)).toEqual([]);
  });
});

describe("blogListSitemapPaths", () => {
  it("lists /blog plus one canonical URL per page", () => {
    expect(blogListSitemapPaths(7)).toEqual(["/blog", "/blog?page=2", "/blog?page=3"]);
  });

  it("always lists at least /blog", () => {
    expect(blogListSitemapPaths(0)).toEqual(["/blog"]);
    expect(blogListSitemapPaths(3)).toEqual(["/blog"]);
  });

  it("respects an explicit page size and never emits pageSize params", () => {
    const paths = blogListSitemapPaths(20, 9);
    expect(paths).toEqual(["/blog", "/blog?page=2", "/blog?page=3"]);
    expect(paths.some((p) => p.includes("pageSize") || p.includes("sort"))).toBe(false);
  });
});
