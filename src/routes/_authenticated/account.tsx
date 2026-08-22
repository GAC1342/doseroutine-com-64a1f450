import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Mail, Link2, Unlink, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/account")({
  errorComponent: routeErrorComponent("account"),
  head: () => ({
    meta: [
      { title: "Sign-in methods — DoseRoutine" },
      {
        name: "description",
        content:
          "Connect Google, Apple and email sign-in to one DoseRoutine account so every login lands in the same place.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

type Identity = {
  identity_id?: string;
  provider: string;
  identity_data?: Record<string, unknown> | null;
  created_at?: string;
};

// Manual identity linking is switched off at the project auth level today, so
// the connect buttons would always fail. Flip to true once it's enabled.
const MANUAL_LINKING_ENABLED = false;

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  email: "Email & password",
};

function labelFor(provider: string) {
  return PROVIDER_LABEL[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

function emailOf(identity: Identity) {
  const raw = identity.identity_data?.["email"];
  return typeof raw === "string" ? raw : null;
}

function AccountPage() {
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: idData }, { data: userData }] = await Promise.all([
      supabase.auth.getUserIdentities(),
      supabase.auth.getUser(),
    ]);
    setIdentities((idData?.identities as Identity[] | undefined) ?? []);
    setAccountEmail(userData?.user?.email ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const linked = new Set((identities ?? []).map((i) => i.provider));

  async function link(provider: "google" | "apple") {
    setBusy(provider);
    setNotice(null);
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      setBusy(null);
      // Supabase returns this when manual identity linking is switched off for
      // the project, or when the provider account already belongs elsewhere.
      const msg = /manual linking/i.test(error.message)
        ? "Linking is currently turned off for this app. Email support@doseroutine.com and we'll merge the two accounts for you."
        : /already/i.test(error.message)
          ? `That ${labelFor(provider)} account is already used by another DoseRoutine account. Sign in with it, export anything you need, then delete it — or email support@doseroutine.com and we'll merge them.`
          : error.message;
      setNotice(msg);
      toast.error("Couldn't connect that sign-in");
    }
    // On success the browser redirects to the provider.
  }

  async function unlink(identity: Identity) {
    if ((identities?.length ?? 0) <= 1) {
      toast.error("You need to keep at least one way to sign in.");
      return;
    }
    setBusy(identity.provider);
    setNotice(null);
    const { error } = await supabase.auth.unlinkIdentity(
      identity as unknown as Parameters<typeof supabase.auth.unlinkIdentity>[0],
    );
    setBusy(null);
    if (error) {
      setNotice(error.message);
      toast.error("Couldn't disconnect that sign-in");
      return;
    }
    toast.success(`${labelFor(identity.provider)} disconnected`);
    await load();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4">
      <Link
        to="/more"
        className="tap-target -ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> More
      </Link>

      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">Sign-in methods</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect Google, Apple and email to this one account. Whichever you use, you land in the same
        stack, workouts and history — no second account.
      </p>

      {accountEmail && (
        <p className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <Mail className="h-4 w-4 text-primary" />
          <span className="truncate">{accountEmail}</span>
        </p>
      )}

      {notice && (
        <Card className="mt-4 rounded-2xl border-amber-300/50 bg-amber-50/60 p-4 text-sm leading-relaxed text-foreground dark:bg-amber-950/20">
          {notice}
        </Card>
      )}

      <Card className="mt-5 rounded-2xl p-2">
        {identities === null ? (
          <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your sign-in methods…
          </p>
        ) : identities.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No sign-in methods found.</p>
        ) : (
          <ul className="divide-y divide-border">
            {identities.map((identity) => (
              <li
                key={identity.identity_id ?? identity.provider}
                className="flex items-center gap-3 px-3 py-3"
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {labelFor(identity.provider)}
                  </p>
                  {emailOf(identity) && (
                    <p className="truncate text-xs text-muted-foreground">{emailOf(identity)}</p>
                  )}
                </div>
                {identities.length > 1 && (
                  <button
                    type="button"
                    onClick={() => void unlink(identity)}
                    disabled={busy === identity.provider}
                    className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
                  >
                    <Unlink className="h-3.5 w-3.5" /> Disconnect
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {identities !== null && !MANUAL_LINKING_ENABLED && (
        <Card className="mt-4 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-foreground">Adding another sign-in</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Each account uses the sign-in method you created it with. If you already have two
            accounts, email{" "}
            <a href="mailto:support@doseroutine.com" className="underline">
              support@doseroutine.com
            </a>{" "}
            and we'll merge them for you.
          </p>
        </Card>
      )}

      {MANUAL_LINKING_ENABLED &&
        identities !== null &&
        (linked.has("google") === false || linked.has("apple") === false) && (
          <Card className="mt-4 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-foreground">Add another way to sign in</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              You'll be sent to the provider once. When you come back, both logins open this same
              account.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!linked.has("google") && (
                <button
                  type="button"
                  onClick={() => void link("google")}
                  disabled={busy !== null}
                  className="tap-target inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
                >
                  {busy === "google" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Connect Google
                </button>
              )}
              {!linked.has("apple") && (
                <button
                  type="button"
                  onClick={() => void link("apple")}
                  disabled={busy !== null}
                  className="tap-target inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
                >
                  {busy === "apple" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Connect Apple
                </button>
              )}
            </div>
          </Card>
        )}

      <Card className="mt-4 rounded-2xl p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          Already created two accounts by accident? Sign in to the one you want to keep and connect
          the other provider here. If that provider is already tied to the second account, export
          anything you need from it and delete it first, or email{" "}
          <a href="mailto:support@doseroutine.com" className="underline">
            support@doseroutine.com
          </a>{" "}
          and we'll merge them.
        </p>
      </Card>
    </div>
  );
}
