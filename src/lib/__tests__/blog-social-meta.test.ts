import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog-posts";
import {
  blogSocialMetaFailures,
  validateAllBlogSocialMeta,
  validateBlogSocialMeta,
} from "@/lib/blog-social-meta-validate";

describe("blog OpenGraph + Twitter card meta", () => {
  const results = validateAllBlogSocialMeta();

  it("renders complete OG and Twitter tags on every post", () => {
    expect(blogSocialMetaFailures(results)).toEqual([]);
  });

  it("covers every published post", () => {
    expect(results).toHaveLength(BLOG_POSTS.length);
  });

  it("fails when a social tag is missing or malformed", () => {
    const broken = validateBlogSocialMeta({
      ...BLOG_POSTS[0],
      featuredImage: "/relative-only.txt",
      featuredImageAlt: "",
    });
    expect(broken.issues.map((i) => i.tag)).toContain("og:image");
  });
});
