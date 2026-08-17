import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let done = false;
    const go = (to: string) => {
      if (done) return;
      done = true;
      navigate({ to, replace: true });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go("/today");
    });

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
      if (data.session) go("/today");
    })();

    // Surface a manual escape hatch rather than silently hanging.
    const soft = setTimeout(() => setStuck(true), 6000);
    const hard = setTimeout(() => go("/auth"), 12000);

    return () => {
      clearTimeout(soft);
      clearTimeout(hard);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
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
