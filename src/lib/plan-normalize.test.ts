import { describe, expect, it } from "vitest";
import { normalizePlanPayload, normalizeSlot } from "@/lib/plan-normalize";
import { blockTime, buildPlanTimeMap, diffSchedule } from "@/lib/apply-plan-logic";

/**
 * Regression suite for the "plan generates but shows nothing" bug: the model
 * returned capitalised slots and a `compounds` array, the old strict schema
 * `.catch([])` wiped every block, and the user saw a summary with no plan.
 */
const MALFORMED_AI_RESPONSE = {
  goal: "Focus & cognition",
  summary: "Front-loads stimulatory items and keeps calming items late.",
  schedule: [
    {
      time_of_day: "Morning",
      clock_hint: "8:00 AM",
      reason: "Peak cortisol window supports focus.",
      compounds: [
        { name: "Tesamorelin", dose: "1 mg", controlled: true, id: "uc-1" },
        { compound: "Quercetin", dosage: "500 mg" },
      ],
    },
    {
      time: "Mid-day",
      items: [{ name: "Urolithin A", dose: "500 mg" }],
    },
    // Unrepairable: no recognisable slot.
    { time_of_day: "Whenever", items: [{ name: "Creatine" }] },
    // Repairable slot but no items — dropped without harming the rest.
    { time_of_day: "Evening", items: [] },
    { time_of_day: "before bed", compounds: [{ name: "Magnesium", dose: "300 mg" }] },
  ],
  interactions: [
    {
      compound_a: "Quercetin",
      compound_b: "Urolithin A",
      severity: "SYNERGY",
      reason: "Shared pathway.",
    },
  ],
};

describe("normalizeSlot", () => {
  it("maps capitalisation, spacing and common aliases onto the five slots", () => {
    expect(normalizeSlot("Morning")).toBe("morning");
    expect(normalizeSlot("MID_DAY")).toBe("midday");
    expect(normalizeSlot("Before bed")).toBe("bedtime");
    expect(normalizeSlot("night")).toBe("bedtime");
    expect(normalizeSlot("Evening (with dinner)")).toBe("evening");
    expect(normalizeSlot("post-workout")).toBe("afternoon");
  });

  it("returns null for something it cannot place", () => {
    expect(normalizeSlot("whenever")).toBeNull();
    expect(normalizeSlot(undefined)).toBeNull();
  });
});

describe("normalizePlanPayload", () => {
  const plan = normalizePlanPayload(MALFORMED_AI_RESPONSE, "Focus & cognition");

  it("keeps every repairable block instead of wiping the schedule", () => {
    expect(plan.blocks.length).toBe(3);
    expect(plan.blocks.map((b) => b.time_of_day)).toEqual(["morning", "midday", "bedtime"]);
  });

  it("accepts `compounds` as an alias for `items` and `reason` for `education`", () => {
    const morning = plan.blocks[0];
    expect(morning.items.map((i) => i.name)).toEqual(["Tesamorelin", "Quercetin"]);
    expect(morning.items[0].dose).toBe("1 mg");
    expect(morning.items[0].user_compound_id).toBe("uc-1");
    expect(morning.items[1].dose).toBe("500 mg");
    expect(morning.education).toContain("cortisol");
  });

  it("never returns a block with zero items and always sorts slots chronologically", () => {
    expect(plan.blocks.every((b) => b.items.length > 0)).toBe(true);
  });

  it("normalises warnings and their severity casing", () => {
    expect(plan.warnings).toHaveLength(1);
    expect(plan.warnings[0].severity).toBe("synergy");
    expect(plan.warnings[0].a).toBe("Quercetin");
  });

  it("forces the goal and the disclaimer", () => {
    expect(plan.goal).toBe("Focus & cognition");
    expect(plan.disclaimer).toBe("This is educational, not medical advice.");
  });

  it("merges duplicate slots rather than showing two morning cards", () => {
    const merged = normalizePlanPayload(
      {
        blocks: [
          { time_of_day: "Morning", items: [{ name: "A" }] },
          { time_of_day: "Early morning", items: [{ name: "B" }, { name: "A" }] },
        ],
      },
      "energy",
    );
    expect(merged.blocks).toHaveLength(1);
    expect(merged.blocks[0].items.map((i) => i.name)).toEqual(["A", "B"]);
  });

  it("survives complete garbage without throwing", () => {
    expect(normalizePlanPayload(null, "g").blocks).toEqual([]);
    expect(normalizePlanPayload({ blocks: "nope" }, "g").blocks).toEqual([]);
  });
});

describe("applying a plan to the stack", () => {
  it("derives a clock time from the hint, or falls back to the slot default", () => {
    expect(blockTime({ time_of_day: "morning", clock_hint: "07:30" })).toBe("07:30");
    expect(blockTime({ time_of_day: "morning", clock_hint: "around 8:00 with food" })).toBe(
      "08:00",
    );
    expect(blockTime({ time_of_day: "bedtime" })).toBe("22:00");
  });

  it("collects every time a compound is placed at", () => {
    const map = buildPlanTimeMap({
      goal: "g",
      disclaimer: "d",
      summary: "s",
      warnings: [],
      blocks: [
        {
          time_of_day: "morning",
          clock_hint: "08:00",
          items: [{ user_compound_id: "a", name: "A", dose: "", controlled: false }],
        },
        {
          time_of_day: "evening",
          clock_hint: "19:00",
          items: [
            { user_compound_id: "a", name: "A", dose: "", controlled: false },
            { user_compound_id: "b", name: "B", dose: "", controlled: false },
          ],
        },
      ],
    });
    expect(map.get("a")).toEqual(["08:00", "19:00"]);
    expect(map.get("b")).toEqual(["19:00"]);
  });

  it("leaves compounds the plan didn't place untouched", () => {
    const changes = diffSchedule(
      [
        { id: "a", name: "A", times_of_day: ["12:00"] },
        { id: "b", name: "B", times_of_day: ["09:00"] },
        { id: "c", name: "C", times_of_day: ["21:00"] },
      ],
      new Map([
        ["a", ["08:00"]],
        ["b", ["09:00"]],
      ]),
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ id: "a", from: ["12:00"], to: ["08:00"] });
  });
});
