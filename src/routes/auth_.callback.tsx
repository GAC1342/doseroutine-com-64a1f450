import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { consumeRedirect } from "@/lib/post-auth-redirect";
import { useQueryClient } from "@tanstack/react-query";
import { primePostAuth } from "@/lib/post-auth-prime";
import { friendlyOAuthError, readCallbackError, stashAuthError } from "@/lib/oauth-error";

export const Route = createFileRoute("/auth_/callback")({
  // NOTE: this route is intentionally server-rendered. With ssr:false the
  // browser gets an empty document, so any hiccup loading the client bundle
  // leaves the user staring at a blank white page mid sign-in.
  component: AuthCallback,
  head: () => ({
    meta: [
      { title: "Signing you in — DoseRoutine" },
      { name: "description", content: "Completing your secure sign-in to DoseRoutine." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Signing you in — DoseRoutine" },
      { property: "og:description", content: "Completing your secure sign-in to DoseRoutine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/** Pulls tokens out of an implicit-flow hash fragment, if present. */
function readHashTokens(): { access_token: string; refresh_token: string } | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  return access_token && refresh_token ? { access_token, refresh_token } : null;
}

function AuthCallback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let done = false;
    // Destination stashed by /auth before the OAuth round trip.
    const dest = consumeRedirect();
    const go = (to: string) => {
      if (done) return;
      done = true;
      navigate({ to: to as "/today", replace: true });
    };
    // Prime session + onboarding gate here so the protected layout renders on
    // arrival instead of bouncing again to /onboarding.
    const land = async (session: Parameters<typeof primePostAuth>[1]) => {
      if (done) return;
      const to = await primePostAuth(queryClient, session, dest);
      go(to);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void land(session);
    });

    // The provider (or the OAuth broker) can bounce back with an error —
    // e.g. a rejected return URL. Say so on /auth instead of spinning.
    const providerError = readCallbackError(window.location.search, window.location.hash);
    if (providerError) {
      const provider = /apple/i.test(providerError) ? "apple" : "google";
      stashAuthError(friendlyOAuthError(providerError, provider));
      sub.subscription.unsubscribe();
      go("/auth");
      return () => {};
    }

    void (async () => {
      try {
        // PKCE flow: ?code=... needs an explicit exchange.
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else {
          // Implicit flow: tokens arrive in the hash. detectSessionInUrl
          // usually handles this, but set them explicitly as a fallback.
          const tokens = readHashTokens();
          if (tokens) await supabase.auth.setSession(tokens);
        }
      } catch {
        // Fall through to the getSession check below.
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) await land(data.session);
    })();

    // Surface a manual escape hatch rather than silently hanging.
    const soft = setTimeout(() => setStuck(true), 6000);
    const hard = setTimeout(() => {
      stashAuthError("Sign-in took too long to come back. Please try again, or use email sign-in.");
      go("/auth");
    }, 12000);

    return () => {
      clearTimeout(soft);
      clearTimeout(hard);
      sub.subscription.unsubscribe();
    };
  }, [navigate, queryClient]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground"
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
      {stuck ? (
        <p className="text-sm text-muted-foreground">
          Taking longer than usual.{" "}
          <Link to="/auth" className="font-medium text-primary underline">
            Back to sign in
          </Link>
        </p>
      ) : null}
      <noscript>
        <p className="text-sm text-muted-foreground">
          JavaScript is required to finish signing in. Enable it and reload this page.
        </p>
      </noscript>
    </main>
  );
}
