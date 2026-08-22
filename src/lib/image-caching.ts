/**
 * Cache rules for optimized image responses.
 *
 * A resized image is only cheap if the browser reuses it. That needs two
 * things from the response: a long-lived, public Cache-Control, and a
 * validator (ETag or Last-Modified) that stays identical across requests so a
 * revalidation returns 304 instead of the bytes again.
 *
 * Pure so the integration test (src/lib/__tests__/image-caching.integration.test.ts)
 * and any future runtime check share one definition.
 */

export interface ImageCacheHeaders {
  status: number;
  cacheControl: string | null;
  etag: string | null;
  lastModified: string | null;
  contentType: string | null;
}

/** Minimum max-age we accept for an immutable, content-addressed image. */
export const MIN_IMAGE_MAX_AGE_SECONDS = 3600;

export function parseMaxAge(cacheControl: string | null): number | null {
  if (!cacheControl) return null;
  const match = /(?:^|,)\s*(?:s-)?max-age\s*=\s*(\d+)/i.exec(cacheControl);
  return match ? Number(match[1]) : null;
}

export function isNoStore(cacheControl: string | null): boolean {
  return /(^|,)\s*no-store\b/i.test(cacheControl ?? "");
}

/** Normalizes `W/"abc"` and `"abc"` to the same comparable value. */
export function normalizeEtag(etag: string | null): string | null {
  if (!etag) return null;
  return etag.trim().replace(/^W\//, "").replace(/^"|"$/g, "");
}

export interface CacheAuditOptions {
  minMaxAge?: number;
  /**
   * Accept a response with no max-age at all. Only for dev servers, which
   * disable caching on purpose; never for production origins.
   */
  allowNoMaxAge?: boolean;
  /** Set false for responses that legitimately have no ETag (e.g. a CDN that
   * only sends Last-Modified). A validator of some kind is still required. */
  requireEtag?: boolean;
}

/** Returns human-readable problems with a single image response's caching. */
export function auditImageCacheHeaders(
  headers: ImageCacheHeaders,
  options: CacheAuditOptions = {},
): string[] {
  const minMaxAge = options.minMaxAge ?? MIN_IMAGE_MAX_AGE_SECONDS;
  const requireEtag = options.requireEtag ?? false;
  const problems: string[] = [];

  if (headers.status !== 200) {
    problems.push(`expected HTTP 200, got ${headers.status}`);
    return problems;
  }
  if (!headers.contentType?.startsWith("image/")) {
    problems.push(`content-type "${headers.contentType ?? "none"}" is not an image type`);
  }
  if (isNoStore(headers.cacheControl)) {
    problems.push("Cache-Control: no-store prevents any browser reuse");
  }

  const maxAge = parseMaxAge(headers.cacheControl);
  if (maxAge === null && options.allowNoMaxAge) {
    // dev server: no freshness lifetime, but the validator checks still apply
  } else if (maxAge === null) {
    problems.push(`Cache-Control "${headers.cacheControl ?? "none"}" declares no max-age`);
  } else if (maxAge < minMaxAge) {
    problems.push(`Cache-Control max-age=${maxAge} is below the ${minMaxAge}s minimum`);
  }

  if (requireEtag && !headers.etag) {
    problems.push("response has no ETag");
  }
  if (!headers.etag && !headers.lastModified) {
    problems.push("response has no ETag and no Last-Modified — revalidation always re-downloads");
  }

  return problems;
}

/** Problems with how a validator behaved across two identical requests. */
export function auditRevalidation(input: {
  firstEtag: string | null;
  secondEtag: string | null;
  firstLastModified: string | null;
  secondLastModified: string | null;
  /** Status of the conditional (If-None-Match / If-Modified-Since) request. */
  conditionalStatus: number | null;
}): string[] {
  const problems: string[] = [];
  const a = normalizeEtag(input.firstEtag);
  const b = normalizeEtag(input.secondEtag);

  if (a && b && a !== b) {
    problems.push(`ETag changed between identical requests (${a} → ${b}) — cache never hits`);
  }
  if (
    !a &&
    input.firstLastModified &&
    input.secondLastModified &&
    input.firstLastModified !== input.secondLastModified
  ) {
    problems.push("Last-Modified changed between identical requests");
  }
  if (input.conditionalStatus !== null && input.conditionalStatus !== 304) {
    problems.push(
      `conditional request returned ${input.conditionalStatus}, expected 304 Not Modified`,
    );
  }
  return problems;
}
