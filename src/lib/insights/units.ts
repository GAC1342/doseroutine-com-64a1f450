/**
 * Unit formatting + conversion for Insights.
 *
 * Every chart, headline, stat and table row goes through one of these
 * formatters so the same value always renders the same way, in the unit
 * system stored on the user's profile (`profiles.unit_pref`).
 */
import { round } from "@/lib/insights/aggregate";

export type UnitSystem = "metric" | "imperial";

export const KG_PER_LB = 0.45359237;

/** Convert a stored kilogram value into the user's display unit. */
export function kgToDisplay(kg: number, system: UnitSystem): number {
  return system === "imperial" ? kg / KG_PER_LB : kg;
}

/** Convert a display-unit weight back into kilograms for storage. */
export function displayToKg(value: number, system: UnitSystem): number {
  return system === "imperial" ? value * KG_PER_LB : value;
}

export function weightUnitLabel(system: UnitSystem): string {
  return system === "imperial" ? "lb" : "kg";
}

export interface InsightUnitsSource {
  units: UnitSystem;
  weightLabel?: string;
  currency?: string;
}

export interface InsightUnits {
  system: UnitSystem;
  weightUnit: string;
  currency: string;
  /** Weight already converted to the display unit, e.g. "184.2 lb". */
  weight: (value: number | null | undefined, opts?: { withUnit?: boolean }) => string;
  /** Percentages: adherence, body fat. */
  percent: (value: number | null | undefined, digits?: number) => string;
  /** Short duration for axes/tooltips, e.g. "45 min". */
  minutes: (value: number | null | undefined) => string;
  /** Long duration for headlines/totals, e.g. "20h 40m". */
  duration: (value: number | null | undefined) => string;
  /** Whole counts, e.g. "1,240" or "12 doses". */
  count: (value: number | null | undefined, noun?: string) => string;
  /** Currency in the user's vial currency, e.g. "$412". */
  money: (value: number | null | undefined) => string;
  /** Currency per month, e.g. "$412/mo". */
  moneyPerMonth: (value: number | null | undefined) => string;
}

const DASH = "—";

function currencyFormatter(currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
  } catch {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  }
}

/** Build the formatter set for one insights payload. */
export function insightUnits(source: InsightUnitsSource): InsightUnits {
  const system: UnitSystem = source.units === "imperial" ? "imperial" : "metric";
  const weightUnit = source.weightLabel || weightUnitLabel(system);
  const currency = source.currency || "USD";
  const money = currencyFormatter(currency);

  return {
    system,
    weightUnit,
    currency,
    weight: (value, opts) =>
      value == null || !Number.isFinite(value)
        ? DASH
        : `${round(value, 1).toLocaleString()}${opts?.withUnit === false ? "" : ` ${weightUnit}`}`,
    percent: (value, digits = 0) =>
      value == null || !Number.isFinite(value) ? DASH : `${round(value, digits).toLocaleString()}%`,
    minutes: (value) =>
      value == null || !Number.isFinite(value) ? DASH : `${Math.round(value).toLocaleString()} min`,
    duration: (value) => {
      if (value == null || !Number.isFinite(value)) return DASH;
      const mins = Math.round(value);
      if (mins < 120) return `${mins.toLocaleString()} min`;
      const hours = Math.floor(mins / 60);
      const rest = mins % 60;
      return rest === 0 ? `${hours.toLocaleString()}h` : `${hours.toLocaleString()}h ${rest}m`;
    },
    count: (value, noun) => {
      if (value == null || !Number.isFinite(value)) return DASH;
      const n = Math.round(value);
      return noun
        ? `${n.toLocaleString()} ${noun}${Math.abs(n) === 1 ? "" : "s"}`
        : n.toLocaleString();
    },
    money: (value) => (value == null || !Number.isFinite(value) ? DASH : money.format(value)),
    moneyPerMonth: (value) =>
      value == null || !Number.isFinite(value) ? DASH : `${money.format(value)}/mo`,
  };
}
