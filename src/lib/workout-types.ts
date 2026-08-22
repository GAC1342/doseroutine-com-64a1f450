/**
 * Shared vocabulary + unit math for fitness tracking.
 *
 * Storage is always metric and time-unit agnostic:
 *   distance -> metres, weight -> kg, pace -> seconds per km.
 * Display converts on the way out based on the user's chosen unit system.
 */

export type WorkoutStatus = "completed" | "planned" | "skipped";

export type WorkoutType =
  | "strength"
  | "bodyweight"
  | "crossfit"
  | "kettlebell"
  | "run"
  | "trail_run"
  | "bike"
  | "spin"
  | "row"
  | "swim"
  | "walk"
  | "hike"
  | "elliptical"
  | "stairs"
  | "ski_erg"
  | "jump_rope"
  | "hiit"
  | "yoga"
  | "pilates"
  | "mobility"
  | "stretching"
  | "breathwork"
  | "martial_arts"
  | "boxing"
  | "climbing"
  | "dance"
  | "racquet"
  | "team_sport"
  | "golf"
  | "surf_paddle"
  | "sport"
  | "recovery"
  | "other";

export type WorkoutFamily = "strength" | "cardio" | "mindbody" | "sport" | "other";

export type WorkoutTypeMeta = {
  key: WorkoutType;
  label: string;
  family: WorkoutFamily;
  /** Cardio types show distance / pace / heart-rate fields. */
  tracksDistance: boolean;
  /** Types that log exercises with sets / reps / weight. */
  tracksSets?: boolean;
};

export const WORKOUT_FAMILY_LABELS: Record<WorkoutFamily, string> = {
  strength: "Strength",
  cardio: "Cardio",
  mindbody: "Mind & body",
  sport: "Sport",
  other: "Other",
};

export const WORKOUT_FAMILY_ORDER: readonly WorkoutFamily[] = [
  "strength",
  "cardio",
  "mindbody",
  "sport",
  "other",
];

export const WORKOUT_TYPES: readonly WorkoutTypeMeta[] = [
  // Strength
  {
    key: "strength",
    label: "Strength",
    family: "strength",
    tracksDistance: false,
    tracksSets: true,
  },
  {
    key: "bodyweight",
    label: "Bodyweight",
    family: "strength",
    tracksDistance: false,
    tracksSets: true,
  },
  {
    key: "crossfit",
    label: "CrossFit / WOD",
    family: "strength",
    tracksDistance: false,
    tracksSets: true,
  },
  {
    key: "kettlebell",
    label: "Kettlebell",
    family: "strength",
    tracksDistance: false,
    tracksSets: true,
  },
  // Cardio
  { key: "run", label: "Run", family: "cardio", tracksDistance: true },
  { key: "trail_run", label: "Trail run", family: "cardio", tracksDistance: true },
  { key: "bike", label: "Cycling", family: "cardio", tracksDistance: true },
  { key: "spin", label: "Spin / indoor bike", family: "cardio", tracksDistance: true },
  { key: "row", label: "Rowing", family: "cardio", tracksDistance: true },
  { key: "swim", label: "Swimming", family: "cardio", tracksDistance: true },
  { key: "walk", label: "Walk", family: "cardio", tracksDistance: true },
  { key: "hike", label: "Hike", family: "cardio", tracksDistance: true },
  { key: "elliptical", label: "Elliptical", family: "cardio", tracksDistance: true },
  { key: "stairs", label: "Stair climber", family: "cardio", tracksDistance: false },
  { key: "ski_erg", label: "Ski erg", family: "cardio", tracksDistance: true },
  { key: "jump_rope", label: "Jump rope", family: "cardio", tracksDistance: false },
  { key: "hiit", label: "HIIT", family: "cardio", tracksDistance: false, tracksSets: true },
  // Mind & body
  { key: "yoga", label: "Yoga", family: "mindbody", tracksDistance: false },
  { key: "pilates", label: "Pilates", family: "mindbody", tracksDistance: false },
  { key: "mobility", label: "Mobility", family: "mindbody", tracksDistance: false },
  { key: "stretching", label: "Stretching", family: "mindbody", tracksDistance: false },
  { key: "breathwork", label: "Breathwork", family: "mindbody", tracksDistance: false },
  { key: "recovery", label: "Recovery / sauna", family: "mindbody", tracksDistance: false },
  // Sport
  { key: "martial_arts", label: "Martial arts", family: "sport", tracksDistance: false },
  { key: "boxing", label: "Boxing", family: "sport", tracksDistance: false },
  { key: "climbing", label: "Climbing", family: "sport", tracksDistance: false },
  { key: "dance", label: "Dance", family: "sport", tracksDistance: false },
  { key: "racquet", label: "Tennis / racquet", family: "sport", tracksDistance: false },
  { key: "team_sport", label: "Team sport", family: "sport", tracksDistance: false },
  { key: "golf", label: "Golf", family: "sport", tracksDistance: false },
  { key: "surf_paddle", label: "Surf / paddle", family: "sport", tracksDistance: true },
  { key: "sport", label: "Other sport", family: "sport", tracksDistance: false },
  // Other
  { key: "other", label: "Other", family: "other", tracksDistance: false },
];

