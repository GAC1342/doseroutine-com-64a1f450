import { describe, expect, it } from "vitest";
import {
  buildDailySeries,
  buildQueryRows,
  filterQueryRows,
  indexByKey,
  mergeMetrics,
  queryRowsToCsv,
  sortQueryRows,
  totalsOfQueries,
} from "@/lib/blog-post-search-detail";

const row = (key: string, clicks: number, impressions: number, position: number) => ({
  keys: [key],
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

describe("blog post search detail", () => {
  it("merges duplicate keys with impression-weighted position", () => {
    const merged = mergeMetrics(
      { clicks: 1, impressions: 100, ctr: 0.01, position: 10 },
      { clicks: 3, impressions: 300, ctr: 0.01, position: 6 },
    );
    expect(merged.clicks).toBe(4);
    expect(merged.impressions).toBe(400);
    expect(merged.position).toBeCloseTo(7);
    expect(merged.ctr).toBeCloseTo(0.01);
  });

  it("indexes rows and folds duplicates", () => {
    const map = indexByKey([row("retatrutide", 2, 50, 8), row("retatrutide", 3, 50, 4)]);
    expect(map.size).toBe(1);
    expect(map.get("retatrutide")?.impressions).toBe(100);
    expect(map.get("retatrutide")?.position).toBeCloseTo(6);
  });

  it("computes deltas and flags new queries", () => {
    const rows = buildQueryRows(
      indexByKey([row("a", 5, 100, 5), row("b", 1, 20, 12)]),
      indexByKey([row("a", 2, 60, 9)]),
    );
    const a = rows.find((r) => r.query === "a")!;
    const b = rows.find((r) => r.query === "b")!;
    expect(a.deltaClicks).toBe(3);
    expect(a.deltaImpressions).toBe(40);
    expect(a.deltaPosition).toBeCloseTo(-4);
    expect(a.isNew).toBe(false);
    expect(b.isNew).toBe(true);
    expect(b.deltaClicks).toBeNull();
    // default sort is impressions desc
    expect(rows[0].query).toBe("a");
  });

  it("sorts and filters the query table", () => {
    const rows = buildQueryRows(
      indexByKey([row("alpha", 1, 10, 3), row("beta", 9, 5, 1)]),
      new Map(),
    );
    expect(sortQueryRows(rows, "clicks", "desc")[0].query).toBe("beta");
    expect(sortQueryRows(rows, "position", "asc")[0].query).toBe("beta");
    expect(sortQueryRows(rows, "query", "asc")[0].query).toBe("alpha");
    expect(filterQueryRows(rows, "BET").map((r) => r.query)).toEqual(["beta"]);
    expect(filterQueryRows(rows, "  ")).toHaveLength(2);
  });

  it("builds an ascending daily series", () => {
    const daily = buildDailySeries([row("2026-01-03", 1, 10, 5), row("2026-01-01", 0, 4, 9)]);
    expect(daily.map((d) => d.date)).toEqual(["2026-01-01", "2026-01-03"]);
  });

  it("totals queries with weighted position", () => {
    const rows = buildQueryRows(
      indexByKey([row("a", 1, 100, 10), row("b", 1, 100, 20)]),
      new Map(),
    );
    const totals = totalsOfQueries(rows);
    expect(totals.queries).toBe(2);
    expect(totals.impressions).toBe(200);
    expect(totals.position).toBeCloseTo(15);
    expect(totals.ctr).toBeCloseTo(0.01);
  });

  it("escapes quotes in CSV export", () => {
    const rows = buildQueryRows(indexByKey([row('best "peptide"', 1, 10, 4)]), new Map());
    const csv = queryRowsToCsv(rows);
    expect(csv.split("\n")[0]).toBe("query,impressions,clicks,ctr,position");
    expect(csv).toContain('"best ""peptide"""');
  });
});
