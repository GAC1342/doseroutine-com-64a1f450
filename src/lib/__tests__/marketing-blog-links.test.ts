import { describe, expect, it } from "vitest";
import { ROUNDUPS, USE_CASES } from "@/lib/app-roundups";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { sectionAnchorId } from "@/lib/blog-section-anchors";
import {
  MARKETING_BLOG_LINKS,
  groupMarketingBlogLinks,
  resolveMarketingBlogLinks,
} from "@/lib/marketing-blog-links";

const PAGE_KEYS = [...Object.keys(ROUNDUPS), ...Object.keys(USE_CASES)];
const GENERIC = /^(read more|click here|learn more|here|this post|more)$/i;

describe("internal linking plan for /best-* and /for/*", () => {
  it("covers every marketing page", () => {
    for (const key of PAGE_KEYS) {
      expect(MARKETING_BLOG_LINKS[key], `missing link plan for ${key}`).toBeDefined();
    }
    // No orphan keys pointing at pages that no longer exist.
    for (const key of Object.keys(MARKETING_BLOG_LINKS)) {
      expect(PAGE_KEYS, `unknown page key ${key}`).toContain(key);
    }
  });

  it.each(PAGE_KEYS)("%s links to retatrutide and orforglipron sections", (key) => {
    const links = resolveMarketingBlogLinks(key);
    expect(links.length).toBeGreaterThanOrEqual(5);
    const posts = links.map((l) => l.post).join(" ");
    expect(posts).toMatch(/retatrutide/);
    expect(posts).toMatch(/orforglipron/);
  });

  it.each(PAGE_KEYS)("%s uses resolvable anchors and descriptive anchor text", (key) => {
    const links = resolveMarketingBlogLinks(key);
    const seen = new Set<string>();
    for (const l of links) {
      const post = BLOG_POSTS.find((p) => p.slug === l.post)!;
      const section = post.sections.find((s) => s.heading === l.section)!;
      expect(l.href).toBe(`/blog/${post.slug}#${sectionAnchorId(section.heading)}`);

      expect(GENERIC.test(l.anchor)).toBe(false);
      expect(l.anchor.trim().split(/\s+/).length).toBeGreaterThanOrEqual(4);
      expect(l.anchor.length).toBeLessThanOrEqual(90);
      expect(l.blurb.length).toBeGreaterThan(10);

      expect(seen.has(l.href), `duplicate link ${l.href} on ${key}`).toBe(false);
      seen.add(l.href);
    }
  });

  it.each(PAGE_KEYS)("%s spreads its related research over several posts", (key) => {
    const groups = groupMarketingBlogLinks(key);
    // A "Related research" block that points at one article is a nav link, not
    // a research block: require breadth across the long-tail set.
    expect(groups.length).toBeGreaterThanOrEqual(4);
    expect(groups.flatMap((g) => g.links)).toHaveLength(resolveMarketingBlogLinks(key).length);
    for (const g of groups) {
      expect(g.postHref).toBe(`/blog/${g.post}`);
      expect(g.postTitle.length).toBeGreaterThan(10);
      // Grouping must be exhaustive: no post appears twice.
      expect(groups.filter((o) => o.post === g.post)).toHaveLength(1);
    }
  });

  it("uses most of the long-tail catalogue across the marketing set", () => {
    const posts = new Set(
      PAGE_KEYS.flatMap((k) => resolveMarketingBlogLinks(k).map((l) => l.post)),
    );
    expect(posts.size).toBeGreaterThanOrEqual(8);
  });
});
