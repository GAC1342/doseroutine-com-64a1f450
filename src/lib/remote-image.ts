/**
 * Resized URLs for images we don't host.
 *
 * the CMS's CDN serves originals only — a 1280px, ~300kB file even when it
 * renders in a 96px thumbnail. wsrv.nl is a free, cache-backed image proxy
 * that resizes and re-encodes on the fly, which cuts those thumbnails to a few
 * kB. Local/site-relative images are returned untouched: they're already
 * optimized at build time.
 */

const PROXY = "https://wsrv.nl/";

/** True when the URL points at a host we don't control. */
export function isRemoteImage(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Output formats the proxy can re-encode to.
 *
 * AVIF is deliberately absent: the proxy answers `output=avif` with HTTP 400
 * ("Saving to avif is disabled"). A <source type="image/avif"> pointing at a
 * 400 would break the image rather than fall back, so remote images ship
 * WebP with a JPEG fallback. Locally generated cards under /og do have AVIF.
 */
export const REMOTE_IMAGE_FORMATS = ["webp", "jpg", "png"] as const;
export type RemoteImageFormat = (typeof REMOTE_IMAGE_FORMATS)[number];

/** A resized variant of `url` at `width` CSS px, or the original when local. */
export function resizedImageUrl(
  url: string,
  width: number,
  format: RemoteImageFormat = "webp",
): string {
  if (!isRemoteImage(url)) return url;
  const target = url.replace(/^https?:\/\//i, "");
  return `${PROXY}?url=${encodeURIComponent(target)}&w=${width}&output=${format}&q=80&we`;
}

/** `srcSet` (1x/2x) for one specific output format — used by <picture>. */
export function remoteFormatSrcSet(
  url: string,
  width: number,
  format: RemoteImageFormat,
): string | undefined {
  if (!isRemoteImage(url)) return undefined;
  return `${resizedImageUrl(url, width, format)} 1x, ${resizedImageUrl(url, width * 2, format)} 2x`;
}

/** `srcSet` string with 1x and 2x candidates for a fixed-width slot. */
export function resizedSrcSet(url: string, width: number): string | undefined {
  if (!isRemoteImage(url)) return undefined;
  return `${resizedImageUrl(url, width)} 1x, ${resizedImageUrl(url, width * 2)} 2x`;
}
