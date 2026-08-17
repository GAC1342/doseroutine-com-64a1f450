/**
 * Capsule / soft-gel quick-set math.
 *
 * Users often know their product as "900 mg soft gels, 2 per day" rather than a
 * total daily amount. This converts capsule strength × count into a total dose
 * without floating point noise (e.g. 3 × 0.1 = 0.30000000000000004).
 */

export type CapsuleDoseInput = {
  /** Amount of the active ingredient in ONE capsule / soft gel. */
  strengthPerCapsule: number | string;
  /** How many capsules / soft gels are taken. */
  count: number | string;
};

export function parseNumber(value: number | string): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Round away binary floating point dust while keeping real precision. */
export function roundDose(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Returns the total dose, or null when either input is missing/invalid/negative.
 * Zero count is valid input but yields 0, which callers treat as "nothing to set".
 */
export function computeCapsuleDose({ strengthPerCapsule, count }: CapsuleDoseInput): number | null {
  const strength = parseNumber(strengthPerCapsule);
  const qty = parseNumber(count);
  if (strength == null || qty == null) return null;
  if (strength <= 0 || qty < 0) return null;
  return roundDose(strength * qty);
}

/** Human summary shown under the control, e.g. "2 × 900 mg = 1800 mg". */
export function formatCapsuleSummary(
  input: CapsuleDoseInput,
  unit: string,
  noun = "soft gel",
): string | null {
  const total = computeCapsuleDose(input);
  if (total == null) return null;
  const strength = parseNumber(input.strengthPerCapsule)!;
  const qty = parseNumber(input.count)!;
  const plural = qty === 1 ? noun : `${noun}s`;
  return `${formatNum(qty)} ${plural} × ${formatNum(strength)} ${unit} = ${formatNum(total)} ${unit}`;
}

function formatNum(n: number): string {
  return Number(roundDose(n).toFixed(6)).toString();
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Hard limits — anything beyond these is almost certainly a typo. */
export const MAX_STRENGTH_PER_CAPSULE = 100_000;
export const MAX_CAPSULE_COUNT = 60;
export const MAX_TOTAL_DOSE = 1_000_000;
/** Above this the entry is legal but unusual, so we warn without blocking. */
export const UNUSUAL_CAPSULE_COUNT = 12;
/** Counts finer than quarters/halves are treated as typos. */
export const MAX_COUNT_DECIMALS = 2;

export type CapsuleValidation = {
  ok: boolean;
  total: number | null;
  /** Blocking problem, shown in red. */
  error?: string;
  /** Which field the error belongs to. */
  field?: "strength" | "count";
  /** Non-blocking heads-up, shown in amber. */
  warning?: string;
  /** True when the user hasn't typed anything yet (neutral state). */
  empty?: boolean;
};

function decimalPlaces(value: number): number {
  const s = Number(roundDose(value).toFixed(6)).toString();
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

/**
 * Full validation for the capsule quick-set control: blocks zero, negative and
 * unreasonable entries so a corrupted daily dose can never be applied.
 */
export function validateCapsuleInput(
  { strengthPerCapsule, count }: CapsuleDoseInput,
  unit = "",
  noun = "soft gel",
): CapsuleValidation {
  const rawStrength = typeof strengthPerCapsule === "string" ? strengthPerCapsule.trim() : "";
  const rawCount = typeof count === "string" ? count.trim() : "";
  const strengthBlank = typeof strengthPerCapsule === "string" && rawStrength === "";
  const countBlank = typeof count === "string" && rawCount === "";
  const u = unit ? ` ${unit}` : "";

  if (strengthBlank || countBlank) {
    return { ok: false, total: null, empty: true };
  }

  const strength = parseNumber(strengthPerCapsule);
  if (strength == null) {
    return {
      ok: false,
      total: null,
      field: "strength",
      error: "Enter a number for the amount per " + noun + ".",
    };
  }
  if (strength <= 0) {
    return {
      ok: false,
      total: null,
      field: "strength",
      error: `Amount per ${noun} must be more than 0${u}.`,
    };
  }
  if (strength > MAX_STRENGTH_PER_CAPSULE) {
    return {
      ok: false,
      total: null,
      field: "strength",
      error: `That's over ${formatNum(MAX_STRENGTH_PER_CAPSULE)}${u} per ${noun} — check the number.`,
    };
  }

  const qty = parseNumber(count);
  if (qty == null) {
    return {
      ok: false,
      total: null,
      field: "count",
      error: "Enter a number for how many you take.",
    };
  }
  if (qty <= 0) {
    return {
      ok: false,
      total: null,
      field: "count",
      error: "Enter how many you take (more than 0).",
    };
  }
  if (qty > MAX_CAPSULE_COUNT) {
    return {
      ok: false,
      total: null,
      field: "count",
      error: `That's over ${MAX_CAPSULE_COUNT} a day — check the number.`,
    };
  }
  if (decimalPlaces(qty) > MAX_COUNT_DECIMALS) {
    return {
      ok: false,
      total: null,
      field: "count",
      error: "Use whole capsules or simple fractions like 0.5.",
    };
  }

  const total = roundDose(strength * qty);
  if (!Number.isFinite(total) || total <= 0) {
    return {
      ok: false,
      total: null,
      field: "strength",
      error: "That total doesn't look right — check both numbers.",
    };
  }
  if (total > MAX_TOTAL_DOSE) {
    return {
      ok: false,
      total: null,
      field: "strength",
      error: `That's a daily total of ${formatNum(total)}${u} — too high to apply.`,
    };
  }

  return {
    ok: true,
    total,
    warning:
      qty > UNUSUAL_CAPSULE_COUNT
        ? `${formatNum(qty)} ${noun}s a day is unusual — double-check before applying.`
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Pasted-label results
// ---------------------------------------------------------------------------

export type ParsedDoseCheck = {
  ok: boolean;
  /** Clamped per-capsule strength actually offered to the user. */
  strength: number;
  /** Clamped capsule count actually offered to the user. */
  count: number;
  /** strength × count after clamping. */
  total: number;
  /** True when clamping changed either number from what was parsed. */
  clamped: boolean;
  /** Blocking problem — "Use this" must stay disabled. */
  error?: string;
  /** Non-blocking heads-up. */
  warning?: string;
};

/** Round a capsule count to the same precision the quick-set control allows. */
export function clampCapsuleCount(count: number): number {
  return Math.round(count * 10 ** MAX_COUNT_DECIMALS) / 10 ** MAX_COUNT_DECIMALS;
}

/**
 * Run an auto-parsed label result through the exact quick-set rules.
 *
 * Label OCR/paste can produce silly numbers (0 capsules, 500 capsules, a
 * strength with 9 decimals). This clamps what is safely clampable — rounding
 * the count to whole/half capsules and the strength to real precision — then
 * validates the clamped pair, so an unreasonable parse is blocked instead of
 * quietly filling the daily dose field.
 */
export function validateParsedLabelDose(
  strengthPerUnit: number,
  countPerServing: number,
  unit = "",
  noun = "soft gel",
): ParsedDoseCheck {
  const rawStrength = Number.isFinite(strengthPerUnit) ? strengthPerUnit : 0;
  const rawCount = Number.isFinite(countPerServing) ? countPerServing : 0;
  const strength = roundDose(rawStrength);
  const count = clampCapsuleCount(rawCount);
  const clamped = strength !== rawStrength || count !== rawCount;

  const check = validateCapsuleInput({ strengthPerCapsule: strength, count }, unit, noun);
  const total = check.total ?? roundDose(strength * count);

  if (!check.ok) {
    return {
      ok: false,
      strength,
      count,
      total,
      clamped,
      error: check.error ?? "That label doesn't give a usable dose — enter the amounts by hand.",
    };
  }

  return { ok: true, strength, count, total, clamped, warning: check.warning };
}
