/**
 * Per-meal preferences for the food diary.
 *
 * Three things people want to tweak on a meal card without leaving the page:
 *  - a name that matches how they actually eat ("Post-workout" instead of "Snack"),
 *  - a calorie goal for that meal, and
 *  - whether the card is expanded or collapsed.
 *
 * All three are presentation choices, so they live in localStorage: instant,
 * offline, and no schema churn. Subscribers are notified so several cards on
 * screen stay in sync.
 */

const KEY = "doseroutine.meal-slot-prefs.v1";

export type MealSlotPref = {
  /** Custom display name, or null to keep the built-in label. */
  name?: string | null;
  /** Calorie goal for this meal, or null for no goal. */
  calorieGoal?: number | null;
  /** True when the card's food list is hidden. */
  collapsed?: boolean;
};

export type MealSlotPrefs = Record<string, MealSlotPref>;

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function onMealSlotPrefsChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function readMealSlotPrefs(): MealSlotPrefs {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as MealSlotPrefs;
  } catch {
    return {};
  }
}

function write(prefs: MealSlotPrefs) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* quota or private mode — preferences are best-effort */
  }
  emit();
}

/** Merge a patch into one slot's preferences. */
export function setMealSlotPref(slot: string, patch: MealSlotPref) {
  const prefs = readMealSlotPrefs();
  const next = { ...(prefs[slot] ?? {}), ...patch };
  // Drop empty values so a cleared name falls back to the built-in label.
  if (next.name != null && next.name.trim() === "") next.name = null;
  if (next.calorieGoal != null && !Number.isFinite(next.calorieGoal)) next.calorieGoal = null;
  if (next.calorieGoal != null && next.calorieGoal <= 0) next.calorieGoal = null;
  write({ ...prefs, [slot]: next });
}

export function toggleMealSlotCollapsed(slot: string, collapsed: boolean) {
  setMealSlotPref(slot, { collapsed });
}

/** Display name for a slot: the user's own name when they set one. */
export function mealSlotName(prefs: MealSlotPrefs, slot: string, fallback: string) {
  const name = prefs[slot]?.name;
  return name && name.trim() ? name.trim() : fallback;
}

/** Clamp a typed goal to something sane before it is stored. */
export function parseCalorieGoal(input: string): number | null {
  const value = Number(input.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.min(Math.round(value), 10000);
}
