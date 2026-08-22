import { assetUrl } from "@/lib/asset-url";
import { BrandLogo } from "@/components/brand-logo";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionSafe, readStoredSession } from "@/lib/auth-session";
import { rememberRedirect, resolveRedirect, sanitizeRedirectPath } from "@/lib/post-auth-redirect";
import { lovable } from "@/integrations/lovable";
import { trackEvent } from "@/lib/analytics";
import { trackFunnelStep } from "@/lib/funnel";
import { Loader2, Mail, Lock, Check, Eye, EyeOff } from "lucide-react";
import { TrustBadges } from "@/components/trust-badges";
import { Testimonials } from "@/components/testimonials";
import { TrustSafety } from "@/components/trust-safety";
import { AuthFlowError } from "@/components/auth-flow-error";
import { consumeAuthError, friendlyOAuthError } from "@/lib/oauth-error";
import { prewarmAuth } from "@/lib/auth-prewarm";
import { useQueryClient } from "@tanstack/react-query";
import { primePostAuth } from "@/lib/post-auth-prime";
import { isNative } from "@/lib/platform";
import { startNativeOAuth } from "@/lib/native-oauth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const path = sanitizeRedirectPath(search["redirect"]);
    return path ? { redirect: path } : {};
  },
  head: () => ({
    meta: [
      { title: "Create your free DoseRoutine account" },
      {
        name: "description",
        content:
          "Create your free DoseRoutine account — no card needed. Track supplements, peptides, hormones and routines in one place.",
      },
      { property: "og:title", content: "Create your free DoseRoutine account" },
      {
        property: "og:description",
        content:
          "Sign up free — no card needed. Interaction checks across 475+ compounds, reminders and adherence tracking.",
      },
      { property: "og:url", content: "https://doseroutine.com/auth" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://doseroutine.com/auth" }],
  }),
  errorComponent: AuthFlowError,
  component: AuthPage,
});

