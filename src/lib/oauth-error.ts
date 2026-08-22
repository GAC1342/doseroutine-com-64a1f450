/**
 * Turns raw provider / broker OAuth errors into plain-English messages, and
 * carries a message across the OAuth round trip back to /auth.
 */

const STASH_KEY = "dr:auth-error";

type Provider = "apple" | "google";

const LABEL: Record<Provider, string> = { apple: "Apple", google: "Google" };

export function friendlyOAuthError(raw: unknown, provider: Provider): string {
  const label = LABEL[provider];
  const msg = (raw instanceof Error ? raw.message : String(raw ?? "")).trim();
  const m = msg.toLowerCase();

  if (!m) return `${label} sign-in didn't complete. Please try again.`;

  if (
    m.includes("redirect") &&
    (m.includes("invalid") || m.includes("not allowed") || m.includes("mismatch"))
  ) {
    return `${label} rejected the return address for this site, so sign-in couldn't finish. This is a configuration issue on our side — please try email sign-in for now, or contact support.`;
  }
  if (
    m.includes("not supported") ||
    m.includes("not enabled") ||
    m.includes("unsupported provider")
  ) {
    return `${label} sign-in isn't available right now. Please use email sign-in instead.`;
  }
  if (
    m.includes("access_denied") ||
    m.includes("cancel") ||
    m.includes("closed") ||
    m.includes("user_cancelled")
  ) {
    return `${label} sign-in was cancelled. You can try again whenever you're ready.`;
  }
  if (m.includes("popup") || m.includes("blocked")) {
    return `Your browser blocked the ${label} sign-in window. Allow pop-ups for this site and try again.`;
  }
  if (
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("timeout") ||
    m.includes("offline")
  ) {
    return `We couldn't reach ${label}. Check your connection and try again.`;
  }
  if (m.includes("already registered") || m.includes("identity_already_exists")) {
    return `That ${label} account is already linked to another sign-in method. Sign in the way you did originally.`;
  }
  // Keep the raw text as a hint, but frame it for a non-technical reader.
  return `${label} sign-in failed: ${msg}`;
}

/** Reads an OAuth error out of a callback URL, if the provider sent one. */
export function readCallbackError(search: string, hash: string): string | null {
  const params = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const code = params.get("error") ?? hashParams.get("error");
  const desc =
    params.get("error_description") ??
    hashParams.get("error_description") ??
    params.get("error_code");
  if (!code && !desc) return null;
  return [desc, code].filter(Boolean).join(" ");
}

export function stashAuthError(message: string): void {
  try {
    sessionStorage.setItem(STASH_KEY, message);
  } catch {
    /* storage unavailable — the message is simply not carried over */
  }
}

export function consumeAuthError(): string | null {
  try {
    const v = sessionStorage.getItem(STASH_KEY);
    if (v) sessionStorage.removeItem(STASH_KEY);
    return v;
  } catch {
    return null;
  }
}
