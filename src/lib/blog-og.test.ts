import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { BLOG_OG_CARD_SLUGS } from "@/lib/blog-og-manifest";
import { BLOG_FALLBACK_IMAGE, blogPostHead, blogPostImageUrl, deriveBlogSeo } from "@/lib/blog-seo";

describe("blog social cards", () => {
  it("has a rendered card on disk for every post", () => {
    for (const post of BLOG_POSTS) {
      expect(
        BLOG_OG_CARD_SLUGS.has(post.slug),
        `run scripts/generate-blog-og.py for ${post.slug}`,
      ).toBe(true);
      expect(existsSync(`public/og/blog/${post.slug}.png`)).toBe(true);
    }
  });

  it("prefers a featured image, then the card, then the site fallback", () => {
    const slug = BLOG_POSTS[0].slug;
    expect(blogPostImageUrl(slug, "/og/blog-hero.jpg")).toBe(
      "https://doseroutine.com/og/blog-hero.jpg",
    );
    expect(blogPostImageUrl(slug, "https://cdn.example.com/a.webp")).toBe(
      "https://cdn.example.com/a.webp",
    );
    expect(blogPostImageUrl(slug)).toBe(`https://doseroutine.com/og/blog/${slug}.png`);
    expect(blogPostImageUrl("does-not-exist")).toBe(BLOG_FALLBACK_IMAGE);
  });

  it("emits absolute og/twitter images with the right mime type", () => {
    for (const post of BLOG_POSTS) {
      const seo = deriveBlogSeo(post);
      expect(seo.image.startsWith("https://")).toBe(true);
      const meta = blogPostHead(post).meta;
      const og = meta.find((m) => "property" in m && m.property === "og:image");
      const tw = meta.find((m) => "name" in m && m.name === "twitter:image");
      expect(og?.content).toBe(seo.image);
      expect(tw?.content).toBe(seo.image);
    }
    const jpg = deriveBlogSeo({ ...BLOG_POSTS[0], featuredImage: "/og/doseroutine-home.jpg" });
    expect(jpg.imageType).toBe("image/jpeg");
    expect(deriveBlogSeo(BLOG_POSTS[0]).imageType).toBe("image/png");
  });
});
