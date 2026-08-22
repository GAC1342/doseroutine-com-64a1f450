/**
 * Cache-busting stamp for exercise illustrations.
 *
 * Illustrations are served from the CDN with long-lived immutable caching, so
 * a browser (or the iOS WebView) that already holds an old copy of a drawing
 * keeps painting it until its cache expires. Bumping this stamp appends a new
 * `?v=` to every illustration URL, which the CDN treats as a distinct cache
 * key — the new artwork appears on the next normal page load, with no hard
 * refresh and no re-upload.
 *
 * BUMP THIS whenever an existing illustration is redrawn or replaced.
 * (Adding a brand-new drawing does not need a bump: new uploads get a fresh
 * asset id, so their URL is unique already.)
 */
export const EXERCISE_ART_VERSION = "2026-08-21";

/** Append the art version to an illustration URL, preserving any query it has. */
export function versionedArtUrl(url: string, version = EXERCISE_ART_VERSION): string {
  if (!url) return url;
  // data:/blob: URLs carry their own bytes — a query would corrupt them.
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const [base, hash = ""] = url.split("#");
  const separator = base.includes("?") ? "&" : "?";
  const suffix = hash ? `#${hash}` : "";
  return `${base}${separator}v=${encodeURIComponent(version)}${suffix}`;
}
