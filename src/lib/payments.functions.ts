import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type Stripe from "stripe";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { isSubscriptionActive } from "@/lib/access";
import { getRequest } from "@tanstack/react-start/server";
import { NATIVE_CHECKOUT_BLOCKED_MESSAGE, isNativeUserAgent } from "@/lib/native-request";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

// Look up an existing Customer by userId metadata (then by email), or
// create one. Putting userId on the Customer object is what makes later
// reads (portal, dashboards, subscriptions.search) resolvable without
// depending on Session metadata, which is NOT searchable.
async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  // userId is interpolated into a Stripe Search query string below;
  // reject anything that could break out of the quoted value.
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

function tierFromPrice(priceId: string): "pro" | null {
  if (priceId.startsWith("pro_")) return "pro";
  return null;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      priceId: string;
      quantity?: number;
      returnUrl: string;
      environment: StripeEnv;
      /** When set on a recurring price, adds a free trial before first charge. */
      trialDays?: number;
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
      if (data.trialDays !== undefined && (data.trialDays < 1 || data.trialDays > 90)) {
        throw new Error("trialDays out of range");
      }
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    // Guideline 3.1.1 — refuse web checkout for requests originating inside
    // the native shell, regardless of what the client bundle decided to show.
    if (isNativeUserAgent(getRequest()?.headers.get("user-agent"))) {
      return { error: NATIVE_CHECKOUT_BLOCKED_MESSAGE };
    }
    try {
      const stripe = createStripeClient(data.environment);
      const { userId } = context;

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";

      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId,
      });

      let productDescription: string | undefined;
      if (!isRecurring) {
        const productId =
          typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
        const product = await stripe.products.retrieve(productId);
        productDescription = product.name;
      }

      const tier = tierFromPrice(data.priceId);

      // Only apply the trial once per user (prevents endless retrial by
      // canceling and re-subscribing). If they've already used their trial,
      // trialDays is silently dropped and the checkout charges immediately.
      let effectiveTrialDays: number | undefined;
      if (isRecurring && data.trialDays) {
        const { data: profile } = await context.supabase
          .from("profiles")
          .select("has_used_trial")
          .eq("id", userId)
          .maybeSingle();
        if (!profile?.has_used_trial) {
          effectiveTrialDays = data.trialDays;
        }
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
        metadata: { userId, tier: tier ?? "" },
        ...(isRecurring && {
          subscription_data: {
            metadata: { userId, tier: tier ?? "" },
            ...(effectiveTrialDays && { trial_period_days: effectiveTrialDays }),
          },
        }),
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type PortalSessionResult = { url: string } | { error: string };

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError || !sub?.stripe_customer_id) throw new Error("No subscription found");

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const getSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Pick the most recent subscription across ALL providers (stripe/apple/google)
    // for this environment. Native IAP rows are written by the RevenueCat
    // webhook; Stripe rows are written by the Stripe webhook. Both feed the
    // same table so entitlement checks work regardless of purchase channel.
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select(
        "tier, status, current_period_end, cancel_at_period_end, environment, provider, price_id",
      )
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const tier = sub?.tier ?? "free";
    const isPro = tier === "pro";
    const isPaid = isPro;
    const active = isPaid && isSubscriptionActive(sub);

    const priceId = (sub?.price_id ?? "") as string;
    const plan: "monthly" | "yearly" | null =
      priceId.includes("yearly") || priceId.includes("annual")
        ? "yearly"
        : priceId.includes("monthly")
          ? "monthly"
          : null;

    return {
      tier,
      isPaid,
      isPro,
      active,
      plan,
      status: sub?.status ?? "free",
      currentPeriodEnd: sub?.current_period_end ?? null,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      provider: sub?.provider ?? null,
    };
  });

/**
 * Delete the currently-signed-in user's account.
 *
 * Required by Apple 5.1.1(v) and Google's data safety policies.
 *
 *   1. Cancel any active Stripe subscription at period end.
 *   2. Delete the auth user via admin API — cascades to user-scoped tables.
 *
 * RevenueCat/Apple/Google entitlements are managed in Settings →
 * Subscriptions per Apple guidelines; the UI surfaces that instruction.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: stripeSub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("provider", "stripe")
      .not("stripe_subscription_id", "is", null)
      .in("status", ["active", "trialing", "past_due"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stripeSub?.stripe_subscription_id) {
      try {
        const stripe = createStripeClient(data.environment);
        await stripe.subscriptions.update(stripeSub.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (e) {
        console.error("Stripe cancel-on-delete failed:", getStripeErrorMessage(e));
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("Auth admin deleteUser failed:", delErr.message);
      throw new Error("Account deletion failed. Please contact support.");
    }

    return { ok: true, hadStripeSub: Boolean(stripeSub?.stripe_subscription_id) };
  });
