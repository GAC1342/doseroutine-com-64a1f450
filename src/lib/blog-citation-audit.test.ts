/**
 * Offline citation rules for every /blog post.
 *
 * Runs in the standard test suite so a bad or aging citation fails CI on the
 * deploy that introduced it. Live link checking lives in
 * `scripts/check-blog-citations.mjs` (needs network).
 */

import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { auditBlogCitations, errorsOf, hostTier } from "@/lib/blog-citation-audit";

describe("blog citations", () => {
  it("has no blocking citation errors", () => {
    const errors = errorsOf(auditBlogCitations(BLOG_POSTS));
    expect(errors.map((e) => `${e.slug} [${e.code}] ${e.url ?? ""} ${e.message}`)).toEqual([]);
  });

  it("every post cites at least one primary or regulatory source", () => {
    const weak = BLOG_POSTS.filter(
      (p) =>
        !p.refs.some((r) => {
          try {
            const tier = hostTier(new URL(r.url).hostname);
            return tier === "primary" || tier === "regulatory";
          } catch {
            return false;
          }
        }),
    ).map((p) => p.slug);
    expect(weak).toEqual([]);
  });

  it("flags malformed, unknown-host and stale citations", () => {
    const issues = auditBlogCitations(
      [
        {
          ...BLOG_POSTS[0],
          slug: "fixture",
          updated: "2000-01-01",
          refs: [{ cite: "Some random blog", url: "https://example.com/post" }],
        },
      ],
      new Date("2026-01-01T00:00:00Z"),
    );
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("unknown_host");
    expect(codes).toContain("missing_refs");
    expect(codes).toContain("stale_post");
  });
});
