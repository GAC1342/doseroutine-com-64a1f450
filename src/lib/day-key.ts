import { formatInTimeZone } from "date-fns-tz";

/**
 * Returns YYYY-MM-DD for the given instant in the given IANA zone.
 * All day-grouping (Today streak, Timeline cells, adherence heatmap) must go
 * through this so an event that happens at 22:00 America/Edmonton doesn't
 * land in the next UTC day and get misgrouped.
 */
export function dayKeyInZone(iso: string | Date, zone: string): string {
  return formatInTimeZone(iso, zone, "yyyy-MM-dd");
}

export function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** YYYY-MM-DD for "today" in the browser's local zone. Use this in place of
 *  `new Date().toISOString().slice(0, 10)` anywhere the value is user-facing
 *  (date-picker defaults/max, quota reset boundaries, check-in dates). */
export function todayInBrowserZone(): string {
  return dayKeyInZone(new Date(), browserZone());
}
