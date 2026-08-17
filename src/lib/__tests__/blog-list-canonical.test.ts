import { describe, it, expect } from "vitest";
import { buildBlogListCanonical } from "../blog-list-canonical";

describe("buildBlogListCanonical", () => {
  it("returns the clean /blog URL when no params are present", () => {
    expect(buildBlogListCanonical("https://doseroutine.com/blog")).toBe(
      "https://doseroutine.com/blog",
    );
    expect(buildBlogListCanonical("https://doseroutine.com/blog/")).toBe(
      "https://doseroutine.com/blog",
    );
  });

  it("strips pageSize so /blog?pageSize=6 and /blog?pageSize=9 consolidate", () => {
    expect(buildBlogListCanonical("https://doseroutine.com/blog?pageSize=6")).toBe(
      "https://doseroutine.com/blog",
    );
    expect(buildBlogListCanonical("https://doseroutine.com/blog?pageSize=9")).toBe(
      "https://doseroutine.com/blog",
    );
  });

  it("strips sort param", () => {
    expect(buildBlogListCanonical("https://doseroutine.com/blog?sort=oldest")).toBe(
      "https://doseroutine.com/blog",
    );
  });

  it("strips page=1 so the first page canonicalizes to clean /blog", () => {
    expect(buildBlogListCanonical("https://doseroutine.com/blog?page=1")).toBe(
      "https://doseroutine.com/blog",
    );
    expect(buildBlogListCanonical("https://doseroutine.com/blog?page=1&pageSize=9")).toBe(
      "https://doseroutine.com/blog",
    );
  });

  it("preserves page when greater than 1", () => {
    expect(buildBlogListCanonical("https://doseroutine.com/blog?page=2")).toBe(
      "https://doseroutine.com/blog?page=2",
    );
  });

  it("preserves page but strips pageSize and sort together", () => {
    expect(
      buildBlogListCanonical("https://doseroutine.com/blog?page=2&pageSize=9&sort=oldest"),
    ).toBe("https://doseroutine.com/blog?page=2");
  });

  it("ignores invalid or zero page values", () => {
    expect(buildBlogListCanonical("https://doseroutine.com/blog?page=0")).toBe(
      "https://doseroutine.com/blog",
    );
    expect(buildBlogListCanonical("https://doseroutine.com/blog?page=-1")).toBe(
      "https://doseroutine.com/blog",
    );
    expect(buildBlogListCanonical("https://doseroutine.com/blog?page=abc")).toBe(
      "https://doseroutine.com/blog",
    );
  });
});
