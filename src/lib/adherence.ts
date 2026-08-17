import { supabase } from "@/integrations/supabase/client";
import { formatInTimeZone } from "date-fns-tz";
import type { Database } from "@/integrations/supabase/types";
import { getEffectiveDoseStatus } from "@/lib/dose-status";
import { historyWindow } from "@/lib/today-window";

/** Profile timezone when known, device timezone otherwise. */
export function resolveZone(tz?: string | null): string {
  return (
    tz ||
    (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC") ||
    "UTC"
  );
}

type Status = Database["public"]["Enums"]["event_status"];
export type AdhEvent = {
  id: string;
  scheduled_at: string;
  status: Status | null;
  taken_at: string | null;
  /** Optional compound label, used for the per-compound monthly breakdown. */
  label?: string | null;
};

export type AdherenceStats = {
  onTimeRate: number; // 0..1 of resolved doses taken within the on-time window
  adherenceRate: number; // 0..1 of resolved doses taken at all (any time)
  onTimeCount: number;
  takenCount: number;
  missedCount: number;
  skippedCount: number;
  totalScheduled: number;
  streak: number; // consecutive days with no missed and >=1 taken
  encouragement: string;
};

const ON_TIME_WINDOW_MIN = 60;

export function computeAdherence(
  events: AdhEvent[],
  windowDays: number,
  zone?: string,
): AdherenceStats {
  const tz =
    zone ||
    (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC") ||
    "UTC";
  const now = Date.now();
  const nowDate = new Date(now);
  const cutoff = now - windowDays * 86_400_000;
  // Only count doses that have been resolved (taken / missed / skipped).
  // Pending future doses shouldn't drag the ratio down or inflate the denominator.
  const past = events.filter((e) => {
    const t = new Date(e.scheduled_at).getTime();
    if (t < cutoff || t > now) return false;
    const status = getEffectiveDoseStatus(e.status, e.scheduled_at, nowDate);
    return status === "taken" || status === "missed" || status === "skipped";
  });
  let taken = 0,
    missed = 0,
    skipped = 0,
    onTime = 0;
  for (const e of past) {
    const status = getEffectiveDoseStatus(e.status, e.scheduled_at, nowDate);
    if (status === "taken") {
      taken++;
      if (e.taken_at) {
        const diff = Math.abs(new Date(e.taken_at).getTime() - new Date(e.scheduled_at).getTime());
        if (diff <= ON_TIME_WINDOW_MIN * 60_000) onTime++;
      }
    } else if (status === "missed") missed++;
    else if (status === "skipped") skipped++;
  }
  const total = past.length;
  const rate = total ? taken / total : 0;

  // Streak: consecutive days (from today backward) with at least one taken and no missed.
  // Group by the profile timezone so day boundaries agree with buildHeatmap.
  const byDay = new Map<string, { taken: number; missed: number }>();
  for (const e of events) {
    const key = formatInTimeZone(e.scheduled_at, tz, "yyyy-MM-dd");
    const b = byDay.get(key) ?? { taken: 0, missed: 0 };
    const status = getEffectiveDoseStatus(e.status, e.scheduled_at, nowDate);
    if (status === "taken") b.taken++;
    if (status === "missed") b.missed++;
    byDay.set(key, b);
  }
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const day = new Date(now - i * 86_400_000);
    const key = formatInTimeZone(day, tz, "yyyy-MM-dd");
    const b = byDay.get(key);
    if (b && b.taken > 0 && b.missed === 0) streak++;
    else if (i === 0) {
      // allow today to be empty without breaking streak
    } else break;
  }

  return {
    onTimeRate: total ? onTime / total : 0,
    adherenceRate: rate,
    onTimeCount: onTime,
    takenCount: taken,
    missedCount: missed,
    skippedCount: skipped,
    totalScheduled: total,
    streak,
    encouragement: encourage(rate, streak, missed),
  };
}

function encourage(rate: number, streak: number, missed: number): string {
  if (rate >= 0.9) return "You're crushing consistency — keep it steady.";
  if (streak >= 3) return `Nice — ${streak}-day streak. Small wins compound.`;
  if (missed > 0 && rate < 0.5) return "Reset moment. One good day starts the next streak.";
  if (rate >= 0.6) return "Solid rhythm. Tighten up the tricky doses next.";
  return "Progress over perfection. Log the next one and keep going.";
}

/** Fetch the adherence history rows for a rolling `days`-day window.
 *  The window comes from the shared `historyWindow` helper so Today, Timeline
 *  and this fetch can never scope to different rows. Pass the user's profile
 *  timezone whenever it is known; it falls back to the device timezone. */
export async function fetchAdherenceEvents(days: number, tz?: string): Promise<AdhEvent[]> {
  const { start, end } = historyWindow(new Date(), resolveZone(tz), days);
  const { data } = await supabase
    .from("schedule_events")
    .select("id, scheduled_at, status, taken_at")
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: false });
  return (data as AdhEvent[] | null) ?? [];
}

