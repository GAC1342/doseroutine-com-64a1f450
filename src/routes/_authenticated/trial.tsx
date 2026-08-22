import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { AlertTriangle, ArrowRight, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { NativePaywall } from "@/components/native-paywall";
import { isNative } from "@/lib/platform";
import {
  TRIAL_DAYS,
  TRIAL_PRO_MONTHLY_CENTS,
  TRIAL_PRO_MONTHLY_PRICE_ID,
  TRIAL_PRO_YEARLY_CENTS,
  TRIAL_PRO_YEARLY_PRICE_ID,
} from "@/lib/access";
import { Card } from "@/components/ui/card";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/trial")({
  errorComponent: routeErrorComponent("trial"),
  ssr: false,
  head: () => ({
    meta: [
      { title: `Start your ${TRIAL_DAYS}-day free trial — DoseRoutine` },
      {
        name: "description",
        content: `Try DoseRoutine free for ${TRIAL_DAYS} days. Full safety report, reminders, and interaction checks. Cancel anytime.`,
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    // Grandfathered users never see this screen.
    const { data: profile } = await supabase
      .from("profiles")
      .select("grandfathered")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.grandfathered) throw redirect({ to: "/today" });
    return {};
  },
  component: TrialPage,
});

type Billing = "yearly" | "monthly";

function TrialPage() {
  // Native (iOS/Android) uses IAP via RevenueCat, not Stripe. Branch in a
  // wrapper so the Stripe screen's hooks always run in a stable order.
  if (isNative()) {
    return <NativePaywall />;
  }
  return <StripeTrialPage />;
}

function StripeTrialPage() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<Billing>("yearly");
  const [stage, setStage] = useState<"insight" | "paywall" | "checkout">("insight");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("trial_insight_shown", {});
  }, []);

  const startCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    trackEvent("trial_start_click", { billing });
    try {
      const priceId = billing === "yearly" ? TRIAL_PRO_YEARLY_PRICE_ID : TRIAL_PRO_MONTHLY_PRICE_ID;
      const result = await createCheckoutSession({
        data: {
          priceId,
          returnUrl: `${window.location.origin}/today?trial=started`,
          environment: getStripeEnvironment(),
          trialDays: TRIAL_DAYS,
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
      setClientSecret(result.clientSecret);
      setStage("checkout");
      trackEvent("trial_checkout_opened", { billing });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }, [billing]);

  const onSkip = () => {
    trackEvent("trial_skipped", { stage });
    navigate({ to: "/today", replace: true });
  };

  if (stage === "checkout" && clientSecret) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-dvh bg-background px-4 pb-12 pt-6 sm:px-6"
      >
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => {
              setClientSecret(null);
              setStage("paywall");
            }}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <Card className="rounded-2xl border-border p-4">
            <EmbeddedCheckoutProvider
              stripe={getStripe()}
              options={{ fetchClientSecret: async () => clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </Card>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            You won't be charged today. Your card is authorized for the trial and billed after{" "}
            {TRIAL_DAYS} days unless you cancel.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-dvh bg-background px-5 pb-12 pt-6 text-foreground"
    >
      <div className="mx-auto flex max-w-lg flex-col">
        {stage === "insight" ? (
          <InsightStage
            onContinue={() => {
              setStage("paywall");
              trackEvent("trial_paywall_shown", {});
            }}
            onSkip={onSkip}
          />
        ) : (
          <PaywallStage
            billing={billing}
            setBilling={setBilling}
            onStart={startCheckout}
            onSkip={onSkip}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </main>
  );
}

function InsightStage({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Safety check
        </span>
        <button onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground">
          Skip
        </button>
      </div>
      <h1 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">
        Here's what DoseRoutine catches for stacks like yours.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A real example — the kind of interaction most tracking apps miss entirely.
      </p>

      <Card className="mt-5 overflow-hidden rounded-2xl border-[color:var(--severity-caution,#f59e0b)]/40">
        <div className="flex items-center gap-2 bg-[color:var(--severity-caution,#f59e0b)]/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-[color:var(--severity-caution,#f59e0b)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--severity-caution,#f59e0b)]">
            Caution — monitor closely
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 font-display text-base font-semibold">
            <span>Tesamorelin</span>
            <span className="text-muted-foreground">+</span>
            <span>TRT (Testosterone)</span>
          </div>
          <p className="mt-2 text-sm text-foreground">
            Tesamorelin drives endogenous GH/IGF-1 while TRT independently raises androgens.
            Stacking without lab-monitored IGF-1 and hematocrit can push both out of safe range and
            mask insulin-resistance changes.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Watch fasting glucose
              &amp; HbA1c every 8–12 weeks
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Track IGF-1 quarterly;
              keep below 250 ng/mL
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Recheck hematocrit at 6
              &amp; 12 weeks
            </li>
          </ul>
        </div>
      </Card>

      <p className="mt-5 text-sm text-muted-foreground">
        Your real stack gets checked against 475+ compounds — supplements, peptides, hormones and
        more. Every pair, every day.
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="tap-target mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[color:var(--primary-hover)]"
      >
        Unlock your full safety report
        <ArrowRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="tap-target mt-3 w-full rounded-xl py-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        Not now
      </button>
    </div>
  );
}

function PaywallStage({
  billing,
  setBilling,
  onStart,
  onSkip,
  loading,
  error,
}: {
  billing: Billing;
  setBilling: (b: Billing) => void;
  onStart: () => void;
  onSkip: () => void;
  loading: boolean;
  error: string | null;
}) {
  const yearlyMonthly = TRIAL_PRO_YEARLY_CENTS / 12 / 100;
  const monthly = TRIAL_PRO_MONTHLY_CENTS / 100;
  const savingsPct = Math.round((1 - TRIAL_PRO_YEARLY_CENTS / 12 / TRIAL_PRO_MONTHLY_CENTS) * 100);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> {TRIAL_DAYS}-day free trial
        </span>
        <button
          onClick={onSkip}
          className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <h1 className="mt-4 font-display text-2xl font-semibold leading-tight sm:text-3xl">
        Try DoseRoutine free for {TRIAL_DAYS} days.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Full access. Cancel anytime before day {TRIAL_DAYS} and you're not charged.
      </p>

      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={() => setBilling("yearly")}
          className={`w-full rounded-2xl border-2 p-4 text-left transition-colors ${billing === "yearly" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-semibold">Annual</span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  Save {savingsPct}%
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                ${TRIAL_PRO_YEARLY_CENTS / 100} billed yearly after trial
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-xl font-bold">${yearlyMonthly.toFixed(2)}</div>
              <div className="text-[11px] text-muted-foreground">per month</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={`w-full rounded-2xl border-2 p-4 text-left transition-colors ${billing === "monthly" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-display text-base font-semibold">Monthly</span>
              <div className="mt-0.5 text-xs text-muted-foreground">Billed monthly after trial</div>
            </div>
            <div className="text-right">
              <div className="font-display text-xl font-bold">${monthly.toFixed(2)}</div>
              <div className="text-[11px] text-muted-foreground">per month</div>
            </div>
          </div>
        </button>
      </div>

      <ul className="mt-5 grid gap-1.5 text-sm text-foreground">
        {[
          "Unlimited compounds — supplements, peptides, hormones & more",
          "AI plan generator & 24/7 AI coach",
          "Smart reminders (push + email) & calendar (.ics) alarms",
          "Stack calendar, timeline & adherence heatmap",
          "Interaction checker & reconstitution calculator",
          "Vial inventory with refill predictions",
          "Injection-site rotation & cycle tracking",
          "Progress photos, lab tracking & body metrics",
          "Cost tracker, side-effect journal & barcode scanner",
          "Shareable report export & protocol sharing",
        ].map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {f}
          </li>
        ))}
      </ul>

      {error ? (
        <p className="mt-4 rounded-lg bg-[color:var(--severity-avoid-bg)] px-3 py-2 text-sm text-[color:var(--severity-avoid)]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className="tap-target mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Start {TRIAL_DAYS}-day free trial
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        Free for {TRIAL_DAYS} days, then{" "}
        {billing === "yearly"
          ? `$${TRIAL_PRO_YEARLY_CENTS / 100}/year`
          : `$${monthly.toFixed(2)}/month`}
        . Cancel anytime in Settings — no charge if you cancel before day {TRIAL_DAYS}.
      </p>
      <button
        type="button"
        onClick={onSkip}
        className="tap-target mt-1 w-full rounded-xl py-2 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Not right now
      </button>
    </div>
  );
}
