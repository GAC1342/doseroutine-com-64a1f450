/**
 * Regression checks for individual blog post pages (/blog/$slug).
 *
 * Drives the REAL route head() for every published post and asserts the
 * canonical URL and robots meta are correct, self-referential and unique —
 * plus the not-found case, which must be noindex with no canonical.
 */

import { describe, expect, it } from "vitest";
import { BLOG_POSTS_NEWEST_FIRST } from "@/lib/blog-posts";
import { blogPostUrl } from "@/lib/blog-seo";
import { Route } from "@/routes/blog.$slug";

const INDEXABLE = "index, follow, max-image-preview:large";
const BASE = "https://doseroutine.com";

type Head = {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<Record<string, string>>;
};

function headFor(slug: string): Head {
  const head = (Route.options as any).head({ params: { slug } });
  return { meta: head.meta ?? [], links: head.links ?? [], scripts: head.scripts ?? [] };
}

const metaValue = (head: Head, name: string) =>
  head.meta.find((m) => m.name === name || m.property === name)?.content;

const linkHrefs = (head: Head, rel: string) =>
  head.links.filter((l) => l.rel === rel).map((l) => l.href);

const jsonLd = (head: Head) =>
  head.scripts
    .filter((s) => s.type === "application/ld+json")
    .map((s) => JSON.parse(String(s.children)) as any);

describe("blog post canonical + robots", () => {
  it("has published posts to check", () => {
    expect(BLOG_POSTS_NEWEST_FIRST.length).toBeGreaterThan(0);
  });

  for (const post of BLOG_POSTS_NEWEST_FIRST) {
    describe(`/blog/${post.slug}`, () => {
      const head = headFor(post.slug);

      it("emits exactly one self-referential canonical", () => {
        const canonicals = linkHrefs(head, "canonical");
        expect(canonicals).toHaveLength(1);
        expect(canonicals[0]).toBe(blogPostUrl(post.slug));
      });

      it("canonical is absolute https, on the project domain, with no query or hash", () => {
        const url = new URL(linkHrefs(head, "canonical")[0]);
        expect(url.protocol).toBe("https:");
        expect(url.origin).toBe(BASE);
        expect(url.pathname).toBe(`/blog/${post.slug}`);
        expect(url.search).toBe("");
        expect(url.hash).toBe("");
        expect(url.pathname.endsWith("/")).toBe(false);
      });

      it("is indexable with the expected robots directive", () => {
        expect(metaValue(head, "robots")).toBe(INDEXABLE);
        expect(head.meta.filter((m) => m.name === "robots")).toHaveLength(1);
      });

      it("og:url matches the canonical", () => {
        expect(metaValue(head, "og:url")).toBe(linkHrefs(head, "canonical")[0]);
      });

      it("JSON-LD url, @id and breadcrumb leaf match the canonical", () => {
        const canonical = linkHrefs(head, "canonical")[0];
        const posting = jsonLd(head).find((n) => n["@type"] === "BlogPosting");
        expect(posting.url).toBe(canonical);
        expect(posting.mainEntityOfPage["@id"]).toBe(canonical);
        const crumbs = jsonLd(head).find((n) => n["@type"] === "BreadcrumbList").itemListElement;
        expect(crumbs[crumbs.length - 1].item).toBe(canonical);
      });
    });
  }

  it("gives every post a unique canonical", () => {
    const canonicals = BLOG_POSTS_NEWEST_FIRST.map((p) => linkHrefs(headFor(p.slug), "canonical")[0]);
    expect(new Set(canonicals).size).toBe(canonicals.length);
  });

  it("never points a post canonical at the blog list or the homepage", () => {
    for (const post of BLOG_POSTS_NEWEST_FIRST) {
      const canonical = linkHrefs(headFor(post.slug), "canonical")[0];
      expect(canonical).not.toBe(`${BASE}/blog`);
      expect(canonical).not.toBe(`${BASE}/`);
    }
  });

  it("marks an unknown slug noindex with no canonical", () => {
    const head = headFor("this-post-does-not-exist");
    expect(metaValue(head, "robots")).toContain("noindex");
    expect(linkHrefs(head, "canonical")).toEqual([]);
  });
});
