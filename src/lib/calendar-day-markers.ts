/**
 * Calendar day markers — the little dots under each date.
 *
 * Google Calendar, Apple Calendar and Fitbod all converge on the same pattern:
 * a small number of coloured dots (never more than three) plus a "+n" overflow
 * count, where colour encodes category and fill encodes done-vs-planned. We
 * copy that, because it is the one convention users already read fluently.
 *
 * Before this, a day only got a dot when a workout had been *logged*, so a
 * month full of scheduled sessions looked empty. Now anything on a day —
 * logged workout, recurring scheduled workout, or a meal anchor — lights it up.
 */

export type DayMarkerKind = "logged" | "scheduled" | "meal";

export type DayMarker = {
  /** Category used for colour: workout family, or "meal". */
  family: string;
  kind: DayMarkerKind;
};

export type DayMarkers = {
  /** Up to MAX_DOTS markers to render, most important first. */
  dots: DayMarker[];
  /** How many further items exist beyond the rendered dots. */
  overflow: number;
  /** Total items on the day, across every category. */
  total: number;
  /** Screen-reader sentence, e.g. "2 workouts logged, 1 scheduled, 1 meal". */
  label: string;
};

export const MAX_DOTS = 3;

const EMPTY: DayMarkers = { dots: [], overflow: 0, total: 0, label: "nothing scheduled" };

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Build the dot row for one calendar cell.
 *
 * Ordering is deliberate: completed work first (it is the thing users scan for),
 * then what is still planned, then meals. Overflow beyond three dots collapses
 * into a count so a busy day never wraps or blows out the cell height.
 */
export function buildDayMarkers(input: {
  /** Families of workouts already logged that day, e.g. ["strength"]. */
  loggedFamilies?: readonly string[];
  /** Families of recurring/planned workouts scheduled that day. */
  scheduledFamilies?: readonly string[];
  /** Number of meal anchors scheduled that day. */
  mealCount?: number;
}): DayMarkers {
  const logged = [...(input.loggedFamilies ?? [])];
  const scheduled = [...(input.scheduledFamilies ?? [])];
  const meals = Math.max(0, input.mealCount ?? 0);

  const all: DayMarker[] = [
    ...logged.map((family) => ({ family, kind: "logged" as const })),
    ...scheduled.map((family) => ({ family, kind: "scheduled" as const })),
    ...Array.from({ length: meals }, () => ({ family: "meal", kind: "meal" as const })),
  ];
  if (all.length === 0) return EMPTY;

  const parts: string[] = [];
  if (logged.length > 0) parts.push(`${plural(logged.length, "workout")} logged`);
  if (scheduled.length > 0) parts.push(`${scheduled.length} scheduled`);
  if (meals > 0) parts.push(plural(meals, "meal"));

  return {
    dots: all.slice(0, MAX_DOTS),
    overflow: Math.max(0, all.length - MAX_DOTS),
    total: all.length,
    label: parts.join(", "),
  };
}

/** Does this day have anything at all on it? Drives the "has plans" outline. */
export function hasAnything(markers: DayMarkers): boolean {
  return markers.total > 0;
}

/** Family bucket used for dot colour, normalised from a session kind. */
export function familyForSessionKind(kind: string | null | undefined): string {
  const k = (kind ?? "").toLowerCase();
  if (k.includes("strength") || k.includes("lift") || k.includes("resistance")) return "strength";
  if (k.includes("cardio") || k.includes("run") || k.includes("cycle")) return "cardio";
  if (k.includes("yoga") || k.includes("mobility") || k.includes("stretch")) return "mindbody";
  if (k.includes("sport")) return "sport";
  return k ? "other" : "strength";
}

/**
 * Convenience wrapper for a calendar cell: takes the logged families already
 * derived from workout logs plus the day's routine occurrences and produces
 * the dot row. Occurrences are typed structurally so this module stays free of
 * calendar/data imports and remains trivially unit-testable.
 */
export function markersForCalendarDay(input: {
  loggedFamilies?: readonly string[];
  occurrences?: readonly { kind: string; sessionKind?: string | null }[];
}): DayMarkers {
  const occurrences = input.occurrences ?? [];
  return buildDayMarkers({
    loggedFamilies: input.loggedFamilies,
    scheduledFamilies: occurrences
      .filter((o) => o.kind === "workout")
      .map((o) => familyForSessionKind(o.sessionKind)),
    mealCount: occurrences.filter((o) => o.kind === "meal").length,
  });
}
