import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Check, Loader2 } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";
import { TrustBadges } from "@/components/trust-badges";
import { PageHeader } from "@/components/page-header";
import { NativePaywall } from "@/components/native-paywall";
import { isNative } from "@/lib/platform";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({ meta: [{ title: "Upgrade — DoseRoutine" }] }),
  // `plan` + `checkout=1` power the one-click buttons in the trial-ending
  // banner and the trial reminder emails: they land here and Stripe checkout
  // opens immediately for the right billing period.
  validateSearch: (
    search: Record<string, unknown>,
  ): { plan?: "monthly" | "yearly"; checkout?: "1" | "return"; next?: string } => ({
    ...(search.plan === "yearly" || search.plan === "monthly"
      ? { plan: search.plan as "monthly" | "yearly" }
      : {}),
    ...(search.checkout === "1" || search.checkout === true
      ? { checkout: "1" as const }
      : search.checkout === "return"
        ? { checkout: "return" as const }
        : {}),
    // Where to send them once checkout finishes. Only same-app paths.
    ...(typeof search.next === "string" && /^\/(?!\/)/.test(search.next)
      ? { next: search.next }
      : {}),
  }),
  component: UpgradePage,
});

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    description: "Everything DoseRoutine offers — one plan.",
    monthlyPriceId: "pro_monthly",
    yearlyPriceId: "pro_yearly",
    monthlyAmount: 999,
    yearlyAmount: 5999,
    features: [
      "Unlimited compounds, peptides, hormones & more",
      "AI-generated supplement plans & 24/7 AI coach",
      "Smart dose reminders (push + email) with quiet hours",
      "Stack calendar, timeline & adherence heatmap",
      "Interaction checker & reconstitution calculator",
      "Vial inventory with refill predictions",
      "Injection-site rotation & cycle tracking",
      "Progress photos, lab tracking & body metrics",
      "Cost tracker & side-effect journal",
      "Shareable report export, protocol sharing & barcode scanner",
    ],
  },
];

type Billing = "monthly" | "yearly";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function UpgradePage() {
  // Native (iOS / Android): Apple/Google mandate their IAP for digital
  // subscriptions. Show the RevenueCat-backed paywall, not Stripe. The
  // branch lives in a wrapper so the Stripe screen's hook order is stable.
  if (isNative()) {
    return (
      <>
        <PageHeader title="Upgrade" fallbackTo="/more" hideBack />
        <NativePaywall />
      </>
    );
  }
  return <StripeUpgradePage />;
}

function StripeUpgradePage() {
  const { plan: planParam, checkout: checkoutParam, next: nextParam } = Route.useSearch();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<Billing>(planParam ?? "monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async (priceId: string) => {
    const result = await createCheckoutSession({
      data: {
        priceId,
        returnUrl: `${window.location.origin}/upgrade?checkout=return${
          nextParam ? `&next=${encodeURIComponent(nextParam)}` : ""
        }`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  }, [nextParam]);

  const startCheckout = useCallback(
    async (planId: string, billingOverride?: Billing) => {
      setSelectedPlan(planId);
      setLoading(true);
      setError(null);
      try {
        const plan = PLANS.find((p) => p.id === planId);
        if (!plan) throw new Error("Plan not found");
        const period = billingOverride ?? billing;
        const priceId = period === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId;
        const secret = await fetchClientSecret(priceId);
        setClientSecret(secret);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Checkout failed");
      } finally {
        setLoading(false);
      }
    },
    [billing, fetchClientSecret],
  );

  // One-click entry from the trial banner / trial reminder emails:
  // /upgrade?checkout=1&plan=monthly opens Stripe checkout straight away.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (checkoutParam !== "1" || autoStarted.current) return;
    autoStarted.current = true;
    void startCheckout("pro", planParam ?? "monthly");
  }, [checkoutParam, planParam, startCheckout]);

  // Stripe sends them back here when checkout completes. If they came from a
  // locked Pro screen, drop them right back on that page.
  const returned = useRef(false);
  useEffect(() => {
    if (checkoutParam !== "return" || !nextParam || returned.current) return;
    returned.current = true;
    void navigate({ to: nextParam, replace: true });
  }, [checkoutParam, nextParam, navigate]);

  if (clientSecret) {
    return (
      <>
        <PageHeader title="Checkout" fallbackTo="/more" hideBack />
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6">
          <button
            onClick={() => {
              setClientSecret(null);
              setSelectedPlan(null);
            }}
            className="mb-4 text-sm font-medium text-primary hover:underline"
          >
            ← Back to plans
          </button>
          <Card id="checkout" className="rounded-2xl border-border p-4">
            <EmbeddedCheckoutProvider
              stripe={getStripe()}
              options={{ fetchClientSecret: async () => clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </Card>
          <TrustBadges variant="checkout" align="center" className="mt-4" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Upgrade" fallbackTo="/more" hideBack />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">Upgrade DoseRoutine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the plan that fits your protocol.
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-muted p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`tap-target rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                billing === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`tap-target rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                billing === "yearly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              Yearly <span className="text-xs text-success">save 37%</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mx-auto mt-6 grid max-w-md gap-4">
          {PLANS.map((plan) => {
            const amount = billing === "monthly" ? plan.monthlyAmount : plan.yearlyAmount;
            const period = billing === "monthly" ? "/month" : "/year";
            const isLoading = loading && selectedPlan === plan.id;
            return (
              <Card key={plan.id} className="flex flex-col rounded-2xl border-border p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{plan.name}</h2>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold">{formatCents(amount)}</div>
                    <div className="text-xs text-muted-foreground">{period}</div>
                  </div>
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => startCheckout(plan.id)}
                  disabled={loading}
                  className="tap-target mt-5 w-full rounded-xl bg-cta py-3.5 text-base font-semibold text-cta-foreground shadow-sm hover:bg-cta-hover active:scale-[0.98] disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading checkout…
                    </span>
                  ) : (
                    "Upgrade"
                  )}
                </button>
                <TrustBadges variant="checkout" className="mt-3" />
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Subscriptions renew automatically. Cancel anytime from your account.
        </p>
      </div>
    </>
  );
}
