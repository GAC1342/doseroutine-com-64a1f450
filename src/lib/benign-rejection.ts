/**
 * Router transitions that are superseded reject with "Transition was skipped".
 *
 * This happens legitimately on native warm starts: a universal link navigates
 * while the router is already mid-transition (splash hand-off, auth hydration,
 * or a second `appUrlOpen` arriving back-to-back). TanStack Router cancels the
 * older transition and rejects its promise — the newer navigation still lands,
 * so the app is fine, but the rejection surfaced as an unhandled error and got
 * reported as a crash signal.
 *
 * These helpers let the global error plumbing ignore that specific shape while
 * leaving every other rejection fully reported.
 */

const BENIGN_PATTERNS = [
  /transition was skipped/i,
  /navigation (was )?(aborted|cancelled|canceled)/i,
  /abort(ed)? navigation/i,
];

function messageOf(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === "object" && "message" in reason) {
    const m = (reason as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

/** True when the rejection is a superseded/aborted router transition. */
export function isBenignRouterRejection(reason: unknown): boolean {
  if (reason && typeof reason === "object" && (reason as { name?: string }).name === "AbortError") {
    return true;
  }
  const message = messageOf(reason);
  if (!message) return false;
  return BENIGN_PATTERNS.some((pattern) => pattern.test(message));
}
