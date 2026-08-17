const KEY = "doseroutine.booty-workout.goal.v1";

export const GOAL_MIN = 1;
export const GOAL_MAX = 31;
export const DEFAULT_GOAL = 12;

export function clampGoal(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_GOAL;
  return Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(n)));
}

/** Monthly completed-day goal, or null when the user hasn't set one. */
export function loadGoal(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return null;
    return clampGoal(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGoal(goal: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(clampGoal(goal)));
  } catch {
    /* storage unavailable — the goal is a convenience */
  }
}

export function clearGoal() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

export type GoalProgress = {
  goal: number;
  done: number;
  remaining: number;
  /** 0–100, capped at 100. */
  percent: number;
  reached: boolean;
  /** Days left in the current calendar month, including today. */
  daysLeftInMonth: number;
  /** True when the days remaining can still cover the shortfall. */
  onTrack: boolean;
};

export function goalProgress(
  goal: number,
  daysThisMonth: number,
  now: Date = new Date(),
): GoalProgress {
  const target = clampGoal(goal);
  const done = Math.max(0, daysThisMonth);
  const remaining = Math.max(0, target - done);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeftInMonth = daysInMonth - now.getDate() + 1;
  return {
    goal: target,
    done,
    remaining,
    percent: Math.min(100, Math.round((done / target) * 100)),
    reached: done >= target,
    daysLeftInMonth,
    onTrack: remaining <= daysLeftInMonth,
  };
}
