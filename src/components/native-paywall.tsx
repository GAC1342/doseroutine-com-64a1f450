import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getIAPOfferings,
  purchasePackage,
  restorePurchases,
  type IAPOffering,
} from "@/lib/revenuecat";

/**
 * Native (iOS / Android) paywall using RevenueCat.
 *
 * Primary offer: 7-day free trial → $9.99/mo (monthly Pro SKU)
 * Secondary offer: annual plan (best value)
 *
 * Web users see the Stripe paywall in `/upgrade` — this component is only
 * rendered inside the native shell.
 */
export function NativePaywall({ onClose }: { onClose?: () => void }) {
  const queryClient = useQueryClient();
  const [offerings, setOfferings] = useState<IAPOffering[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await getIAPOfferings();
        setOfferings(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load subscription options");
      }
    })();
  }, []);

  async function buy(pkgId: string) {
    setBusy(pkgId);
    setError(null);
    try {
      const info = await purchasePackage(pkgId);
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await queryClient.refetchQueries({ queryKey: ["subscription"] });
      if (info.activeEntitlements.length > 0) {
        onClose?.();
      }
    } catch (e: any) {
      if (e?.userCancelled) return;
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setBusy("__restore");
    setError(null);
    try {
      const info = await restorePurchases();
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await queryClient.refetchQueries({ queryKey: ["subscription"] });
      if (info.activeEntitlements.length === 0) {
        setError(
          "No active subscriptions found on this Apple ID / Google account. If you recently subscribed, wait a minute and try again.",
        );
      } else {
        onClose?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  }

  if (offerings === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const monthly = offerings.find((o) => o.period === "monthly" && o.entitlement === "pro");
  const yearly = offerings.find((o) => o.period === "yearly" && o.entitlement === "pro");

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold">Try DoseRoutine Pro free</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          7 days free, then $9.99/month or $59.99/year. Cancel anytime.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {yearly && (
          <button
            onClick={() => buy(yearly.identifier)}
            disabled={busy !== null}
            className="w-full rounded-2xl border-2 border-primary bg-primary/5 p-5 text-left shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Best value
                </div>
                <div className="mt-1 font-display text-lg font-semibold">
                  {yearly.freeTrialDays ? `${yearly.freeTrialDays}-day free trial` : "Yearly plan"}
                </div>
                <div className="text-sm text-muted-foreground">
                  then {yearly.priceString}/year — save vs monthly
                </div>
              </div>
              <div className="text-right">
                {busy === yearly.identifier ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <span className="font-display text-xl font-bold">Start</span>
                )}
              </div>
            </div>
          </button>
        )}

        {monthly && (
          <button
            onClick={() => buy(monthly.identifier)}
            disabled={busy !== null}
            className="w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-success">
                  Flexible
                </div>
                <div className="mt-1 font-display text-lg font-semibold">Monthly plan</div>
                <div className="text-sm text-muted-foreground">
                  {monthly.freeTrialDays ? `${monthly.freeTrialDays}-day free trial, ` : ""}
                  then {monthly.priceString}/month
                </div>
              </div>
              <div className="text-right">
                {busy === monthly.identifier ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <span className="font-display text-xl font-bold">Go monthly</span>
                )}
              </div>
            </div>
          </button>
        )}
      </div>

      <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
        {[
          "Unlimited compounds, peptides & hormones",
          "AI plan generator & 24/7 AI coach",
          "Smart dose reminders & calendar alarms",
          "Timeline, adherence heatmap & stack calendar",
          "Interaction checker & reconstitution calculator",
          "Vial inventory with refill predictions",
          "Injection-site rotation & cycle tracking",
          "Progress photos, labs & body metrics",
          "Cost tracker, side-effect journal & barcode scanner",
          "Shareable report export & protocol sharing",
        ].map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-center gap-3 text-xs text-muted-foreground">
        <button
          onClick={restore}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Restore purchases
        </button>
        <p className="max-w-xs text-center leading-relaxed">
          Payment is charged to your Apple ID or Google account at purchase confirmation.
          Subscription auto-renews for the same period and price (Monthly Pro $9.99/month or Yearly
          Pro $59.99/year) unless cancelled at least 24 hours before the current period ends. Manage
          or cancel in your device Settings after purchase.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <a
            href="https://doseroutine.com/legal#terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Terms of Use (EULA)
          </a>
          <span aria-hidden>·</span>
          <a
            href="https://doseroutine.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
