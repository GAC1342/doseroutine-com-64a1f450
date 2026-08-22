import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns the RevenueCat public SDK key for the requested native platform.
 * These keys are public (safe to ship to the client) but we keep them in
 * runtime secrets so they can be rotated without rebuilding the app.
 */
export const getRevenueCatConfig = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        platform: z.enum(["ios", "android"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const key =
      data.platform === "ios"
        ? process.env.REVENUECAT_APPLE_KEY
        : process.env.REVENUECAT_GOOGLE_KEY;

    if (!key) {
      throw new Error(`RevenueCat key not configured for ${data.platform}`);
    }

    return { apiKey: key };
  });

function tierFromProductId(productId: string | null | undefined): "pro" | null {
  if (!productId) return null;
  if (productId.startsWith("pro_")) return "pro";
  return null;
}

function providerFromStore(store: string | null | undefined): "apple" | "google" | null {
  if (!store) return null;
  const s = String(store).toLowerCase();
  if (s.includes("app_store") || s === "mac_app_store" || s === "apple") return "apple";
  if (s.includes("play_store") || s === "google") return "google";
  return null;
}

/**
 * Authoritative restore/sync for the signed-in user.
 *
 * Called from the client immediately after `Purchases.restorePurchases()`
 * (and after `Purchases.purchasePackage()`) so that our `subscriptions`
 * table reflects Apple/Google entitlements without waiting for the
 * RevenueCat webhook — which can lag by several seconds and, for pure
 * restores where nothing changed on RC's side, may never fire.
 *
 * Uses the RevenueCat REST v1 subscriber endpoint with the project's
 * secret key (server-side only).
 * Docs: https://www.revenuecat.com/reference/subscribers
 */
export const syncRevenueCatSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { userId } = context;
    // Writes to `subscriptions` must go through the admin client — the
    // per-user client is now SELECT-only on that table (see hardening
    // migration) so entitlement rows are only ever written server-side.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;
    const secret = process.env.REVENUECAT_SECRET_KEY;
    if (!secret) {
      // Not fatal — the RC webhook path still works. Return a neutral result
      // so the client can fall back to polling the subscription query.
      return { synced: false as const, reason: "not_configured" as const };
    }

    const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
        "X-Platform": "ios",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`RevenueCat sync failed (${res.status}): ${text.slice(0, 200)}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const body = (await res.json()) as any;
    const subscriber = body?.subscriber;
    if (!subscriber) {
      return { synced: false as const, reason: "no_subscriber" as const };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const subs: Record<string, any> = subscriber.subscriptions ?? {};
    const entries = Object.entries(subs);
    entries.sort(([, a], [, b]) => {
      const at = new Date(a?.purchase_date ?? 0).getTime();
      const bt = new Date(b?.purchase_date ?? 0).getTime();
      return bt - at;
    });

    // Pick the newest Apple/Google subscription record.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    let picked: { productId: string; data: any } | null = null;
    for (const [productId, s] of entries) {
      if (providerFromStore(s?.store)) {
        picked = { productId, data: s };
        break;
      }
    }

    const now = Date.now();
    const activeEntitlements = Object.entries(subscriber.entitlements ?? {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
      .filter(([, v]: [string, any]) => {
        const exp = v?.expires_date;
        return exp ? new Date(exp).getTime() > now : true;
      })
      .map(([k]) => k);

    if (!picked) {
      return { synced: true as const, activeEntitlements };
    }

    const s = picked.data;
    const provider = providerFromStore(s.store)!;
    const tier = tierFromProductId(picked.productId);
    const environment: "sandbox" | "live" = s.is_sandbox ? "sandbox" : "live";
    const periodStart = s.purchase_date ? new Date(s.purchase_date).toISOString() : null;
    const periodEnd = s.expires_date ? new Date(s.expires_date).toISOString() : null;
    const active = !!(periodEnd && new Date(periodEnd).getTime() > now);
    const canceled = !!s.unsubscribe_detected_at;
    const isTrial = s.period_type === "trial";
    const billingIssue = !!s.billing_issues_detected_at && active;

    let status: string;
    if (billingIssue) status = "past_due";
    else if (!active) status = "canceled";
    else if (isTrial) status = "trialing";
    else status = "active";

    const storeTransactionId: string | null =
      s.store_transaction_id ?? s.original_purchase_transaction_id ?? null;

    const row = {
      user_id: userId,
      provider,
      entitlement: tier,
      tier,
      status,
      store_product_id: picked.productId,
      store_transaction_id: storeTransactionId,
      revenuecat_app_user_id: userId,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: canceled,
      environment,
      updated_at: new Date().toISOString(),
    };

    // Always dedupe via a stable key so replaying restore is idempotent.
    const dedupeKey: string = storeTransactionId || `rc_sync_${userId}_${provider}_${environment}`;
    const rowWithKey = { ...row, store_transaction_id: dedupeKey };
    const { error } = await supabase
      .from("subscriptions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
      .upsert(rowWithKey as any, { onConflict: "store_transaction_id" });
    if (error) throw error;

    return {
      synced: true as const,
      activeEntitlements,
      tier,
      status,
      environment,
    };
  });