type Mode = "sign-up" | "signin";

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  // Where to land once auth completes (defaults to /today).
  const dest = resolveRedirect(search.redirect) as "/today";
  // One navigation for the whole sign-in: prime the session + onboarding gate
  // first, then jump straight to the page the user actually belongs on.
  async function landAfterAuth(session: Parameters<typeof primePostAuth>[1]) {
    const to = await primePostAuth(queryClient, session, dest);
    navigate({ to: to as "/today", replace: true });
  }

  const [mode, setMode] = useState<Mode>("sign-up");
  const [loading, setLoading] = useState<null | "email" | "google" | "apple">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // C4 — a reviewer on a bad connection lands here first. Say so plainly
  // instead of letting every attempt fail with a vague network error.
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  /** True (and shows the message) when there's no connection to sign in over. */
  function blockedByOffline(): boolean {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setOffline(true);
      setError("You're offline. Reconnect to the internet and try again.");
      return true;
    }
    return false;
  }

  // A failed OAuth round trip bounces back here; show why in plain English.
  useEffect(() => {
    const stashed = consumeAuthError();
    if (stashed) setError(stashed);
  }, []);

  useEffect(() => {
    trackEvent("auth_started", { initial_mode: mode });
    trackFunnelStep("funnel_auth_view", { initial_mode: mode });
    // Warm the backend connection and preload the post-sign-in route chunk so
    // the first navigation after signing in has nothing left to fetch.
    prewarmAuth();
    void router.preloadRoute({ to: dest }).catch(() => {});
    // OAuth leaves the page, so stash the destination for /auth/callback.
    rememberRedirect(search.redirect);
    // Already signed in? Leave immediately using the persisted session rather
    // than waiting a round-trip on the auth SDK — one redirect, no flash.
    if (readStoredSession()) {
      navigate({ to: dest, replace: true });
    } else {
      getSessionSafe().then((session) => {
        if (session) navigate({ to: dest, replace: true });
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, dest]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (blockedByOffline()) return;
    trackEvent("auth_submit_attempt", {
      mode,
      has_email: !!email,
      has_password: !!password,
      password_length: password.length,
    });
    if (!email || !password) {
      trackEvent("auth_validation_failed", { mode, reason: "missing_fields" });
      setError("Please enter your email and a password.");
      return;
    }
    if (mode === "sign-up" && password.length < 8) {
      trackEvent("auth_validation_failed", { mode, reason: "password_too_short" });
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading("email");
    trackEvent("auth_method_click", { method: "email", mode });
    if (mode === "sign-up") {
      trackFunnelStep("funnel_signup_method", { method: "email" });
      trackFunnelStep("funnel_signup_submitted", { method: "email" });
    }

    if (mode === "sign-up") {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${dest}` },
      });
      if (err) {
        trackEvent("auth_failed", { method: "email", mode, message: err.message });
        const msg = /pwned|weak|leaked|compromised/i.test(err.message)
          ? "This password has appeared in a known data breach (checked against HaveIBeenPwned). Please use a different password — try adding random words or characters that aren't from a common phrase."
          : err.message;
        setError(msg);
        setLoading(null);
        return;
      }

      // Supabase returns a decoy user with no identities when the email is
      // already registered — that is not a new signup, so it must not be
      // counted as a conversion.
      // If email confirmation is required, session will be null.
      if (!data.session) {
        trackEvent("auth_email_confirm_sent", {});
        trackFunnelStep("funnel_signup_pending_confirm", { method: "email" });
        setNotice("Check your email to confirm your account, then sign in.");
        setLoading(null);
        setMode("signin");
        return;
      }
      trackEvent("auth_completed", { method: "email", mode: "sign-up" });
      trackFunnelStep("funnel_signup_completed", { method: "email" });

      await landAfterAuth(data.session);
      return;
    }

    const { data: signInData, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      trackEvent("auth_failed", { method: "email", mode, message: err.message });
      setError(err.message);
      setLoading(null);
      return;
    }
    trackEvent("auth_completed", { method: "email", mode: "signin" });
    await landAfterAuth(signInData.session);
  }

  async function handleForgot() {
    setError(null);
    setNotice(null);
    if (blockedByOffline()) return;
    if (!email) {
      setError("Enter your email above, then tap 'Forgot password' again.");
      return;
    }
    trackEvent("auth_method_click", { method: "reset", mode });
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setNotice("Password reset link sent — check your email.");
  }

  async function handleGoogle() {
    setError(null);
    setNotice(null);
    if (blockedByOffline()) return;
    setLoading("google");
    trackEvent("auth_method_click", { method: "google", mode });
    if (mode === "sign-up") {
      trackFunnelStep("funnel_signup_method", { method: "google" });
      trackFunnelStep("funnel_signup_submitted", { method: "google" });
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });
    if (result.error) {
      trackEvent("auth_failed", { method: "google", mode, message: result.error.message });
      setError(friendlyOAuthError(result.error.message, "google"));
      setLoading(null);
      return;
    }
    if (result.redirected) return;
    trackEvent("auth_completed", { method: "google", mode });
    if (mode === "sign-up") trackFunnelStep("funnel_signup_completed", { method: "google" });
    await landAfterAuth(await getSessionSafe());
  }

  async function handleApple() {
    setError(null);
    setNotice(null);
    if (blockedByOffline()) return;
    setLoading("apple");
    trackEvent("auth_method_click", { method: "apple", mode });
    if (mode === "sign-up") {
      trackFunnelStep("funnel_signup_method", { method: "apple" });
      trackFunnelStep("funnel_signup_submitted", { method: "apple" });
    }
    // C1 — inside the native shell the redirect must be the app's custom
    // scheme and the provider page must run in the system browser, otherwise
    // the round trip can never come back to the app.
    if (isNative()) {
      const native = await startNativeOAuth("apple");
      if (native.error) {
        trackEvent("auth_failed", { method: "apple", mode, message: native.error.message });
        setError(friendlyOAuthError(native.error.message, "apple"));
        setLoading(null);
      }
      // Success continues in /auth/callback via the deep link.
      return;
    }
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });
    if (result.error) {
      trackEvent("auth_failed", { method: "apple", mode, message: result.error.message });
      setError(friendlyOAuthError(result.error.message, "apple"));
      setLoading(null);
      return;
    }
    if (result.redirected) return;
    trackEvent("auth_completed", { method: "apple", mode });
    if (mode === "sign-up") trackFunnelStep("funnel_signup_completed", { method: "apple" });
    await landAfterAuth(await getSessionSafe());
  }

  const isSignup = mode === "sign-up";
  // Resolved after hydration so SSR markup (web) and the native shell agree.
  const [showGoogle, setShowGoogle] = useState(() => !isNative());
  useEffect(() => {
    setShowGoogle(!isNative());
  }, []);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center bg-background px-6 pt-[8vh] pb-8 text-foreground sm:justify-center sm:pt-8"
    >
      <div
        className={
          isSignup
            ? "grid w-full max-w-sm gap-10 lg:max-w-5xl lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start lg:gap-14"
            : "w-full max-w-sm"
        }
      >
        <div className="flex w-full flex-col items-center text-center">
          <BrandLogo
            size={64}
            alt="DoseRoutine supplement tracker logo"
            className="mb-5 h-16 w-16"
            priority
          />

          <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {isSignup ? "Create your free account" : "Welcome back"}
          </h1>
          <p className="mt-2 max-w-[300px] text-[14px] leading-snug text-muted-foreground">
            {isSignup
              ? "Free to start — no card required. Upgrade to Pro whenever you want more."
              : "Sign in to your DoseRoutine account."}
          </p>

          {isSignup ? (
            <ul className="mt-4 grid w-full gap-1.5 text-left text-[13px] text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Free account — no card needed
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                475+ compounds with interaction checks
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Reminders, adherence and doctor-ready exports
              </li>
            </ul>
          ) : null}

          <div className="mt-6 w-full space-y-2.5">
            {/* C2 — Google blocks OAuth inside embedded webviews ("disallowed_useragent"),
              so the native shell offers Apple + email instead of a button that
              can only fail. The web build keeps Google. */}
            {showGoogle ? (
              <button
                onClick={handleGoogle}
                disabled={loading !== null}
                className="tap-target flex w-full items-center justify-center gap-3 rounded-xl border-2 border-foreground/15 bg-background px-4 py-2.5 text-[15px] font-medium text-foreground shadow-sm transition-colors hover:bg-card disabled:opacity-60"
              >
                {loading === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>
            ) : null}
            <button
              onClick={handleApple}
              disabled={loading !== null}
              className="tap-target flex w-full items-center justify-center gap-3 rounded-xl bg-foreground px-4 py-2.5 text-[15px] font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleIcon />}
              Continue with Apple
            </button>
          </div>

          {isSignup ? <TrustBadges variant="trial" align="center" className="mt-4" /> : null}
          {isSignup ? <Testimonials className="mt-5 p-5 sm:p-5 lg:hidden" /> : null}

          <div className="my-5 flex w-full items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or use email
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="w-full space-y-2.5">
            <label className="sr-only" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => trackEvent("auth_field_focus", { field: "email", mode })}
                onBlur={(e) =>
                  trackEvent("auth_field_blur", {
                    field: "email",
                    mode,
                    filled: e.target.value.length > 0,
                  })
                }
                placeholder="you@example.com"
                className="tap-target w-full rounded-xl border-2 border-foreground/15 bg-background pl-10 pr-3 text-[15px] text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => trackEvent("auth_field_focus", { field: "password", mode })}
                onBlur={(e) =>
                  trackEvent("auth_field_blur", {
                    field: "password",
                    mode,
                    length: e.target.value.length,
                  })
                }
                placeholder={isSignup ? "Password (min 8 chars)" : "Password"}
                className="tap-target w-full rounded-xl border-2 border-foreground/15 bg-background pl-10 pr-11 text-[15px] text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading !== null}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[15px] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSignup ? "Create free account" : "Sign in"}
            </button>
          </form>

          {!isSignup ? (
            <button
              type="button"
              onClick={handleForgot}
              className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Forgot password?
            </button>
          ) : null}

          {offline ? (
            <p
              role="status"
              className="mt-4 w-full rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
            >
              You&rsquo;re offline. DoseRoutine needs a connection to sign you in — your saved data
              will be here as soon as you reconnect.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 w-full rounded-lg bg-[color:var(--avoid)]/10 px-3 py-2 text-sm text-[color:var(--avoid)]">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="mt-4 w-full rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
              {notice}
            </p>
          ) : null}

          <p className="mt-6 text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to DoseRoutine?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(isSignup ? "signin" : "sign-up");
                setError(null);
                setNotice(null);
              }}
              className="font-semibold text-primary underline underline-offset-2"
            >
              {isSignup ? "Sign in" : "Create free account"}
            </button>
          </p>

          {isSignup ? (
            <TrustSafety variant="compact" className="mt-6 p-5 sm:p-6 lg:hidden" />
          ) : null}

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/legal" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {isSignup ? (
          <aside className="hidden w-full flex-col gap-6 text-left lg:flex lg:sticky lg:top-8">
            <Testimonials className="p-6" />
            <TrustSafety variant="compact" className="p-6" />
          </aside>
        ) : null}
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.9 32.5 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.6 19 12.5 24 12.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.4 0-9.9-3.5-11.5-8.3l-6.5 5C9.5 39.4 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.9 34.9 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
