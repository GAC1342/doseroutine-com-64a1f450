/**
 * Performance budgets for the portion-scaling hot path.
 *
 * These functions run on every keystroke in the amount field and on every
 * servings change, so a regression here shows up as visible UI lag. The budgets
 * are set well above measured local timings: they catch a real slowdown (an
 * added network-shaped lookup, an accidental O(n^2) pass), not machine noise.
 *
 * Set PERF_BUDGET_MULTIPLIER=3 on a slow CI runner to relax every budget.
 */
import { describe, expect, it, vi } from "vitest";
import { foodDbMock, portionsQueryMock, startMock } from "@/test/fixtures/meal-harness";
import { makeLargeMeal } from "@/test/fixtures/foods";

// The rescale helper lives next to a React component; stub its framework
// imports so this stays a pure timing test with no rendering cost.
vi.mock("@tanstack/react-query", () => portionsQueryMock());
vi.mock("@tanstack/react-start", () => startMock());
vi.mock("@/lib/food-db.functions", () => foodDbMock());

import { rescaleItemToGrams } from "@/components/food-portion-picker";
import { roundTotals, scaleItems, totalsFor } from "@/lib/meal-nutrition";
import { cueClassFor, parsePortionGrams, parseQuantity, visualHintFor } from "@/lib/portion-units";

const MULTIPLIER = Number(process.env["PERF_BUDGET_MULTIPLIER"] ?? 1) || 1;

/**
 * Average ms per call, best of three runs. Best-of-N absorbs a one-off
 * scheduler stall on a shared runner without weakening the budget.
 */
function measure(label: string, iterations: number, fn: (i: number) => unknown) {
  // Warm-up so first-call JIT cost is not part of the measurement.
  for (let i = 0; i < Math.min(iterations, 200); i += 1) fn(i);

  let best = Infinity;
  for (let run = 0; run < 3; run += 1) {
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) fn(i);
    const avg = (performance.now() - start) / iterations;
    if (avg < best) best = avg;
  }

  return {
    avg: best,
    /** Fails with the measured number next to the budget. */
    expectUnder(budgetMs: number) {
      const budget = budgetMs * MULTIPLIER;
      if (best > budget) {
        throw new Error(
          `${label}: ${best.toFixed(4)} ms/call exceeded the ${budget.toFixed(4)} ms budget ` +
            `(${(best / budget).toFixed(1)}x over, ${iterations} iterations).`,
        );
      }
      expect(best).toBeLessThanOrEqual(budget);
    },
  };
}

const AMOUNTS = ["200 g", "1 lb 4 oz", "1,5 kg", "3 oz", "1 cup", "2.5 servings", "150g"];
const FOODS = [
  "Grilled chicken breast",
  "Steamed broccoli",
  "Brown rice",
  "Almonds",
  "Olive oil",
  "Cheddar cheese",
];

describe("portion parsing stays within budget", () => {
  it("parses free-typed amounts fast", () => {
    measure("parsePortionGrams", 10_000, (i) =>
      parsePortionGrams(AMOUNTS[i % AMOUNTS.length]!),
    ).expectUnder(0.05);
  });

  it("parses raw quantities fast", () => {
    measure("parseQuantity", 10_000, (i) =>
      parseQuantity(AMOUNTS[i % AMOUNTS.length]!),
    ).expectUnder(0.05);
  });

  it("parses and derives the cue label together fast", () => {
    measure("parse + cue", 10_000, (i) => {
      const grams = parsePortionGrams(AMOUNTS[i % AMOUNTS.length]!);
      const food = FOODS[i % FOODS.length]!;
      cueClassFor(food);
      return grams ? visualHintFor(grams, food) : null;
    }).expectUnder(0.05);
  });
});

describe("recalculation stays within budget", () => {
  const items = makeLargeMeal(12);

  it("rescales a single item fast", () => {
    const item = items[0]!;
    measure("rescaleItemToGrams", 10_000, (i) =>
      rescaleItemToGrams(item, 60 + (i % 200)),
    ).expectUnder(0.02);
  });

  it("recalculates a 12-item meal fast", () => {
    measure("full meal recalc", 2_000, (i) => {
      const factor = 0.5 + (i % 20) / 10;
      return roundTotals(totalsFor(scaleItems(items, factor)));
    }).expectUnder(1);
  });

  it("keeps a rapid servings-slider burst under one frame budget each", () => {
    // 60 consecutive recalcs, as if the user dragged servings for one second.
    const burst = () => {
      for (let frame = 0; frame < 60; frame += 1) {
        const factor = 0.5 + (frame % 20) / 10;
        roundTotals(totalsFor(scaleItems(items, factor)));
      }
    };
    burst();

    let best = Infinity;
    for (let run = 0; run < 3; run += 1) {
      const start = performance.now();
      burst();
      best = Math.min(best, performance.now() - start);
    }

    const budget = 30 * MULTIPLIER;
    if (best > budget) {
      throw new Error(
        `60-frame recalc burst took ${best.toFixed(2)} ms, over the ${budget.toFixed(2)} ms budget.`,
      );
    }
    expect(best).toBeLessThanOrEqual(budget);
  });
});
