/**
 * Duplicate-URL canonicalisation for query parameters.
 *
 * Google crawled thousands of `?lang=xx` copies of every page. The server
 * renders English HTML for every URL, so those copies are duplicates, not
 * translations — the correct signal is a 301 to the clean path plus a
 * self-referencing canonical and a self-referencing hreflang cluster
 * (`en` + `x-default`) on the destination. See `src/lib/hreflang.ts`.
 *
 * The UI language switcher writes `?n=xx` client-side, and campaign links add
 * tracking parameters; both produce the same class of duplicate, so they are
 * collapsed by the same rule.
 *
 * Pure functions only — unit-tested and used by the edge handler in
 * `src/server.ts`.
 */

/** Exact parameter names that never change the rendered document. */
export const DUPLICATE_PARAMS: readonly string[] = [
  "lang", // legacy locale switcher
  "n", // current client-side locale switcher
  "fbclid",
  "gclid",
  "msclkid",
  "yclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
];

/** Prefixes that never change the rendered document (utm_source, utm_medium, …). */
export const DUPLICATE_PARAM_PREFIXES: readonly string[] = ["utm_"];

export function isDuplicateParam(name: string): boolean {
  const key = name.toLowerCase();
  if (DUPLICATE_PARAMS.includes(key)) return true;
  return DUPLICATE_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * Remove every duplicate-producing parameter from `url` in place.
 * Returns true when anything was removed (i.e. a 301 is required).
 */
export function stripDuplicateParams(url: URL): boolean {
  const doomed = [...url.searchParams.keys()].filter(isDuplicateParam);
  for (const key of doomed) url.searchParams.delete(key);
  return doomed.length > 0;
}

/** The canonical URL string for any incoming URL (no duplicate parameters). */
export function canonicalUrl(input: string | URL): string {
  const url = new URL(input.toString());
  stripDuplicateParams(url);
  return url.toString();
}
