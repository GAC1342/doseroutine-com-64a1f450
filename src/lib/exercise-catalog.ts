/**
 * The full list of built-in exercise names, shared by every picker so the
 * library and the quick-add sheet always offer the same catalog.
 */

import { MUSCLE_GROUPS } from "@/lib/muscle-groups";
import { exerciseOptions, isSessionBlockName } from "@/lib/exercise-options";

const FAMILY_SEEDS = ["strength", "run", "yoga", "hiit", "sport"] as const;

/**
 * Every built-in exercise name we can offer, de-duplicated, order preserved.
 *
 * Session blocks ("Warm-up", "Main set", "Cool down") are excluded by default:
 * they are log-row scaffolding, not movements, so in a browsing grid they only
 * ever rendered as blank "No illustration" cards.
 */
export function builtInExerciseNames(options?: { includeSessionBlocks?: boolean }): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (name: string) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    if (!options?.includeSessionBlocks && isSessionBlockName(name)) return;
    seen.add(key);
    out.push(name);
  };
  for (const group of MUSCLE_GROUPS) for (const ex of group.exercises) push(ex.name);
  for (const type of FAMILY_SEEDS) for (const name of exerciseOptions(type)) push(name);
  return out;
}
