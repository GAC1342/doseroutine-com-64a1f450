/**
 * Single source of truth for on-device alarms.
 *
 * The reminders screen used to be the only place that pushed alarms to the OS,
 * which meant a user who added a compound, workout, or meal anywhere else never
 * got a buzz until they happened to reopen that one screen. This module reads
 * everything that should alert from the database and re-arms the device, and is
 * called on app launch, on every resume, and after any schedule edit.
 */
import { supabase } from "@/integrations/supabase/client";
import { normalizeTime } from "@/lib/routine-schedule";
import {
  isNativeNotifications,
  checkNativePermission,
  syncDoseAlarms,
  type RoutineAlarm,
} from "@/lib/local-notifications";

export const NATIVE_ALARMS_PREF_KEY = "doseroutine.native-alarms";
export const ALARMS_CHANGED_EVENT = "doseroutine:alarms-changed";

/** Alarms are on unless the user explicitly turned them off. */
export function nativeAlarmsPreferred(): boolean {
  try {
    return localStorage.getItem(NATIVE_ALARMS_PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Anything that edits a dose time, workout, or meal calls this when it saves. */
export function requestAlarmSync(): void {
  try {
    window.dispatchEvent(new CustomEvent(ALARMS_CHANGED_EVENT));
  } catch {
    /* SSR / no window */
  }
}

type DoseAlarm = {
  compoundId: string;
  compoundName: string;
  time: string;
  leadMinutes: number;
  frequency: string | null;
  daysOfWeek: number[] | null;
};

/** Reads every alerting schedule for the signed-in user. */
export async function collectAlarms(): Promise<{ doses: DoseAlarm[]; routines: RoutineAlarm[] }> {
  // allSettled, not all: one failing table (network blip, RLS hiccup) must not
  // wipe out every other reminder type for this pass.
  const [ucRes, remRes, workoutRes, mealRes] = await Promise.allSettled([
    supabase
      .from("user_compounds")
      .select("id, frequency, days_of_week, times_of_day, active, compound:compounds(name)")
      .eq("active", true),
    supabase.from("reminders").select("user_compound_id, enabled, lead_time_minutes"),
    supabase
      .from("workout_sessions")
      .select(
        "id, label, planned_time, days_of_week, active, at_time_alert_on, pre_alert_on, pre_lead_min",
      )
      .eq("active", true)
      .not("planned_time", "is", null),
    supabase
      .from("meal_times")
      .select("id, label, planned_time, days_of_week, active, alerts_on")
      .eq("active", true)
      .eq("alerts_on", true),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  const rowsOf = (res: PromiseSettledResult<{ data: any }>): any[] =>
    res.status === "fulfilled" ? (res.value.data ?? []) : [];
  const ucData = rowsOf(ucRes);
  const remData = rowsOf(remRes);
  const workoutRows = rowsOf(workoutRes);
  const mealRows = rowsOf(mealRes);

  const remByUc = new Map<string, { enabled: boolean; lead: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  remData.forEach((r: any) => {
    if (!r.user_compound_id) return;
    const prev = remByUc.get(r.user_compound_id);
    const enabled = !!r.enabled || !!prev?.enabled;
    remByUc.set(r.user_compound_id, {
      enabled,
      lead: Math.max(0, r.lead_time_minutes ?? prev?.lead ?? 0),
    });
  });

  const doses: DoseAlarm[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  ucData.forEach((uc: any) => {
    const rem = remByUc.get(uc.id);
    if (!rem?.enabled) return;
    const times = (uc.times_of_day as string[] | null) ?? [];
    times.forEach((raw) => {
      const time = normalizeTime(raw);
      if (!time) return;
      doses.push({
        compoundId: uc.id,
        compoundName: uc.compound?.name ?? "your dose",
        time,
        leadMinutes: rem.lead,
        frequency: uc.frequency ?? null,
        daysOfWeek: uc.days_of_week ?? null,
      });
    });
  });

  const routines: RoutineAlarm[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  workoutRows.forEach((w: any) => {
    const time = normalizeTime(w.planned_time);
    if (!time) return;
    const lead = w.pre_alert_on ? Math.max(0, w.pre_lead_min ?? 0) : 0;
    if (lead === 0 && w.at_time_alert_on === false) return;
    routines.push({
      id: w.id,
      kind: "workout",
      label: w.label || "Workout",
      time,
      leadMinutes: lead,
      daysOfWeek: w.days_of_week ?? null,
    });
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  mealRows.forEach((m: any) => {
    const time = normalizeTime(m.planned_time);
    if (!time) return;
    routines.push({
      id: m.id,
      kind: "meal",
      label: m.label || "Meal",
      time,
      daysOfWeek: m.days_of_week ?? null,
    });
  });

  return { doses, routines };
}

/**
 * Re-arms every on-device alarm. Returns how many are now pending, or -1 when
 * the device isn't native / permission is missing / the user opted out.
 */
export async function syncAllAlarms(): Promise<number> {
  if (!isNativeNotifications()) return -1;
  if (!nativeAlarmsPreferred()) return -1;
  const granted = await checkNativePermission();
  if (!granted) return -1;
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return -1;
  const { doses, routines } = await collectAlarms();
  return await syncDoseAlarms(doses, routines);
}
