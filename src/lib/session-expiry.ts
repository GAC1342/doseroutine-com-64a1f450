/**
 * Session-expiry detection.
 *
 * Supabase refresh tokens can be revoked (password change, another device
 * signing out, an expired refresh window). When that happens the SDK stops
 * emitting a usable session and every protected request 401s — the user is
 * left staring at a broken screen instead of a login form.
 *
 * `watchSessionExpiry` fires a single callback the moment the session is
 * known to be dead, from any of three signals:
 *   1. `onAuthStateChange` → SIGNED_OUT / TOKEN_REFRESHED with no session
 *   2. a periodic check of the stored token's `expires_at`
 *   3. the app returning to the foreground (tab focus / native resume)
 */
import { supabase } from "@/integrations/supabase/client";
import { getSessionSafe } from "@/lib/auth-session";

/** Treat a token as dead this many ms before its real expiry. */
const SKEW_MS = 5_000;
const POLL_MS = 60_000;

export function isSessionExpired(
  session: { expires_at?: number | null } | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!session) return true;
  const expiresAt = session.expires_at;
  if (typeof expiresAt !== "number") return false;
  return expiresAt * 1000 - SKEW_MS <= now;
}

/** Build the login URL that returns the user to where they were. */
export function loginRedirectSearch(pathname: string): { redirect?: string } {
  if (!pathname || pathname === "/" || pathname.startsWith("/auth")) return {};
  return { redirect: pathname };
}

/**
 * Start watching. Calls `onExpired` at most once, then stops.
 * Returns an unsubscribe function.
 */
export function watchSessionExpiry(onExpired: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  let stopped = false;

  const fire = () => {
    if (stopped) return;
    stopped = true;
    cleanup();
    onExpired();
  };

  const check = async () => {
    if (stopped) return;
    try {
      const session = await getSessionSafe();
      if (isSessionExpired(session)) fire();
    } catch {
      /* transient SDK errors are handled by the boundary, not here */
    }
  };

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (stopped) return;
    if (event === "SIGNED_OUT") {
      fire();
      return;
    }
    if ((event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") && !session) {
      void check();
    }
  });

  const interval = window.setInterval(() => void check(), POLL_MS);
  const onVisible = () => {
    if (document.visibilityState === "visible") void check();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);

  function cleanup() {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
    try {
      data.subscription.unsubscribe();
    } catch {
      /* already torn down */
    }
  }

  return () => {
    stopped = true;
    cleanup();
  };
}
