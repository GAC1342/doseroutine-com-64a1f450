import { describe, expect, it } from "vitest";

import {
  detectCoverageAnomalies,
  formatCoverageReport,
  type CoverageInput,
} from "@/lib/sitemap-coverage";

const NOW = new Date("2026-08-18T00:00:00Z");

function input(overrides: Partial<CoverageInput> = {}): CoverageInput {
  return {
    servedUrlCount: 1000,
    servedImageCount: 0,
    submittedUrls: 1000,
    indexedUrls: 900,
    errors: 0,
    warnings: 0,
    lastDownloaded: "2026-08-17T00:00:00Z",
    isPending: false,
    now: NOW,
    ...overrides,
  };
}

describe("detectCoverageAnomalies", () => {
  it("is quiet on a healthy sitemap", () => {
    expect(detectCoverageAnomalies(input())).toEqual([]);
  });

  it("flags a sitemap Google has no submitted count for", () => {
    const kinds = detectCoverageAnomalies(input({ submittedUrls: null })).map((a) => a.kind);
    expect(kinds).toContain("not_submitted");
  });

  it("tolerates a small submitted/served gap but flags a large one", () => {
    expect(detectCoverageAnomalies(input({ submittedUrls: 970 }))).toEqual([]);
    const kinds = detectCoverageAnomalies(input({ submittedUrls: 700 })).map((a) => a.kind);
    expect(kinds).toContain("submitted_mismatch");
  });

  it("flags a low indexed ratio", () => {
    const anomalies = detectCoverageAnomalies(input({ indexedUrls: 400 }));
    expect(anomalies.map((a) => a.kind)).toContain("indexed_ratio_low");
    expect(anomalies[0].message).toContain("40%");
  });

  it("treats an unreported indexed count as unknown, not zero", () => {
    expect(detectCoverageAnomalies(input({ indexedUrls: null }))).toEqual([]);
    // Google now always reports 0 here; that must not read as "nothing indexed".
    expect(detectCoverageAnomalies(input({ indexedUrls: 0 }))).toEqual([]);
  });

  it("counts image entries toward the expected submitted total", () => {
    // 959 pages + 54 images is exactly what Search Console counts as 1013.
    expect(
      detectCoverageAnomalies(
        input({ servedUrlCount: 959, servedImageCount: 54, submittedUrls: 1013, indexedUrls: 0 }),
      ),
    ).toEqual([]);
    const kinds = detectCoverageAnomalies(
      input({ servedUrlCount: 959, servedImageCount: 54, submittedUrls: 600, indexedUrls: 0 }),
    ).map((a) => a.kind);
    expect(kinds).toContain("submitted_mismatch");
  });

  it("surfaces Google's error and warning counts", () => {
    const anomalies = detectCoverageAnomalies(input({ errors: 2, warnings: 3 }));
    expect(anomalies.map((a) => a.kind)).toEqual(["sitemap_errors", "sitemap_warnings"]);
    expect(anomalies[0].severity).toBe("error");
    expect(anomalies[0].message).toContain("not exposed by the API");
  });

  it("flags a stale fetch and a pending sitemap", () => {
    const kinds = detectCoverageAnomalies(
      input({ lastDownloaded: "2026-08-01T00:00:00Z", isPending: true }),
    ).map((a) => a.kind);
    expect(kinds).toEqual(expect.arrayContaining(["stale_fetch", "pending"]));
  });

  it("does not divide by zero when nothing is served yet", () => {
    expect(() =>
      detectCoverageAnomalies(input({ servedUrlCount: 0, submittedUrls: 0, indexedUrls: 0 })),
    ).not.toThrow();
  });
});

describe("formatCoverageReport", () => {
  it("prints counts and anomalies", () => {
    const data = input({ indexedUrls: 100 });
    const text = formatCoverageReport(data, detectCoverageAnomalies(data));
    expect(text).toContain("submitted URLs: 1000");
    expect(text).toContain("anomalies:");
  });

  it("says so when everything is clean", () => {
    expect(formatCoverageReport(input(), [])).toContain("no anomalies");
  });
});
