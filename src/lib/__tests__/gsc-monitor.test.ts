import { describe, expect, it } from "vitest";
import {
  countSitemapLocs,
  detectIssues,
  parseSitemapEntry,
  summarizeCoverage,
} from "@/lib/gsc-monitor";

describe("parseSitemapEntry", () => {
  it("flattens a Search Console sitemap entry and sums content counts", () => {
    const s = parseSitemapEntry({
      path: "https://doseroutine.com/sitemap.xml",
      lastSubmitted: "2026-08-01T00:00:00Z",
      lastDownloaded: "2026-08-04T20:24:00Z",
      isPending: false,
      errors: "0",
      warnings: "2",
      contents: [
        { type: "web", submitted: "800", indexed: "400" },
        { type: "image", submitted: "88", indexed: "0" },
      ],
    });
    expect(s.path).toBe("https://doseroutine.com/sitemap.xml");
    expect(s.submittedUrls).toBe(888);
    expect(s.indexedUrls).toBe(400);
    expect(s.errors).toBe(0);
    expect(s.warnings).toBe(2);
    expect(s.isPending).toBe(false);
  });

  it("returns nulls for an empty entry", () => {
    const s = parseSitemapEntry({});
    expect(s.path).toBeNull();
    expect(s.submittedUrls).toBeNull();
    expect(s.errors).toBeNull();
  });
});

describe("summarizeCoverage", () => {
  it("counts indexed, excluded, crawl errors and robots blocks", () => {
    const c = summarizeCoverage([
      { indexing_verdict: "PASS", coverage_state: "Submitted and indexed" },
      { indexing_verdict: "PASS", coverage_state: "Submitted and indexed" },
      { indexing_verdict: "NEUTRAL", coverage_state: "Discovered - currently not indexed" },
      { indexing_verdict: "FAIL", coverage_state: "Server error (5xx)" },
      { indexing_verdict: "FAIL", coverage_state: "Blocked by robots.txt" },
      { indexing_verdict: null, coverage_state: null },
    ]);
    expect(c.inspected).toBe(5);
    expect(c.indexed).toBe(2);
    expect(c.notIndexed).toBe(3);
    expect(c.excluded).toBe(1);
    expect(c.crawlErrors).toBe(1);
    expect(c.robotsBlocked).toBe(1);
    expect(c.breakdown["Submitted and indexed"]).toBe(2);
  });
});

describe("detectIssues", () => {
  const cleanCoverage = summarizeCoverage([
    { indexing_verdict: "PASS", coverage_state: "Submitted and indexed" },
  ]);

  it("reports nothing when everything is healthy", () => {
    const issues = detectIssues({
      sitemap: parseSitemapEntry({
        path: "x",
        lastDownloaded: new Date().toISOString(),
        errors: 0,
        warnings: 0,
      }),
      sitemapFetchOk: true,
      sitemapUrlCount: 888,
      coverage: cleanCoverage,
      prior: { indexed_urls: 1, sitemap_url_count: 888 },
    });
    expect(issues).toEqual([]);
  });

  it("flags sitemap errors, warnings and staleness", () => {
    const stale = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const issues = detectIssues({
      sitemap: parseSitemapEntry({ path: "x", lastDownloaded: stale, errors: 3, warnings: 1 }),
      sitemapFetchOk: true,
      sitemapUrlCount: 888,
      coverage: cleanCoverage,
      prior: null,
    });
    const kinds = issues.map((i) => i.kind);
    expect(kinds).toContain("sitemap_errors");
    expect(kinds).toContain("sitemap_warnings");
    expect(kinds).toContain("sitemap_stale");
  });

  it("flags an unreachable sitemap and a large URL drop", () => {
    const issues = detectIssues({
      sitemap: null,
      sitemapFetchOk: false,
      sitemapUrlCount: 400,
      coverage: cleanCoverage,
      prior: { indexed_urls: 1, sitemap_url_count: 888 },
    });
    const kinds = issues.map((i) => i.kind);
    expect(kinds).toContain("sitemap_unreachable");
    expect(kinds).toContain("sitemap_url_drop");
  });

  it("flags an indexing drop only against a prior baseline", () => {
    const coverage = summarizeCoverage([
      { indexing_verdict: "PASS", coverage_state: "Submitted and indexed" },
      { indexing_verdict: "NEUTRAL", coverage_state: "Crawled - currently not indexed" },
      { indexing_verdict: "NEUTRAL", coverage_state: "Crawled - currently not indexed" },
    ]);
    expect(
      detectIssues({
        sitemap: null,
        sitemapFetchOk: true,
        sitemapUrlCount: null,
        coverage,
        prior: null,
      }).map((i) => i.kind),
    ).not.toContain("indexed_drop");

    expect(
      detectIssues({
        sitemap: null,
        sitemapFetchOk: true,
        sitemapUrlCount: null,
        coverage,
        prior: { indexed_urls: 10 },
      }).map((i) => i.kind),
    ).toContain("indexed_drop");
  });

  it("surfaces API errors", () => {
    const issues = detectIssues({
      sitemap: null,
      sitemapFetchOk: true,
      sitemapUrlCount: null,
      coverage: cleanCoverage,
      prior: null,
      apiError: "sitemaps 403",
    });
    expect(issues[0].kind).toBe("api_error");
  });
});

describe("countSitemapLocs", () => {
  it("counts loc entries", () => {
    expect(countSitemapLocs("<url><loc>a</loc></url><url><loc>b</loc></url>")).toBe(2);
    expect(countSitemapLocs("<urlset></urlset>")).toBe(0);
  });
});
