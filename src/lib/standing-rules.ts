/**
 * Standing skip rules.
 *
 * A standing rule is a recurring policy — "always skip Sundays", "no creatine
 * on rest days" — that removes doses from the schedule automatically, so the
 * user never has to touch those days by hand.
 *
 * Semantics, deliberately matched to vacation mode:
 *   - A skipped day generates NO events for the affected compound(s). Nothing
 *     to miss means nothing that can damage the adherence score.
 *   - A rule with `user_compound_id = null` applies to the whole stack.
 *   - Weekdays are ISO numbers, 1 = Monday … 7 = Sunday (same convention as
 *     `user_compounds.days_of_week`, so the two can never disagree).
 *   - Disabled rules are inert but kept, so a user can toggle a policy off for
 *     a while without losing it.
 */

export type StandingRule = {
  id: string;
  user_compound_id: string | null;
  days_of_week: number[] | null;
  enabled: boolean;
  note: string | null;
};

export const WEEKDAYS: { dow: number; short: string; long: string }[] = [
  { dow: 1, short: "Mon", long: "Monday" },
  { dow: 2, short: "Tue", long: "Tuesday" },
  { dow: 3, short: "Wed", long: "Wednesday" },
  { dow: 4, short: "Thu", long: "Thursday" },
  { dow: 5, short: "Fri", long: "Friday" },
  { dow: 6, short: "Sat", long: "Saturday" },
  { dow: 7, short: "Sun", long: "Sunday" },
];

/** Keeps only rules that can actually fire: enabled, with valid weekdays. */
export function activeRules(rules: StandingRule[] | null | undefined): StandingRule[] {
  if (!rules) return [];
  return rules.filter(
    (r) =>
      r.enabled && Array.isArray(r.days_of_week) && r.days_of_week.some((d) => d >= 1 && d <= 7),
  );
}

/**
 * True when a standing rule removes this compound's doses on this weekday.
 * A global rule (no compound) wins over everything on that weekday.
 */
export function isSkippedByRules(
  dow: number,
  userCompoundId: string,
  rules: StandingRule[] | null | undefined,
): boolean {
  for (const r of activeRules(rules)) {
    if (r.user_compound_id !== null && r.user_compound_id !== userCompoundId) continue;
    if ((r.days_of_week ?? []).includes(dow)) return true;
  }
  return false;
}

/** True when every compound in the stack is skipped on this weekday. */
export function isWholeDaySkipped(dow: number, rules: StandingRule[] | null | undefined): boolean {
  return activeRules(rules).some(
    (r) => r.user_compound_id === null && (r.days_of_week ?? []).includes(dow),
  );
}

/** The rules that fire on a given weekday, for explaining "why is today empty?". */
export function rulesForDay(dow: number, rules: StandingRule[] | null | undefined): StandingRule[] {
  return activeRules(rules).filter((r) => (r.days_of_week ?? []).includes(dow));
}

/** "Sundays" · "Sat & Sun" · "Mon, Wed & Fri" · "Every day". */
export function formatWeekdays(days: number[] | null | undefined): string {
  const set = [...new Set((days ?? []).filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b);
  if (!set.length) return "No days";
  if (set.length === 7) return "Every day";
  if (set.length === 1) {
    return `${WEEKDAYS[set[0] - 1].long}s`;
  }
  if (set.length === 2 && set[0] === 6 && set[1] === 7) return "Weekends";
  if (set.length === 5 && set.every((d) => d <= 5)) return "Weekdays";
  const names = set.map((d) => WEEKDAYS[d - 1].short);
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** Plain-English summary of one rule, e.g. "Skip Sundays · whole stack". */
export function describeRule(rule: StandingRule, compoundName?: string | null): string {
  const scope = rule.user_compound_id ? compoundName || "one compound" : "whole stack";
  return `Skip ${formatWeekdays(rule.days_of_week)} · ${scope}`;
}
