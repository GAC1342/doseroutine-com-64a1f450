/**
 * Lightweight usage signals for the calendar day panel.
 *
 * We want to know which of the three day tabs (Stack / Training / Meals) and
 * which day-edit actions people actually reach for, so future UX work targets
 * the busy surfaces instead of guesses. Everything routes through the existing
 * anonymous analytics pipeline — no extra table, no personal data, just the
 * tab name and the action name.
 */

import { trackEvent } from "@/lib/analytics";

export type CalendarTab = "stack" | "workouts" | "food";

/** Day-edit interactions worth counting; keep the vocabulary small and stable. */
export type CalendarDayAction =
  | "edit_open"
  | "edit_save"
  | "edit_cancel"
  | "dose_status"
  | "add_meal"
  | "add_workout"
  | "edit_workout_occurrence";

/** Same tab clicked twice in a row shouldn't inflate the counts. */
let lastTab: CalendarTab | null = null;

export function trackCalendarTab(tab: CalendarTab): void {
  if (lastTab === tab) return;
  lastTab = tab;
  trackEvent("calendar_tab_open", { tab });
}

export function trackCalendarDayAction(action: CalendarDayAction, tab?: CalendarTab): void {
  trackEvent("calendar_day_action", { action, tab: tab ?? lastTab ?? "stack" });
}

/** Test seam — resets the dedupe memory. */
export function resetCalendarUsageForTests(): void {
  lastTab = null;
}
