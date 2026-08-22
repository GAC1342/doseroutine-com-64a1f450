/**
 * Logging streaks and time-of-day nudges.
 *
 * A "logged day" is any day with at least one meal or one dose recorded. The
 * current day never breaks a streak — it is still in progress until midnight.
 */

export type LoggingStreak = {
  /** Consecutive logged days ending today (or yesterday, if today is empty). */
  current: number;
  /** Best run inside the window we looked at. */
  best: number;
  /** True when nothing has been logged yet today. */
  todayEmpty: boolean;
  /** Days logged out of the last 7. */
  last7: number;
};

export function dayKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDay(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return dayKeyLocal(d);
}

/**
 * @param loggedDays day keys (YYYY-MM-DD, local) that had a meal or dose
 * @param today reference day key
 */
export function computeLoggingStreak(
  loggedDays: Iterable<string>,
  today: string = dayKeyLocal(new Date()),
): LoggingStreak {
  const days = new Set(loggedDays);
  const todayEmpty = !days.has(today);

  let current = 0;
  let cursor = todayEmpty ? shiftDay(today, -1) : today;
  while (days.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }

  // Best run across the days we know about, oldest first.
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous != null && shiftDay(previous, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }

  let last7 = 0;
  for (let i = 0; i < 7; i++) {
    if (days.has(shiftDay(today, -i))) last7 += 1;
  }

  return { current, best, todayEmpty, last7 };
}

/** Short, non-guilt-trippy line for the streak card. */
export function streakMessage(streak: LoggingStreak): string {
  if (streak.current === 0) return "Log anything today to start a streak.";
  if (streak.todayEmpty)
    return `${streak.current}-day streak — log something today to keep it going.`;
  if (streak.current === 1) return "Day one. Tomorrow makes it a streak.";
  if (streak.current >= streak.best && streak.current > 2)
    return `${streak.current} days in a row — your best run yet.`;
  return `${streak.current} days in a row. Best: ${streak.best}.`;
}

export type LoggingNudgeSettings = {
  meals_enabled: boolean;
  doses_enabled: boolean;
  /** "HH:MM" or "HH:MM:SS" local times. */
  breakfast_by: string;
  lunch_by: string;
  dinner_by: string;
  quiet_after: string;
  /** ISO timestamp: no nudges are shown before this moment. */
  snoozed_until?: string | null;
};

export const DEFAULT_NUDGE_SETTINGS: LoggingNudgeSettings = {
  meals_enabled: true,
  doses_enabled: true,
  breakfast_by: "10:30",
  lunch_by: "14:30",
  dinner_by: "20:30",
  quiet_after: "21:30",
  snoozed_until: null,
};

/** Snooze presets offered on a nudge. */
export const SNOOZE_OPTIONS: Array<{ id: string; label: string; minutes: number }> = [
  { id: "30m", label: "30 min", minutes: 30 },
  { id: "1h", label: "1 hour", minutes: 60 },
  { id: "3h", label: "3 hours", minutes: 180 },
];

/** Snooze until the start of tomorrow, local time. */
export function snoozeUntilTomorrow(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(6, 0, 0, 0);
  return d.toISOString();
}

/** Snooze for a number of minutes from now. */
export function snoozeFor(minutes: number, now: Date = new Date()): string {
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

/** Which cut-off time a nudge reschedules. */
export function nudgeTimeField(
  nudge: LoggingNudge,
): keyof Pick<LoggingNudgeSettings, "breakfast_by" | "lunch_by" | "dinner_by"> | null {
  if (nudge.kind !== "meal" || !nudge.slot) return null;
  return nudge.slot === "breakfast"
    ? "breakfast_by"
    : nudge.slot === "lunch"
      ? "lunch_by"
      : "dinner_by";
}

export type LoggingNudge = {
  kind: "meal" | "dose";
  slot?: "breakfast" | "lunch" | "dinner";
  text: string;
};

function minutesOf(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * Pick at most one nudge to show right now.
 *
 * Rules: nothing before the slot's cut-off, nothing during quiet hours, and
 * nothing for a slot that already has a meal against it. Overdue doses win
 * over meal nudges because a missed dose matters more than a missed log.
 */
export function pickLoggingNudge(input: {
  now: Date;
  settings: LoggingNudgeSettings;
  /** Meal slots already logged today. */
  loggedSlots: ReadonlySet<string>;
  /** Doses scheduled earlier today that are still not marked taken/skipped. */
  overdueDoses: number;
}): LoggingNudge | null {
  const { now, settings, loggedSlots, overdueDoses } = input;
  const minutes = now.getHours() * 60 + now.getMinutes();

  // A snooze silences every nudge until it expires.
  if (settings.snoozed_until) {
    const until = new Date(settings.snoozed_until).getTime();
    if (Number.isFinite(until) && until > now.getTime()) return null;
  }

  if (settings.doses_enabled && overdueDoses > 0) {
    return {
      kind: "dose",
      text:
        overdueDoses === 1
          ? "You have one dose from earlier today that isn't marked yet."
          : `${overdueDoses} doses from earlier today aren't marked yet.`,
    };
  }

  if (!settings.meals_enabled) return null;
  if (minutes >= minutesOf(settings.quiet_after)) return null;

  const slots: Array<{ slot: "breakfast" | "lunch" | "dinner"; by: string; label: string }> = [
    { slot: "dinner", by: settings.dinner_by, label: "dinner" },
    { slot: "lunch", by: settings.lunch_by, label: "lunch" },
    { slot: "breakfast", by: settings.breakfast_by, label: "breakfast" },
  ];

  for (const entry of slots) {
    if (minutes < minutesOf(entry.by)) continue;
    if (loggedSlots.has(entry.slot)) continue;
    return { kind: "meal", slot: entry.slot, text: `No ${entry.label} logged yet today.` };
  }
  return null;
}
