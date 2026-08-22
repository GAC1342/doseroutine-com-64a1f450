import { describe, expect, it } from "vitest";
import { DEFAULT_TIMING_RULES } from "@/lib/meal-timing";
import {
  STARTER_PRESETS,
  isPresetActive,
  normalizePresetName,
  presetRules,
  resolveAutoPreset,
  autoRuleSummary,
  presetMatchesDay,
  parsePresetsJson,
  presetsToJson,
  type MealTimingPreset,
} from "@/lib/meal-timing-presets";

const preset = (over: Partial<MealTimingPreset> = {}): MealTimingPreset => ({
  id: "p1",
  name: "Training day",
  auto_mode: "off",
  auto_weekdays: [],
  ...DEFAULT_TIMING_RULES,
  ...over,
});

describe("presetRules", () => {
  it("drops id and name", () => {
    expect(presetRules(preset())).toEqual(DEFAULT_TIMING_RULES);
  });
});

describe("isPresetActive", () => {
  it("matches when every rule value is equal", () => {
    expect(isPresetActive(preset(), { ...DEFAULT_TIMING_RULES })).toBe(true);
  });
  it("does not match on any difference", () => {
    expect(isPresetActive(preset(), { ...DEFAULT_TIMING_RULES, workout_window_min: 45 })).toBe(
      false,
    );
  });
});

describe("normalizePresetName", () => {
  it("collapses whitespace and caps the length", () => {
    expect(normalizePresetName("  Training   day \n")).toBe("Training day");
    expect(normalizePresetName("x".repeat(60))).toHaveLength(40);
    expect(normalizePresetName("   ")).toBe("");
  });
});

describe("STARTER_PRESETS", () => {
  it("offers distinct training and rest day setups", () => {
    const names = STARTER_PRESETS.map((p) => p.name);
    expect(names).toEqual(["Training day", "Rest day"]);
    expect(STARTER_PRESETS[0]!.rules.workout_window_min).toBeGreaterThan(
      STARTER_PRESETS[1]!.rules.workout_window_min,
    );
    expect(STARTER_PRESETS[0]!.rules.max_meals_per_day).toBeGreaterThan(
      STARTER_PRESETS[1]!.rules.max_meals_per_day,
    );
  });
});

describe("auto-apply scheduling", () => {
  const training = preset({ id: "t", name: "Training day", auto_mode: "workout_days" });
  const rest = preset({ id: "r", name: "Rest day", auto_mode: "rest_days" });
  const sunday = preset({
    id: "s",
    name: "Sunday reset",
    auto_mode: "weekdays",
    auto_weekdays: [0],
  });

  it("matches workout and rest days", () => {
    expect(presetMatchesDay(training, { weekday: 1, isWorkoutDay: true })).toBe(true);
    expect(presetMatchesDay(training, { weekday: 1, isWorkoutDay: false })).toBe(false);
    expect(presetMatchesDay(rest, { weekday: 1, isWorkoutDay: false })).toBe(true);
  });

  it("prefers an explicit weekday pick over workout rules", () => {
    const picked = resolveAutoPreset([training, rest, sunday], { weekday: 0, isWorkoutDay: true });
    expect(picked?.id).toBe("s");
  });

  it("falls back to the workout rule and returns null when nothing matches", () => {
    expect(resolveAutoPreset([training, sunday], { weekday: 2, isWorkoutDay: true })?.id).toBe("t");
    expect(resolveAutoPreset([sunday], { weekday: 2, isWorkoutDay: true })).toBeNull();
  });

  it("summarises the schedule", () => {
    expect(autoRuleSummary(sunday)).toBe("Auto on Sun");
    expect(autoRuleSummary(preset())).toBeNull();
  });
});

describe("preset export / import", () => {
  const preset = {
    id: "1",
    name: "Training day",
    auto_mode: "weekdays" as const,
    auto_weekdays: [1, 3],
    ...DEFAULT_TIMING_RULES,
  };

  it("round-trips through JSON", () => {
    const { presets, skipped } = parsePresetsJson(presetsToJson([preset]));
    expect(skipped).toHaveLength(0);
    expect(presets[0]).toMatchObject({
      name: "Training day",
      auto_mode: "weekdays",
      auto_weekdays: [1, 3],
      late_meal_hour: DEFAULT_TIMING_RULES.late_meal_hour,
    });
  });

  it("skips junk rows and bad files", () => {
    expect(parsePresetsJson("nope").presets).toHaveLength(0);
    const res = parsePresetsJson(
      JSON.stringify({ presets: [{ name: "" }, { name: "A" }, { name: "a" }] }),
    );
    expect(res.presets).toHaveLength(1);
    expect(res.skipped.length).toBe(2);
  });
});