const TYPE_MAP = new Map(WORKOUT_TYPES.map((t) => [t.key, t]));

export function workoutTypeMeta(type: string | null | undefined): WorkoutTypeMeta {
  return TYPE_MAP.get((type ?? "other") as WorkoutType) ?? TYPE_MAP.get("other")!;
}

export function workoutTypeLabel(type: string | null | undefined): string {
  return workoutTypeMeta(type).label;
}

export function workoutFamily(type: string | null | undefined): WorkoutFamily {
  return workoutTypeMeta(type).family;
}

/** Types that should show the sets / reps / weight exercise list. */
export function tracksSets(type: string | null | undefined): boolean {
  return workoutTypeMeta(type).tracksSets === true;
}

/** Workout types grouped by family, in display order. */
export function workoutTypesByFamily(): {
  family: WorkoutFamily;
  label: string;
  types: WorkoutTypeMeta[];
}[] {
  return WORKOUT_FAMILY_ORDER.map((family) => ({
    family,
    label: WORKOUT_FAMILY_LABELS[family],
    types: WORKOUT_TYPES.filter((t) => t.family === family),
  })).filter((group) => group.types.length > 0);
}

/* -------------------- units -------------------- */

export type UnitSystem = "imperial" | "metric";

export const KG_PER_LB = 0.45359237;
export const METRES_PER_MILE = 1609.344;

export function toKg(value: number, units: UnitSystem): number {
  return units === "imperial" ? value * KG_PER_LB : value;
}

export function fromKg(kg: number, units: UnitSystem): number {
  return units === "imperial" ? kg / KG_PER_LB : kg;
}

export function toMetres(value: number, units: UnitSystem): number {
  return units === "imperial" ? value * METRES_PER_MILE : value * 1000;
}

export function fromMetres(metres: number, units: UnitSystem): number {
  return units === "imperial" ? metres / METRES_PER_MILE : metres / 1000;
}

export function weightUnitLabel(units: UnitSystem): string {
  return units === "imperial" ? "lb" : "kg";
}

export function distanceUnitLabel(units: UnitSystem): string {
  return units === "imperial" ? "mi" : "km";
}

/** Rounds for display without pretending to more precision than we have. */
export function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/* -------------------- derived numbers -------------------- */

export type SetInput = {
  exercise: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
};

/** sets x reps x weight, summed across every exercise row. */
export function totalVolumeKg(sets: readonly SetInput[]): number {
  return sets.reduce((sum, s) => {
    const count = (s.sets ?? 0) * (s.reps ?? 0);
    const weight = s.weightKg ?? 0;
    if (count <= 0 || weight <= 0) return sum;
    return sum + count * weight;
  }, 0);
}

/**
 * Epley estimated one-rep max. Returns null when the row can't produce one
 * (no weight, no reps, or a rep count high enough that the formula is noise).
 */
export function estimateOneRepMaxKg(weightKg: number | null, reps: number | null): number | null {
  if (!weightKg || weightKg <= 0) return null;
  if (!reps || reps <= 0) return null;
  if (reps > 15) return null;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Seconds per unit distance, from a total duration and distance. */
export function paceSecondsPerUnit(
  durationMin: number | null,
  distanceMetres: number | null,
  units: UnitSystem,
): number | null {
  if (!durationMin || durationMin <= 0) return null;
  if (!distanceMetres || distanceMetres <= 0) return null;
  const distance = fromMetres(distanceMetres, units);
  if (distance <= 0) return null;
  return (durationMin * 60) / distance;
}

/** 8:42 style pace label. */
export function formatPace(secondsPerUnit: number | null): string {
  if (secondsPerUnit == null || !Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0) return "—";
  const total = Math.round(secondsPerUnit);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** "1h 15m" / "45m" */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "—";
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
