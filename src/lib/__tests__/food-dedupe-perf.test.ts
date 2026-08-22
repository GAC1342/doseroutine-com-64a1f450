/**
 * Performance budgets for food duplicate detection.
 *
 * The USDA import path calls `bestDuplicate` once per incoming food against the
 * catalog, and the admin review panel calls `findDuplicatePairs` over a catalog
 * slice (O(n^2) comparisons). A slowdown here shows up as an import that times
 * out or an admin page that locks the tab, which no correctness test catches.
 *
 * Budgets sit well above measured local timings (roughly 3x headroom): they
 * catch a real regression — an added per-comparison allocation, a lost
 * early-exit, accidental super-quadratic behavior — not machine noise.
 *
 * Memory budgets sit alongside the time budgets: retained heap after repeated
 * scans catches leaks (caches that never evict, arrays that keep growing), and
 * allocation-per-comparison catches churn that shows up as GC pauses in the
 * admin panel. Memory assertions need `--expose-gc`; `npm run test:dedupe-perf`
 * sets it. Without it those cases are skipped rather than reported as flaky.
 *
 * Set PERF_BUDGET_MULTIPLIER=3 on a slow CI runner to relax every budget.
 */
import { describe, expect, it } from "vitest";
import { makeDedupeCatalog, makeIncomingNearDuplicate } from "@/test/fixtures/dedupe-catalog";
import {
  bestDuplicate,
  classifyDuplicate,
  explainDuplicate,
  findDuplicatePairs,
} from "@/lib/food-dedupe";

const MULTIPLIER = Number(process.env["PERF_BUDGET_MULTIPLIER"] ?? 1) || 1;
const CASE_TIMEOUT = 120_000;

/** Best-of-N wall time in ms, so one scheduler stall cannot fail the run. */
function bestOf(runs: number, fn: () => unknown): number {
  let best = Infinity;
  for (let run = 0; run < runs; run += 1) {
    const start = performance.now();
    fn();
    const elapsed = performance.now() - start;
    if (elapsed < best) best = elapsed;
  }
  return best;
}

function expectUnder(label: string, measured: number, budgetMs: number) {
  const budget = budgetMs * MULTIPLIER;
  if (measured > budget) {
    throw new Error(
      `${label}: ${measured.toFixed(1)} ms exceeded the ${budget.toFixed(1)} ms budget ` +
        `(${(measured / budget).toFixed(1)}x over).`,
    );
  }
  expect(measured).toBeLessThanOrEqual(budget);
}

type GcGlobal = typeof globalThis & { gc?: () => void };
const gc = (globalThis as GcGlobal).gc;
const canMeasureMemory = typeof gc === "function";

/** Settle the heap so a reading reflects retained memory, not garbage. */
function collect() {
  for (let i = 0; i < 3; i += 1) gc?.();
}

