/**
 * Which meal a scan belongs to.
 *
 * The user shouldn't have to tell us it's breakfast at 8am. We infer the slot
 * from the clock on their own device (so it is always their timezone), and
 * when they have configured meal times in the app we snap to those instead of
 * generic hours — someone whose "dinner" is at 22:00 shouldn't get "snack".
 */
import { slotForHour, type MealSlot } from "@/lib/meal-nutrition";

/** A meal time the user configured, "HH:MM" plus the slot it represents. */
export type ConfiguredMealTime = {
  label: string | null;
  time: string;
};

function minutesOf(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(time ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Map a user's free-text meal label onto one of our slots. */
export function slotFromLabel(label: string | null | undefined): MealSlot | null {
  const text = String(label ?? "").toLowerCase();
  if (!text) return null;
  if (/break|morning|wake/.test(text)) return "breakfast";
  if (/lunch|midday|noon/.test(text)) return "lunch";
  if (/dinner|supper|evening|tea/.test(text)) return "dinner";
  if (/snack|pre|post|shake/.test(text)) return "snack";
  return null;
}

/**
 * Best slot for a moment in time.
 *
 * `mealTimes` are the user's configured times; the nearest one within
 * `windowMin` wins. Everything else falls back to sensible clock hours.
 */
export function inferMealSlot(
  at: Date = new Date(),
  mealTimes: ReadonlyArray<ConfiguredMealTime> = [],
  windowMin = 150,
): MealSlot {
  const nowMin = at.getHours() * 60 + at.getMinutes();

  let best: { slot: MealSlot; distance: number } | null = null;
  for (const entry of mealTimes) {
    const slot = slotFromLabel(entry.label);
    const mins = minutesOf(entry.time);
    if (!slot || mins == null) continue;
    // Wrap across midnight so a 23:30 meal still matches a 00:10 scan.
    const raw = Math.abs(nowMin - mins);
    const distance = Math.min(raw, 1440 - raw);
    if (!best || distance < best.distance) best = { slot, distance };
  }
  if (best && best.distance <= windowMin) return best.slot;

  return slotForHour(at.getHours());
}

/** Short "why" line shown next to the auto-picked slot. */
export function describeSlotChoice(slot: MealSlot, at: Date = new Date()): string {
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Set to ${slot} from your ${time} local time — change it if this was something else.`;
}
