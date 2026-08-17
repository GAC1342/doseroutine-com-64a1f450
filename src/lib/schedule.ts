import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { isPausedOnDate, normalizePause, type PauseWindow } from "@/lib/pause";
import {
  activeRules,
  isSkippedByRules,
  isWholeDaySkipped,
  rulesForDay,
  type StandingRule,
} from "@/lib/standing-rules";

type UC = Database["public"]["Tables"]["user_compounds"]["Row"];

type PlannedEvent = {
  user_id: string;
  user_compound_id: string;
  scheduled_at: string; // ISO UTC
  dose_amount: number | null;
  dose_unit: Database["public"]["Enums"]["dose_unit_enum"] | null;
  status: Database["public"]["Enums"]["event_status"];
};

type LocalDate = { iso: string; dow: number /* 1..7 Mon..Sun */ };

/** Returns true if a compound is due on the given local calendar date. */
function dueOnLocalDate(uc: UC, ld: LocalDate): boolean {
  if (uc.start_date && ld.iso < uc.start_date) return false;
  if (uc.end_date && ld.iso > uc.end_date) return false;

  if (uc.cycle_on_days && uc.cycle_off_days && uc.start_date) {
    const start = Date.UTC(
      Number(uc.start_date.slice(0, 4)),
      Number(uc.start_date.slice(5, 7)) - 1,
      Number(uc.start_date.slice(8, 10)),
    );
    const cur = Date.UTC(
      Number(ld.iso.slice(0, 4)),
      Number(ld.iso.slice(5, 7)) - 1,
      Number(ld.iso.slice(8, 10)),
    );
    const days = Math.floor((cur - start) / 86_400_000);
    if (days < 0) return false;
    const cycle = uc.cycle_on_days + uc.cycle_off_days;
    if (days % cycle >= uc.cycle_on_days) return false;
  }

  if (uc.frequency === "daily") return true;
  if (uc.frequency === "weekly") {
    return (uc.days_of_week ?? []).includes(ld.dow);
  }
  if (uc.frequency === "custom") {
    if (uc.days_of_week && uc.days_of_week.length) {
      return uc.days_of_week.includes(ld.dow);
    }
    return true;
  }
  return false;
}

