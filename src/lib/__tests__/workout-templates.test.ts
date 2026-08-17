import { describe, expect, it } from "vitest";
import {
  formatPaceInput,
  parsePaceInput,
  templateSummary,
  type WorkoutTemplate,
} from "@/lib/workout-templates";

function template(partial: Partial<WorkoutTemplate> = {}): WorkoutTemplate {
  return {
    id: "t1",
    name: "Push day",
    workout_type: "strength",
    duration_min: null,
    rpe: null,
    calories: null,
    distance_m: null,
    target_pace_s: null,
    target_hr: null,
    notes: null,
    use_count: 0,
    last_used_at: null,
    exercises: [],
    ...partial,
  };
}

describe("parsePaceInput", () => {
  it("parses min:sec", () => {
    expect(parsePaceInput("8:30")).toBe(510);
    expect(parsePaceInput("10:05")).toBe(605);
  });

  it("tolerates a unit suffix", () => {
    expect(parsePaceInput("8:30 /mi")).toBe(510);
    expect(parsePaceInput("4:00/km")).toBe(240);
  });

  it("accepts raw seconds", () => {
    expect(parsePaceInput("510")).toBe(510);
  });

  it("rejects junk and non-positive values", () => {
    expect(parsePaceInput("")).toBeNull();
    expect(parsePaceInput("fast")).toBeNull();
    expect(parsePaceInput("0")).toBeNull();
    expect(parsePaceInput("8:75")).toBeNull();
  });
});

describe("formatPaceInput", () => {
  it("round-trips with parsePaceInput", () => {
    expect(formatPaceInput(510)).toBe("8:30");
    expect(parsePaceInput(formatPaceInput(605))).toBe(605);
  });

  it("returns empty for missing pace", () => {
    expect(formatPaceInput(null)).toBe("");
    expect(formatPaceInput(0)).toBe("");
  });
});

describe("templateSummary", () => {
  it("summarises exercises, duration and pacing", () => {
    const summary = templateSummary(
      template({
        duration_min: 45,
        rpe: 8,
        target_pace_s: 510,
        exercises: [
          {
            id: "e1",
            template_id: "t1",
            exercise: "Bench",
            set_index: 0,
            sets: 4,
            reps: 8,
            weight_kg: 80,
            rest_seconds: 120,
            tempo: "3-1-1",
          },
        ],
      }),
    );
    expect(summary).toBe("1 exercise · 45 min · 8:30 pace · RPE 8");
  });

  it("is empty when the template has no details", () => {
    expect(templateSummary(template())).toBe("");
  });
});
