import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { describeBootFailure, recordBootStep } from "@/lib/boot-diagnostics";

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
  // Airplane-mode cold start: the SDK's token refresh can only fail, and every
  // second spent waiting is a second of blank screen. Trust the stored session.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const stored = readStoredSession();
    recordBootStep(
      "session-restore",
      stored ? "ok" : "skipped",
      stored ? "Used your saved sign-in (offline)" : "No saved sign-in available while offline",
    );
    return stored;
  }

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
      recordBootStep("session-restore", "stalled", "Sign-in check timed out; used saved sign-in");
      return readStoredSession();
    }
    recordBootStep("session-restore", "ok", "Sign-in confirmed");
    return result.session;
  } catch (error) {
    recordBootStep("session-restore", "failed", describeBootFailure(error));
    return readStoredSession();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Query key holding the current session inside the router's QueryClient. */
export const AUTH_SESSION_QUERY_KEY = ["auth-session"] as const;

type MinimalQueryClient = {
  getQueryData: (key: never) => unknown;
  setQueryData: (key: never, data: never) => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural fit for QueryClient.fetchQuery's generic signature.
  fetchQuery: (options: any) => Promise<any>;
};

/**
 * Silent session restoration.
 *
 * On a hard refresh the auth SDK has to re-read storage and (often) refresh the
 * access token before it resolves — that await is what makes protected routes
 * flash a spinner or bounce through /auth. The persisted session is already in
 * localStorage and is trustworthy enough to render with, so we seed the cache
 * from it synchronously and revalidate in the background. Only when there is
 * no usable stored session do we block on the SDK.
 */
export async function resolveSessionFast(client: MinimalQueryClient): Promise<Session | null> {
  const cached = client.getQueryData(AUTH_SESSION_QUERY_KEY as never) as Session | null | undefined;
  if (cached !== undefined) return cached;

  const stored = readStoredSession();
  if (stored) {
    client.setQueryData(AUTH_SESSION_QUERY_KEY as never, stored as never);
    void client
      .fetchQuery({
        queryKey: AUTH_SESSION_QUERY_KEY,
        queryFn: () => getSessionSafe(),
        staleTime: 0,
        retry: false,
      })
      .catch(() => {});
    return stored;
  }

  return (await client.fetchQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
    queryFn: () => getSessionSafe(),
  })) as Session | null;
}
