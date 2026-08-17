/**
 * Consistency invariants for schedule_events.
 *
 * The invariant this guards:
 *   For a given (user_compound_id, local day, HH:mm slot), a dose must
 *   have exactly one live status. It cannot be simultaneously "pending"
 *   (still scheduled to be taken) AND "missed" (already timed out) on
 *   the same local day. If it appears both ways, the schedule generator
 *   or the missed-doses cron has created a duplicate row and the UI
 *   will double-count (banner says "missed" while the day list still
 *   offers a Mark taken button — the exact bug reported earlier).
 *
 * These helpers are pure and side-effect-free so they can run in tests,
 * in a dev-mode assertion inside data-fetch paths, or as a scheduled
 * health check.
 */
import { formatInTimeZone } from "date-fns-tz";

export type ConsistencyEvent = {
  id: string;
  user_compound_id: string | null;
  scheduled_at: string;
  status: "pending" | "taken" | "skipped" | "missed" | (string & {});
};

export type ConsistencyViolation = {
  key: string; // "{user_compound_id}|{local_day}|{HH:mm}"
  user_compound_id: string | null;
  local_day: string;
  slot: string;
  statuses: string[];
  event_ids: string[];
  kind: "pending_and_missed" | "duplicate_terminal" | "multiple_rows";
};

function slotOf(iso: string, zone: string): string {
  return formatInTimeZone(iso, zone, "HH:mm");
}

/**
 * Find every group of schedule_events that shares the same
 * (user_compound_id, local day, HH:mm slot) and has an inconsistent
 * status combination. Returns an empty array when the invariant holds.
 *
 * `kind` breakdown:
 *   - "pending_and_missed": the reported bug — same slot present as both
 *     pending and missed. The UI cannot decide which to render, and the
 *     user sees contradictory affordances.
 *   - "duplicate_terminal": the same slot has more than one taken/skipped
 *     row, which double-counts adherence.
 *   - "multiple_rows": any other multi-row group at the same slot; safe
 *     but still indicates the generator wrote a duplicate.
 */
export function findDayConsistencyViolations(
  events: readonly ConsistencyEvent[],
  zone: string,
): ConsistencyViolation[] {
  const groups = new Map<string, ConsistencyEvent[]>();
  for (const e of events) {
    if (!e.user_compound_id) continue; // ad-hoc rows have no slot identity
    const day = formatInTimeZone(e.scheduled_at, zone, "yyyy-MM-dd");
    const slot = slotOf(e.scheduled_at, zone);
    const key = `${e.user_compound_id}|${day}|${slot}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(e);
    groups.set(key, bucket);
  }

  const out: ConsistencyViolation[] = [];
  for (const [key, bucket] of groups) {
    if (bucket.length < 2) continue;
    const statuses = bucket.map((b) => b.status);
    const hasPending = statuses.includes("pending");
    const hasMissed = statuses.includes("missed");
    const terminalCount = statuses.filter((s) => s === "taken" || s === "skipped").length;

    let kind: ConsistencyViolation["kind"];
    if (hasPending && hasMissed) kind = "pending_and_missed";
    else if (terminalCount > 1) kind = "duplicate_terminal";
    else kind = "multiple_rows";

    const [uc, day, slot] = key.split("|");
    out.push({
      key,
      user_compound_id: uc || null,
      local_day: day,
      slot,
      statuses,
      event_ids: bucket.map((b) => b.id),
      kind,
    });
  }
  return out;
}

/**
 * Throwing wrapper for tests. Empty result → no throw.
 */
export function assertDayConsistency(events: readonly ConsistencyEvent[], zone: string): void {
  const violations = findDayConsistencyViolations(events, zone);
  if (violations.length === 0) return;
  const summary = violations
    .map((v) => `  [${v.kind}] ${v.key} → ${v.statuses.join(", ")} (${v.event_ids.length} rows)`)
    .join("\n");
  throw new Error(`schedule_events consistency violation in ${zone}:\n${summary}`);
}
