/**
 * Strict decimal input handling for dose fields.
 *
 * Goal: whatever the user types is what gets saved. No silent increments from
 * scroll wheels or arrow keys, no locale/exponent surprises, no floating point
 * dust turning 900 into 899.999999.
 */

export type DoseParseResult = { ok: true; value: number } | { ok: false; error: string };

/** Max decimals we persist. Beyond this is noise for any real dosing. */
export const DOSE_MAX_DECIMALS = 6;
/** Guard rail against typos like 900000000 mg. */
export const DOSE_MAX_VALUE = 1_000_000;

/**
 * Keystroke-level sanitiser for a controlled text field.
 * Keeps only digits and a single decimal separator, normalises "," to ".",
 * and clamps the number of decimals. Never reformats what the user is still
 * typing (a trailing "." or leading "." is preserved).
 */
export function sanitizeDecimalInput(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    // Drop any dots after the first one.
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
    const [intPart, decPart = ""] = s.split(".");
    s = intPart + "." + decPart.slice(0, DOSE_MAX_DECIMALS);
  }
  // Strip redundant leading zeros ("007" -> "7") but keep "0" and "0.x".
  s = s.replace(/^0+(?=\d)/, "");
  return s;
}

/**
 * Parse a dose string exactly. Returns a helpful error instead of NaN or 0 so
 * a mistyped field can never be silently persisted as a different number.
 */
export function parseDoseInput(raw: string | number | null | undefined): DoseParseResult {
  if (raw == null) return { ok: false, error: "Enter a dose amount." };
  const s = String(raw).trim().replace(/,/g, ".");
  if (!s) return { ok: false, error: "Enter a dose amount." };
  if (!/^\d*\.?\d*$/.test(s) || s === ".") {
    return { ok: false, error: "Dose must be a plain number, e.g. 900 or 2.5." };
  }
  const value = Number(s);
  if (!Number.isFinite(value)) {
    return { ok: false, error: "Dose must be a plain number, e.g. 900 or 2.5." };
  }
  if (value <= 0) return { ok: false, error: "Dose must be greater than zero." };
  if (value > DOSE_MAX_VALUE) {
    return { ok: false, error: `Dose looks too large — max ${DOSE_MAX_VALUE.toLocaleString()}.` };
  }
  const decimals = s.includes(".") ? s.split(".")[1].length : 0;
  if (decimals > DOSE_MAX_DECIMALS) {
    return { ok: false, error: `Use at most ${DOSE_MAX_DECIMALS} decimal places.` };
  }
  // Round-trip through the decimal string so the saved number matches exactly
  // what was typed (900 -> 900, not 899.9999999999999).
  return { ok: true, value: Number(value.toFixed(DOSE_MAX_DECIMALS)) };
}

/** Convenience for display: strips trailing zeros from a stored dose. */
export function formatDose(value: number): string {
  return Number(value.toFixed(DOSE_MAX_DECIMALS)).toString();
}
