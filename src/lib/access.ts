/**
 * Single source of truth for "does this user get full app access".
 *
 * Rules:
 *   - Grandfathered users (created before the trial-paywall deploy) ALWAYS
 *     have full access, forever. We never yank active safety warnings out
 *     from under someone mid-stack.
 *   - Anyone with an active/trialing/past-due subscription has full access.
 *   - Everyone else is a new free user who must start the 7-day trial to
 *     unlock the app.
 */
export type AccessInputs = {
  grandfathered: boolean | null | undefined;
  subscriptionActive: boolean | null | undefined;
  /** ISO timestamp of complimentary (tester reward) access, if any. */
  compAccessUntil?: string | null;
};

export function isCompAccessActive(until: string | null | undefined): boolean {
  if (!until) return false;
  const t = new Date(until).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export function hasFullAccess(inputs: AccessInputs): boolean {
  if (inputs.grandfathered) return true;
  if (inputs.subscriptionActive) return true;
  if (isCompAccessActive(inputs.compAccessUntil)) return true;
  return false;
}

/** Free months awarded to closed-testing participants after 14 days. */
export const TESTER_REWARD_MONTHS = 3;

export const TRIAL_DAYS = 7;
export const TRIAL_PRO_MONTHLY_PRICE_ID = "pro_monthly";
export const TRIAL_PRO_YEARLY_PRICE_ID = "pro_yearly";
export const TRIAL_PRO_YEARLY_CENTS = 5999;
export const TRIAL_PRO_MONTHLY_CENTS = 999;

/**
 * Statuses that count as an entitled subscription.
 * `past_due` stays entitled: the card failed but the provider is still
 * retrying — yanking access mid-dunning is a worse failure than a few
 * extra entitled days.
 */
export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Grace window applied to `current_period_end` before we consider a row expired. */
export const SUBSCRIPTION_EXPIRY_GRACE_MS = 24 * 60 * 60 * 1000;

export type SubscriptionRow = {
  tier?: string | null;
  status?: string | null;
  current_period_end?: string | null;
};

/**
 * Single source of truth for "is this subscription row currently entitled".
 * Used by both the client-facing status server fn and the server-side
 * entitlement resolver so the two can never disagree.
 *
 * Fail-closed on unknown/missing rows, but tolerant of a missing period end
 * (some providers omit it) and of the dunning grace window.
 */
export function isSubscriptionActive(
  sub: SubscriptionRow | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!sub) return false;
  const status = String(sub.status ?? "").toLowerCase();
  const endRaw = sub.current_period_end;
  const end = endRaw ? new Date(endRaw).getTime() : NaN;
  const hasEnd = Number.isFinite(end);
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
    // An "active" row whose period ended long ago is stale (missed webhook) —
    // treat it as expired instead of granting access forever.
    return !hasEnd || end + SUBSCRIPTION_EXPIRY_GRACE_MS > now;
  }
  // Canceled but paid through the end of the period.
  if (status === "canceled" || status === "cancelled") {
    return hasEnd && end > now;
  }
  return false;
}
