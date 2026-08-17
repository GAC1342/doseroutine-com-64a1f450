import { describe, expect, it } from "vitest";
import {
  buildBlogPerformance,
  currentPeriod,
  indexPageRows,
  indexQueryRows,
  previousPeriod,
  slugFromPageUrl,
  totalsOf,
} from "@/lib/blog-search-performance";
import { LONGTAIL_BLOG_POSTS } from "@/lib/blog-posts-longtail";

const NOW = Date.UTC(2026, 7, 14);

describe("periods", () => {
  it("uses a lagged, complete window", () => {
    const cur = currentPeriod(28, NOW);
    expect(cur.endDate).toBe("2026-08-11");
    expect(cur.startDate).toBe("2026-07-15");
  });

  it("previous period is adjacent and equal length", () => {
    const prev = previousPeriod(28, NOW);
    expect(prev.endDate).toBe("2026-07-14");
    expect(prev.startDate).toBe("2026-06-17");
  });
});

describe("slugFromPageUrl", () => {
  it("handles trailing slash and params", () => {
    expect(slugFromPageUrl("https://doseroutine.com/blog/foo-bar")).toBe("foo-bar");
    expect(slugFromPageUrl("https://doseroutine.com/blog/foo-bar/")).toBe("foo-bar");
    expect(slugFromPageUrl("https://doseroutine.com/blog/foo-bar?x=1")).toBe("foo-bar");
    expect(slugFromPageUrl("https://doseroutine.com/library/x")).toBeNull();
  });
});

describe("buildBlogPerformance", () => {
  const slug = LONGTAIL_BLOG_POSTS[0].slug;
  const base = `https://doseroutine.com/blog/${slug}`;

  it("merges duplicate page rows and joins onto the catalogue", () => {
    const cur = indexPageRows([
      { keys: [base], clicks: 3, impressions: 100, ctr: 0.03, position: 12 },
      { keys: [`${base}/`], clicks: 1, impressions: 100, ctr: 0.01, position: 8 },
    ]);
    const prev = indexPageRows([
      { keys: [base], clicks: 2, impressions: 150, ctr: 0.013, position: 15 },
    ]);
    const queries = indexQueryRows([
      { keys: [base, "a"], clicks: 1, impressions: 10, ctr: 0.1, position: 9 },
      { keys: [base, "b"], clicks: 0, impressions: 90, ctr: 0, position: 11 },
    ]);

    const rows = buildBlogPerformance(cur, prev, queries, { longTailOnly: true });
    expect(rows).toHaveLength(LONGTAIL_BLOG_POSTS.length);

    const row = rows.find((r) => r.slug === slug)!;
    expect(row.clicks).toBe(4);
    expect(row.impressions).toBe(200);
    expect(row.position).toBe(10);
    expect(row.deltaImpressions).toBe(50);
    expect(row.deltaClicks).toBe(2);
    expect(row.deltaPosition).toBe(-5);
    expect(row.topQueries[0].query).toBe("b");
    expect(row.longTail).toBe(true);
  });

  it("keeps zero-impression posts visible and totals correctly", () => {
    const rows = buildBlogPerformance(new Map(), new Map(), new Map(), { longTailOnly: true });
    expect(rows.every((r) => r.impressions === 0)).toBe(true);
    const totals = totalsOf(rows);
    expect(totals.withData).toBe(0);
    expect(totals.posts).toBe(LONGTAIL_BLOG_POSTS.length);
    expect(totals.ctr).toBe(0);
  });
});
