import { THEME_BOOT_SCRIPT } from "@/lib/theme";

/**
 * The single pre-hydration inline script rendered into <head> by
 * src/routes/__root.tsx.
 *
 * It lives in its own module because its bytes are STABLE across every
 * response: that lets the CSP allow it with a `sha256-...` hash instead of a
 * per-response nonce. Hash-allowed scripts keep working when the browser
 * replays a cached HTML body after a 304, which a rotated nonce would break.
 *
 * If you edit this string, the hash changes automatically — it is derived at
 * runtime from this exact constant, never hard-coded.
 */
/**
 * Pre-paint bounce for already-signed-in visitors landing on "/".
 *
 * Search results point at the homepage, so a returning signed-in user used to
 * see the marketing page render, hydrate, and only then redirect — a visible
 * flash plus a second full page load. Reading the persisted session in <head>
 * moves that decision before first paint, so the browser never paints home.
 *
 * Guards: only the bare homepage, never an OAuth return (tokens in the hash),
 * never twice in one tab (so signing out and browsing home still works), and
 * only for a stored session whose access token has not expired.
 */
const SESSION_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? ""}-auth-token`;

const SIGNED_IN_BOUNCE_SCRIPT = `(function(){try{if(location.pathname!=="/")return;if(location.search||(location.hash&&location.hash.indexOf("token")>-1))return;if(sessionStorage.getItem("dr-home-bounce"))return;var raw=localStorage.getItem(${JSON.stringify(SESSION_KEY)});if(!raw)return;var s=JSON.parse(raw);if(!s||!s.access_token||!s.user)return;if(typeof s.expires_at==="number"&&s.expires_at*1000<Date.now())return;sessionStorage.setItem("dr-home-bounce","1");location.replace("/today");}catch(e){}})();`;

export const BOOT_INLINE_SCRIPT = `${THEME_BOOT_SCRIPT}\n(function(){try{var h=location.hostname;if(h!=="doseroutine.com"&&h!=="www.doseroutine.com"){var m=document.createElement("meta");m.name="robots";m.content="noindex, nofollow";document.head.appendChild(m);}}catch(e){}})();\n${SIGNED_IN_BOUNCE_SCRIPT}`;

/** Inline snippets that are byte-identical on every response. */
export const STABLE_INLINE_SCRIPTS: readonly string[] = [BOOT_INLINE_SCRIPT];
