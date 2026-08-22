/**
 * Saved meal-timing presets, so a user can flip between setups (training day
 * vs rest day, travel week, fasting day) without re-typing every number.
 */
import { DEFAULT_TIMING_RULES, type MealTimingRules } from "@/lib/meal-timing";

export type MealTimingPreset = MealTimingRules & {
  id: string;
  name: string;
  auto_mode: PresetAutoMode;
  auto_weekdays: number[] | null;
};

export const PRESET_COLUMNS =
  "id,name,auto_mode,auto_weekdays,with_food_window_min,workout_window_min,empty_stomach_gap_min,first_meal_protein_g,late_meal_hour,max_meals_per_day,suggestions_enabled";

/** Starter presets offered when the user has none yet. */
export const STARTER_PRESETS: Array<{ name: string; rules: MealTimingRules }> = [
  {
    name: "Training day",
    rules: {
      ...DEFAULT_TIMING_RULES,
      workout_window_min: 120,
      first_meal_protein_g: 40,
      max_meals_per_day: 6,
    },
  },
  {
    name: "Rest day",
    rules: {
      ...DEFAULT_TIMING_RULES,
      workout_window_min: 60,
      first_meal_protein_g: 30,
      max_meals_per_day: 4,
      late_meal_hour: 20,
    },
  },
];

/** Strip a preset down to just the rule values. */
export function presetRules(preset: MealTimingPreset): MealTimingRules {
  const {
    id: _id,
    name: _name,
    auto_mode: _autoMode,
    auto_weekdays: _autoWeekdays,
    ...rules
  } = preset;
  return rules;
}

/** True when the live rules already equal this preset. */
export function isPresetActive(preset: MealTimingPreset, rules: MealTimingRules): boolean {
  const target = presetRules(preset);
  return (Object.keys(target) as Array<keyof MealTimingRules>).every(
    (key) => target[key] === rules[key],
  );
}

/** Trim and validate a preset name typed by the user. */
export function normalizePresetName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, 40);
}

/* ---------------------------------------------------------------------------
 * Auto-apply
 * ------------------------------------------------------------------------- */

export type PresetAutoMode = "off" | "workout_days" | "rest_days" | "weekdays";

export const AUTO_MODE_LABELS: Record<PresetAutoMode, string> = {
  off: "Never (manual only)",
  workout_days: "On my workout days",
  rest_days: "On my rest days",
  weekdays: "On chosen days",
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type AutoContext = {
  /** 0 = Sunday. */
  weekday: number;
  /** True when a workout is planned or logged for that day. */
  isWorkoutDay: boolean;
};

/** Short human summary of when a preset will switch itself on. */
export function autoRuleSummary(preset: MealTimingPreset): string | null {
  switch (preset.auto_mode) {
    case "workout_days":
      return "Auto on workout days";
    case "rest_days":
      return "Auto on rest days";
    case "weekdays": {
      const days = (preset.auto_weekdays ?? []).slice().sort((a, b) => a - b);
      if (days.length === 0) return null;
      return `Auto on ${days.map((d) => WEEKDAY_LABELS[d]).join(", ")}`;
    }
    default:
      return null;
  }
}

/** Does this preset's auto rule match the given day? */
export function presetMatchesDay(preset: MealTimingPreset, ctx: AutoContext): boolean {
  switch (preset.auto_mode) {
    case "workout_days":
      return ctx.isWorkoutDay;
    case "rest_days":
      return !ctx.isWorkoutDay;
    case "weekdays":
      return (preset.auto_weekdays ?? []).includes(ctx.weekday);
    default:
      return false;
  }
}

/** Pick the preset that should be active today.
 *  Explicit weekday picks beat workout/rest rules; ties break on name so the
 *  choice is stable between renders. */
export function resolveAutoPreset(
  presets: MealTimingPreset[],
  ctx: AutoContext,
): MealTimingPreset | null {
  const matches = presets.filter((p) => presetMatchesDay(p, ctx));
  if (matches.length === 0) return null;
  const weekdayPicks = matches.filter((p) => p.auto_mode === "weekdays");
  const pool = weekdayPicks.length > 0 ? weekdayPicks : matches;
  return pool.slice().sort((a, b) => a.name.localeCompare(b.name))[0] ?? null;
}

/* ---------------------------------------------------------------------------
 * Export / import (device sync via a small JSON file)
 * ------------------------------------------------------------------------- */

export const PRESET_FILE_KIND = "doseroutine.meal-timing-presets";
export const PRESET_FILE_VERSION = 1;

export type PresetExportFile = {
  kind: typeof PRESET_FILE_KIND;
  version: number;
  exported_at: string;
  presets: Array<
    MealTimingRules & { name: string; auto_mode: PresetAutoMode; auto_weekdays: number[] | null }
  >;
};

/** Serialise presets to a portable JSON string (no ids, no user ids). */
export function presetsToJson(presets: ReadonlyArray<MealTimingPreset>): string {
  const file: PresetExportFile = {
    kind: PRESET_FILE_KIND,
    version: PRESET_FILE_VERSION,
    exported_at: new Date().toISOString(),
    presets: presets.map((preset) => ({
      name: preset.name,
      auto_mode: preset.auto_mode,
      auto_weekdays: preset.auto_weekdays ?? null,
      ...presetRules(preset),
    })),
  };
  return JSON.stringify(file, null, 2);
}

export type PresetImportResult = {
  presets: Array<
    MealTimingRules & { name: string; auto_mode: PresetAutoMode; auto_weekdays: number[] | null }
  >;
  skipped: string[];
};

function clampNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Parse a previously exported file back into presets, ignoring junk rows. */
export function parsePresetsJson(input: string): PresetImportResult {
  const skipped: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { presets: [], skipped: ["That file isn't valid JSON"] };
  }
  const raw = Array.isArray(parsed)
    ? parsed
    : ((parsed as { presets?: unknown })?.presets as unknown);
  if (!Array.isArray(raw)) return { presets: [], skipped: ["No presets found in that file"] };

  const seen = new Set<string>();
  const presets: PresetImportResult["presets"] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      skipped.push("A row wasn't readable");
      continue;
    }
    const row = item as Record<string, unknown>;
    const name = normalizePresetName(String(row["name"] ?? ""));
    if (!name) {
      skipped.push("A preset had no name");
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      skipped.push(`Duplicate preset “${name}”`);
      continue;
    }
    seen.add(key);

    const mode = String(row["auto_mode"] ?? "off") as PresetAutoMode;
    const autoMode: PresetAutoMode = ["off", "workout_days", "rest_days", "weekdays"].includes(mode)
      ? mode
      : "off";
    const weekdays = Array.isArray(row["auto_weekdays"])
      ? (row["auto_weekdays"] as unknown[])
          .map((d) => Number(d))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      : null;

    const rules = {} as MealTimingRules;
    (Object.keys(DEFAULT_TIMING_RULES) as Array<keyof MealTimingRules>).forEach((key2) => {
      const fallback = DEFAULT_TIMING_RULES[key2];
      const value = row[key2 as string];
      (rules as Record<string, unknown>)[key2 as string] =
        typeof fallback === "boolean" ? value !== false : clampNumber(value, fallback as number);
    });

    presets.push({ name, auto_mode: autoMode, auto_weekdays: weekdays, ...rules });
  }
  if (presets.length === 0 && skipped.length === 0) skipped.push("No presets found in that file");
  return { presets, skipped };
}
