/**
 * Facets for the exercise library: muscle group, equipment and difficulty.
 *
 * Built-in exercises already carry their muscle group via `MUSCLE_GROUPS`.
 * Equipment and difficulty are not stored anywhere, so they are inferred from
 * the exercise name using the vocabulary lifters actually use ("barbell",
 * "cable", "smith machine", …). The inference is deliberately conservative:
 * anything we cannot classify falls back to "other" rather than guessing.
 */

import { MUSCLE_GROUPS, type MuscleGroupKey } from "@/lib/muscle-groups";

export type EquipmentKey =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "cardio"
  | "other";

export type DifficultyKey = "beginner" | "intermediate" | "advanced";

export const EQUIPMENT_LABELS: Record<EquipmentKey, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine / cable",
  bodyweight: "Bodyweight",
  kettlebell: "Kettlebell",
  band: "Bands",
  cardio: "Cardio gear",
  other: "Other",
};

export const DIFFICULTY_LABELS: Record<DifficultyKey, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const EQUIPMENT_RULES: { key: EquipmentKey; patterns: RegExp }[] = [
  { key: "kettlebell", patterns: /\bkettlebell|\bkb\b|turkish get-?up/ },
  { key: "band", patterns: /\bband(s|ed)?\b|resistance band|face pull/ },
  {
    key: "machine",
    patterns:
      /\bmachine|\bcable|smith\b|pulldown|pull-?down|leg press|leg extension|leg curl|pec deck|hack squat|seated row|lat pull|chest press|preacher|assisted/,
  },
  {
    key: "cardio",
    patterns:
      /\btreadmill|\brow(ing)? (machine|erg)|\berg\b|\bbike\b|cycling|spin\b|elliptical|stair ?(master|climber)|ski erg|jump rope|\brun\b|running|jog|swim|walk/,
  },
  {
    key: "barbell",
    patterns:
      /\bbarbell|\bdeadlift|bench press|back squat|front squat|overhead press|clean|snatch|\bpress\b.*\bbar\b|romanian deadlift|\brdl\b|hip thrust/,
  },
  { key: "dumbbell", patterns: /\bdumbbell|\bdb\b|goblet|farmer'?s? (carry|walk)/ },
  {
    key: "bodyweight",
    patterns:
      /push-?up|pull-?up|chin-?up|\bdip\b|\bdips\b|plank|crunch|sit-?up|air squat|lunge|burpee|mountain climber|glute bridge|\bhold\b|hanging|bodyweight|\byoga\b|stretch|superman|bird ?dog|calf raise|leg raise|hollow|\bl-?sit\b/,
  },
];

const ADVANCED =
  /snatch|clean (and|&) jerk|\bjerk\b|muscle-?up|pistol|handstand|planche|front lever|deficit|pause (squat|bench)|good morning|zercher|nordic|dragon flag|one-?arm|single-?arm barbell|sumo deadlift high/;
const BEGINNER =
  /machine|assisted|goblet|glute bridge|plank|crunch|sit-?up|wall|band|leg press|leg extension|leg curl|push-?up|walk|bike|elliptical|stretch|calf raise|face pull|lat pull|row (machine)?$|dead ?bug|bird ?dog|farmer/;
const INTERMEDIATE_COMPOUND =
  /squat|deadlift|bench|overhead press|pull-?up|chin-?up|\bdip\b|row|lunge|hip thrust|\brdl\b/;

let muscleIndex: Map<string, MuscleGroupKey> | null = null;

function buildMuscleIndex(): Map<string, MuscleGroupKey> {
  if (muscleIndex) return muscleIndex;
  const map = new Map<string, MuscleGroupKey>();
  for (const group of MUSCLE_GROUPS) {
    for (const ex of group.exercises) {
      const key = ex.name.trim().toLowerCase();
      if (!map.has(key)) map.set(key, group.key);
    }
  }
  muscleIndex = map;
  return map;
}

/** Muscle group for a known built-in exercise, else null. */
export function exerciseMuscleGroup(name: string): MuscleGroupKey | null {
  return buildMuscleIndex().get(name.trim().toLowerCase()) ?? null;
}

export function exerciseEquipment(name: string): EquipmentKey {
  const n = name.trim().toLowerCase();
  for (const rule of EQUIPMENT_RULES) if (rule.patterns.test(n)) return rule.key;
  return "other";
}

export function exerciseDifficulty(name: string): DifficultyKey {
  const n = name.trim().toLowerCase();
  if (ADVANCED.test(n)) return "advanced";
  if (BEGINNER.test(n)) return "beginner";
  if (INTERMEDIATE_COMPOUND.test(n)) return "intermediate";
  return "intermediate";
}

export type ExerciseFacets = {
  name: string;
  muscle: MuscleGroupKey | null;
  equipment: EquipmentKey;
  difficulty: DifficultyKey;
  /** True when the exercise is one the user saved themselves. */
  mine: boolean;
  /** ms timestamp of the last time the user logged it, if ever. */
  lastUsedAt?: number;
  /** How many times the user has logged it. */
  useCount?: number;
};

export function describeExercise(
  name: string,
  extra: Partial<Omit<ExerciseFacets, "name">> = {},
): ExerciseFacets {
  return {
    name,
    muscle: exerciseMuscleGroup(name),
    equipment: exerciseEquipment(name),
    difficulty: exerciseDifficulty(name),
    mine: false,
    ...extra,
  };
}

export type ExerciseFilters = {
  query: string;
  muscle: MuscleGroupKey | "all";
  equipment: EquipmentKey | "all";
  difficulty: DifficultyKey | "all";
  /** Restrict to exercises the user has logged or saved before. */
  usedOnly: boolean;
};

export const EMPTY_FILTERS: ExerciseFilters = {
  query: "",
  muscle: "all",
  equipment: "all",
  difficulty: "all",
  usedOnly: false,
};

/** Word-prefix aware match so "bench pr" still finds "Bench press". */
export function matchesQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = name.toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

function score(item: ExerciseFacets, query: string): number {
  const q = query.trim().toLowerCase();
  let s = 0;
  if (q) {
    const n = item.name.toLowerCase();
    if (n === q) s -= 300;
    else if (n.startsWith(q)) s -= 200;
    else if (n.includes(` ${q}`)) s -= 100;
  }
  if (item.lastUsedAt) s -= 50;
  return s;
}

/** Filters and ranks the library: previously used first, then alphabetical. */
export function filterExercises(
  items: readonly ExerciseFacets[],
  filters: ExerciseFilters,
): ExerciseFacets[] {
  const out = items.filter((item) => {
    if (filters.muscle !== "all" && item.muscle !== filters.muscle) return false;
    if (filters.equipment !== "all" && item.equipment !== filters.equipment) return false;
    if (filters.difficulty !== "all" && item.difficulty !== filters.difficulty) return false;
    if (filters.usedOnly && !item.lastUsedAt && !item.mine) return false;
    return matchesQuery(item.name, filters.query);
  });

  return out.sort((a, b) => {
    const diff = score(a, filters.query) - score(b, filters.query);
    if (diff !== 0) return diff;
    if (a.lastUsedAt && b.lastUsedAt && a.lastUsedAt !== b.lastUsedAt)
      return b.lastUsedAt - a.lastUsedAt;
    return a.name.localeCompare(b.name);
  });
}

/** Count of filters currently narrowing the list (excluding free text). */
export function activeFilterCount(filters: ExerciseFilters): number {
  let n = 0;
  if (filters.muscle !== "all") n += 1;
  if (filters.equipment !== "all") n += 1;
  if (filters.difficulty !== "all") n += 1;
  if (filters.usedOnly) n += 1;
  return n;
}
