/**
 * H4 — external links must leave the app.
 *
 * Inside the native shell (Capacitor WKWebView / Android WebView) a plain
 * anchor can navigate the app's own webview to a third-party page, which
 * traps the user with no chrome, no back button, and no way home. Capacitor's
 * webview delegate hands `window.open(url, "_blank")` to the OS, which opens
 * the user's default browser (Safari / Chrome) — that's what we always want
 * for legal, support and citation links.
 *
 * Same idea for `mailto:` / `tel:` / `sms:`: the webview must hand those to
 * the OS mail/phone/messages app rather than trying to navigate to them.
 *
 * On the web this is just a normal new-tab open with `noopener,noreferrer`.
 */
import { isNative } from "@/lib/platform";

/** Schemes the operating system (not the webview) should handle. */
const APP_SCHEME_RE = /^(mailto:|tel:|sms:|facetime:|geo:)/i;

/** True for links that must be handed to a native system app, not a browser. */
export function isAppSchemeUrl(href: string): boolean {
  return !!href && APP_SCHEME_RE.test(href.trim());
}

/**
 * Hosts that are always "this app" regardless of which origin the shell is
 * currently served from. Kept explicit — a subdomain like
 * `blog.doseroutine.com` is NOT in here, so it correctly opens externally.
 */
const INTERNAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function normalizeHost(host: string): string {
  // Strip the port and any trailing FQDN dot so `example.com.:443` and
  // `example.com` compare equal.
  const withoutPort = host.replace(/:\d+$/, "").toLowerCase();
  return withoutPort.endsWith(".") ? withoutPort.slice(0, -1) : withoutPort;
}

/**
 * Same-origin (or relative) URLs stay in-app; everything else is external.
 *
 * Deliberately strict about hostnames: only an exact host match counts as
 * internal. Subdomains (`blog.example.com` from `example.com`) and custom
 * domains pointing at the same product are treated as external, because in
 * the native shell they are served outside the app bundle.
 */
export function isExternalUrl(href: string): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (isAppSchemeUrl(trimmed)) return true;
  // Pure fragments and query-only links never leave the page.
  if (trimmed.startsWith("#") || trimmed.startsWith("?")) return false;
  try {
    const base = typeof window === "undefined" ? "https://doseroutine.com" : window.location.href;
    const url = new URL(trimmed, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (typeof window === "undefined") return true;
    const target = normalizeHost(url.host);
    const current = normalizeHost(window.location.host);
    if (!target) return false;
    if (target === current) return false;
    // Capacitor serves the bundle from localhost / capacitor://localhost; treat
    // those loopback aliases as the same in-app origin.
    if (INTERNAL_HOSTS.has(target) && INTERNAL_HOSTS.has(current)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Open `href` in the system browser / mail / phone app (native) or a new tab. */
export function openExternalUrl(href: string): void {
  if (typeof window === "undefined" || !href) return;
  if (isAppSchemeUrl(href)) {
    // mailto:/tel:/sms: must be a top-level navigation — window.open on these
    // schemes is blocked or opens a blank tab in several webviews.
    window.location.href = href;
    return;
  }
  // `noopener` also prevents the opened page from reaching back via
  // window.opener; Capacitor forwards the request to the OS on native.
  const w = window.open(href, "_blank", "noopener,noreferrer");
  if (!w && isNative()) {
    // Popup blocked / no handle returned — fall back to a direct hand-off.
    window.location.href = href;
  }
}

/**
 * Global click interceptor. Returns a cleanup function.
 * Only active on native: on the web, browsers already handle `_blank` fine
 * and hijacking clicks would break middle-click / modifier behavior.
 */
export function installExternalLinkHandler(): () => void {
  if (typeof document === "undefined" || !isNative()) return () => {};

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
    if (!anchor) return;
    if (anchor.dataset.internalLink === "true") return;
    if (anchor.hasAttribute("download")) return;
    const href = anchor.getAttribute("href") ?? "";
    if (!href || href.startsWith("#")) return;
    // App schemes must use the raw attribute: anchor.href resolves them but
    // some webviews rewrite unknown schemes on the property.
    if (isAppSchemeUrl(href)) {
      e.preventDefault();
      openExternalUrl(href.trim());
      return;
    }
    if (!isExternalUrl(anchor.href || href)) return;
    e.preventDefault();
    openExternalUrl(anchor.href || href);
  };

  // L2 — capture phase, so an anchor whose own handler calls
  // stopPropagation() can't slip past and navigate the webview to a
  // third-party page. Safe to act early: onClick only intervenes for
  // external / app-scheme hrefs, which never have in-app click behavior.
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
