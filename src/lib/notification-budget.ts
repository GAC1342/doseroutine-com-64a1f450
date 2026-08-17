/**
 * Daily notification budget.
 *
 * Nothing in DoseRoutine repeats or nags — each dose alerts once, each routine
 * anchor once per day. What was missing is a ceiling on the *total*: a large
 * stack plus three meal times could buzz someone 15+ times a day. This module
 * enforces "at most N buzzing alerts per user per local calendar day", where N
 * comes from profiles.daily_alert_limit (0 = unlimited).
 *
 * Pure — no database access — so the three background jobs can share it and it
 * can be unit tested directly.
 */

export const DEFAULT_DAILY_ALERT_LIMIT = 3;

/** Lower number = sent first when more alerts are due than the budget allows. */
export const ALERT_PRIORITY = {
  dose: 0,
  workout: 1,
  meal: 2,
} as const;

export type AlertCategory = keyof typeof ALERT_PRIORITY;

export type BudgetCandidate<T> = {
  category: AlertCategory;
  /** Local wall-clock "HH:mm" of the thing being announced; earlier wins ties. */
  time?: string | null;
  /** Stable id so ordering is deterministic when category and time tie. */
  id: string;
  payload: T;
};

export type BudgetDecision<T> = {
  /** Send the buzzing channels (push / email) for these. */
  allowed: BudgetCandidate<T>[];
  /** Over budget: inbox-only, logged as `skipped:daily-cap`. */
  capped: BudgetCandidate<T>[];
};

export const CAP_STATUS = "skipped:daily-cap";

/** Resolve a profile's limit into a usable number. 0 / negative = unlimited. */
export function resolveDailyLimit(raw: number | null | undefined): number {
  if (raw == null) return DEFAULT_DAILY_ALERT_LIMIT;
  if (!Number.isFinite(raw) || raw <= 0) return Infinity;
  return Math.floor(raw);
}

function timeRank(time: string | null | undefined): number {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Doses first, then workouts, then meals; earliest scheduled time wins ties. */
export function compareCandidates<T>(a: BudgetCandidate<T>, b: BudgetCandidate<T>): number {
  const byCategory = ALERT_PRIORITY[a.category] - ALERT_PRIORITY[b.category];
  if (byCategory !== 0) return byCategory;
  const byTime = timeRank(a.time) - timeRank(b.time);
  if (byTime !== 0) return byTime;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Split this run's due alerts into "buzz" and "inbox only".
 *
 * @param alreadySentToday how many buzzing alerts this user already got today
 * @param limit            resolved from resolveDailyLimit()
 */
export function applyDailyBudget<T>(
  candidates: BudgetCandidate<T>[],
  alreadySentToday: number,
  limit: number,
): BudgetDecision<T> {
  if (limit === Infinity) {
    return { allowed: [...candidates].sort(compareCandidates), capped: [] };
  }
  const remaining = Math.max(0, limit - Math.max(0, alreadySentToday));
  const ordered = [...candidates].sort(compareCandidates);
  return {
    allowed: ordered.slice(0, remaining),
    capped: ordered.slice(remaining),
  };
}

/**
 * Count rows toward the day's budget. Only rows that actually buzzed count —
 * inbox mirrors and previously capped rows must not eat the budget, or a capped
 * alert would silently consume the slot it was denied.
 */
export function countsTowardBudget(row: {
  channel?: string | null;
  status?: string | null;
}): boolean {
  const channel = (row.channel ?? "").toLowerCase();
  if (channel && channel !== "push" && channel !== "email") return false;
  const status = (row.status ?? "sent").toLowerCase();
  if (status.startsWith("skipped")) return false;
  if (status.startsWith("error")) return false;
  return true;
}

/**
 * Sum the buzzing alerts already logged for a user on a given local day.
 *
 * One announcement is one alert even when it went out over both push and
 * email, so rows are de-duplicated by their subject key (schedule event id for
 * doses, routine id for routine anchors). Without this, a user with email plus
 * push enabled would burn their allowance twice as fast.
 */
export function usedBudget(
  rows: Array<{
    key?: string | null;
    channel?: string | null;
    status?: string | null;
  }>,
): number {
  const seen = new Set<string>();
  let unkeyed = 0;
  for (const row of rows) {
    if (!countsTowardBudget(row)) continue;
    if (row.key) seen.add(row.key);
    else unkeyed++;
  }
  return seen.size + unkeyed;
}

/** Local YYYY-MM-DD for an instant, in the user's timezone. */
export function localDayKey(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
