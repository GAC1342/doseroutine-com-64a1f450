/**
 * Exercises the user has actually logged, newest first.
 *
 * Powers the "Used before" filter in the exercise library so a returning user
 * can jump straight back to their own movements instead of scrolling the full
 * catalog.
 */

import { supabase } from "@/integrations/supabase/client";

export type RecentExercise = {
  name: string;
  lastUsedAt: number;
  useCount: number;
};

const MAX_ROWS = 500;

export async function fetchRecentExercises(): Promise<RecentExercise[]> {
  const { data, error } = await supabase
    .from("workout_sets")
    .select("exercise,created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw error;

  const byName = new Map<string, RecentExercise>();
  for (const row of (data ?? []) as { exercise: string; created_at: string }[]) {
    const name = (row.exercise ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const at = Date.parse(row.created_at);
    const existing = byName.get(key);
    if (existing) {
      existing.useCount += 1;
      if (Number.isFinite(at) && at > existing.lastUsedAt) existing.lastUsedAt = at;
    } else {
      byName.set(key, { name, lastUsedAt: Number.isFinite(at) ? at : 0, useCount: 1 });
    }
  }
  return [...byName.values()].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

/** "2d ago" style label for the recency badge. */
export function relativeUsedLabel(at: number, now = Date.now()): string {
  const days = Math.floor((now - at) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
