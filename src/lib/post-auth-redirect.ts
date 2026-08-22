/**
 * Where to send the user after they finish signing in.
 *
 * Public pages can link to `/auth?redirect=/booty-workout` so a gated action
 * (schedule a day, log a session) returns the visitor to where they started.
 * Only same-origin absolute paths are honoured — never an external URL.
 */

const STORAGE_KEY = "doseroutine:post-auth-redirect";
const DEFAULT_DESTINATION = "/today";

/** Returns a safe same-origin path, or null when the value can't be trusted. */
export function sanitizeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw.startsWith("/")) return null;
  // Reject protocol-relative ("//evil.com") and backslash tricks.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (raw.includes("\\")) return null;
  return raw;
}

/** Path to navigate to after auth, falling back to the app home. */
export function resolveRedirect(value: unknown): string {
  return sanitizeRedirectPath(value) ?? DEFAULT_DESTINATION;
}

/**
 * OAuth leaves the page, so the search param can't survive the round trip.
 * Stash it before redirecting and read it back on /auth/callback.
 */
export function rememberRedirect(value: unknown): void {
  if (typeof window === "undefined") return;
  const path = sanitizeRedirectPath(value);
  try {
    if (path) window.sessionStorage.setItem(STORAGE_KEY, path);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private-mode storage failures are non-fatal; we just use the default.
  }
}

/** Reads and clears the stashed destination. */
export function consumeRedirect(): string {
  if (typeof window === "undefined") return DEFAULT_DESTINATION;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    return resolveRedirect(stored);
  } catch {
    return DEFAULT_DESTINATION;
  }
}
