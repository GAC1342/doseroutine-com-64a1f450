/**
 * Performance budgets for the /articles blog.
 *
 * These are hard thresholds: the automated check in e2e/articles-perf.spec.ts
 * fails (and therefore fails the build/CI job that runs it) when a page
 * exceeds any of them. Values follow Google's Core Web Vitals "good" bands,
 * with TTFB held slightly tighter than the 800ms field target because these
 * measurements run locally against a warm server.
 */

export type PerfBudget = {
  /** Largest Contentful Paint, milliseconds. */
  lcpMs: number;
  /** Cumulative Layout Shift, unitless. */
  cls: number;
  /** Time To First Byte, milliseconds. */
  ttfbMs: number;
};

/** Budget applied to every /articles URL unless overridden below. */
export const ARTICLES_PERF_BUDGET: PerfBudget = {
  lcpMs: 2500,
  cls: 0.1,
  ttfbMs: 800,
};

/** Per-path overrides (e.g. content-heavy index pages). */
export const ARTICLES_PERF_OVERRIDES: Record<string, Partial<PerfBudget>> = {
  "/articles": { lcpMs: 3000, ttfbMs: 1200 },
};

/** Resolved budget for a path. */
export function perfBudgetFor(path: string): PerfBudget {
  return { ...ARTICLES_PERF_BUDGET, ...(ARTICLES_PERF_OVERRIDES[path] ?? {}) };
}

/** Human-readable failures for a measurement, empty when within budget. */
export function perfViolations(path: string, measured: Partial<PerfBudget>): string[] {
  const budget = perfBudgetFor(path);
  const out: string[] = [];
  if (measured.lcpMs !== undefined && measured.lcpMs > budget.lcpMs) {
    out.push(`LCP ${Math.round(measured.lcpMs)}ms > ${budget.lcpMs}ms budget`);
  }
  if (measured.cls !== undefined && measured.cls > budget.cls) {
    out.push(`CLS ${measured.cls.toFixed(3)} > ${budget.cls} budget`);
  }
  if (measured.ttfbMs !== undefined && measured.ttfbMs > budget.ttfbMs) {
    out.push(`TTFB ${Math.round(measured.ttfbMs)}ms > ${budget.ttfbMs}ms budget`);
  }
  return out;
}
