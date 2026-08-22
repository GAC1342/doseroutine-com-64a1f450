import { describe, expect, it } from "vitest";

import {
  ALERTED_METRICS,
  POOR_THRESHOLDS,
  evaluateVital,
  isArticleSurface,
  surfaceOf,
  type VitalSample,
} from "@/lib/web-vitals-alerts";

const base: VitalSample = {
  name: "LCP",
  value: 1000,
  loadKind: "navigate",
  path: "/",
  viewportWidth: 1440,
};

describe("surface classification", () => {
  it("treats narrow viewports as mobile", () => {
    expect(surfaceOf({ ...base, viewportWidth: 390 })).toBe("mobile");
    expect(surfaceOf({ ...base, viewportWidth: 768 })).toBe("mobile");
    expect(surfaceOf({ ...base, viewportWidth: 769 })).toBe("other");
  });

  it("treats article and blog paths as the article surface", () => {
    for (const path of ["/articles", "/articles/foo", "/blog", "/blog/bar"]) {
      expect(isArticleSurface(path)).toBe(true);
      expect(surfaceOf({ ...base, path })).toBe("article");
    }
    for (const path of ["/", "/today", "/articlesomething"]) {
      expect(isArticleSurface(path)).toBe(false);
    }
  });
});

describe("evaluateVital", () => {
  it("alerts on poor mobile LCP/INP/CLS", () => {
    for (const metric of ALERTED_METRICS) {
      const alert = evaluateVital({
        ...base,
        name: metric,
        value: POOR_THRESHOLDS[metric] + 1,
        viewportWidth: 390,
      });
      expect(alert).toMatchObject({ metric, surface: "mobile" });
    }
  });

  it("alerts on poor article-page metrics at desktop widths", () => {
    expect(
      evaluateVital({ ...base, path: "/articles/x", value: 5000, viewportWidth: 1440 }),
    ).toMatchObject({ surface: "article", metric: "LCP" });
  });

  it("stays quiet for values at or under the threshold", () => {
    for (const metric of ALERTED_METRICS) {
      expect(
        evaluateVital({
          ...base,
          name: metric,
          value: POOR_THRESHOLDS[metric],
          viewportWidth: 390,
        }),
      ).toBeNull();
    }
  });

  it("ignores bfcache, prerender and non-navigate samples", () => {
    for (const loadKind of ["bfcache", "prerender", "other"] as const) {
      expect(evaluateVital({ ...base, value: 9999, viewportWidth: 390, loadKind })).toBeNull();
    }
  });

  it("ignores non-alerted metrics and unrelated desktop pages", () => {
    expect(evaluateVital({ ...base, name: "TTFB", value: 9999, viewportWidth: 390 })).toBeNull();
    expect(evaluateVital({ ...base, name: "FCP", value: 9999, viewportWidth: 390 })).toBeNull();
    expect(evaluateVital({ ...base, value: 9999, viewportWidth: 1440, path: "/today" })).toBeNull();
  });

  it("ignores impossible values", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(evaluateVital({ ...base, value, viewportWidth: 390 })).toBeNull();
    }
  });
});
