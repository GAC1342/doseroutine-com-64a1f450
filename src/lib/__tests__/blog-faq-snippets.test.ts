import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { LONGTAIL_BLOG_POSTS } from "@/lib/blog-posts-longtail";
import {
  FAQ_MAX_CHARS,
  FAQ_MAX_WORDS,
  FAQ_MIN_WORDS,
  faqAnchorId,
  faqWordCount,
} from "@/lib/faq-snippet";
import { blogPostHead } from "@/lib/blog-seo";

const LONGTAIL = LONGTAIL_BLOG_POSTS.map((p) => p.slug);

describe("long-tail blog FAQs target featured snippets", () => {
  it.each(LONGTAIL)("%s has at least 5 unique questions", (slug) => {
    const post = BLOG_POSTS.find((p) => p.slug === slug)!;
    expect(post.faqs.length).toBeGreaterThanOrEqual(5);
    const qs = post.faqs.map((f) => f.q);
    expect(new Set(qs).size).toBe(qs.length);
    for (const q of qs) expect(q.trim().endsWith("?")).toBe(true);
  });

  it.each(LONGTAIL)("%s answers are snippet length (%s-%s words)", (slug) => {
    const post = BLOG_POSTS.find((p) => p.slug === slug)!;
    for (const f of post.faqs) {
      const words = faqWordCount(f.a);
      expect(words, `${slug}: "${f.q}" has ${words} words`).toBeGreaterThanOrEqual(FAQ_MIN_WORDS);
      expect(words, `${slug}: "${f.q}" has ${words} words`).toBeLessThanOrEqual(FAQ_MAX_WORDS);
      expect(f.a.length, `${slug}: "${f.q}" is too long to lift whole`).toBeLessThanOrEqual(
        FAQ_MAX_CHARS,
      );
    }
  });

  it.each(LONGTAIL)("%s emits FAQPage schema anchored to on-page ids", (slug) => {
    const post = BLOG_POSTS.find((p) => p.slug === slug)!;
    const scripts = blogPostHead(post).scripts ?? [];
    const faqScript = scripts
      .map((s) => JSON.parse(String((s as { children?: string }).children ?? "{}")))
      .find((j) => j["@type"] === "FAQPage");

    expect(faqScript, `${slug} has no FAQPage schema`).toBeDefined();
    expect(faqScript.mainEntity).toHaveLength(post.faqs.length);

    for (const [i, entity] of faqScript.mainEntity.entries()) {
      const f = post.faqs[i];
      expect(entity["@type"]).toBe("Question");
      expect(entity.name).toBe(f.q);
      expect(entity.url).toContain(`#${faqAnchorId(f.q)}`);
      expect(entity.acceptedAnswer["@type"]).toBe("Answer");
      expect(entity.acceptedAnswer.text).toBe(f.a);
    }
  });

  it("generates unique anchor ids per post", () => {
    for (const post of BLOG_POSTS) {
      const ids = post.faqs.map((f) => faqAnchorId(f.q));
      expect(new Set(ids).size, `duplicate FAQ anchor in ${post.slug}`).toBe(ids.length);
    }
  });
});
