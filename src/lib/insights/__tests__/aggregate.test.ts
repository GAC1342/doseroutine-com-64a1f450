import { describe, expect, it } from "vitest";
import {
  bucketByDay,
  bucketByWeek,
  condense,
  deltaAcross,
  deltaBetween,
  enumerateDays,
  hasData,
  latest,
  total,
} from "@/lib/insights/aggregate";
import { buildDemoInsights } from "@/lib/insights/demo";

const END = "2026-03-10";

describe("enumerateDays", () => {
  it("returns an inclusive window ending on the given day", () => {
    expect(enumerateDays(3, END)).toEqual(["2026-03-08", "2026-03-09", END]);
  });
});

describe("bucketByDay", () => {
  it("sums same-day values and leaves empty days null", () => {
    const points = bucketByDay(
      [
        { date: "2026-03-09", value: 2 },
        { date: "2026-03-09T18:00:00Z", value: 3 },
        { date: END, value: 1 },
      ],
      3,
      "sum",
      END,
    );
    expect(points.map((p) => p.value)).toEqual([null, 5, 1]);
  });

  it("ignores rows outside the window", () => {
    const points = bucketByDay([{ date: "2020-01-01", value: 9 }], 3, "sum", END);
    expect(hasData(points)).toBe(false);
  });

  it("averages when asked", () => {
    const points = bucketByDay(
      [
        { date: END, value: 10 },
        { date: END, value: 20 },
      ],
      1,
      "avg",
      END,
    );
    expect(points[0]!.value).toBe(15);
  });
});

describe("bucketByWeek", () => {
  it("groups into 7-day blocks", () => {
    const points = bucketByWeek(
      [
        { date: "2026-03-10", value: 1 },
        { date: "2026-03-04", value: 1 },
        { date: "2026-03-01", value: 1 },
      ],
      14,
      "sum",
      END,
    );
    expect(points).toHaveLength(2);
    expect(points[0]!.value).toBe(1);
    expect(points[1]!.value).toBe(2);
  });
});

describe("condense", () => {
  it("keeps the final point when downsampling", () => {
    const points = bucketByDay([], 365, "sum", END);
    const small = condense(points, 40);
    expect(small.length).toBeLessThanOrEqual(41);
    expect(small[small.length - 1]!.date).toBe(END);
  });
});

describe("deltas", () => {
  it("computes percent change between halves", () => {
    const points = bucketByDay(
      [
        { date: "2026-03-07", value: 10 },
        { date: "2026-03-08", value: 10 },
        { date: "2026-03-09", value: 20 },
        { date: END, value: 20 },
      ],
      4,
      "sum",
      END,
    );
    const d = deltaAcross(points, "avg");
    expect(d.pct).toBe(100);
    expect(d.direction).toBe("up");
  });

  it("treats tiny moves as flat", () => {
    expect(deltaBetween(100.1, 100).direction).toBe("flat");
    expect(deltaBetween(80, 100).direction).toBe("down");
    expect(deltaBetween(null, 100).change).toBeNull();
  });
});

describe("series helpers", () => {
  it("totals and reads the latest non-null value", () => {
    const points = bucketByDay(
      [
        { date: "2026-03-09", value: 4 },
        { date: END, value: 6 },
      ],
      3,
      "sum",
      END,
    );
    expect(total(points)).toBe(10);
    expect(latest(points)).toBe(6);
  });
});

describe("demo insights", () => {
  it("produces populated, deterministic sample series", () => {
    const a = buildDemoInsights();
    const b = buildDemoInsights();
    expect(a.adherence.map((p) => p.value)).toEqual(b.adherence.map((p) => p.value));
    expect(hasData(a.adherence)).toBe(true);
    expect(hasData(a.weight)).toBe(true);
    expect(a.rotation.sites.length).toBeGreaterThan(0);
    expect(a.vials.length).toBeGreaterThan(0);
    expect(a.spend.length).toBeGreaterThan(0);
  });
});
