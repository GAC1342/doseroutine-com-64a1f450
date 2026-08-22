import { test, expect } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { perfBudgetFor, perfViolations } from "../src/lib/perf-budgets";
import { articlePaths } from "./article-slugs";

/**
 * Core Web Vitals gate for /articles.
 *
 * Measures LCP, CLS and TTFB in a real Chromium page for the articles index
 * and every first-party post, and FAILS when a page exceeds the budgets in
 * src/lib/perf-budgets.ts. Wire it into CI (`npm run test:articles-perf`) so a
 * heavy image, a late-loading font or an un-reserved layout slot can't ship.
 *
 * Chromium only: LargestContentfulPaint and layout-shift entries are
 * Chrome-specific, so other projects skip rather than report false passes.
 */

const RESULTS_DIR = join(process.cwd(), "test-results", "articles-perf");

type Vitals = { lcpMs: number | null; cls: number; ttfbMs: number };

/**
 * Routes come from the draft filenames on disk (see e2e/article-slugs.ts)
 * rather than importing src/lib/local-articles.ts — that module uses
 * import.meta.glob, which only exists inside Vite, not Playwright's runner.
 */
const PATHS = articlePaths();

const report: Array<{ path: string; vitals: Vitals; violations: string[] }> = [];

test.describe("/articles Core Web Vitals", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "vitals APIs are Chromium-only");

  for (const path of PATHS) {
    test(`${path} stays within LCP/CLS/TTFB budget`, async ({ page }) => {
      // Install the observers before any navigation so no entry is missed.
      await page.addInitScript(() => {
        const w = window as unknown as { __vitals: { lcp: number | null; cls: number } };
        w.__vitals = { lcp: null, cls: 0 };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            w.__vitals.lcp = entry.startTime;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as Array<{
            value: number;
            hadRecentInput: boolean;
          }>) {
            if (!entry.hadRecentInput) w.__vitals.cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });

      await page.goto(path, { waitUntil: "load" });
      // Let late images/fonts settle so LCP and CLS reflect the final paint.
      await page.waitForTimeout(2500);

      const vitals = await page.evaluate<Vitals>(() => {
        const w = window as unknown as { __vitals: { lcp: number | null; cls: number } };
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        return {
          lcpMs: w.__vitals.lcp,
          cls: w.__vitals.cls,
          ttfbMs: nav ? nav.responseStart - nav.requestStart : 0,
        };
      });

      const violations = perfViolations(path, {
        ...(vitals.lcpMs !== null ? { lcpMs: vitals.lcpMs } : {}),
        cls: vitals.cls,
        ttfbMs: vitals.ttfbMs,
      });
      report.push({ path, vitals, violations });

      const budget = perfBudgetFor(path);
      expect(vitals.lcpMs, `${path}: no LCP entry recorded — page rendered nothing`).not.toBeNull();
      expect(
        violations,
        `${path} exceeded its performance budget (${JSON.stringify(budget)}): ${violations.join("; ")}`,
      ).toEqual([]);
    });
  }

  test.afterAll(() => {
    if (report.length === 0) return;
    mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(join(RESULTS_DIR, "vitals.json"), JSON.stringify(report, null, 2));
  });
});
