const KEY = "doseroutine.booty-workout.settings.v1";

export type BootyIntensity = "gentle" | "standard" | "intense" | "custom";

export type BootyWorkoutSettings = {
  /** Seconds of work per move. */
  workSec: number;
  /** Seconds of rest between moves. */
  restSec: number;
  /** Which preset produced these numbers ("custom" when hand-tuned). */
  preset: BootyIntensity;
};

export const WORK_MIN = 15;
export const WORK_MAX = 90;
export const REST_MIN = 0;
export const REST_MAX = 60;
export const STEP_SEC = 5;

export const INTENSITY_PRESETS: {
  id: Exclude<BootyIntensity, "custom">;
  label: string;
  description: string;
  workSec: number;
  restSec: number;
}[] = [
  {
    id: "gentle",
    label: "Gentle",
    description: "Shorter work, longer rest — great for beginners.",
    workSec: 30,
    restSec: 20,
  },
  {
    id: "standard",
    label: "Standard",
    description: "The classic 45 on, 15 off ten-minute routine.",
    workSec: 45,
    restSec: 15,
  },
  {
    id: "intense",
    label: "Intense",
    description: "Longer sets with minimal rest for a real burn.",
    workSec: 60,
    restSec: 10,
  },
];

export const defaultSettings: BootyWorkoutSettings = {
  workSec: 45,
  restSec: 15,
  preset: "standard",
};

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Match a work/rest pair back to a preset id, or "custom". */
export function presetFor(workSec: number, restSec: number): BootyIntensity {
  const hit = INTENSITY_PRESETS.find((p) => p.workSec === workSec && p.restSec === restSec);
  return hit ? hit.id : "custom";
}

export function normalizeSettings(raw: Partial<BootyWorkoutSettings> | null): BootyWorkoutSettings {
  const workSec = clamp(Number(raw?.workSec), WORK_MIN, WORK_MAX, defaultSettings.workSec);
  const restSec = clamp(Number(raw?.restSec), REST_MIN, REST_MAX, defaultSettings.restSec);
  return { workSec, restSec, preset: presetFor(workSec, restSec) };
}

export function loadSettings(): BootyWorkoutSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return normalizeSettings(JSON.parse(raw) as Partial<BootyWorkoutSettings>);
  } catch {
    return null;
  }
}

export function saveSettings(settings: BootyWorkoutSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — settings are a convenience */
  }
}

/** Total routine length for a given number of moves. */
export function totalSecondsFor(moves: number, settings: BootyWorkoutSettings): number {
  return moves * settings.workSec + Math.max(0, moves - 1) * settings.restSec;
}