function heapUsedMb(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

/** Retained heap growth (MB) across `runs` iterations, measured after GC. */
function retainedGrowthMb(runs: number, fn: () => unknown): number {
  fn(); // warm-up: let lazy caches and JIT structures allocate once
  collect();
  const before = heapUsedMb();
  for (let run = 0; run < runs; run += 1) fn();
  collect();
  return heapUsedMb() - before;
}

/** Peak live heap (MB) above the settled baseline while `fn` runs. */
function peakHeapMb(fn: () => unknown): number {
  collect();
  const before = heapUsedMb();
  fn();
  const peak = heapUsedMb();
  return peak - before;
}

function expectUnderMb(label: string, measuredMb: number, budgetMb: number) {
  const budget = budgetMb * MULTIPLIER;
  if (measuredMb > budget) {
    throw new Error(
      `${label}: ${measuredMb.toFixed(1)} MB exceeded the ${budget.toFixed(1)} MB budget ` +
        `(${(measuredMb / budget).toFixed(1)}x over).`,
    );
  }
  expect(measuredMb).toBeLessThanOrEqual(budget);
}

/** 10,000 deterministic USDA-shaped rows, built once for the whole file. */
const CATALOG_10K = makeDedupeCatalog(10_000);

describe("food dedupe performance on a 10k catalog", () => {
  it("builds a deterministic 10k catalog", () => {
    expect(CATALOG_10K).toHaveLength(10_000);
    expect(makeDedupeCatalog(50)).toEqual(CATALOG_10K.slice(0, 50));
  });

  it(
    "scans one incoming food against all 10,000 candidates within budget",
    () => {
      const incoming = makeIncomingNearDuplicate(CATALOG_10K, 4321);
      bestDuplicate(incoming, CATALOG_10K); // warm-up
      const elapsed = bestOf(2, () => bestDuplicate(incoming, CATALOG_10K));
      // Measured ~0.6 s locally for 10k comparisons.
      expectUnder("bestDuplicate over 10k rows", elapsed, 2_000);
    },
    CASE_TIMEOUT,
  );

  it("still finds the near-duplicate it was scanning for", () => {
    const hit = bestDuplicate(makeIncomingNearDuplicate(CATALOG_10K, 4321), CATALOG_10K);
    expect(hit).not.toBeNull();
    expect(hit!.match.verdict).not.toBe("none");
  });

  it(
    "imports a 20-food batch against a 2,000-row catalog within budget",
    () => {
      const catalog = CATALOG_10K.slice(0, 2_000);
      const batch = Array.from({ length: 20 }, (_, i) =>
        makeIncomingNearDuplicate(catalog, i * 37),
      );
      const run = () => {
        for (const incoming of batch) bestDuplicate(incoming, catalog);
      };
      run(); // warm-up
      const elapsed = bestOf(2, run);
      // 40k comparisons; measured ~2 s locally.
      expectUnder("20-food import batch vs 2k catalog", elapsed, 8_000);
    },
    CASE_TIMEOUT,
  );

  it(
    "classifies a single pair fast enough to keep 10k scans viable",
    () => {
      const [a, b] = [CATALOG_10K[10]!, CATALOG_10K[11]!];
      const iterations = 5_000;
      const run = () => {
        for (let i = 0; i < iterations; i += 1) classifyDuplicate(a, b);
      };
      run(); // warm-up
      const elapsed = bestOf(3, run);
      // ~0.04 ms/comparison locally -> ~200 ms for 5k.
      expectUnder("classifyDuplicate x5k", elapsed, 700);
    },
    CASE_TIMEOUT,
  );

  it(
    "pairs a 300-row review slice within budget",
    () => {
      const slice = CATALOG_10K.slice(0, 300); // ~45k comparisons
      findDuplicatePairs(slice); // warm-up
      const elapsed = bestOf(2, () => findDuplicatePairs(slice));
      // Measured ~1.4 s locally for ~45k comparisons; budget allows for noisy CI hosts.
      expectUnder("findDuplicatePairs over 300 rows", elapsed, 9_000);
    },
    CASE_TIMEOUT,
  );

  it(
    "scales roughly quadratically, not worse, as the slice grows",
    () => {
      const small = bestOf(2, () => findDuplicatePairs(CATALOG_10K.slice(0, 150)));
      const large = bestOf(2, () => findDuplicatePairs(CATALOG_10K.slice(0, 300)));
      // Doubling rows quadruples comparisons; allow 3x headroom on top of 4x
      // before calling it a super-quadratic regression.
      const ratio = large / Math.max(small, 1);
      if (ratio > 12) {
        throw new Error(
          `findDuplicatePairs scaled ${ratio.toFixed(1)}x when rows doubled ` +
            `(${small.toFixed(1)} ms -> ${large.toFixed(1)} ms); expected <= 12x.`,
        );
      }
      expect(ratio).toBeLessThanOrEqual(12);
    },
    CASE_TIMEOUT,
  );

  it(
    "keeps the explanation path affordable for on-demand debugging",
    () => {
      const [a, b] = [CATALOG_10K[100]!, CATALOG_10K[112]!];
      const iterations = 1_000;
      const run = () => {
        for (let i = 0; i < iterations; i += 1) explainDuplicate(a, b);
      };
      run(); // warm-up
      const elapsed = bestOf(3, run);
      expectUnder("explainDuplicate x1k", elapsed, 400);
    },
    CASE_TIMEOUT,
  );
});

describe.runIf(canMeasureMemory)("food dedupe memory budgets on a 10k catalog", () => {
  it(
    "does not retain heap across repeated 10k scans",
    () => {
      const incoming = makeIncomingNearDuplicate(CATALOG_10K, 4321);
      // 10 full scans = 100k comparisons. A per-call cache that never evicts,
      // or results appended to module state, shows up as steady growth here.
      const growth = retainedGrowthMb(10, () => bestDuplicate(incoming, CATALOG_10K));
      expectUnderMb("retained heap after 10 x bestDuplicate(10k)", growth, 12);
    },
    CASE_TIMEOUT,
  );

  it(
    "keeps peak allocation for a single 10k scan modest",
    () => {
      const incoming = makeIncomingNearDuplicate(CATALOG_10K, 1234);
      bestDuplicate(incoming, CATALOG_10K); // warm-up
      const peak = peakHeapMb(() => bestDuplicate(incoming, CATALOG_10K));
      // The scan should stream over the catalog, not materialise a result per row.
      expectUnderMb("peak heap during one bestDuplicate(10k)", peak, 24);
    },
    CASE_TIMEOUT,
  );

  it(
    "keeps per-comparison allocation churn bounded",
    () => {
      const [a, b] = [CATALOG_10K[10]!, CATALOG_10K[11]!];
      const iterations = 20_000;
      const growth = retainedGrowthMb(1, () => {
        for (let i = 0; i < iterations; i += 1) classifyDuplicate(a, b);
      });
      // Nothing from a classification should survive the call.
      expectUnderMb(`retained heap after ${iterations} classifyDuplicate calls`, growth, 8);
    },
    CASE_TIMEOUT,
  );

  it(
    "releases the pair list after a 300-row review slice",
    () => {
      const slice = CATALOG_10K.slice(0, 300);
      findDuplicatePairs(slice); // warm-up
      const growth = retainedGrowthMb(3, () => findDuplicatePairs(slice));
      expectUnderMb("retained heap after 3 x findDuplicatePairs(300)", growth, 16);
    },
    CASE_TIMEOUT,
  );

  it(
    "keeps explanation objects from accumulating",
    () => {
      const [a, b] = [CATALOG_10K[100]!, CATALOG_10K[112]!];
      const iterations = 5_000;
      const growth = retainedGrowthMb(1, () => {
        for (let i = 0; i < iterations; i += 1) explainDuplicate(a, b);
      });
      expectUnderMb(`retained heap after ${iterations} explainDuplicate calls`, growth, 10);
    },
    CASE_TIMEOUT,
  );
});
