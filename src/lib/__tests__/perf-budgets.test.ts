/**
 * Guards the /articles performance budgets themselves: the thresholds must
 * stay inside Google's "good" Core Web Vitals bands, and the violation
 * reporter must actually fail when a measurement is over budget (otherwise
 * the e2e gate would silently pass everything).
 */

import { describe, it, expect } from "vitest";
import { ARTICLES_PERF_BUDGET, perfBudgetFor, perfViolations } from "../perf-budgets";
import { LOCAL_ARTICLES } from "../local-articles";

describe("articles performance budgets", () => {
  it("keeps thresholds inside the Core Web Vitals good bands", () => {
    expect(ARTICLES_PERF_BUDGET.lcpMs).toBeLessThanOrEqual(2500);
    expect(ARTICLES_PERF_BUDGET.cls).toBeLessThanOrEqual(0.1);
    expect(ARTICLES_PERF_BUDGET.ttfbMs).toBeLessThanOrEqual(800);
  });

  it("applies the per-post budget to every first-party article path", () => {
    for (const article of LOCAL_ARTICLES) {
      expect(perfBudgetFor(`/articles/${article.slug}`)).toEqual(ARTICLES_PERF_BUDGET);
    }
  });

  it("allows the index a documented, bounded override", () => {
    const index = perfBudgetFor("/articles");
    expect(index.lcpMs).toBeGreaterThanOrEqual(ARTICLES_PERF_BUDGET.lcpMs);
    expect(index.lcpMs).toBeLessThanOrEqual(3000);
    expect(index.cls).toBe(ARTICLES_PERF_BUDGET.cls);
  });

  it("reports nothing when measurements are within budget", () => {
    expect(perfViolations("/articles/x", { lcpMs: 900, cls: 0.01, ttfbMs: 120 })).toEqual([]);
  });

  it("reports every metric that is over budget", () => {
    const out = perfViolations("/articles/x", { lcpMs: 5000, cls: 0.4, ttfbMs: 1500 });
    expect(out).toHaveLength(3);
    expect(out.join(" ")).toMatch(/LCP/);
    expect(out.join(" ")).toMatch(/CLS/);
    expect(out.join(" ")).toMatch(/TTFB/);
  });

  it("treats exactly-at-budget as passing and one over as failing", () => {
    expect(perfViolations("/articles/x", { lcpMs: 2500 })).toEqual([]);
    expect(perfViolations("/articles/x", { lcpMs: 2501 })).toHaveLength(1);
  });
});
