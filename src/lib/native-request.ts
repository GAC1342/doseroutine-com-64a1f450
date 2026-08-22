/**
 * Server-side detection of requests coming from the native app shell.
 *
 * App Store guideline 3.1.1 forbids selling digital content through anything
 * other than in-app purchase. The UI already hides Stripe checkout inside the
 * app (`isNative()`), but a client-side check is not a defense: a stale
 * bundle, a deep link, or a WebView route change could still reach the
 * checkout server function. The native shell appends `DoseRoutineApp` to its
 * WebView user agent (see capacitor.config.ts), so the server can refuse.
 */
const NATIVE_UA_MARKERS = [/DoseRoutineApp/i, /\bCapacitor\b/i];

export function isNativeUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return NATIVE_UA_MARKERS.some((re) => re.test(userAgent));
}

/** Message shown when checkout is refused inside the app. */
export const NATIVE_CHECKOUT_BLOCKED_MESSAGE =
  "Purchases in the app go through the App Store. Please use the in-app upgrade option.";
