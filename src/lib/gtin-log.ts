/**
 * Structured logging for GTIN-14 barcode normalization.
 *
 * Sources disagree about leading zeros (UPC-A vs EAN-13 vs zero-stripped), so
 * we pad every barcode to GTIN-14 before comparing. When that padding/stripping
 * actually *changes* the string, we record a structured event so barcode
 * mismatches can be traced back to the normalization step rather than guessed at.
 *
 * Pure and dependency-free: events go into a bounded in-memory ring buffer and,
 * optionally, to a sink you register (console, analytics, etc.).
 */

export type GtinNormalizationEvent = {
  /** Stable machine key — safe to assert on in tests. */
  event: "gtin.normalized";
  /** Where the barcode came from, e.g. "food-dedupe.incoming". */
  source: string;
  /** Original value exactly as supplied (stringified, may contain separators). */
  raw: string;
  /** Digits-only form before padding. */
  digits: string;
  /** Final GTIN-14 (or >=14 digit) value used for comparison. */
  normalized: string;
  /** Why the value changed. */
  reason:
    | "padded"
    | "stripped-non-digits"
    | "stripped-non-digits+padded"
    | "leading-zeros-collapsed"
    | "empty";
  /** Count of zeros added on the left (0 when none). */
  paddedZeros: number;
  /** Epoch millis, for ordering. */
  at: number;
};

export type GtinLogSink = (event: GtinNormalizationEvent) => void;

const MAX_EVENTS = 200;
const buffer: GtinNormalizationEvent[] = [];
let sink: GtinLogSink | null = null;

/** Register a sink (console, analytics). Pass null to remove. */
export function setGtinLogSink(next: GtinLogSink | null): void {
  sink = next;
}

/** Recent normalization events, oldest first. */
export function getGtinLog(): readonly GtinNormalizationEvent[] {
  return buffer.slice();
}

/** Drop all recorded events — call between tests. */
export function clearGtinLog(): void {
  buffer.length = 0;
}

function record(event: GtinNormalizationEvent): void {
  buffer.push(event);
  if (buffer.length > MAX_EVENTS) buffer.splice(0, buffer.length - MAX_EVENTS);
  try {
    sink?.(event);
  } catch {
    // A broken sink must never break food matching.
  }
}

export type GtinNormalization = {
  /** GTIN-14 value, or "" when there were no usable digits. */
  value: string;
  /** True when the normalized value differs from the raw input. */
  changed: boolean;
  event: GtinNormalizationEvent | null;
};

/**
 * Normalize a barcode to GTIN-14 and log when the value changes.
 *
 * @param value raw barcode from any source
 * @param source label recorded on the event, e.g. "food-dedupe.incoming"
 */
export function normalizeGtin14(
  value: string | null | undefined,
  source = "unknown",
): GtinNormalization {
  const raw = String(value ?? "");
  const digitsOnly = raw.replace(/\D/g, "");
  const trimmed = digitsOnly.replace(/^0+/, "");
  const normalized = !trimmed ? "" : trimmed.length >= 14 ? trimmed : trimmed.padStart(14, "0");

  if (normalized === raw) return { value: normalized, changed: false, event: null };

  const strippedNonDigits = digitsOnly !== raw;
  const paddedZeros = normalized ? Math.max(0, normalized.length - trimmed.length) : 0;

  let reason: GtinNormalizationEvent["reason"];
  if (!normalized) reason = "empty";
  else if (strippedNonDigits && paddedZeros > 0) reason = "stripped-non-digits+padded";
  else if (strippedNonDigits) reason = "stripped-non-digits";
  else if (paddedZeros > 0) reason = "padded";
  else reason = "leading-zeros-collapsed";

  const event: GtinNormalizationEvent = {
    event: "gtin.normalized",
    source,
    raw,
    digits: digitsOnly,
    normalized,
    reason,
    paddedZeros,
    at: Date.now(),
  };
  record(event);
  return { value: normalized, changed: true, event };
}
