/**
 * Server-side entitlement resolution.
 *
 * Client route guards (ProRouteGate / useAccess) are UX only — anyone with a
 * valid session can call a server function directly. Pro-only server functions
 * MUST call `requireFullAccess` before doing paid work (AI generations, etc).
 *
 * Mirrors `hasFullAccess` in src/lib/access.ts, but reads the caller's own
 * rows under RLS instead of trusting anything from the client.
 */
import { hasFullAccess, isSubscriptionActive } from "@/lib/access";
import {
  ensureEntitlementCorrelationId,
  reportEntitlementFailure,
  traceEntitlementResolution,
} from "@/lib/entitlement-telemetry";

type MinimalSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  from: (table: string) => any;
};

export class UpgradeRequiredError extends Error {
  constructor(message = "Your trial or subscription has ended. Upgrade to keep using AI plans.") {
    super(message);
    this.name = "UpgradeRequiredError";
  }
}

/**
 * Thrown when the entitlement read itself failed (database/network), as
 * opposed to the user genuinely not being entitled. Callers must NOT treat
 * this as "no access" — a paying user must never be denied because a query
 * blipped.
 */
export class EntitlementUnavailableError extends Error {
  readonly retryable = true;
  /** Trace id shared with the Sentry event / structured log for this failure. */
  readonly correlationId: string;
  constructor(
    message = "We couldn't verify your subscription. Please try again.",
    correlationId = "",
  ) {
    super(message);
    this.name = "EntitlementUnavailableError";
    this.correlationId = correlationId;
  }
}

export async function resolveFullAccess(
  supabase: MinimalSupabase,
  userId: string,
  /** Correlation id from the caller (client request header) — minted when absent. */
  correlationIdInput?: string | null,
): Promise<boolean> {
  const correlationId = ensureEntitlementCorrelationId(correlationIdInput);
  const [{ data: profile, error: profileError }, { data: sub, error: subError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("grandfathered, comp_access_until")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (profileError || subError) {
    reportEntitlementFailure(
      {
        resolver: "server:resolveFullAccess",
        source: profileError && subError ? "both" : profileError ? "profile" : "subscription",
        userId,
        correlationId,
        outcome: "throw",
        detail: {
          profileRowFound: !!profile,
          subscriptionRowFound: !!sub,
        },
      },
      profileError ?? subError,
    );
    throw new EntitlementUnavailableError(undefined, correlationId);
  }

  const subscriptionActive = isSubscriptionActive(sub);

  const granted = hasFullAccess({
    grandfathered: !!profile?.grandfathered,
    subscriptionActive,
    compAccessUntil: (profile?.comp_access_until as string | null) ?? null,
  });

  traceEntitlementResolution({
    resolver: "server:resolveFullAccess",
    outcome: granted ? "granted" : "denied",
    correlationId,
    detail: { subscriptionActive, grandfathered: !!profile?.grandfathered },
  });

  return granted;
}

/** Throws UpgradeRequiredError when the caller has no active entitlement. */
export async function requireFullAccess(
  supabase: MinimalSupabase,
  userId: string,
  correlationIdInput?: string | null,
): Promise<void> {
  const correlationId = ensureEntitlementCorrelationId(correlationIdInput);
  const ok = await resolveFullAccess(supabase, userId, correlationId);
  if (!ok) {
    reportEntitlementFailure({
      resolver: "server:resolveFullAccess",
      source: "both",
      userId,
      correlationId,
      outcome: "denied",
      detail: { reason: "no active entitlement" },
    });
    throw new UpgradeRequiredError();
  }
}
