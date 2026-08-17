import { describe, expect, it } from "vitest";
import {
  CRAWL_WATCH_URLS,
  alertsForReading,
  collectAlerts,
  shouldAlert,
  summarize,
  type InspectionReading,
} from "../crawl-block-watch";

const base: InspectionReading = {
  url: "https://doseroutine.com/",
  robotsTxtState: "ALLOWED",
  pageFetchState: "SUCCESSFUL",
  indexingState: "INDEXING_ALLOWED",
  verdict: "PASS",
  coverageState: "Submitted and indexed",
  lastCrawlTime: "2026-08-16T00:00:00Z",
  apiError: null,
};

describe("crawl-block-watch", () => {
  it("keeps the previously blocked lang URLs on the watch list", () => {
    expect(CRAWL_WATCH_URLS.some((u) => u.includes("?lang=fr"))).toBe(true);
  });

  it("reports no alerts for a healthy reading", () => {
    expect(alertsForReading(base)).toEqual([]);
  });

  it("flags a robots.txt block as an error", () => {
    const alerts = alertsForReading({ ...base, robotsTxtState: "DISALLOWED" });
    expect(alerts.map((a) => a.code)).toContain("robots_blocked");
    expect(shouldAlert(alerts)).toBe(true);
  });

  it("flags a blocked page fetch", () => {
    const alerts = alertsForReading({ ...base, pageFetchState: "BLOCKED_ROBOTS_TXT" });
    expect(alerts.map((a) => a.code)).toContain("fetch_blocked");
  });

  it("treats other fetch problems as warnings", () => {
    const alerts = alertsForReading({ ...base, pageFetchState: "NOT_FOUND" });
    expect(alerts[0].severity).toBe("warning");
    expect(shouldAlert(alerts)).toBe(false);
  });

  it("flags noindex/disallowed indexing", () => {
    const alerts = alertsForReading({ ...base, indexingState: "BLOCKED_BY_META_TAG" });
    expect(alerts.map((a) => a.code)).toContain("indexing_disallowed");
  });

  it("surfaces API failures as warnings without other noise", () => {
    const alerts = alertsForReading({
      ...base,
      robotsTxtState: null,
      pageFetchState: null,
      apiError: "403 forbidden",
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].code).toBe("api_error");
  });

  it("summarizes a mixed run", () => {
    const readings = [
      base,
      { ...base, url: "https://doseroutine.com/?lang=fr", robotsTxtState: "DISALLOWED" },
      { ...base, url: "https://doseroutine.com/blog", robotsTxtState: null, apiError: "500" },
    ];
    expect(summarize(readings)).toEqual({
      checked: 3,
      allowed: 1,
      blocked: 1,
      errors: 1,
      unknown: 0,
    });
    expect(collectAlerts(readings)).toHaveLength(2);
  });
});
