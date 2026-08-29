/**
 * Sign-in prewarming.
 *
 * The slowest part of the first navigation after clicking "Sign in" is not the
 * route chunk (the router already preloads that on intent) — it is the cold
 * DNS + TLS handshake to the auth backend, which only happens when the sign-in
 * form actually posts. Warming the connection as soon as the user shows intent
 * (hover / focus / touch) removes that round trip from the critical path.
 *
 * Everything here is idempotent, best-effort and non-blocking: failures are
 * swallowed and never surface to the user.
 */

/** Auth/API origin derived from the public backend URL. */
export function backendOrigin(): string | undefined {
  const raw = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

let warmed = false;

function addHint(rel: "preconnect" | "dns-prefetch", href: string) {
  if (document.head.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (rel === "preconnect") link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/**
 * Open the backend connection ahead of the sign-in request. Safe to call on
 * every pointer event — the real work runs at most once per page load.
 */
export function prewarmAuth(): void {
  if (typeof window === "undefined" || warmed) return;
  warmed = true;

  const origin = backendOrigin();
  if (!origin) return;

  try {
    addHint("preconnect", origin);
    addHint("dns-prefetch", origin);
  } catch {
    // DOM unavailable — the fetch below still warms the socket.
  }

  try {
    // Tiny endpoint used purely to complete the DNS/TLS handshake. It needs
    // the publishable key or the backend answers 401, which shows up as a
    // console error at launch; the key is public and no session is sent.
    const apikey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    void fetch(`${origin}/auth/v1/health`, {
      credentials: "omit",
      cache: "no-store",
      headers: apikey ? { apikey } : undefined,
    }).catch(() => {});
  } catch {
    // Network blocked (offline, extension) — sign-in still works, just colder.
  }

}

/** Test-only: forget that the page already warmed the connection. */
export function resetAuthPrewarmForTests(): void {
  warmed = false;
}

/**
 * Props to spread onto any sign-in affordance. Pairs with the router's
 * `defaultPreload: "intent"` chunk preloading.
 */
export const authPrewarmProps = {
  onPointerEnter: prewarmAuth,
  onFocus: prewarmAuth,
  onTouchStart: prewarmAuth,
} as const;
