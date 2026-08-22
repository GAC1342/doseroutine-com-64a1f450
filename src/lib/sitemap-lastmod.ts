/**
 * `lastmod` / date hygiene for anything crawlers read.
 *
 * Google ignores a sitemap's `lastmod` values entirely once it decides they
 * are untrustworthy, and a date in the future is the classic trigger. Our
 * editorial calendar stamps upcoming articles with their scheduled slot, so
 * live pages were advertising publish dates days ahead of "now" — both in the
 * sitemap and in Article structured data.
 *
 * These helpers clamp any timestamp to the present and drop unparseable ones,
 * so we only ever publish dates a crawler will believe.
 */

/** Parse an ISO date, returning null when it isn't a real timestamp. */
function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A crawler-safe ISO timestamp: never in the future, never invalid.
 * Returns null when there is no usable date — callers then omit `lastmod`
 * rather than inventing a build-time value.
 */
export function safeTimestamp(
  value: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const date = parseIso(value);
  if (!date) return null;
  // Only rewrite when we must: date-only values like "2026-08-13" are valid
  // lastmod and should survive verbatim.
  if (date.getTime() <= now.getTime()) return value as string;
  return now.toISOString();
}

/** True when a timestamp is ahead of `now` (and therefore must be clamped). */
export function isFutureTimestamp(
  value: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const date = parseIso(value);
  return date != null && date.getTime() > now.getTime();
}
