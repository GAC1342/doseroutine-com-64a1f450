/**
 * Redaction helpers for server-side logs.
 *
 * Webhook handlers run on shared infrastructure and their stdout is retained.
 * Raw user ids and store/session ids are personal identifiers, so logs keep
 * only enough of the tail to correlate a support ticket with a delivery.
 */

/**
 * Mask an identifier down to a non-reversible tail, e.g.
 * `2f1c9a44-...-9be3` -> `…9be3`. Short or empty values collapse entirely so a
 * truncated id can never be mistaken for a full one.
 */
export function redactId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "<none>";
  if (value.length <= 6) return "<redacted>";
  return `…${value.slice(-4)}`;
}

/** Redact a Stripe-style prefixed id while keeping the object-type prefix. */
export function redactPrefixedId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "<none>";
  const underscore = value.indexOf("_");
  if (underscore <= 0) return redactId(value);
  return `${value.slice(0, underscore)}_${redactId(value.slice(underscore + 1))}`;
}

/** Reduce an unknown thrown value to a safe, message-only string. */
export function redactError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "unknown error";
}
