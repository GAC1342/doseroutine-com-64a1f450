/**
 * Cache-busting helper for files served from /public.
 *
 * Vite hashes every bundled JS/CSS/asset it processes, but files under
 * /public are served verbatim — so an old icon, manifest, splash screen,
 * or service worker can linger in a browser cache for weeks. Appending a
 * per-deploy `?v=<BUILD_ID>` query string forces revalidation on every
 * new deploy while keeping the URL stable within a single deploy.
 *
 * `__BUILD_ID__` is injected by Vite (`define`) at build time.
 */
declare const __BUILD_ID__: string;

export const BUILD_ID: string =
  typeof __BUILD_ID__ === "string" && __BUILD_ID__ ? __BUILD_ID__ : "dev";

export function assetUrl(path: string): string {
  if (!path) return path;
  // Leave absolute/external URLs alone.
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${BUILD_ID}`;
}
