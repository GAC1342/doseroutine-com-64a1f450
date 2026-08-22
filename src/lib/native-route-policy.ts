/**
 * Native shell route policy (App Store guideline 4.2 / 2.5.x).
 *
 * The same web app powers doseroutine.com and the iOS/Android shell. On the
 * web the marketing + SEO surface is the point; inside the native binary it
 * makes the app look like a repackaged website and exposes internal debug and
 * admin screens through deep links.
 *
 * `nativeRedirectFor()` maps any such path to the real app experience. Legal,
 * privacy, support and help routes stay reachable — Apple requires them.
 */

/** Paths that must never render inside the native shell. */
const BLOCKED_PREFIXES = [
  "/debug",
  "/admin",
  "/promo-kit",
  "/closed-testing",
  "/install",
  "/blog",
  "/articles",
  "/health-tracking-blog",
  "/alternatives",
  "/compare",
  "/vs/",
  "/for/",
  "/goals/",
  "/dose-routine",
  "/lovable",
];

/**
 * Debug paths that stay reachable inside the shell.
 *
 * H4 — empty on purpose. Shipping a reachable debug screen in a review build
 * risks guideline 2.3.1 (hidden/undocumented features). Debug screens are read
 * on the web build instead.
 */
const NATIVE_ALLOWED_PATHS: string[] = [];

/** Marketing landing pages generated for search ("/best-…-app"). */
const BLOCKED_PATTERNS = [/^\/best-[a-z0-9-]+$/i];

/** Where a blocked path lands instead. */
export const NATIVE_HOME = "/today";

/**
 * Returns the path the native shell should navigate to instead, or null when
 * the current path is fine. Always returns null on the web.
 */
export function nativeRedirectFor(pathname: string): string | null {
  if (!pathname.startsWith("/")) return null;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (path === "/") return NATIVE_HOME;
  if (NATIVE_ALLOWED_PATHS.includes(path)) return null;
  const blocked = BLOCKED_PREFIXES.some((prefix) => {
    const base = prefix.replace(/\/+$/, "");
    return path === base || path.startsWith(`${base}/`);
  });
  if (blocked) return NATIVE_HOME;
  if (BLOCKED_PATTERNS.some((re) => re.test(path))) return NATIVE_HOME;
  return null;
}
