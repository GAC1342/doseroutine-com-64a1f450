const KEY = "doseroutine.booty-workout.progress.v1";

const MAX_SESSIONS = 30;

export type BootyWorkoutSession = {
  /** Stable id so an in-progress session can be updated in place. */
  id: string;
  /** ISO timestamp for when this run started. */
  startedAt: string;
  /** ISO timestamp of the last activity in this run. */
  endedAt: string;
  /** Seconds of the routine actually worked through. */
  durationSec: number;
  /** True when all moves were finished. */
  completed: boolean;
  /** Label of the move the user was on when the run ended. */
  lastMove: string;
  /** 1-based index of that move. */
  lastMoveIndex: number;
  /** Total moves in the routine, for "3 of 8" style display. */
  totalMoves: number;
};

export type BootyWorkoutProgress = {
  /** Step index the user stopped on (0-based). */
  stepIndex: number;
  /** Seconds remaining in that step when they stopped. */
  remaining: number;
  /** ISO timestamp of the most recent completed run, if any. */
  lastCompletedAt: string | null;
  /** Number of completed runs. */
  completions: number;
  /** Most recent sessions, newest first. */
  sessions: BootyWorkoutSession[];
};

export const emptyProgress: BootyWorkoutProgress = {
  stepIndex: 0,
  remaining: 0,
  lastCompletedAt: null,
  completions: 0,
  sessions: [],
};

function coerceSession(raw: unknown): BootyWorkoutSession | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<BootyWorkoutSession>;
  if (typeof s.id !== "string" || typeof s.startedAt !== "string") return null;
  return {
    id: s.id,
    startedAt: s.startedAt,
    endedAt: typeof s.endedAt === "string" ? s.endedAt : s.startedAt,
    durationSec: Number.isFinite(s.durationSec) ? Number(s.durationSec) : 0,
    completed: Boolean(s.completed),
    lastMove: typeof s.lastMove === "string" ? s.lastMove : "",
    lastMoveIndex: Number.isFinite(s.lastMoveIndex) ? Number(s.lastMoveIndex) : 0,
    totalMoves: Number.isFinite(s.totalMoves) ? Number(s.totalMoves) : 0,
  };
}

export function loadProgress(): BootyWorkoutProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BootyWorkoutProgress>;
    return {
      stepIndex: Number.isFinite(parsed.stepIndex) ? Number(parsed.stepIndex) : 0,
      remaining: Number.isFinite(parsed.remaining) ? Number(parsed.remaining) : 0,
      lastCompletedAt: parsed.lastCompletedAt ?? null,
      completions: Number.isFinite(parsed.completions) ? Number(parsed.completions) : 0,
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions
            .map(coerceSession)
            .filter((s): s is BootyWorkoutSession => s !== null)
            .slice(0, MAX_SESSIONS)
        : [],
    };
  } catch {
    return null;
  }
}

export function saveProgress(progress: BootyWorkoutProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable — progress is a convenience, not a requirement */
  }
}

/** Insert or replace a session by id, keeping the list newest-first and bounded. */
export function upsertSession(
  sessions: BootyWorkoutSession[],
  session: BootyWorkoutSession,
): BootyWorkoutSession[] {
  const rest = sessions.filter((s) => s.id !== session.id);
  return [session, ...rest].slice(0, MAX_SESSIONS);
}

export function newSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatCompletedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMin = Math.round((now - date.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(totalSeconds: number): string {
  const secs = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s} sec`;
  return `${m} min ${String(s).padStart(2, "0")} sec`;
}

/* ---------- Streak & monthly stats ---------- */

export type BootyWorkoutStats = {
  /** Consecutive weeks (ending with the current week) containing a completed run. */
  weeklyStreak: number;
  /** True when the current week already has a completed run. */
  activeThisWeek: boolean;
  /** Distinct days with a completed run in the current calendar month. */
  daysThisMonth: number;
  /** Days in the current calendar month so far (for context). */
  daysElapsedThisMonth: number;
};

/** Local-midnight Monday that starts the week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - day);
  return d;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function computeStats(
  progress: BootyWorkoutProgress,
  now: Date = new Date(),
): BootyWorkoutStats {
  const completed = progress.sessions
    .filter((s) => s.completed)
    .map((s) => new Date(s.endedAt))
    .filter((d) => !Number.isNaN(d.getTime()));

  const currentWeek = startOfWeek(now);
  const weekKeys = new Set(
    completed.map((d) => startOfWeek(d).getTime()),
  );

  let weeklyStreak = 0;
  let cursor = currentWeek.getTime();
  // A streak may still be alive if this week is empty but last week wasn't.
  if (!weekKeys.has(cursor)) cursor -= WEEK_MS;
  while (weekKeys.has(cursor)) {
    weeklyStreak += 1;
    cursor -= WEEK_MS;
  }

  const monthDays = new Set(
    completed
      .filter(
        (d) =>
          d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(),
      )
      .map((d) => d.getDate()),
  );

  return {
    weeklyStreak,
    activeThisWeek: weekKeys.has(currentWeek.getTime()),
    daysThisMonth: monthDays.size,
    daysElapsedThisMonth: now.getDate(),
  };
}

export function formatMonthLabel(now: Date = new Date()): string {
  return now.toLocaleDateString(undefined, { month: "long" });
}

/** Wipe all stored progress, streak and session history. */
export function clearProgress() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/* ---------- Weekly / monthly completion series (for charts) ---------- */

export type CompletionPoint = {
  /** Stable bucket key, e.g. "2026-W33" or "2026-08". */
  key: string;
  /** Short axis label, e.g. "Aug 10" or "Aug". */
  label: string;
  /** Distinct days with a completed run inside the bucket. */
  days: number;
  /** True for the bucket containing `now`. */
  current: boolean;
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function completedDates(progress: BootyWorkoutProgress): Date[] {
  return progress.sessions
    .filter((s) => s.completed)
    .map((s) => new Date(s.endedAt))
    .filter((d) => !Number.isNaN(d.getTime()));
}

/** Distinct completed days per week, oldest first, for the last `weeks` weeks. */
export function weeklyCompletionSeries(
  progress: BootyWorkoutProgress,
  weeks = 8,
  now: Date = new Date(),
): CompletionPoint[] {
  const dates = completedDates(progress);
  const currentWeek = startOfWeek(now).getTime();
  const buckets: CompletionPoint[] = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = currentWeek - i * WEEK_MS;
    const startDate = new Date(start);
    const days = new Set(
      dates
        .filter((d) => startOfWeek(d).getTime() === start)
        .map(dayKey),
    );
    buckets.push({
      key: `${startDate.getFullYear()}-W${startDate.getMonth() + 1}-${startDate.getDate()}`,
      label: startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      days: days.size,
      current: i === 0,
    });
  }
  return buckets;
}

/** Distinct completed days per calendar month, oldest first, for the last `months` months. */
export function monthlyCompletionSeries(
  progress: BootyWorkoutProgress,
  months = 6,
  now: Date = new Date(),
): CompletionPoint[] {
  const dates = completedDates(progress);
  const buckets: CompletionPoint[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const days = new Set(
      dates
        .filter(
          (d) =>
            d.getFullYear() === anchor.getFullYear() && d.getMonth() === anchor.getMonth(),
        )
        .map(dayKey),
    );
    buckets.push({
      key: `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}`,
      label: anchor.toLocaleDateString(undefined, { month: "short" }),
      days: days.size,
      current: i === 0,
    });
  }
  return buckets;
}
