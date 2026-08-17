import { SLOT_DEFAULT_TIME, type PlanPayload, type TimeSlot } from "@/lib/plan-normalize";

export type ScheduleSnapshotRow = {
  id: string;
  name: string;
  times_of_day: string[];
};

export type ScheduleChange = {
  id: string;
  name: string;
  from: string[];
  to: string[];
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Pull a usable "HH:MM" out of a block's clock hint, else the slot default. */
export function blockTime(block: { time_of_day: string; clock_hint?: string }): string {
  const hint = String(block.clock_hint ?? "").trim();
  if (HHMM.test(hint)) return hint;
  const loose = hint.match(/\b(\d{1,2}):(\d{2})\b/);
  if (loose) {
    const h = Math.min(23, Number(loose[1]));
    return `${String(h).padStart(2, "0")}:${loose[2]}`;
  }
  return SLOT_DEFAULT_TIME[block.time_of_day as TimeSlot] ?? "08:00";
}

/**
 * Map user_compound_id -> the times the plan wants it taken at.
 * A compound placed in two blocks gets both times.
 */
export function buildPlanTimeMap(plan: PlanPayload | null): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!plan || !Array.isArray(plan.blocks)) return map;
  for (const block of plan.blocks) {
    const time = blockTime(block);
    for (const item of block.items ?? []) {
      const id = item.user_compound_id;
      if (!id) continue;
      const times = map.get(id) ?? [];
      if (!times.includes(time)) times.push(time);
      map.set(id, times);
    }
  }
  for (const [id, times] of map) map.set(id, [...times].sort());
  return map;
}

function sameTimes(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

/**
 * What would change if we applied the plan.
 * Compounds the plan didn't place are left untouched — no entry is returned
 * for them, so applying can never blank out a schedule the plan ignored.
 */
export function diffSchedule(
  current: ScheduleSnapshotRow[],
  target: Map<string, string[]>,
): ScheduleChange[] {
  const changes: ScheduleChange[] = [];
  for (const row of current) {
    const to = target.get(row.id);
    if (!to || to.length === 0) continue;
    const from = Array.isArray(row.times_of_day) ? row.times_of_day : [];
    if (sameTimes(from, to)) continue;
    changes.push({ id: row.id, name: row.name, from, to });
  }
  return changes;
}
