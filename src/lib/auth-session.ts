import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * Supabase's `getSession()` acquires a cross-tab Web Lock before it resolves.
 * If another tab (or an interrupted token refresh) is holding that lock, the
 * promise can hang forever. Route guards that `await` it then never resolve,
 * which renders a permanently blank screen right after sign-in.
 *
 * These helpers always resolve: they race the SDK call against a timeout and
 * fall back to the session Supabase already persisted in localStorage.
 */

const DEFAULT_TIMEOUT_MS = 3500;

function storageKey(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  return projectId ? `sb-${projectId}-auth-token` : null;
}

/** Reads the persisted session synchronously, without touching the Web Lock. */
export function readStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  const key = storageKey();
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.access_token || !parsed.user) return null;
    if (typeof parsed.expires_at === "number" && parsed.expires_at * 1000 < Date.now()) {
      // Expired access token — the SDK may still refresh it, so don't treat the
      // stored copy as proof of a live session.
      return null;
    }
    return parsed as Session;
  } catch {
    return null;
  }
}

/**
 * Never-hanging replacement for `supabase.auth.getSession()`.
 * Falls back to the persisted session if the SDK call stalls.
 */
export async function getSessionSafe(
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Session | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
  });

  try {
    const result = await Promise.race([
      supabase.auth.getSession().then((r) => ({ session: r.data.session ?? null })),
      timeout,
    ]);

    if ("timedOut" in result) {
      return readStoredSession();
    }
    return result.session;
  } catch {
    return readStoredSession();
  } finally {
    if (timer) clearTimeout(timer);
  }
}
