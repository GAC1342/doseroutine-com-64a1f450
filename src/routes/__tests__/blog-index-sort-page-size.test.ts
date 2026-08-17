import { describe, it, expect } from "vitest";
import {
  applyBlogPageSize,
  applyBlogSort,
  BLOG_PAGE_SIZE_OPTIONS,
  normalizeBlogPageSize,
  type BlogListSearch,
} from "@/lib/blog-list-canonical";
import { BLOG_SORTS } from "@/lib/blog-posts";

const PAGES = [1, 2, 5];

describe("blog list: sort x pageSize synchronization", () => {
  it("keeps pageSize and resets to page 1 for every sort/pageSize/page combination", () => {
    for (const sort of BLOG_SORTS) {
      for (const pageSize of BLOG_PAGE_SIZE_OPTIONS) {
        for (const page of PAGES) {
          const prev: BlogListSearch = { sort: "newest", page, pageSize };
          const next = applyBlogSort(prev, sort);
          expect(next.sort).toBe(sort);
          expect(next.pageSize).toBe(pageSize);
          expect(next.page).toBe(1);
        }
      }
    }
  });

  it("keeps sort and resets to page 1 when page size changes", () => {
    for (const sort of BLOG_SORTS) {
      for (const from of BLOG_PAGE_SIZE_OPTIONS) {
        for (const to of BLOG_PAGE_SIZE_OPTIONS) {
          const next = applyBlogPageSize({ sort, page: 4, pageSize: from }, to);
          expect(next.sort).toBe(sort);
          expect(next.pageSize).toBe(to);
          expect(next.page).toBe(1);
        }
      }
    }
  });

  it("normalizes an invalid incoming pageSize while switching sort", () => {
    for (const sort of BLOG_SORTS) {
      const carried = applyBlogSort(
        { sort: "newest", page: 3, pageSize: normalizeBlogPageSize("abc") },
        sort,
      );
      expect(carried.pageSize).toBe(3);
      expect(carried.page).toBe(1);
    }
  });

  it("normalizes bad page size input on change and never breaks the list", () => {
    for (const bad of [12, -1, 0, 3.5, Number.NaN, null, "abc", undefined]) {
      const next = applyBlogPageSize({ sort: "relevance", page: 2, pageSize: 9 }, bad);
      expect(next.pageSize).toBe(3);
      expect(next.sort).toBe("relevance");
      expect(next.page).toBe(1);
    }
  });

  it("is stable when sort and page size change in sequence, in either order", () => {
    for (const sort of BLOG_SORTS) {
      for (const size of BLOG_PAGE_SIZE_OPTIONS) {
        const start: BlogListSearch = { sort: "newest", page: 7, pageSize: 3 };
        const a = applyBlogPageSize(applyBlogSort(start, sort), size);
        const b = applyBlogSort(applyBlogPageSize(start, size), sort);
        expect(a).toEqual(b);
        expect(a).toEqual({ sort, page: 1, pageSize: size });
      }
    }
  });

  it("preserves unrelated search params", () => {
    const prev = { sort: "newest", page: 3, pageSize: 6, q: "glp-1" } as BlogListSearch & {
      q: string;
    };
    expect(applyBlogSort(prev, "oldest")).toMatchObject({ q: "glp-1", pageSize: 6, page: 1 });
    expect(applyBlogPageSize(prev, 9)).toMatchObject({ q: "glp-1", sort: "newest", page: 1 });
  });
});
