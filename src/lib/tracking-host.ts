/**
 * Third-party analytics should only ever see the real, published site.
 *
 * Without this gate, every editor preview reload, local `bun dev` session and
 * `*-dev` build shows up in the external dashboard as a "visitor" — and any
 * form submitted while testing shows up as a "conversion". That is exactly how
 * a project with 13 accounts ends up reading as 160 conversions.
 */

const PRODUCTION_HOSTS = new Set(["doseroutine.com", "www.doseroutine.com"]);

/** True only on the canonical public site (never localhost / preview / dev). */
export function isProductionAnalyticsHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  if (PRODUCTION_HOSTS.has(host)) return true;
  // Lovable hosting: the published app only. Preview and dev builds live on
  // lovableproject.com, `id-preview--*` or `*-dev.lovable.app`.
  if (!host.endsWith(".lovable.app")) return false;
  if (host.startsWith("id-preview--")) return false;
  const sub = host.slice(0, -".lovable.app".length);
  if (sub.endsWith("-dev")) return false;
  return true;
}

/** Browser-side convenience wrapper. */
export function analyticsAllowedHere(): boolean {
  if (typeof window === "undefined") return false;
  return isProductionAnalyticsHost(window.location.hostname);
}
