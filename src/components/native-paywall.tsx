import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PaywallLegalDialog } from "@/components/paywall-legal-dialog";

import {
  getIAPOfferings,
  isUserCancelledError,
  purchasePackage,
  restorePurchases,
  type IAPOffering,
} from "@/lib/revenuecat";

/** RevenueCat can hang offline or when the store is unreachable — never spin forever. */
const OFFERINGS_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("The App Store took too long to respond.")),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

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
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadOfferings = useCallback(async () => {
    setLoadFailed(false);
    setError(null);
    try {
      const list = await withTimeout(getIAPOfferings(), OFFERINGS_TIMEOUT_MS);
      if (!mounted.current) return;
      setOfferings(list);
    } catch (e) {
      if (!mounted.current) return;
      // Fail visible, never silent: show a retry surface instead of a spinner.
      setOfferings([]);
      setLoadFailed(true);
      setError(e instanceof Error ? e.message : "Could not load subscription options");
    }
  }, []);

  useEffect(() => {
    void loadOfferings();
  }, [loadOfferings]);

  async function buy(pkgId: string) {
    setBusy(pkgId);
    setError(null);
    try {
      const info = await purchasePackage(pkgId);
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await queryClient.refetchQueries({ queryKey: ["subscription"] });
      if (info.activeEntitlements.length > 0) {
        onClose?.();
      } else {
        setError(
          "The purchase went through but Pro isn't active yet. Tap Restore purchases in a moment.",
        );
      }
    } catch (e) {
      // A cancelled purchase is a normal outcome, not an error surface.
      if (isUserCancelledError(e)) return;
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setBusy("__restore");
    setError(null);
    try {
      const info = await withTimeout(restorePurchases(), OFFERINGS_TIMEOUT_MS);
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
  // H1 — never advertise a free trial we haven't actually confirmed with the
  // store. `freeTrialDays` comes from the live RevenueCat/StoreKit product, so
  // if no introductory offer is configured the copy drops the trial claim.
  const trialDays = monthly?.freeTrialDays ?? yearly?.freeTrialDays ?? 0;

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold">DoseRoutine Pro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {trialDays
            ? `${trialDays} days free, then $9.99/month or $59.99/year. Cancel anytime.`
            : "$9.99/month or $59.99/year. Cancel anytime."}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loadFailed && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Subscription options couldn’t be loaded. Check your connection and try again — you can
            keep using the app in the meantime.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void loadOfferings()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
              >
                Continue without subscribing
              </button>
            )}
          </div>
        </div>
      )}

      {!loadFailed && !monthly && !yearly && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            No subscription plans are available on this device right now. This is usually temporary
            — you can keep using every free feature in the meantime, or restore an existing purchase
            below.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void loadOfferings()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
              >
                Continue without subscribing
              </button>
            )}
          </div>
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
          {/* H3 — these must stay reachable inside the app. They open in a
              dialog above the paywall so the purchase sheet is never
              unmounted mid-flow. */}
          <PaywallLegalDialog doc="terms" />
          <span aria-hidden>·</span>
          <PaywallLegalDialog doc="privacy" />
        </div>
      </div>
    </div>
  );
}
