import { describe, expect, it } from "vitest";
import {
  buildMonthlyReport,
  computeAdherenceScore,
  scoreBand,
  type AdhEvent,
} from "@/lib/adherence";

const NOW = new Date("2026-03-20T12:00:00Z");

function ev(partial: Partial<AdhEvent> & { scheduled_at: string }): AdhEvent {
  return {
    id: Math.random().toString(36).slice(2),
    status: "pending",
    taken_at: null,
    ...partial,
  };
}

describe("computeAdherenceScore", () => {
  it("returns null (not zero) when nothing has been resolved yet", () => {
    const result = computeAdherenceScore([], 30, NOW);
    expect(result.score).toBeNull();
    expect(result.scored).toBe(0);
  });

  it("scores taken / (taken + missed)", () => {
    const events = [
      ev({
        scheduled_at: "2026-03-19T08:00:00Z",
        status: "taken",
        taken_at: "2026-03-19T08:05:00Z",
      }),
      ev({
        scheduled_at: "2026-03-18T08:00:00Z",
        status: "taken",
        taken_at: "2026-03-18T08:05:00Z",
      }),
      ev({
        scheduled_at: "2026-03-17T08:00:00Z",
        status: "taken",
        taken_at: "2026-03-17T08:05:00Z",
      }),
      ev({ scheduled_at: "2026-03-16T08:00:00Z", status: "missed" }),
    ];
    expect(computeAdherenceScore(events, 30, NOW).score).toBe(75);
  });

  it("excludes intentional skips from both sides of the ratio", () => {
    const events = [
      ev({
        scheduled_at: "2026-03-19T08:00:00Z",
        status: "taken",
        taken_at: "2026-03-19T08:05:00Z",
      }),
      ev({ scheduled_at: "2026-03-18T08:00:00Z", status: "skipped" }),
      ev({ scheduled_at: "2026-03-17T08:00:00Z", status: "skipped" }),
    ];
    const result = computeAdherenceScore(events, 30, NOW);
    expect(result.score).toBe(100);
    expect(result.skipped).toBe(2);
    expect(result.scored).toBe(1);
  });

  it("ignores future pending doses so they cannot drag the score down", () => {
    const events = [
      ev({
        scheduled_at: "2026-03-19T08:00:00Z",
        status: "taken",
        taken_at: "2026-03-19T08:05:00Z",
      }),
      ev({ scheduled_at: "2026-03-25T08:00:00Z", status: "pending" }),
    ];
    expect(computeAdherenceScore(events, 30, NOW).score).toBe(100);
  });

  it("ignores doses older than the window", () => {
    const events = [
      ev({ scheduled_at: "2025-12-01T08:00:00Z", status: "missed" }),
      ev({
        scheduled_at: "2026-03-19T08:00:00Z",
        status: "taken",
        taken_at: "2026-03-19T08:05:00Z",
      }),
    ];
    const result = computeAdherenceScore(events, 30, NOW);
    expect(result.missed).toBe(0);
    expect(result.score).toBe(100);
  });
});

describe("scoreBand", () => {
  it("maps scores to bands", () => {
    expect(scoreBand(null)).toBe("none");
    expect(scoreBand(95)).toBe("great");
    expect(scoreBand(80)).toBe("good");
    expect(scoreBand(60)).toBe("fair");
    expect(scoreBand(10)).toBe("low");
  });
});

describe("buildMonthlyReport", () => {
  const events = [
    // March: 3 taken, 1 missed => 75
    ev({
      scheduled_at: "2026-03-02T08:00:00Z",
      status: "taken",
      taken_at: "2026-03-02T08:01:00Z",
      label: "Vitamin D",
    }),
    ev({
      scheduled_at: "2026-03-03T08:00:00Z",
      status: "taken",
      taken_at: "2026-03-03T08:01:00Z",
      label: "Vitamin D",
    }),
    ev({
      scheduled_at: "2026-03-04T08:00:00Z",
      status: "taken",
      taken_at: "2026-03-04T08:01:00Z",
      label: "Vitamin D",
    }),
    ev({ scheduled_at: "2026-03-05T08:00:00Z", status: "missed", label: "Tesamorelin" }),
    // February: 1 taken, 1 missed => 50
    ev({
      scheduled_at: "2026-02-10T08:00:00Z",
      status: "taken",
      taken_at: "2026-02-10T08:01:00Z",
      label: "Vitamin D",
    }),
    ev({ scheduled_at: "2026-02-11T08:00:00Z", status: "missed", label: "Vitamin D" }),
  ];

  it("scores the requested month and compares against the previous one", () => {
    const report = buildMonthlyReport(events, { month: "2026-03", zone: "UTC", now: NOW });
    expect(report.score).toBe(75);
    expect(report.previousScore).toBe(50);
    expect(report.delta).toBe(25);
  });

  it("breaks the month down per compound", () => {
    const report = buildMonthlyReport(events, { month: "2026-03", zone: "UTC", now: NOW });
    expect(report.best[0]).toMatchObject({ label: "Vitamin D", score: 100 });
    expect(report.worst.some((c) => c.label === "Tesamorelin" && c.score === 0)).toBe(true);
  });

  it("never lists the same compound as both best and worst", () => {
    const single = [
      ev({
        scheduled_at: "2026-03-02T08:00:00Z",
        status: "taken",
        taken_at: "2026-03-02T08:01:00Z",
        label: "Only",
      }),
    ];
    const report = buildMonthlyReport(single, { month: "2026-03", zone: "UTC", now: NOW });
    expect(report.best.map((c) => c.label)).toEqual(["Only"]);
    expect(report.worst).toEqual([]);
  });

  it("returns day cells sorted ascending with ratios", () => {
    const report = buildMonthlyReport(events, { month: "2026-03", zone: "UTC", now: NOW });
    expect(report.days.map((d) => d.date)).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
    ]);
    expect(report.days[3].ratio).toBe(0);
  });

  it("has no previous-month delta when there is no prior data", () => {
    const report = buildMonthlyReport(events, { month: "2026-02", zone: "UTC", now: NOW });
    expect(report.previousScore).toBeNull();
    expect(report.delta).toBeNull();
  });
});
