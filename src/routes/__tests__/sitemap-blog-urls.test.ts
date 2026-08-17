/**
 * Sitemap + robots blog coverage guard.
 *
 * Invokes the real /sitemap.xml GET handler (database mocked) and asserts:
 *
 *   - every published blog post appears exactly once, at its canonical URL
 *   - the /blog list and every paginated page (default page size) appear,
 *     matching the canonical form the blog route emits
 *   - no non-canonical blog URL (pageSize, sort, page=1, trailing slash)
 *     leaks into the sitemap
 *   - robots.txt advertises the sitemap and does not block blog URLs
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BLOG_POSTS_NEWEST_FIRST } from "@/lib/blog-posts";
import { blogListSitemapPaths, DEFAULT_BLOG_PAGE_SIZE } from "@/lib/blog-list-canonical";
import { blogPostUrl } from "@/lib/blog-seo";

vi.mock("@/integrations/supabase/client", () => {
  const rows = [{ slug: "bpc-157" }, { slug: "tb-500" }];
  return {
    supabase: {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: rows, error: null }),
          then: (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null }),
        }),
      }),
    },
  };
});

const BASE = "https://doseroutine.com";
type Handler = (ctx: { request: Request }) => Promise<Response>;

let xml = "";
let locs: string[] = [];

beforeAll(async () => {
  const mod = await import("../sitemap[.]xml");
  const GET = (mod.Route as unknown as { options: { server: { handlers: { GET: Handler } } } })
    .options.server.handlers.GET;
  const res = await GET({ request: new Request(`${BASE}/sitemap.xml`) });
  xml = await res.text();
  locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
});

const blogLocs = () => locs.filter((l) => l.startsWith(`${BASE}/blog`));

describe("sitemap.xml blog coverage", () => {
  it("is well-formed XML with a urlset and at least one URL", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<urlset");
    expect(locs.length).toBeGreaterThan(0);
  });

  it("contains no duplicate URLs at all", () => {
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("includes every published blog post at its canonical URL", () => {
    for (const post of BLOG_POSTS_NEWEST_FIRST) {
      expect(locs).toContain(blogPostUrl(post.slug));
    }
  });

  it("lists each post exactly once", () => {
    for (const post of BLOG_POSTS_NEWEST_FIRST) {
      expect(locs.filter((l) => l === blogPostUrl(post.slug))).toHaveLength(1);
    }
  });

  it("includes /blog and every paginated index page at the default page size", () => {
    const expected = blogListSitemapPaths(BLOG_POSTS_NEWEST_FIRST.length).map((p) => `${BASE}${p}`);
    expect(expected[0]).toBe(`${BASE}/blog`);
    for (const url of expected) expect(locs).toContain(url);

    const totalPages = Math.ceil(BLOG_POSTS_NEWEST_FIRST.length / DEFAULT_BLOG_PAGE_SIZE);
    expect(expected).toHaveLength(Math.max(1, totalPages));
  });

  it("paginated list URLs match the canonical form (page=N, no pageSize/sort)", () => {
    const listUrls = blogLocs().filter((l) => l === `${BASE}/blog` || l.includes("/blog?"));
    for (const url of listUrls) {
      const u = new URL(url);
      expect(u.pathname).toBe("/blog");
      expect(u.searchParams.get("pageSize")).toBeNull();
      expect(u.searchParams.get("sort")).toBeNull();
      const page = u.searchParams.get("page");
      if (page !== null) expect(Number(page)).toBeGreaterThan(1);
    }
  });

  it("never lists a non-canonical blog URL", () => {
    for (const url of blogLocs()) {
      expect(url).not.toContain("pageSize=");
      expect(url).not.toContain("sort=");
      expect(url).not.toContain("page=1");
      expect(url.endsWith("/")).toBe(false);
      expect(url.startsWith(`${BASE}/blog`)).toBe(true);
    }
  });

  it("does not list a blog page beyond the last one", () => {
    const totalPages = Math.max(
      1,
      Math.ceil(BLOG_POSTS_NEWEST_FIRST.length / DEFAULT_BLOG_PAGE_SIZE),
    );
    for (const url of blogLocs()) {
      const page = new URL(url).searchParams.get("page");
      if (page) expect(Number(page)).toBeLessThanOrEqual(totalPages);
    }
  });

  it("emits a self-referential xhtml canonical for each blog post URL", () => {
    for (const post of BLOG_POSTS_NEWEST_FIRST) {
      const canonical = blogPostUrl(post.slug);
      expect(xml).toContain(`<xhtml:link rel="canonical" href="${canonical}" />`);
    }
  });

  it("carries a content-derived lastmod for each post, never a build timestamp", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const post of BLOG_POSTS_NEWEST_FIRST) {
      const block = xml.split(`<loc>${blogPostUrl(post.slug)}</loc>`)[1]?.split("</url>")[0] ?? "";
      expect(block).toContain(`<lastmod>${post.updated}</lastmod>`);
      if (post.updated !== today) expect(block).not.toContain(`<lastmod>${today}</lastmod>`);
    }
  });
});

describe("robots.txt sitemap directive", () => {
  const robots = readFileSync(join(process.cwd(), "public", "robots.txt"), "utf8");
  const lines = robots.split("\n").map((l) => l.trim());

  it("advertises the canonical sitemap plus the RSS discovery feed", () => {
    const directives = lines.filter((l) => /^sitemap:/i.test(l));
    expect(directives).toHaveLength(2);
    expect(directives[0]).toBe(`Sitemap: ${BASE}/sitemap.xml`);
    expect(directives[1]).toBe(`Sitemap: ${BASE}/feed.xml`);
  });

  it("has no site-wide Disallow that would block the sitemap URLs", () => {
    expect(lines).not.toContain("Disallow: /");
  });

  it("does not disallow /blog for any agent", () => {
    for (const line of lines) {
      if (/^disallow:/i.test(line)) {
        const path = line.split(":")[1].trim();
        if (path) expect(`${BASE}/blog`.startsWith(`${BASE}${path}`)).toBe(false);
      }
    }
  });
});
