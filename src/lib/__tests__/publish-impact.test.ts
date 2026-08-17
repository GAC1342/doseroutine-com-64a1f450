import { describe, expect, it } from "vitest";
import {
  buildPublishImpactReport,
  buildPublishImpactSeries,
  isImprovement,
  toComparisonBars,
  type PublishImpactSnapshot,
} from "@/lib/publish-impact";

function snap(
  date: string,
  overrides: Partial<PublishImpactSnapshot> = {},
): PublishImpactSnapshot {
  return {
    snapshot_date: date,
    impressions: 100,
    clicks: 5,
    ctr: 0.05,
    avg_position: 20,
    indexed_urls: 500,
    inspected_urls: 600,
    crawl_error_urls: 0,
    sitemap_url_count: 944,
    sitemap_last_downloaded: null,
    ...overrides,
  };
}

describe("buildPublishImpactReport", () => {
  it("splits snapshots into before/after windows around the publish date", () => {
    const rows = [
      snap("2026-08-01"),
      snap("2026-08-02"),
      snap("2026-08-03", { impressions: 200 }),
      snap("2026-08-04", { impressions: 200 }),
    ];
    const report = buildPublishImpactReport(rows, "2026-08-03", 2);
    expect(report.beforeCount).toBe(2);
    expect(report.afterCount).toBe(2);
    const impressions = report.metrics.find((m) => m.key === "impressions")!;
    expect(impressions.before).toBe(100);
    expect(impressions.after).toBe(200);
    expect(impressions.change).toBe(100);
    expect(impressions.changePct).toBe(100);
  });

  it("ignores snapshots outside the window", () => {
    const rows = [snap("2026-07-01", { impressions: 1 }), snap("2026-08-03")];
    const report = buildPublishImpactReport(rows, "2026-08-03", 7);
    expect(report.beforeCount).toBe(0);
    const impressions = report.metrics.find((m) => m.key === "impressions")!;
    expect(impressions.before).toBeNull();
    expect(impressions.change).toBeNull();
    expect(report.summary).toMatch(/Not enough snapshots/);
  });

  it("treats lower average position as an improvement", () => {
    const rows = [snap("2026-08-02", { avg_position: 30 }), snap("2026-08-03", { avg_position: 20 })];
    const report = buildPublishImpactReport(rows, "2026-08-03", 1);
    const position = report.metrics.find((m) => m.key === "avg_position")!;
    expect(position.change).toBe(-10);
    expect(isImprovement(position)).toBe(true);
  });

  it("flags when Google refetched the sitemap after publishing", () => {
    const rows = [
      snap("2026-08-02", { sitemap_last_downloaded: "2026-08-01T10:00:00Z" }),
      snap("2026-08-04", { sitemap_last_downloaded: "2026-08-04T09:00:00Z" }),
    ];
    const report = buildPublishImpactReport(rows, "2026-08-03", 5);
    expect(report.sitemapFetchedAfterPublish).toBe(true);
  });

  it("summarises impression movement in plain English", () => {
    const rows = [
      snap("2026-08-02", { impressions: 100, indexed_urls: 500 }),
      snap("2026-08-03", { impressions: 150, indexed_urls: 520 }),
    ];
    const report = buildPublishImpactReport(rows, "2026-08-03", 1);
    expect(report.summary).toContain("Impressions are up 50%");
    expect(report.summary).toContain("+20 indexed pages");
  });
});

describe("buildPublishImpactSeries", () => {
  it("returns chronological points split by phase", () => {
    const rows = [
      snap("2026-08-04", { impressions: 220 }),
      snap("2026-08-02", { impressions: 100 }),
      snap("2026-08-03", { impressions: 200 }),
    ];
    const series = buildPublishImpactSeries(rows, "impressions", "2026-08-03", 3);
    expect(series.map((p) => p.date)).toEqual(["2026-08-02", "2026-08-03", "2026-08-04"]);
    expect(series.map((p) => p.phase)).toEqual(["before", "after", "after"]);
    expect(series[0]!.offset).toBe(-1);
    // last "before" point bridges into the after line so segments connect
    expect(series[0]!.after).toBe(100);
    expect(series[1]!.before).toBeNull();
    expect(series[2]!.after).toBe(220);
  });

  it("drops days outside the window and de-duplicates dates", () => {
    const rows = [snap("2026-07-01"), snap("2026-08-03"), snap("2026-08-03")];
    const series = buildPublishImpactSeries(rows, "clicks", "2026-08-03", 2);
    expect(series).toHaveLength(1);
  });

  it("builds before/after bars from a metric comparison", () => {
    const rows = [snap("2026-08-02", { clicks: 4 }), snap("2026-08-03", { clicks: 10 })];
    const report = buildPublishImpactReport(rows, "2026-08-03", 1);
    const clicks = report.metrics.find((m) => m.key === "clicks")!;
    expect(toComparisonBars(clicks)).toEqual([
      { phase: "Before", value: 4 },
      { phase: "After", value: 10 },
    ]);
  });
});