export type HeatCell = {
  date: string;
  total: number;
  taken: number;
  missed: number;
  ratio: number;
};

export function buildHeatmap(events: AdhEvent[], days: number, zone?: string): HeatCell[] {
  const tz =
    zone ||
    (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC") ||
    "UTC";
  const map = new Map<string, HeatCell>();
  // Build day keys in the user's zone so setup and event grouping agree.
  const nowUtc = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(nowUtc - i * 86_400_000);
    const key = formatInTimeZone(d, tz, "yyyy-MM-dd");
    map.set(key, { date: key, total: 0, taken: 0, missed: 0, ratio: 0 });
  }
  for (const e of events) {
    const key = formatInTimeZone(e.scheduled_at, tz, "yyyy-MM-dd");
    const cell = map.get(key);
    if (!cell) continue;
    const status = getEffectiveDoseStatus(e.status, e.scheduled_at);
    cell.total++;
    if (status === "taken") cell.taken++;
    if (status === "missed") cell.missed++;
    cell.ratio = cell.total ? cell.taken / cell.total : 0;
  }
  return Array.from(map.values());
}

/* ---------------------------------------------------------------------
 * Headline adherence score
 *
 * One number people can read at a glance and hand to a clinician.
 *
 * Scoring rule (deliberate, and documented so it can't drift):
 *   score = taken / (taken + missed)
 *   - PENDING doses are excluded entirely. A dose that isn't due yet must
 *     never drag the score down.
 *   - SKIPPED doses are excluded from both sides. A skip is an intentional
 *     decision (rest day, clinician said stop), not a failure — counting it
 *     as a miss punishes honest logging and trains people to under-report.
 *   - MISSED doses are the only thing that lowers the score.
 * With no resolved doses at all the score is `null`, not 0 — "no data" and
 * "you failed everything" are different states and must render differently.
 * ------------------------------------------------------------------ */

export type AdherenceScore = {
  /** 0-100, or null when there is nothing to score yet. */
  score: number | null;
  taken: number;
  missed: number;
  skipped: number;
  /** taken + missed — the scoring denominator. */
  scored: number;
};

export function computeAdherenceScore(
  events: AdhEvent[],
  windowDays = 30,
  now: Date = new Date(),
): AdherenceScore {
  const nowMs = now.getTime();
  const cutoff = nowMs - windowDays * 86_400_000;
  let taken = 0;
  let missed = 0;
  let skipped = 0;

  for (const e of events) {
    const t = new Date(e.scheduled_at).getTime();
    if (Number.isNaN(t) || t < cutoff || t > nowMs) continue;
    const status = getEffectiveDoseStatus(e.status, e.scheduled_at, now);
    if (status === "taken") taken++;
    else if (status === "missed") missed++;
    else if (status === "skipped") skipped++;
  }

  const scored = taken + missed;
  return {
    score: scored ? Math.round((taken / scored) * 100) : null,
    taken,
    missed,
    skipped,
    scored,
  };
}

/** Human label for a score band — used for the ring color and copy. */
/** Score at or above which a compound counts as "consistent". */
export const GOOD_SCORE = 80;

export function scoreBand(score: number | null): "none" | "low" | "fair" | "good" | "great" {
  if (score == null) return "none";
  if (score >= 90) return "great";
  if (score >= 75) return "good";
  if (score >= 50) return "fair";
  return "low";
}

/* ---------------------------------------------------------------------
 * Monthly report
 * ------------------------------------------------------------------ */

export type CompoundAdherence = {
  label: string;
  taken: number;
  missed: number;
  scored: number;
  score: number;
};

export type MonthlyReport = {
  /** yyyy-MM of the reported month, in the user's timezone. */
  month: string;
  score: number | null;
  taken: number;
  missed: number;
  skipped: number;
  scored: number;
  /** Score for the preceding month, for the trend arrow. */
  previousScore: number | null;
  /** Signed difference vs the previous month, or null when incomparable. */
  delta: number | null;
  days: HeatCell[];
  best: CompoundAdherence[];
  worst: CompoundAdherence[];
};

