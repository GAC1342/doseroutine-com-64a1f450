/**
 * C1 — OAuth inside the native shell.
 *
 * On the web the auth SDK simply redirects the current page and returns to
 * `${origin}/auth/callback`. That cannot work inside Capacitor:
 *
 *   - `window.location.origin` is `capacitor://localhost`, which neither Apple
 *     nor the auth backend will accept as a redirect target, and
 *   - running the provider's page inside the app's own WKWebView is both
 *     blocked by some providers and invisible to the OS credential UI.
 *
 * So on native we ask the auth backend for the provider URL *without*
 * redirecting (`skipBrowserRedirect`), open it in the system browser
 * (SFSafariViewController / Chrome Custom Tab), and let the provider bounce
 * back to the custom scheme `com.doseroutine.app://auth/callback?code=…`.
 * The OS hands that URL to the app, `NativeAppListeners` routes it to
 * `/auth/callback`, and the existing PKCE exchange there finishes the job —
 * the verifier lives in this webview's storage, which is where the flow began.
 */
import { supabase } from "@/integrations/supabase/client";

/** Custom URL scheme registered in Info.plist / AndroidManifest.xml. */
export const NATIVE_AUTH_SCHEME = "com.doseroutine.app";
export const NATIVE_AUTH_REDIRECT = `${NATIVE_AUTH_SCHEME}://auth/callback`;

export type NativeOAuthProvider = "apple" | "google";

export type NativeOAuthResult = { error?: Error };

/**
 * Starts a provider sign-in from the native shell. Resolves as soon as the
 * system browser is open — the session arrives later via the deep link, so
 * callers should leave their loading state alone rather than navigating.
 */
export async function startNativeOAuth(provider: NativeOAuthProvider): Promise<NativeOAuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: NATIVE_AUTH_REDIRECT,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error };
    if (!data?.url) return { error: new Error("Sign-in is unavailable right now.") };

    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url, presentationStyle: "popover" });
    return {};
  } catch (e) {
    // H-3 — if the system browser cannot be opened (plugin missing from the
    // native build, or the OS refused), the user must see a recovery message
    // instead of a silently stuck spinner.
    const detail = e instanceof Error ? e.message : String(e);
    return {
      error: new Error(
        `Couldn't open the secure sign-in page. Please try again, or use your email and password. (${detail})`,
      ),
    };
  }
}

/** Closes the system browser once the deep link brought us back. Never throws. */
export async function closeNativeAuthBrowser(): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* already closed, or the plugin isn't available on this platform */
  }
}
