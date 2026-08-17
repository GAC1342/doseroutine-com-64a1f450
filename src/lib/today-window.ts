import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Compute the [start, end] UTC instants covering the local calendar day
 *  that contains `now` in the given IANA timezone. Mirrors the query window
 *  used by the Today page so tests can assert both stay in sync. */
export function localDayWindow(now: Date, tz: string): { start: Date; end: Date; iso: string } {
  const iso = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const start = fromZonedTime(`${iso}T00:00:00`, tz);
  const end = fromZonedTime(`${iso}T23:59:59.999`, tz);
  return { start, end, iso };
}

/** Compute the [start, end] UTC instants covering a rolling `days`-day history
 *  window: local midnight `days - 1` calendar days ago through `now`.
 *
 *  Every screen that reads adherence history (Today, Timeline,
 *  fetchAdherenceEvents) MUST use this so they can never disagree about which
 *  rows are in scope. The start is anchored to a real local midnight in `tz` —
 *  not raw `Date.now() - days * 86_400_000` — so partial days never leak in and
 *  the boundary survives DST transitions. The end is `now` (not end-of-day) so
 *  doses that are scheduled later today are not counted as already scored.
 *
 *  `days` counts calendar days inclusive of today: days=7 spans today plus the
 *  6 days before it.
 */
export function historyWindow(now: Date, tz: string, days: number): { start: Date; end: Date } {
  // Step back (days - 1) calendar days from today's local date, then take that
  // day's local midnight. Going through the local ISO date (rather than
  // subtracting ms from the start instant) keeps the boundary on a real local
  // midnight even when a DST shift makes a day 23 or 25 hours long.
  const startIso = formatInTimeZone(
    new Date(now.getTime() - (days - 1) * 86_400_000),
    tz,
    "yyyy-MM-dd",
  );
  const start = fromZonedTime(`${startIso}T00:00:00`, tz);
  return { start, end: new Date(now.getTime()) };
}

/** Filter scheduled events to only those whose scheduled_at falls inside
 *  the local calendar day for `now` in `tz`. Inclusive of both bounds to
 *  match the `.gte`/`.lte` query the page uses. */
export function filterEventsForLocalDay<T extends { scheduled_at: string }>(
  events: T[],
  now: Date,
  tz: string,
): T[] {
  const { start, end } = localDayWindow(now, tz);
  const s = start.getTime();
  const e = end.getTime();
  return events.filter((ev) => {
    const t = new Date(ev.scheduled_at).getTime();
    return t >= s && t <= e;
  });
}
