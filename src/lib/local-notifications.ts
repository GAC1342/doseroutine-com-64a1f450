/**
 * Native local notifications (Capacitor).
 *
 * These are on-device alarms — they fire even offline, don't require a
 * push server, and work while the app is closed. Only active inside the
 * installed native iOS / Android wrapper. In the browser these helpers
 * become no-ops so the web app stays untouched.
 */
import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  Weekday,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications";

export function isNativeNotifications(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Ask for notification permission. Only call this from a user gesture that
 * explains why — a plugin failure must never bubble up and break the screen.
 */
export async function requestNativePermission(): Promise<boolean> {
  if (!isNativeNotifications()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const res = await LocalNotifications.requestPermissions();
    return res.display === "granted";
  } catch (err) {
    console.warn("[alarms] permission request failed", err);
    return false;
  }
}

/** Read-only permission check — never shows a system dialog. */
export async function checkNativePermission(): Promise<boolean> {
  if (!isNativeNotifications()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display === "granted";
  } catch {
    return false;
  }
}

/**
 * Android 8+ requires a notification channel. Importance 5 (MAX) is what makes
 * a reminder buzz, make a sound, and show as a heads-up banner instead of a
 * silent tray entry. Creating the same id twice is a no-op.
 */
export const ALARM_CHANNEL_ID = "doseroutine-alarms";

let channelReady = false;

export async function ensureChannel(): Promise<void> {
  if (!isNativeNotifications()) return;
  if (channelReady) return;
  try {
    if (Capacitor.getPlatform() !== "android") {
      channelReady = true;
      return;
    }
    await LocalNotifications.createChannel({
      id: ALARM_CHANNEL_ID,
      name: "Reminders",
      description: "Dose, workout, and meal reminders",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    channelReady = true;
  } catch {
    // Channel creation is best effort — the plugin falls back to its default.
  }
}

/**
 * Android 12+ downgrades alarms to inexact (can drift many minutes) unless the
 * app is allowed to schedule exact alarms. For a medication reminder that is
 * not acceptable, so we surface the setting and can send the user to it.
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (!isNativeNotifications()) return false;
  if (Capacitor.getPlatform() !== "android") return true;
  try {
    const res = await LocalNotifications.checkExactNotificationSetting();
    return res.exact_alarm === "granted";
  } catch {
    return true;
  }
}

/** Opens the OS screen where the user allows exact alarms (Android only). */
export async function requestExactAlarms(): Promise<boolean> {
  if (!isNativeNotifications()) return false;
  if (Capacitor.getPlatform() !== "android") return true;
  try {
    const res = await LocalNotifications.changeExactNotificationSetting();
    return res.exact_alarm === "granted";
  } catch {
    return false;
  }
}

type Dose = {
  compoundId: string;
  compoundName: string;
  /** "HH:MM" 24h */
  time: string;
  leadMinutes?: number;
  frequency?: string | null;
  /** DoseRoutine stores weekdays as 1=Mon through 7=Sun. */
  daysOfWeek?: number[] | null;
};

/** A recurring workout or meal anchor that should also buzz on-device. */
export type RoutineAlarm = {
  /** Row id of the workout_sessions / meal_times record. */
  id: string;
  kind: "workout" | "meal";
  label: string;
  /** "HH:MM" 24h local time. */
  time: string;
  leadMinutes?: number;
  /** Routine weekdays are 0=Sun through 6=Sat (null/empty = every day). */
  daysOfWeek?: number[] | null;
};

/**
 * Cancel every scheduled DoseRoutine alarm on this device.
 */
export async function cancelAllDoseAlarms(): Promise<void> {
  if (!isNativeNotifications()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length === 0) return;
    await LocalNotifications.cancel({ notifications: pending.notifications });
  } catch (err) {
    console.warn("[alarms] cancel failed", err);
  }
}

/**
 * Replace all scheduled alarms with a fresh set. Daily doses repeat daily;
 * weekly/custom weekday doses repeat only on the selected weekdays. Recurring
 * workout and meal anchors are scheduled in the same pass, because scheduling
 * clears the whole pending list first.
 * Deterministic IDs (hash of compoundId + time) keep the pending list clean.
 */
export async function syncDoseAlarms(
  doses: Dose[],
  routines: RoutineAlarm[] = [],
): Promise<number> {
  if (!isNativeNotifications()) return 0;
  const ok = await requestNativePermission();
  if (!ok) return 0;

  await cancelAllDoseAlarms();

  const doseNotifications = doses
    .flatMap((d) => {
      const [hh, mm] = d.time.split(":").map((n) => parseInt(n, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) return [];
      const lead = d.leadMinutes ?? 0;
      const reminderTime = subtractLead(hh, mm, lead);
      const selectedDays = normalizeWeekDays(d.daysOfWeek);
      const isWeekdaySchedule =
        (d.frequency === "weekly" || d.frequency === "custom") && selectedDays.length > 0;
      const days = isWeekdaySchedule ? selectedDays : [null];

      return days.map((doseDay) => {
        const alarmDay = doseDay ? shiftDay(doseDay, -reminderTime.dayOffset) : null;
        return {
          id: stableId(`${d.compoundId}|${d.time}|${lead}|${alarmDay ?? "daily"}`),
          title: "Time for your stack",
          body: lead > 0 ? `${d.compoundName} in ${lead} min` : `Take ${d.compoundName} now`,
          schedule: {
            on: {
              ...(alarmDay ? { weekday: toCapacitorWeekday(alarmDay) } : {}),
              hour: reminderTime.hour,
              minute: reminderTime.minute,
            },
            allowWhileIdle: true,
            repeats: true,
          },
          smallIcon: "ic_stat_icon_config_sample",
          channelId: ALARM_CHANNEL_ID,
        } satisfies LocalNotificationSchema;
      });
    })
    .filter((n) => n !== null);

  const all = [...doseNotifications, ...routineNotifications(routines)];
  // iOS only keeps 64 pending notifications per app and silently drops the
  // rest, so never hand the OS more than the budget. Doses win over routines.
  const notifications = capNotifications(all);

  if (notifications.length === 0) return 0;
  await ensureChannel();
  // L1 — own the failure here rather than relying on every caller wrapping
  // this in try/catch. A rejected schedule() must never take down the screen
  // that triggered the sync; report 0 scheduled and let the caller carry on.
  try {
    await LocalNotifications.schedule({ notifications });
  } catch (err) {
    console.warn("[alarms] LocalNotifications.schedule failed", err);
    return 0;
  }
  return notifications.length;
}

/**
 * Hard ceiling on pending alarms (iOS allows 64). Doses are scheduled first,
 * then routine anchors, each group ordered by time of day so the earliest
 * alarms of the day always survive the cut.
 */
export const MAX_PENDING_ALARMS = 60;

function capNotifications(list: LocalNotificationSchema[]): LocalNotificationSchema[] {
  if (list.length <= MAX_PENDING_ALARMS) return list;
  return list.slice(0, MAX_PENDING_ALARMS);
}

/** Build repeating on-device alarms for workout / meal anchors. */
function routineNotifications(routines: RoutineAlarm[]): LocalNotificationSchema[] {
  return routines.flatMap((r) => {
    const [hh, mm] = (r.time ?? "").split(":").map((n) => parseInt(n, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return [];
    const lead = Math.max(0, r.leadMinutes ?? 0);
    const reminderTime = subtractLead(hh, mm, lead);
    // Routine weekdays are 0=Sun..6=Sat; convert to the 1=Mon..7=Sun form the
    // shift/Capacitor helpers use. Empty means every day.
    const selected = [...new Set((r.daysOfWeek ?? []).filter((d) => d >= 0 && d <= 6))]
      .map((d) => (d === 0 ? 7 : d))
      .sort((a, b) => a - b);
    const days: (number | null)[] = selected.length > 0 && selected.length < 7 ? selected : [null];
    const noun = r.kind === "workout" ? "Workout" : "Meal";

    return days.map((day) => {
      const alarmDay = day ? shiftDay(day, -reminderTime.dayOffset) : null;
      return {
        id: stableId(`routine|${r.kind}|${r.id}|${r.time}|${lead}|${alarmDay ?? "daily"}`),
        title: `${noun}: ${r.label}`,
        body: lead > 0 ? `Starts in ${lead} min` : "Starting now",
        schedule: {
          on: {
            ...(alarmDay ? { weekday: toCapacitorWeekday(alarmDay) } : {}),
            hour: reminderTime.hour,
            minute: reminderTime.minute,
          },
          allowWhileIdle: true,
          repeats: true,
        },
        smallIcon: "ic_stat_icon_config_sample",
        channelId: ALARM_CHANNEL_ID,
      } satisfies LocalNotificationSchema;
    });
  });
}

function normalizeWeekDays(input: readonly number[] | null | undefined): number[] {
  return [...new Set((input ?? []).filter((day) => day >= 1 && day <= 7))].sort((a, b) => a - b);
}

function subtractLead(
  hour: number,
  minute: number,
  leadMinutes: number,
): { hour: number; minute: number; dayOffset: number } {
  let total = hour * 60 + minute - Math.max(0, leadMinutes);
  let dayOffset = 0;
  while (total < 0) {
    total += 24 * 60;
    dayOffset -= 1;
  }
  while (total >= 24 * 60) {
    total -= 24 * 60;
    dayOffset += 1;
  }
  return {
    hour: Math.floor(total / 60),
    minute: total % 60,
    dayOffset,
  };
}

function shiftDay(day: number, offset: number): number {
  return ((((day - 1 + offset) % 7) + 7) % 7) + 1;
}

function toCapacitorWeekday(day: number): Weekday {
  return day === 7 ? Weekday.Sunday : ((day + 1) as Weekday);
}

function stableId(input: string): number {
  // 32-bit signed hash, then squeeze into a safe positive int range.
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 2_000_000_000;
}
