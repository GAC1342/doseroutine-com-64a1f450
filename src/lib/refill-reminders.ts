/**
 * Refill reminders for saved medications (including pills added through the
 * pill identifier).
 *
 * The forecast is derived from what the user already told us: how many doses
 * are left in the bottle (`vial_inventory`) and how often the medication is
 * scheduled (`user_compounds.frequency` / `times_of_day` / `days_of_week`).
 * Everything here is pure so it can be unit-tested and reused by both the UI
 * card and the notification scheduler.
 */

export type SupplyScheduleInput = {
  frequency: string | null;
  timesOfDay: string[] | null;
  daysOfWeek: number[] | null;
};

/**
 * Average doses consumed per calendar day. Weekly/custom schedules are
 * averaged across the week so a "3 days a week, twice a day" bottle forecasts
 * correctly instead of assuming daily use.
 */
export function dosesPerDay(input: SupplyScheduleInput): number {
  const perDay = Math.max(1, (input.timesOfDay ?? []).filter(Boolean).length || 1);
  const freq = (input.frequency ?? "daily").toLowerCase();
  if (freq === "weekly" || freq === "custom") {
    const days = (input.daysOfWeek ?? []).filter((d) => Number.isFinite(d)).length;
    if (days > 0) return (perDay * days) / 7;
    return perDay / 7;
  }
  if (freq === "eod" || freq === "every_other_day") return perDay / 2;
  return perDay;
}

export type RefillStatus = "ok" | "soon" | "due" | "out" | "unknown";

export type RefillForecast = {
  /** Whole days of supply left, rounded down. Null when unknown. */
  daysLeft: number | null;
  /** Projected run-out date. Null when unknown. */
  runOutOn: Date | null;
  status: RefillStatus;
  /** Doses that trigger the "reorder now" state. */
  lowThreshold: number;
};

export type SupplyRowInput = SupplyScheduleInput & {
  dosesRemaining: number | null;
  lowThreshold: number | null;
};

/** Default warning window when the row has no explicit threshold: 7 days. */
export function defaultLowThreshold(perDay: number): number {
  return Math.max(1, Math.round(perDay * 7));
}

export function forecastRefill(row: SupplyRowInput, now: Date = new Date()): RefillForecast {
  const perDay = dosesPerDay(row);
  const threshold = row.lowThreshold ?? defaultLowThreshold(perDay);
  const remaining = row.dosesRemaining;
  if (remaining == null || !Number.isFinite(remaining) || perDay <= 0) {
    return { daysLeft: null, runOutOn: null, status: "unknown", lowThreshold: threshold };
  }
  if (remaining <= 0) {
    return { daysLeft: 0, runOutOn: now, status: "out", lowThreshold: threshold };
  }
  const daysLeft = Math.floor(remaining / perDay);
  const runOutOn = new Date(now.getTime() + (remaining / perDay) * 86_400_000);
  const status: RefillStatus = remaining <= threshold ? "due" : daysLeft <= 14 ? "soon" : "ok";
  return { daysLeft, runOutOn, status, lowThreshold: threshold };
}

/** Human summary used in both the card and the notification body. */
export function describeRefill(name: string, forecast: RefillForecast): string {
  if (forecast.status === "unknown") return `${name} — add a bottle quantity to forecast refills.`;
  if (forecast.status === "out") return `${name} — you're out. Refill today.`;
  const days = forecast.daysLeft ?? 0;
  if (forecast.status === "due") {
    return `${name} — about ${days} day${days === 1 ? "" : "s"} left. Order your refill now.`;
  }
  return `${name} — about ${days} day${days === 1 ? "" : "s"} of supply left.`;
}

/**
 * When to fire the reminder: the day the supply drops to the low threshold,
 * never in the past and never before tomorrow morning.
 */
export function refillReminderDate(
  row: SupplyRowInput,
  now: Date = new Date(),
  hour = 9,
): Date | null {
  const perDay = dosesPerDay(row);
  const remaining = row.dosesRemaining;
  if (remaining == null || perDay <= 0) return null;
  const threshold = row.lowThreshold ?? defaultLowThreshold(perDay);
  const daysUntilLow = Math.max(0, (remaining - threshold) / perDay);
  const at = new Date(now.getTime() + daysUntilLow * 86_400_000);
  at.setHours(hour, 0, 0, 0);
  if (at.getTime() <= now.getTime()) {
    // Already at/below the threshold — remind at the next occurrence of `hour`.
    const next = new Date(now);
    next.setHours(hour, 0, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    return next;
  }
  return at;
}

/** Sort worst-first so the card leads with what needs ordering today. */
const STATUS_RANK: Record<RefillStatus, number> = { out: 0, due: 1, soon: 2, ok: 3, unknown: 4 };

export function sortByUrgency<T extends { forecast: RefillForecast }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      STATUS_RANK[a.forecast.status] - STATUS_RANK[b.forecast.status] ||
      (a.forecast.daysLeft ?? 9999) - (b.forecast.daysLeft ?? 9999),
  );
}
