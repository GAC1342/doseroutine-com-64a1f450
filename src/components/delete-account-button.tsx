import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { isNative, isIOS } from "@/lib/platform";

/**
 * In-app account deletion — required by Apple 5.1.1(v) and Google 2024 policy.
 * Store subscriptions (Apple/Google) can only be cancelled by the user in
 * their device Settings, so we surface that instruction explicitly.
 */
export function DeleteAccountButton() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setErr(null);
    try {
      let env: "sandbox" | "live" = "sandbox";
      try {
        env = getStripeEnvironment();
      } catch {
        /* no stripe configured — still allow account deletion */
      }
      await deleteMyAccount({ data: { environment: env } });
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Deletion failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <AlertTriangle className="h-4 w-4" />
        Delete account
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="text-sm">
          <p className="font-semibold text-destructive">Permanently delete your account?</p>
          <p className="mt-1 text-muted-foreground">
            This removes your profile, stack, check-ins, reminders, and chat history. It cannot be
            undone.
          </p>
          {isNative() && (
            <p className="mt-2 rounded-lg bg-background p-2 text-xs text-foreground">
              <strong>Important:</strong> If you subscribed inside the app, you must also cancel
              your subscription in{" "}
              <strong>
                {isIOS() ? "Settings → Apple ID → Subscriptions" : "Google Play → Subscriptions"}
              </strong>{" "}
              or you'll continue to be billed.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs text-muted-foreground">
          Type <strong>DELETE</strong> to confirm:
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          autoCapitalize="characters"
        />
      </div>

      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setConfirmText("");
            setErr(null);
          }}
          disabled={busy}
          className="tap-target flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={busy || confirmText !== "DELETE"}
          className="tap-target flex-1 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
        >
          {busy ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Deleting…
            </span>
          ) : (
            "Delete forever"
          )}
        </button>
      </div>
    </div>
  );
}
