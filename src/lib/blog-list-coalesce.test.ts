import { describe, expect, it } from "vitest";
import { applyBlogPageSize, applyBlogSort } from "./blog-list-canonical";
import {
  blogListSearchEqual,
  coalesceBlogListUpdates,
  shouldCommitBlogListSearch,
} from "./blog-list-coalesce";

const base = { sort: "newest", page: 1, pageSize: 3 };

describe("blog list coalescing", () => {
  it("folds a burst of sort/pageSize taps into one search state", () => {
    const next = coalesceBlogListUpdates({ ...base, page: 4 }, [
      (p) => applyBlogSort(p, "oldest"),
      (p) => applyBlogPageSize(p, 6),
      (p) => applyBlogSort(p, "relevance"),
      (p) => applyBlogPageSize(p, 9),
    ]);
    expect(next).toEqual({ sort: "relevance", page: 1, pageSize: 9 });
  });

  it("normalizes unsupported page sizes while folding", () => {
    const next = coalesceBlogListUpdates(base, [(p) => applyBlogPageSize(p, 12)]);
    expect(next.pageSize).toBe(3);
  });

  it("treats equivalent views as equal", () => {
    expect(blogListSearchEqual(base, { sort: "newest", page: 1, pageSize: 12 })).toBe(true);
    expect(blogListSearchEqual(base, { ...base, sort: "oldest" })).toBe(false);
  });

  it("drops bursts that resolve back to the current URL", () => {
    const next = coalesceBlogListUpdates(base, [
      (p) => applyBlogSort(p, "oldest"),
      (p) => applyBlogSort(p, "newest"),
    ]);
    expect(shouldCommitBlogListSearch(base, next)).toBe(false);
  });

  it("commits when the burst changes the view", () => {
    const next = coalesceBlogListUpdates(base, [(p) => applyBlogPageSize(p, 9)]);
    expect(shouldCommitBlogListSearch(base, next)).toBe(true);
  });

  it("keeps unrelated params (page reset semantics) intact", () => {
    const next = coalesceBlogListUpdates({ sort: "oldest", page: 7, pageSize: 6 }, [
      (p) => applyBlogSort(p, "newest"),
    ]);
    expect(next).toEqual({ sort: "newest", page: 1, pageSize: 6 });
  });
});
