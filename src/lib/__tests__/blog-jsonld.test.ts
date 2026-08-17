import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog-posts";
import {
  blogJsonLdFailures,
  parseJsonLdBlocks,
  validateAllBlogPostJsonLd,
  validateBlogPostJsonLd,
} from "@/lib/blog-jsonld-validate";

describe("blog JSON-LD required fields", () => {
  const results = validateAllBlogPostJsonLd();

  it("emits an Article node with headline, dates, author and publisher on every post", () => {
    expect(blogJsonLdFailures(results)).toEqual([]);
  });

  it("covers every published post", () => {
    expect(results).toHaveLength(BLOG_POSTS.length);
    expect(results.every((r) => r.article)).toBe(true);
  });

  it("fails when a required field is missing", () => {
    const post = { ...BLOG_POSTS[0], heading: "", published: "not-a-date" };
    const issues = validateBlogPostJsonLd(post).issues.map((i) => i.field);
    expect(issues).toContain("headline");
    expect(issues).toContain("datePublished");
  });

  it("flags invalid JSON-LD blocks", () => {
    const nodes = parseJsonLdBlocks({
      scripts: [{ type: "application/ld+json", children: "{oops" }],
    });
    expect(nodes[0]).toHaveProperty("__invalidJson");
  });
});