function monthKey(iso: string | Date, tz: string): string {
  return formatInTimeZone(iso, tz, "yyyy-MM");
}

function scoreEventsIn(events: AdhEvent[], month: string, tz: string, now: Date) {
  let taken = 0;
  let missed = 0;
  let skipped = 0;
  for (const e of events) {
    if (monthKey(e.scheduled_at, tz) !== month) continue;
    const status = getEffectiveDoseStatus(e.status, e.scheduled_at, now);
    if (status === "taken") taken++;
    else if (status === "missed") missed++;
    else if (status === "skipped") skipped++;
  }
  const scored = taken + missed;
  return {
    taken,
    missed,
    skipped,
    scored,
    score: scored ? Math.round((taken / scored) * 100) : null,
  };
}

function previousMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyReport(
  events: AdhEvent[],
  options: { month?: string; zone?: string; now?: Date } = {},
): MonthlyReport {
  const tz =
    options.zone ||
    (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC") ||
    "UTC";
  const now = options.now ?? new Date();
  const month = options.month ?? monthKey(now, tz);

  const current = scoreEventsIn(events, month, tz, now);
  const previous = scoreEventsIn(events, previousMonthKey(month), tz, now);

  // Day-by-day cells for the month, in the user's timezone.
  const dayMap = new Map<string, HeatCell>();
  for (const e of events) {
    if (monthKey(e.scheduled_at, tz) !== month) continue;
    const key = formatInTimeZone(e.scheduled_at, tz, "yyyy-MM-dd");
    const cell = dayMap.get(key) ?? { date: key, total: 0, taken: 0, missed: 0, ratio: 0 };
    const status = getEffectiveDoseStatus(e.status, e.scheduled_at, now);
    cell.total++;
    if (status === "taken") cell.taken++;
    if (status === "missed") cell.missed++;
    cell.ratio = cell.total ? cell.taken / cell.total : 0;
    dayMap.set(key, cell);
  }
  const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Per-compound breakdown. Events without a label are pooled under "Other".
  const byCompound = new Map<string, { taken: number; missed: number }>();
  for (const e of events) {
    if (monthKey(e.scheduled_at, tz) !== month) continue;
    const status = getEffectiveDoseStatus(e.status, e.scheduled_at, now);
    if (status !== "taken" && status !== "missed") continue;
    const label = e.label?.trim() || "Other";
    const row = byCompound.get(label) ?? { taken: 0, missed: 0 };
    if (status === "taken") row.taken++;
    else row.missed++;
    byCompound.set(label, row);
  }
  const compounds: CompoundAdherence[] = Array.from(byCompound.entries())
    .map(([label, r]) => {
      const scored = r.taken + r.missed;
      return {
        label,
        taken: r.taken,
        missed: r.missed,
        scored,
        score: Math.round((r.taken / scored) * 100),
      };
    })
    // Ties broken by volume so a single perfect dose doesn't top the chart.
    .sort((a, b) => b.score - a.score || b.scored - a.scored);

  return {
    month,
    score: current.score,
    taken: current.taken,
    missed: current.missed,
    skipped: current.skipped,
    scored: current.scored,
    previousScore: previous.score,
    delta: current.score != null && previous.score != null ? current.score - previous.score : null,
    days,
    // Banded rather than "top 3 / bottom 3": with only one or two compounds a
    // rank split would label a 0% compound as "most consistent".
    best: compounds.filter((c) => c.score >= GOOD_SCORE).slice(0, 3),
    worst: compounds
      .filter((c) => c.score < GOOD_SCORE)
      .reverse()
      .slice(0, 3),
  };
}

/** Fetches adherence events with compound labels, for the monthly report. */
export async function fetchLabeledAdherenceEvents(days: number, tz?: string): Promise<AdhEvent[]> {
  const { start, end } = historyWindow(new Date(), resolveZone(tz), days);
  const { data } = await supabase
    .from("schedule_events")
    .select(
      "id, scheduled_at, status, taken_at, user_compound:user_compounds(custom_name, compound:compounds(name))",
    )
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: false });

  type Row = AdhEvent & {
    user_compound?: { custom_name: string | null; compound?: { name: string } | null } | null;
  };
  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    scheduled_at: r.scheduled_at,
    status: r.status,
    taken_at: r.taken_at,
    label: r.user_compound?.compound?.name ?? r.user_compound?.custom_name ?? null,
  }));
}
