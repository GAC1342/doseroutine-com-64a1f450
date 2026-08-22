import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock } from "lucide-react";
import { assetUrl } from "@/lib/asset-url";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — DoseRoutine" },
      {
        name: "description",
        content:
          "Choose a new password for your DoseRoutine account and get straight back to your dose, meal and workout tracking.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://doseroutine.com/reset-password" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase parses the URL hash and fires PASSWORD_RECOVERY when the user
    // arrives from the recovery link. Also handle an existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) setReady(true);
      })
      .catch(() => {
        /* offline: wait for the recovery event instead */
      });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    navigate({ to: "/today", replace: true });
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center bg-background px-6 pt-[10vh] text-foreground"
    >
      <div className="w-full max-w-sm text-center">
        <BrandLogo
          size={64}
          alt="DoseRoutine supplement tracker logo"
          className="mx-auto mb-5 h-16 w-16"
          priority
        />
        <h1 className="font-display text-2xl font-bold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ready
            ? "Choose a new password for your DoseRoutine account."
            : "Verifying your reset link…"}
        </p>

        {ready ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-3 text-left">
            <label className="sr-only" htmlFor="new-password">
              New password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="tap-target w-full rounded-xl border-2 border-foreground/15 bg-background pl-10 pr-3 text-[15px] shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update password
            </button>
            {error ? (
              <p className="rounded-lg bg-[color:var(--avoid)]/10 px-3 py-2 text-sm text-[color:var(--avoid)]">
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </main>
  );
}
