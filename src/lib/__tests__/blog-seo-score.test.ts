/**
 * CI gate: every /blog post must clear the SEO score threshold.
 *
 * Thresholds, rule weights and blocking checks come from
 * `seo-score.config.json` (override the path with SEO_SCORE_CONFIG, or the
 * threshold alone with SEO_SCORE_PASSING_SCORE) so CI can be tightened or
 * loosened without code changes.
 */

import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog-posts";
import {
  failingPosts,
  formatScore,
  keywordsFor,
  scoreAllBlogPosts,
  scoreBlogPost,
} from "@/lib/blog-seo-score";
import { loadSeoScoreConfig } from "@/lib/seo-score-config.load";
import { applyEnvOverrides, mergeSeoScoreConfig } from "@/lib/seo-score-config";

const config = loadSeoScoreConfig();
const results = scoreAllBlogPosts(BLOG_POSTS, config);

describe("blog SEO score", () => {
  it("has at least one post to score", () => {
    expect(results.length).toBeGreaterThan(0);
  });

  it(`every post scores at least ${config.passingScore}/100`, () => {
    const below = results.filter((r) => r.score < config.passingScore).map(formatScore);
    expect(below).toEqual([]);
  });

  it(`no post fails a blocking check (${config.blockingChecks.join(", ")})`, () => {
    const blocking = results
      .filter((r) => r.failed.some((f) => config.blockingChecks.includes(f.id)))
      .map(formatScore);
    expect(blocking).toEqual([]);
  });

  it("failingPosts() reports nothing for the current catalogue", () => {
    expect(failingPosts(results, config).map(formatScore)).toEqual([]);
  });

  it("titles and meta descriptions are unique across posts", () => {
    const titles = BLOG_POSTS.map((p) => p.title.trim().toLowerCase());
    const descriptions = BLOG_POSTS.map((p) => p.description.trim().toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("scores a deliberately bad post below the threshold", () => {
    const bad = scoreBlogPost(
      {
        ...BLOG_POSTS[0],
        slug: "fixture-bad",
        title: "Blog",
        heading: "Blog",
        description: "Too short.",
        intro: "Nothing relevant here at all.",
        sections: [{ heading: "One", body: ["x"] }],
      },
      config,
    );
    expect(bad.score).toBeLessThan(config.passingScore);
    expect(bad.failed.map((f) => f.id)).toContain("title_length");
  });

  it("derives keywords from tags and slug tokens", () => {
    expect(keywordsFor(BLOG_POSTS[0]).length).toBeGreaterThan(0);
  });
});

describe("seo-score config", () => {
  it("tightening a threshold changes the gate without code changes", () => {
    const strict = mergeSeoScoreConfig({ passingScore: 100 });
    expect(strict.passingScore).toBe(100);
    const loose = mergeSeoScoreConfig({ passingScore: 10 });
    expect(failingPosts(scoreAllBlogPosts(BLOG_POSTS, loose), loose)).toEqual([]);
  });

  it("disabling a rule reweights the score to 100", () => {
    const cfg = mergeSeoScoreConfig({
      rules: { title_brand: { enabled: false } },
      blockingChecks: ["title_length"],
    });
    const scored = scoreBlogPost(
      { ...BLOG_POSTS[0], title: "No brand suffix here at all now" },
      cfg,
    );
    expect(scored.checks.some((c) => c.id === "title_brand")).toBe(false);
  });

  it("rejects unknown rule ids and out-of-range thresholds", () => {
    expect(() => mergeSeoScoreConfig({ rules: { nope: {} } })).toThrow(/unknown rule id/);
    expect(() => mergeSeoScoreConfig({ passingScore: 140 })).toThrow(/between 0 and 100/);
    expect(() =>
      mergeSeoScoreConfig({
        rules: { h2_unique: { enabled: false } },
        blockingChecks: ["h2_unique"],
      }),
    ).toThrow(/disabled/);
  });

  it("honours the SEO_SCORE_PASSING_SCORE env override", () => {
    expect(applyEnvOverrides(config, { SEO_SCORE_PASSING_SCORE: "95" }).passingScore).toBe(95);
    expect(() => applyEnvOverrides(config, { SEO_SCORE_PASSING_SCORE: "abc" })).toThrow();
  });
});