export function planEvents(
  userId: string,
  ucs: UC[],
  tz: string,
  days = 7,
  from: Date = new Date(),
  /** Vacation mode: local dates inside this range produce no doses at all. */
  pause: PauseWindow | null = null,
  /** Standing rules: recurring weekday skips, per-compound or whole-stack. */
  rules: StandingRule[] | null = null,
): PlannedEvent[] {
  const out: PlannedEvent[] = [];

  // Anchor to the user's local "today" — not UTC. Iterating UTC midnight can
  // fall on the wrong local date for tz offsets, which flips weekly DOW.
  const todayLocalISO = formatInTimeZone(from, tz, "yyyy-MM-dd");
  const [y0, m0, d0] = todayLocalISO.split("-").map(Number);

  for (let i = 0; i < days; i++) {
    // Advance the local calendar by i days using UTC arithmetic (safe: we only
    // use it to derive Y-M-D, never as an instant).
    const anchor = new Date(Date.UTC(y0, m0 - 1, d0 + i, 12, 0, 0));
    const iso = formatInTimeZone(anchor, "UTC", "yyyy-MM-dd");
    const dow = Number(formatInTimeZone(anchor, "UTC", "i")); // 1..7 Mon..Sun
    const ld: LocalDate = { iso, dow };

    // Vacation mode: skip the whole day. No events means nothing to miss, so
    // paused days never count against adherence.
    if (isPausedOnDate(iso, pause)) continue;
    // A whole-stack standing rule ("always skip Sundays") clears the day too.
    if (isWholeDaySkipped(dow, rules)) continue;

    for (const uc of ucs) {
      if (!uc.active) continue;
      if (!dueOnLocalDate(uc, ld)) continue;
      // Per-compound standing rule, e.g. "no creatine on rest days".
      if (isSkippedByRules(dow, uc.id, rules)) continue;

      const times = (uc.times_of_day as string[] | null) ?? [];
      for (const t of times) {
        const [hh, mm] = t.split(":").map(Number);
        if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
        const localISO = `${iso}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
        const utc = fromZonedTime(localISO, tz);
        out.push({
          user_id: userId,
          user_compound_id: uc.id,
          scheduled_at: utc.toISOString(),
          dose_amount: uc.dose_amount,
          dose_unit: uc.dose_unit,
          status: "pending",
        });
      }
    }
  }
  return out;
}

/**

 * Local days inside the planning horizon that a standing rule covers.
 * `wholeDay` means every compound is skipped; otherwise only `compoundIds`.
 */
export function ruleSkipDays(
  tz: string,
  days: number,
  from: Date,
  rules: StandingRule[] | null,
): { iso: string; wholeDay: boolean; compoundIds: string[] }[] {
  const active = activeRules(rules);
  if (!active.length) return [];

  const todayLocalISO = formatInTimeZone(from, tz, "yyyy-MM-dd");
  const [y0, m0, d0] = todayLocalISO.split("-").map(Number);
  const out: { iso: string; wholeDay: boolean; compoundIds: string[] }[] = [];

  for (let i = 0; i < days; i++) {
    const anchor = new Date(Date.UTC(y0, m0 - 1, d0 + i, 12, 0, 0));
    const iso = formatInTimeZone(anchor, "UTC", "yyyy-MM-dd");
    const dow = Number(formatInTimeZone(anchor, "UTC", "i"));
    const firing = rulesForDay(dow, active);
    if (!firing.length) continue;
    const wholeDay = firing.some((r) => r.user_compound_id === null);
    const compoundIds = [
      ...new Set(firing.map((r) => r.user_compound_id).filter((id): id is string => id !== null)),
    ];
    if (!wholeDay && !compoundIds.length) continue;
    out.push({ iso, wholeDay, compoundIds });
  }
  return out;
}

/** Generate + upsert schedule events for the current user for the next N days.
 *  Idempotent via the (user_compound_id, scheduled_at) unique index.
 *
 *  Pass `purgeCompoundIds` when a compound's schedule was just edited: any
 *  pending future events for those compounds are deleted first so old times
 *  don't linger and fire reminders. Taken/skipped/missed events are never
 *  touched — history stays intact. */
export async function generateScheduleForCurrentUser(
  days = 7,
  purgeCompoundIds: string[] = [],
): Promise<number> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return 0;

  if (purgeCompoundIds.length) {
    // Delete ALL pending events (past + future) for these compounds so that
    // when a user changes their schedule (e.g. daily → weekly Monday), stale
    // events left over from the previous schedule don't linger on Timeline
    // or get auto-flipped to "missed". Taken/skipped/missed history stays.
    const { error: delErr } = await supabase
      .from("schedule_events")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending")
      .in("user_compound_id", purgeCompoundIds);
    if (delErr) throw delErr;
  }

  const [{ data: prof }, { data: ucs }, { data: ruleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("timezone, pause_start, pause_end, pause_reason")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_compounds").select("*").eq("user_id", user.id).eq("active", true),
    supabase
      .from("standing_skip_rules")
      .select("id, user_compound_id, days_of_week, enabled, note")
      .eq("user_id", user.id)
      .eq("enabled", true),
  ]);
  const tz = prof?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const rules = (ruleRows ?? []) as StandingRule[];

  // Vacation mode: clear any pending doses already sitting inside the paused
  // range (they may have been generated before the pause was set) so the days
  // read as genuinely off instead of turning into a wall of "missed".
  const pauseRange = normalizePause(prof ?? null);
  if (pauseRange) {
    const from = fromZonedTime(`${pauseRange.start}T00:00:00`, tz);
    const to = fromZonedTime(`${pauseRange.end}T23:59:59`, tz);
    const { error: pauseDelErr } = await supabase
      .from("schedule_events")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gte("scheduled_at", from.toISOString())
      .lte("scheduled_at", to.toISOString());
    if (pauseDelErr) throw pauseDelErr;
  }

  // Standing rules: same idea, but recurring. Sweep the planning horizon and
  // drop pending doses that a rule now covers, so turning on "always skip
  // Sundays" cleans up the Sundays that were already on the calendar.
  for (const day of ruleSkipDays(tz, days, new Date(), rules)) {
    const from = fromZonedTime(`${day.iso}T00:00:00`, tz);
    const to = fromZonedTime(`${day.iso}T23:59:59`, tz);
    let q = supabase
      .from("schedule_events")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gte("scheduled_at", from.toISOString())
      .lte("scheduled_at", to.toISOString());
    // A whole-stack rule clears the day; otherwise only the named compounds.
    if (!day.wholeDay) q = q.in("user_compound_id", day.compoundIds);
    const { error: ruleDelErr } = await q;
    if (ruleDelErr) throw ruleDelErr;
  }

  const planned = planEvents(user.id, (ucs ?? []) as UC[], tz, 7, new Date(), prof ?? null, rules);

  if (!planned.length) return 0;

  // Upsert in chunks to keep payloads reasonable
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < planned.length; i += CHUNK) {
    const batch = planned.slice(i, i + CHUNK);
    const { error, count } = await supabase.from("schedule_events").upsert(batch, {
      onConflict: "user_compound_id,scheduled_at",
      ignoreDuplicates: true,
      count: "exact",
    });
    if (error) throw error;
    inserted += count ?? 0;
  }
  return inserted;
}
