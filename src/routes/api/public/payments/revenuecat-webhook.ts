/**
 * RevenueCat webhook — receives Apple/Google subscription lifecycle events
 * and writes them to the same `subscriptions` table that the Stripe webhook
 * writes to, so entitlement checks (`useSubscription`, `useIsPaid`, etc.)
 * are provider-agnostic.
 *
 * Auth: RevenueCat sends a static `Authorization` header value the user
 * configures in their RevenueCat dashboard. We compare it in constant time
 * against `REVENUECAT_WEBHOOK_AUTH`.
 *
 * Docs: https://www.revenuecat.com/docs/integrations/webhooks
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { redactError } from "@/lib/log-redact";

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

function tierFromProductId(productId: string | undefined | null): "pro" | "free" {
  if (!productId) return "free";
  if (productId.startsWith("pro_")) return "pro";
  return "free";
}

function providerFromStore(store: string | undefined | null): "apple" | "google" | null {
  if (store === "APP_STORE" || store === "MAC_APP_STORE") return "apple";
  if (store === "PLAY_STORE") return "google";
  return null;
}

// RevenueCat event types that create/update entitlements.
const ACTIVE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);
const CANCELED_EVENTS = new Set(["CANCELLATION", "EXPIRATION", "SUBSCRIPTION_PAUSED"]);
const TRIAL_EVENTS = new Set([
  "INITIAL_PURCHASE", // may be trial — detected by is_trial_period on the event
]);

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
async function handleEvent(event: any) {
  const type: string = event.type;
  const userId: string | undefined = event.app_user_id;
  if (!userId) {
    console.error("[RC webhook] missing app_user_id");
    return;
  }

  const provider = providerFromStore(event.store);
  if (!provider) {
    console.warn("[RC webhook] unknown store:", event.store);
    return;
  }

  const productId: string | undefined = event.product_id;
  const tier = tierFromProductId(productId);
  const environment: "sandbox" | "live" = event.environment === "PRODUCTION" ? "live" : "sandbox";
  // Prefer real store transaction id; fall back to the RC event id so every
  // event still has a stable dedupe key (RC retries on non-2xx, so a raw
  // insert would create duplicate rows for the same event).
  const storeTransactionId: string =
    event.transaction_id ||
    event.original_transaction_id ||
    (event.id
      ? `rc_evt_${event.id}`
      : `rc_evt_${userId}_${type}_${event.event_timestamp_ms ?? Date.now()}`);

  const periodStart = event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null;
  const periodEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  const isTrial = event.period_type === "TRIAL" || event.is_trial_period === true;

  let status: string;
  if (ACTIVE_EVENTS.has(type)) {
    status = isTrial ? "trialing" : "active";
  } else if (CANCELED_EVENTS.has(type)) {
    status = type === "EXPIRATION" ? "canceled" : "canceled";
  } else if (type === "BILLING_ISSUE") {
    status = "past_due";
  } else if (type === "TRANSFER") {
    // Handled separately below.
    status = "active";
  } else {
    console.log("[RC webhook] ignoring event type:", type);
    return;
  }

  const supabase = getSupabase();
  const row = {
    user_id: userId,
    provider,
    entitlement: tier === "free" ? null : tier,
    tier: tier === "free" ? null : tier,
    status,
    store_product_id: productId ?? null,
    store_transaction_id: storeTransactionId,
    revenuecat_app_user_id: userId,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: type === "CANCELLATION",
    environment,
    updated_at: new Date().toISOString(),
  };

  // Always upsert on store_transaction_id — idempotent under RC redelivery.
  await supabase.from("subscriptions").upsert(row, { onConflict: "store_transaction_id" });
}

export const Route = createFileRoute("/api/public/payments/revenuecat-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
        if (!expected) {
          console.error("[RC webhook] REVENUECAT_WEBHOOK_AUTH not configured");
          return new Response("Not configured", { status: 503 });
        }
        const rawHeader = (request.headers.get("authorization") ?? "").trim();
        // Accept either the raw secret or "Bearer <secret>" form.
        const provided = rawHeader.toLowerCase().startsWith("bearer ")
          ? rawHeader.slice(7).trim()
          : rawHeader;
        const expectedTrim = expected.trim();
        if (!timingSafeEq(provided, expectedTrim)) {
          console.error("[RC webhook] auth mismatch", {
            providedLen: provided.length,
            expectedLen: expectedTrim.length,
          });
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const body = await request.json();
          const event = body?.event;
          if (!event?.type) {
            return new Response("Bad event", { status: 400 });
          }
          await handleEvent(event);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[RC webhook] error:", redactError(e));
          // Return 500 so RevenueCat retries.
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
