/**
 * Automated checks for the /articles internal-link cluster and the
 * "Related articles" section it drives.
 *
 * These fail CI when a draft loses its cluster links, links to a slug that
 * doesn't exist, or ends up orphaned with no inbound links — all of which
 * quietly break internal link equity and the related-posts block.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CLUSTER_EDGES, inboundCount, relatedArticles } from "@/lib/article-cluster";
import { DRAFT_ARTICLES as LOCAL_ARTICLES } from "@/lib/local-articles";

// The cluster contract covers the in-house drafts; snapshotted CMS posts get
// their topic links from src/lib/cms-related-articles.ts instead.
const LOCAL_ARTICLE_SLUGS = LOCAL_ARTICLES.map((a) => a.slug);

const PLAN_FILE = join(process.cwd(), "src/content/article-drafts/INTERNAL-LINKING-PLAN.md");
// Cluster pillar for the 60-day editorial calendar; every roundup links up to it.
const HUB = "best-medication-reminder-apps";

describe("article cluster graph", () => {
  it("only contains edges between real, non-self article slugs", () => {
    expect(CLUSTER_EDGES.length).toBeGreaterThan(0);
    for (const edge of CLUSTER_EDGES) {
      expect(LOCAL_ARTICLE_SLUGS, `unknown from: ${edge.from}`).toContain(edge.from);
      expect(LOCAL_ARTICLE_SLUGS, `unknown to: ${edge.to}`).toContain(edge.to);
      expect(edge.from, "self link").not.toBe(edge.to);
    }
  });

  it("uses descriptive anchors, never bare or generic text", () => {
    for (const edge of CLUSTER_EDGES) {
      expect(edge.anchor.length, `${edge.from} -> ${edge.to}`).toBeGreaterThanOrEqual(8);
      expect(edge.anchor.toLowerCase()).not.toMatch(/^(click here|here|read more|this|link)$/);
    }
  });

  it("gives every post outbound and inbound cluster links (no orphans)", () => {
    for (const slug of LOCAL_ARTICLE_SLUGS) {
      const out = CLUSTER_EDGES.filter((e) => e.from === slug);
      expect(out.length, `${slug} has no outbound cluster links`).toBeGreaterThanOrEqual(2);
      expect(inboundCount(slug), `${slug} is orphaned (no inbound links)`).toBeGreaterThanOrEqual(
        2,
      );
    }
  });

  it("keeps the pillar as the most-linked hub", () => {
    const hubCount = inboundCount(HUB);
    for (const slug of LOCAL_ARTICLE_SLUGS) {
      if (slug === HUB) continue;
      expect(inboundCount(slug), `${slug} out-links the pillar`).toBeLessThanOrEqual(hubCount);
    }
  });

  it("never duplicates the same edge twice", () => {
    const keys = CLUSTER_EDGES.map((e) => `${e.from}->${e.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("matches the documented linking plan's target list", () => {
    const plan = readFileSync(PLAN_FILE, "utf8");
    for (const slug of LOCAL_ARTICLE_SLUGS) {
      expect(plan, `${slug} missing from the linking plan`).toContain(`/articles/${slug}`);
    }
  });
});

describe("related articles selection", () => {
  it("returns up to three real, non-self, unique suggestions per post", () => {
    for (const article of LOCAL_ARTICLES) {
      const related = relatedArticles(article.slug);
      expect(related.length, `${article.slug} related count`).toBeGreaterThanOrEqual(2);
      expect(related.length).toBeLessThanOrEqual(3);
      expect(new Set(related.map((r) => r.slug)).size).toBe(related.length);
      for (const item of related) {
        expect(item.slug).not.toBe(article.slug);
        expect(LOCAL_ARTICLE_SLUGS).toContain(item.slug);
        expect(item.href).toBe(`/articles/${item.slug}`);
        expect(item.title.length).toBeGreaterThan(10);
        expect(item.metaDescription.length).toBeGreaterThan(10);
        expect(["mutual", "outbound", "inbound"]).toContain(item.relation);
      }
    }
  });

  it("ranks mutual links ahead of one-way links", () => {
    for (const article of LOCAL_ARTICLES) {
      const order = relatedArticles(article.slug).map((r) => r.relation);
      const rank = { mutual: 0, outbound: 1, inbound: 2 } as const;
      const ranks = order.map((r) => rank[r]);
      expect(
        [...ranks].sort((a, b) => a - b),
        `${article.slug} ordering`,
      ).toEqual(ranks);
    }
  });

  it("is deterministic across calls", () => {
    for (const article of LOCAL_ARTICLES) {
      expect(relatedArticles(article.slug)).toEqual(relatedArticles(article.slug));
    }
  });

  it("honours the limit argument", () => {
    expect(relatedArticles(HUB, 1)).toHaveLength(1);
    expect(relatedArticles(HUB, 2)).toHaveLength(2);
  });
});
