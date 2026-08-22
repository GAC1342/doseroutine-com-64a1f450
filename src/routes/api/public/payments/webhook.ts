import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { redactError, redactId, redactPrefixedId } from "@/lib/log-redact";

// Defer client construction until first use so env var availability is not
// assumed at module load time.
let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function tierFromPrice(priceId: string): "pro" | "free" {
  if (priceId.startsWith("pro_")) return "pro";
  return "free";
}

async function sendWelcomeIfFirst(
  userId: string,
  subscriptionId: string,
  tier: "pro" | "free",
  status: string,
) {
  if (tier === "free") return;
  if (status !== "active" && status !== "trialing") return;

  const supabase = getSupabase();

  // First purchase = no prior subscription row for this user other than the
  // one just upserted. Any prior row (canceled or active) means we've
  // already welcomed them.
  const { data: prior } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .neq("stripe_subscription_id", subscriptionId)
    .limit(1);
  if (prior && prior.length > 0) return;

  // Idempotency: don't resend if webhook redelivers.
  const idempotencyKey = `subscription-welcome-${subscriptionId}`;

  const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(userId);
  if (userErr || !userRes.user?.email) {
    console.error("Welcome email: no user email", redactId(userId), redactError(userErr));
    return;
  }

  const appUrl = process.env.PUBLIC_APP_URL ?? `https://doseroutine.com/today`;

  try {
    const result = await sendTemplateEmail("subscription-welcome", userRes.user.email, {
      templateData: { tier, appUrl },
      idempotencyKey,
    });
    if (!result.sent) {
      console.log("Welcome email not sent:", result.reason);
    }
  } catch (e) {
    console.error("Welcome email failed:", redactError(e));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const tier = tierFromPrice(priceId);

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        product_id: productId,
        price_id: priceId,
        tier,
        status: subscription.status,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        environment: env,
        provider: "stripe",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );

  // Flag once so we never offer a second trial to a user who trialed then canceled.
  if (subscription.status === "trialing" || subscription.status === "active") {
    await getSupabase().from("profiles").update({ has_used_trial: true }).eq("id", userId);
  }

  await sendWelcomeIfFirst(userId, subscription.id, tier, subscription.status);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      tier: tierFromPrice(priceId),
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
async function handleCheckoutSessionCompleted(session: any, env: StripeEnv) {
  // Subscription checkouts are handled by the subscription.created/updated
  // webhooks. One-time payments would land here if needed in the future.
  console.log("Checkout session completed:", redactPrefixedId(session.id), env);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid or missing env query parameter:", rawEnv);
          // Return 500 so Stripe marks the delivery failed + retries, instead of
          // silently accepting a misconfigured endpoint and diverging state.
          return new Response("Invalid env", { status: 500 });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", redactError(e));
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
