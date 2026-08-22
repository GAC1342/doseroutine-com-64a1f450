/**
 * Shared workout routines — public link model.
 *
 * PRIVACY CONTRACT (do not widen without a review):
 * a shared routine carries workout data only. Compounds, doses, supplements,
 * peptides, hormones, protocols, bloodwork, body metrics, progress photos and
 * every free-text note are excluded at the database layer
 * (`public.get_shared_routine`) and again in the types below, so a public page
 * physically cannot render them. The whitelist is the field list of
 * `SharedRoutine` / `SharedRoutineExercise` — nothing else crosses the line.
 */

/** One movement as the owner saved it. No notes, no user-uploaded media. */
export type SharedRoutineExercise = {
  exercise: string;
  set_index: number;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  rest_seconds: number | null;
  tempo: string | null;
};

export type SharedRoutine = {
  public_id: string;
  created_at: string;
  view_count: number;
  save_count: number;
  /** Only present when the owner ticked "show my name" on the share sheet. */
  owner_name: string | null;
  routine_name: string;
  workout_type: string;
  duration_min: number | null;
  rpe: number | null;
  distance_m: number | null;
  target_pace_s: number | null;
  target_hr: number | null;
  exercises: SharedRoutineExercise[];
};

/**
 * Fields allowed to leave the owner's account. Used by the runtime scrubber
 * below and asserted in tests so a future schema change can't leak a column.
 */
export const SHARED_ROUTINE_EXERCISE_FIELDS = [
  "exercise",
  "set_index",
  "sets",
  "reps",
  "weight_kg",
  "rest_seconds",
  "tempo",
] as const;

/** Base62 alphabet — no separators, so the id is safe in a URL path. */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Public ids must stay this long: 12 base62 chars ≈ 71 bits, not guessable. */
export const PUBLIC_ID_LENGTH = 12;

/**
 * Random, non-sequential public id. Uses the CSPRNG — never Math.random, and
 * never anything derived from the routine id or a counter.
 */
export function generatePublicId(length = PUBLIC_ID_LENGTH): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

export function isValidPublicId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9]{10,64}$/.test(value);
}

/** Absolute link for copy / share / the card footer. */
export function routineShareUrl(publicId: string, origin?: string): string {
  const base =
    origin ?? (typeof window === "undefined" ? "https://doseroutine.com" : window.location.origin);
  return `${base}/r/${publicId}`;
}

/** Same link without the scheme, for printing on the image card. */
export function routineShareLabel(publicId: string): string {
  return `doseroutine.com/r/${publicId}`;
}

/**
 * Defence in depth: strips anything not on the whitelist, even if the database
 * function is later changed to return more.
 */
export function scrubExercise(raw: Record<string, unknown>): SharedRoutineExercise {
  return {
    exercise: typeof raw["exercise"] === "string" ? raw["exercise"] : "",
    set_index: numberOrZero(raw["set_index"]),
    sets: numberOrNull(raw["sets"]),
    reps: numberOrNull(raw["reps"]),
    weight_kg: numberOrNull(raw["weight_kg"]),
    rest_seconds: numberOrNull(raw["rest_seconds"]),
    tempo: typeof raw["tempo"] === "string" && raw["tempo"].trim() !== "" ? raw["tempo"] : null,
  };
}

function numberOrNull(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

/* -------------------- display formatting -------------------- */

/** "4 × 8 · 60 kg · 90s rest" — everything the owner filled in, nothing else. */
export function formatExerciseDetail(ex: SharedRoutineExercise): string {
  const parts: string[] = [];
  if (ex.sets != null && ex.reps != null) parts.push(`${ex.sets} × ${ex.reps}`);
  else if (ex.sets != null) parts.push(`${ex.sets} set${ex.sets === 1 ? "" : "s"}`);
  else if (ex.reps != null) parts.push(`${ex.reps} reps`);
  if (ex.weight_kg != null) parts.push(`${round(ex.weight_kg)} kg`);
  if (ex.rest_seconds != null) parts.push(`${Math.round(ex.rest_seconds)}s rest`);
  if (ex.tempo) parts.push(`tempo ${ex.tempo}`);
  return parts.join(" · ");
}

/** Sub-headline used on the page and in the Open Graph description. */
export function routineSummary(routine: {
  exercises: SharedRoutineExercise[];
  duration_min: number | null;
}): string {
  const count = routine.exercises.length;
  const parts: string[] = [`${count} exercise${count === 1 ? "" : "s"}`];
  if (routine.duration_min) parts.push(`${Math.round(routine.duration_min)} min`);
  parts.push("shared from DoseRoutine");
  return parts.join(" · ");
}

/** Seconds per unit -> "8:30". */
export function formatPace(secondsPerUnit: number | null): string | null {
  if (secondsPerUnit == null || !Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0)
    return null;
  const total = Math.round(secondsPerUnit);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
