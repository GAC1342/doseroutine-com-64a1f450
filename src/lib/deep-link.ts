import { isBenignRouterRejection } from "./benign-rejection";

/**
 * Deep-link handling shared by the native app listeners and their tests.
 *
 * Two launch shapes must behave identically:
 *   - cold start: the OS hands the app a launch URL before listeners attach
 *   - warm start: `appUrlOpen` fires while the app is already running
 *
 * In both cases we wait for the auth session lookup to settle before routing
 * (otherwise a protected target bounces to /auth and the destination is lost)
 * and we process links one at a time so two quick opens can't interleave.
 */

const APP_HOSTS = new Set(["doseroutine.com", "www.doseroutine.com"]);

/**
 * Paths that must NOT be captured by the native app. Universal links matching
 * these stay in the browser (server endpoints, machine-readable files, and the
 * Lovable internal routes have no in-app screen to show).
 */
export const WEB_ONLY_PATH_PREFIXES = [
  "/api/",
  "/_serverFn/",
  "/.well-known/",
  "/.mcp/",
  "/mcp",
  "/lovable/",
  "/sitemap",
  "/robots.txt",
] as const;

/** True when the path has a real in-app screen and should open in the app. */
export function isAppLinkPath(pathname: string): boolean {
  return !WEB_ONLY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/** Convert an opened URL into an in-app path, or null when it isn't ours. */
export function deepLinkPath(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const isCustomScheme = url.protocol.startsWith("com.doseroutine");
    const isAppHost = APP_HOSTS.has(url.hostname);
    if (!isCustomScheme && !isAppHost) return null;
    // com.doseroutine.app://today → hostname carries the first segment.
    const path = isCustomScheme
      ? `/${[url.hostname, url.pathname.replace(/^\/+/, "")].filter(Boolean).join("/")}`
      : url.pathname || "/";
    const normalized = path.replace(/\/+$/, "") || "/";
    if (!normalized.startsWith("/")) return null;
    // Server endpoints and machine-readable files have no in-app screen; let
    // the OS keep those in the browser rather than opening a blank app view.
    if (!isAppLinkPath(normalized)) return null;
    return `${normalized}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export type DeepLinkOpenerOptions = {
  /** Resolves once the auth session has been read back from storage. */
  hydrateSession: () => Promise<unknown>;
  /** Client-side navigation to an in-app path. */
  navigate: (path: string) => Promise<unknown>;
  /** True once the owning component unmounted; navigation is skipped. */
  isDisposed: () => boolean;
  /** Non-fatal reporting hook. */
  onError?: (err: unknown, path: string) => void;
};

/**
 * Returns a function that routes one opened URL. Calls are queued so links
 * arriving back-to-back (cold launch URL + an immediate warm `appUrlOpen`)
 * are applied in order rather than racing each other.
 */
export function createDeepLinkOpener(
  options: DeepLinkOpenerOptions,
): (rawUrl: string) => Promise<void> {
  let chain: Promise<void> = Promise.resolve();

  return (rawUrl: string) => {
    chain = chain.then(async () => {
      const path = deepLinkPath(rawUrl);
      if (!path) return;
      try {
        await options.hydrateSession();
      } catch {
        /* offline / storage unavailable — route anyway */
      }
      if (options.isDisposed()) return;
      try {
        await options.navigate(path);
      } catch (err) {
        // A newer link superseded this navigation — the newer one lands, so
        // there is nothing to report.
        if (isBenignRouterRejection(err)) return;
        options.onError?.(err, path);
      }
    });
    return chain;
  };
}
