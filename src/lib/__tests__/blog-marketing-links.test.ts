import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { LONGTAIL_BLOG_POSTS } from "@/lib/blog-posts-longtail";
import { MARKETING_BLOG_LINKS } from "@/lib/marketing-blog-links";
import { MARKETING_PAGES, resolveBlogMarketingLinks } from "@/lib/blog-marketing-links";

describe("blog → marketing internal links", () => {
  it("every marketing page key exists in the outbound link plan", () => {
    for (const page of MARKETING_PAGES) {
      expect(Object.keys(MARKETING_BLOG_LINKS)).toContain(page.key);
    }
  });

  it("marketing page hrefs are absolute internal paths", () => {
    for (const page of MARKETING_PAGES) {
      expect(page.href).toMatch(/^\/(best-|for\/)/);
    }
  });

  it("each long-tail post links to at least two relevant marketing pages", () => {
    for (const post of LONGTAIL_BLOG_POSTS) {
      const links = resolveBlogMarketingLinks(post);
      expect(links.length, post.slug).toBeGreaterThanOrEqual(2);
      expect(new Set(links.map((l) => l.href)).size).toBe(links.length);
      for (const l of links) {
        expect(l.anchor.length).toBeGreaterThan(15);
        expect(l.anchor.toLowerCase()).not.toMatch(/read more|click here|learn more/);
      }
    }
  });

  it("reciprocal pages rank first", () => {
    for (const post of BLOG_POSTS) {
      const links = resolveBlogMarketingLinks(post);
      const firstNonRecip = links.findIndex((l) => !l.reciprocal);
      if (firstNonRecip === -1) continue;
      expect(links.slice(firstNonRecip).every((l) => !l.reciprocal)).toBe(true);
    }
  });

  it("never emits more than three links per post", () => {
    for (const post of BLOG_POSTS) {
      expect(resolveBlogMarketingLinks(post).length).toBeLessThanOrEqual(3);
    }
  });
});
