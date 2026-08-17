import { describe, expect, it } from "vitest";
import { blogUrlHints, sitemapCachePolicy, daysSince } from "@/lib/blog-freshness";

const NOW = Date.parse("2026-08-14T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString().slice(0, 10);

describe("blog freshness policy", () => {
  it("gives brand new posts daily crawl hints", () => {
    expect(blogUrlHints(daysAgo(1), NOW)).toEqual({ changefreq: "daily", priority: "0.9" });
    expect(blogUrlHints(daysAgo(13), NOW).changefreq).toBe("daily");
  });

  it("decays hints as posts age", () => {
    expect(blogUrlHints(daysAgo(30), NOW)).toEqual({ changefreq: "weekly", priority: "0.85" });
    expect(blogUrlHints(daysAgo(400), NOW)).toEqual({ changefreq: "monthly", priority: "0.8" });
  });

  it("treats unparseable dates as old rather than fresh", () => {
    expect(daysSince("not-a-date", NOW)).toBe(Number.POSITIVE_INFINITY);
    expect(blogUrlHints("not-a-date", NOW).changefreq).toBe("monthly");
  });

  it("shortens sitemap caching while any post is new", () => {
    const fresh = sitemapCachePolicy([daysAgo(200), daysAgo(2)], NOW);
    expect(fresh.ttlMs).toBeLessThanOrEqual(10 * 60 * 1000);
    expect(fresh.cacheControl).toContain("s-maxage=1800");

    const steady = sitemapCachePolicy([daysAgo(200), daysAgo(90)], NOW);
    expect(steady.ttlMs).toBe(60 * 60 * 1000);
    expect(steady.cacheControl).toContain("s-maxage=21600");
  });

  it("never caches the sitemap for longer than a day at the edge", () => {
    for (const p of [sitemapCachePolicy([daysAgo(1)], NOW), sitemapCachePolicy([daysAgo(999)], NOW)]) {
      const sMaxAge = Number(/s-maxage=(\d+)/.exec(p.cacheControl)?.[1]);
      expect(sMaxAge).toBeLessThanOrEqual(86400);
    }
  });
});
