/**
 * Error classification shared by every route error boundary.
 *
 * Three questions matter when a screen blows up:
 *   1. Is this just the network / offline?  → show the recovery screen with a
 *      "Try again" that re-runs the loaders once connectivity is back.
 *   2. Is the auth token dead?              → bounce to the login flow.
 *   3. Anything else                        → generic boundary + crash report.
 *
 * Pure functions, no imports: safe to use during SSR and inside tests.
 */

function messageOf(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "object") {
    const candidate = error as { message?: unknown; error?: unknown; name?: unknown };
    if (typeof candidate.message === "string") return candidate.message;
    if (typeof candidate.error === "string") return candidate.error;
  }
  return "";
}

function statusOf(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  for (const value of [candidate.status, candidate.statusCode, candidate.code]) {
    if (typeof value === "number" && value >= 100 && value <= 599) return value;
  }
  return null;
}

const NETWORK_PATTERNS: RegExp[] = [
  /failed to fetch/i,
  /fetch failed/i,
  /network\s*error/i,
  /networkerror when attempting/i,
  /load failed/i, // Safari's "Failed to fetch"
  /net::err_/i,
  /err_internet_disconnected/i,
  /err_network/i,
  /err_connection/i,
  /the internet connection appears to be offline/i,
  /connection (was )?(lost|refused|reset)/i,
  /request timed? ?out/i,
  /timeout(ed)? (of|after)/i,
  /socket hang up/i,
  /you are offline/i,
  /offline/i,
  /aborterror/i,
  /signal is aborted/i,
  // Cold start in airplane mode: the route chunk itself can't be downloaded.
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /chunkloaderror/i,
];

const AUTH_EXPIRY_PATTERNS: RegExp[] = [
  /jwt (is )?expired/i,
  /token (is )?expired/i,
  /invalid refresh token/i,
  /refresh_token_not_found/i,
  /refresh token not found/i,
  /auth session missing/i,
  /session (has )?expired/i,
  /session_not_found/i,
  /invalid (jwt|claim|token)/i,
  /not authenticated/i,
  /\bunauthorized\b/i,
  /pgrst301/i,
];

/** Network / connectivity failure — retryable, not a bug in the app. */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const status = statusOf(error);
  if (status === 408 || status === 502 || status === 503 || status === 504) return true;
  const message = messageOf(error);
  if (!message) return false;
  // A 401/403 is an auth problem even if the message mentions "fetch".
  if (isAuthExpiryError(error)) return false;
  return NETWORK_PATTERNS.some((re) => re.test(message));
}

/** The user's auth token is gone or no longer valid — they must sign in again. */
export function isAuthExpiryError(error: unknown): boolean {
  const status = statusOf(error);
  if (status === 401) return true;
  const message = messageOf(error);
  if (!message) return false;
  return AUTH_EXPIRY_PATTERNS.some((re) => re.test(message));
}

const CANCELLATION_PATTERNS: RegExp[] = [
  /cancelledError/i,
  /^cancelled$/i,
  /request was cancelled/i,
  /navigation (was )?(cancelled|aborted)/i,
  /route (load|loader) (was )?cancelled/i,
];

/**
 * The work was thrown away on purpose — a redirect (e.g. the native route
 * guard) or a fresh navigation cancelled an in-flight loader/query. Nothing
 * failed, so boundaries must show the pending state, never a crash screen.
 */
export function isCancellationError(error: unknown): boolean {
  if (!error) return false;
  const name = error instanceof Error ? error.name : (error as { name?: unknown })?.name;
  if (typeof name === "string" && /^(cancelled ?error|abort ?error)$/i.test(name.trim())) {
    return true;
  }
  if ((error as { silent?: unknown })?.silent === true) return true;
  const message = messageOf(error);
  if (!message) return false;
  return CANCELLATION_PATTERNS.some((re) => re.test(message));
}

export type BoundaryErrorKind = "cancelled" | "offline" | "auth-expired" | "unknown";

export function classifyBoundaryError(error: unknown): BoundaryErrorKind {
  // Cancellation first: an AbortError reads as "offline" otherwise.
  if (isCancellationError(error)) return "cancelled";
  if (isAuthExpiryError(error)) return "auth-expired";
  if (isNetworkError(error)) return "offline";
  return "unknown";
}

/** Short, user-safe message. Falls back when the raw message is huge or empty. */
export function friendlyErrorMessage(error: unknown, fallback: string): string {
  const message = messageOf(error)
    .replace(/^Error:\s*/i, "")
    .trim();
  if (!message || message.length > 200) return fallback;
  return message;
}

/**
 * The message to actually show a user in a toast or inline error.
 *
 * Raw fetch failures read as "Load failed" (iOS WKWebView) or
 * "Failed to fetch" (Chromium), which tells nobody anything — and App Store
 * reviewers routinely test on a throttled or disconnected device. Network and
 * expired-session failures get plain-English copy; everything else falls back
 * to the caller's own wording unless the raw message is short and readable.
 */
export function userFacingErrorMessage(error: unknown, fallback: string): string {
  const kind = classifyBoundaryError(error);
  if (kind === "offline") {
    return "You appear to be offline. Reconnect and try again — nothing was lost.";
  }
  if (kind === "auth-expired") {
    return "Your session expired. Sign in again to continue.";
  }
  if (kind === "cancelled") return fallback;
  return friendlyErrorMessage(error, fallback);
}
